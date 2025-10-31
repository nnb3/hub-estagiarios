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
            const errorBody = await response.json();
            // Exibe a mensagem de erro específica do backend (ex: limite atingido)
            throw new Error(errorBody.error || `Proxy request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error calling proxy for action "${action}":`, error);
        throw error; // Re-throw para ser tratado pelo chamador
    }
}

export async function transcribeAudio(file: { mimeType: string; data: string }): Promise<string> {
  try {
    const result = await callProxy('transcribeAudio', { file });
    return result.text;
  } catch (error) {
    return `Desculpe, ocorreu um erro: ${error.message}`;
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
    return result.text;
  } catch (error) {
     return `Desculpe, ocorreu um erro: ${error.message}`;
  }
}

export async function generateImageWithImagen(prompt: string): Promise<{ base64: string, mimeType: string } | null> {
    try {
        const result = await callProxy('generateImage', { prompt });
        return { base64: result.base64, mimeType: result.mimeType };
    } catch (error) {
        console.error("Error generating image via proxy:", error);
        return null;
    }
}

export async function editImageWithNanoBanana(prompt: string, files: { mimeType: string; data: string }[]): Promise<{ base64: string, mimeType: string } | null> {
    try {
        const result = await callProxy('editImage', { prompt, files });
        return { base64: result.base64, mimeType: result.mimeType };
    } catch (error) {
        console.error("Error editing image via proxy:", error);
        return null;
    }
}