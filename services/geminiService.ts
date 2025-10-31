import type { Message } from "../types";
import { auth } from './firebaseService';

// Helper para fazer chamadas para a função de proxy segura
async function callProxy(action: string, payload: any) {
    try {
        const user = auth.currentUser;
        // Se não houver usuário logado, não prossegue
        if (!user) {
            throw new Error("Usuário não autenticado. Por favor, faça o login novamente.");
        }
        
        // Gera o token de identificação do usuário
        const token = await user.getIdToken();

        const response = await fetch('/api/gemini-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Envia o token no cabeçalho para o backend verificar
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action, payload }),
        });

        if (!response.ok) {
            let errorText = `Proxy request failed with status ${response.status}`;
            try {
                // Tenta analisar como JSON, pode ser um erro estruturado do nosso proxy
                const errorBody = await response.json();
                errorText = errorBody.error || errorText;
            } catch (e) {
                // Se a análise de JSON falhar, o corpo pode ser HTML ou texto simples
                try {
                    const textBody = await response.text();
                    // Exibe apenas uma parte do texto se for muito longo
                    errorText = textBody.substring(0, 200) || errorText;
                } catch (textErr) {
                    // Mantém a mensagem de erro original se a leitura do texto também falhar
                }
            }
            throw new Error(errorText);
        }
        
        // FIX: Lê a resposta como texto primeiro para evitar erros com corpo vazio.
        const responseText = await response.text();
        if (!responseText) {
            // Um corpo vazio pode indicar um problema silencioso no servidor.
            // Retornamos um objeto vazio para que o chamador possa lidar com isso.
            return {}; 
        }

        return JSON.parse(responseText); // Agora faz o parse do texto, que é seguro.

    } catch (error) {
        console.error(`Error calling proxy for action "${action}":`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(errorMessage);
    }
}

export async function transcribeAudio(file: { mimeType: string; data: string }): Promise<string> {
  try {
    const result = await callProxy('transcribeAudio', { file });
    return result.text || "Não foi possível extrair o texto da resposta.";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return `Desculpe, ocorreu um erro: ${errorMessage}`;
  }
}

export async function sendMessageToIntern(
  internId: string,
  systemInstruction: string,
  message: string,
  history: Message[],
  files?: { mimeType: string; data: string }[]
): Promise<string> {
  try {
    const payload = { internId, systemInstruction, message, history, files };
    const result = await callProxy('sendMessage', payload);
    // Adiciona uma verificação para garantir que result.text exista
    if (typeof result.text !== 'string') {
      console.error("Resposta inválida do servidor ao enviar mensagem:", result);
      return "Desculpe, recebi uma resposta inesperada do servidor. Tente novamente.";
    }
    return result.text;
  } catch (error) {
     const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
     return `Desculpe, ocorreu um erro: ${errorMessage}`;
  }
}

export async function generateImageWithImagen(prompt: string): Promise<{ base64: string, mimeType: string } | null> {
    try {
        const result = await callProxy('generateImage', { prompt });
        if (!result || !result.base64) return null;
        return { base64: result.base64, mimeType: result.mimeType };
    } catch (error) {
        console.error("Error generating image via proxy:", error);
        return null;
    }
}

export async function editImageWithNanoBanana(prompt: string, files: { mimeType: string; data: string }[]): Promise<{ base64: string, mimeType: string } | null> {
    try {
        const result = await callProxy('editImage', { prompt, files });
        if (!result || !result.base64) return null;
        return { base64: result.base64, mimeType: result.mimeType };
    } catch (error) {
        console.error("Error editing image via proxy:", error);
        return null;
    }
}
