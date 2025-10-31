// Importando tipos e classes do SDK do Gemini e do handler da Netlify
import type { Handler } from "@netlify/functions";
import { GoogleGenAI, Part, Content, FunctionDeclaration, Type, Modality } from "@google/genai";
import * as admin from 'firebase-admin';

// --- INICIALIZAÇÃO DO FIREBASE ADMIN SDK ---
// Isso só roda uma vez, quando a função "acorda".
// As credenciais devem ser configuradas como variáveis de ambiente no painel da Netlify.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}


// --- Tipos Locais para a Função ---
type MessageRole = 'user' | 'model';

interface MessageFile {
  name: string;
  mimeType: string;
  data: string; // base64
}

interface Message {
  role: MessageRole;
  content: string;
  files?: MessageFile[];
}

// --- Funções de Ferramenta para a Magnólia ---
const calendarTools: FunctionDeclaration[] = [
    { name: 'scheduleEvent', parameters: { type: Type.OBJECT, description: 'Agenda um evento.', properties: { title: { type: Type.STRING }, startDateTime: { type: Type.STRING }, endDateTime: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'startDateTime'] } },
    { name: 'createTask', parameters: { type: Type.OBJECT, description: 'Cria uma tarefa.', properties: { title: { type: Type.STRING } }, required: ['title'] } },
];


// --- Handler Principal da Netlify Function ---
export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }
    
    // --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
    const authorization = event.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Não autorizado. Token de autenticação não fornecido.' }) };
    }

    const token = authorization.split('Bearer ')[1];
    let uid: string;
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        uid = decodedToken.uid;
    } catch (error) {
        console.error("Token verification failed:", error);
        return { statusCode: 403, body: JSON.stringify({ error: 'Sessão inválida ou expirada. Por favor, faça o login novamente.' }) };
    }
    
     // --- VERIFICAÇÃO DE LIMITE DE USO DIÁRIO ---
    const db = admin.firestore();
    const DAILY_LIMIT = 20;
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const usageDocRef = db.collection('dailyUsage').doc(uid);

    try {
        const usageDoc = await usageDocRef.get();
        if (usageDoc.exists) {
            const data = usageDoc.data()!;
            if (data.lastResetDate === today && data.count >= DAILY_LIMIT) {
                return { statusCode: 429, body: JSON.stringify({ error: 'Você atingiu seu limite de 20 interações diárias. Por favor, tente novamente amanhã.' }) };
            }
        }
    } catch (dbError) {
        console.error("Firestore usage check error:", dbError);
        return { statusCode: 500, body: JSON.stringify({ error: 'Desculpe, não foi possível verificar seu limite de uso no momento. Tente novamente mais tarde.' }) };
    }

    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "API_KEY environment variable is not set." }) };
    }
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const model = "gemini-2.5-flash";

    try {
        const { action, payload } = JSON.parse(event.body || '{}');
        let response;
        let result;

        switch (action) {
            // --- AÇÃO: Transcrever Áudio ---
            case 'transcribeAudio':
                const { file: audioFile } = payload;
                const audioPart: Part = { inlineData: { mimeType: audioFile.mimeType, data: audioFile.data } };
                const textPart: Part = { text: "Transcreva este áudio na íntegra em português. Retorne apenas o texto transcrito, sem nenhuma formatação, comentários ou introduções adicionais." };
                response = await ai.models.generateContent({ model, contents: [{ parts: [audioPart, textPart] }] });
                result = { text: response.text };
                break;

            // --- AÇÃO: Enviar Mensagem para Estagiário ---
            case 'sendMessage':
                const { internId, systemInstruction, message, history, files } = payload;
                
                // Mapeamento e filtragem robustos do histórico
                const contents: Content[] = history
                    .filter((msg: Message | null): msg is Message => 
                        msg != null && 
                        typeof msg.role === 'string' &&
                        // FIX: Garante que o conteúdo de texto não seja apenas espaços em branco
                        ((typeof msg.content === 'string' && msg.content.trim() !== '') || (Array.isArray(msg.files) && msg.files.length > 0))
                    )
                    .map((msg: Message) => {
                        const parts: Part[] = [];
                        if (msg.content && msg.content.trim() !== '') { 
                            parts.push({ text: msg.content }); 
                        }
                        if (msg.files) {
                            msg.files.forEach(file => {
                                if(file && file.mimeType && file.data) {
                                    parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
                                }
                            });
                        }
                        return { role: msg.role, parts };
                    }).filter((content: Content) => content.parts.length > 0);

                const userParts: Part[] = [];
                if (message) { userParts.push({ text: message }); }
                if (files) {
                    files.forEach((file: any) => userParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } }));
                }

                if(userParts.length > 0) {
                    contents.push({ role: 'user', parts: userParts });
                }

                // A API Gemini espera que a conversa comece com um 'user'.
                // Removemos a saudação inicial do modelo para garantir a conformidade.
                if (contents.length > 0 && contents[0].role === 'model') {
                    contents.shift();
                }

                if (internId === 'magnolia') {
                    const firstResponse = await ai.models.generateContent({ model, contents, config: { systemInstruction, tools: [{ functionDeclarations: calendarTools }] } });
                    const functionCalls = firstResponse.functionCalls;
                    if (functionCalls && functionCalls.length > 0) {
                        contents.push(firstResponse.candidates![0].content);
                        const functionResponses: Part[] = functionCalls.map(fc => ({ functionResponse: { name: fc.name, response: { success: true } } }));
                        contents.push({ role: 'tool', parts: functionResponses });
                        const finalResponse = await ai.models.generateContent({ model, contents, config: { systemInstruction, tools: [{ functionDeclarations: calendarTools }] } });
                        result = { text: finalResponse.text };
                    } else {
                        result = { text: firstResponse.text };
                    }
                } else {
                    const geminiResponse = await ai.models.generateContent({ model, contents, config: { systemInstruction } });
                    result = { text: geminiResponse.text };
                }
                break;

            // --- AÇÃO: Gerar Imagem (Moodboard/Textura) ---
            case 'generateImage':
                const { prompt: imagePrompt } = payload;
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{ parts: [{ text: imagePrompt }] }],
                    config: { responseModalities: [Modality.IMAGE] },
                });
                const generatedImageBase64 = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (!generatedImageBase64) throw new Error("Image generation failed.");
                result = { base64: generatedImageBase64, mimeType: 'image/png' };
                break;

            // --- AÇÃO: Editar Imagem ---
            case 'editImage':
                const { prompt: editPrompt, files: editFiles } = payload;
                const editParts: Part[] = editFiles.map((file: any) => ({ inlineData: { data: file.data, mimeType: file.mimeType } }));
                editParts.push({ text: editPrompt });
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{ parts: editParts }],
                    config: { responseModalities: [Modality.IMAGE] },
                });
                const editedImageBase64 = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
                if (!editedImageBase64) throw new Error("Image editing failed.");
                result = { base64: editedImageBase64, mimeType: editFiles[0].mimeType };
                break;

            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Ação inválida" }) };
        }
        
         // Incrementa o contador de uso após uma chamada bem-sucedida
        try {
            const usageDoc = await usageDocRef.get();
            if (usageDoc.exists && usageDoc.data()!.lastResetDate === today) {
                await usageDocRef.update({ count: admin.firestore.FieldValue.increment(1) });
            } else {
                await usageDocRef.set({ count: 1, lastResetDate: today });
            }
        } catch (dbError) {
            console.error("Firestore usage update error:", dbError);
            // Não bloqueia a resposta se a atualização falhar, mas loga o erro.
        }

        return { statusCode: 200, body: JSON.stringify(result) };

    } catch (error) {
        console.error("Error in Gemini proxy function:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || "Ocorreu um erro interno no servidor." }) };
    }
};
