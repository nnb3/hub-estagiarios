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
        const usageData = usageDoc.data();
        let currentCount = 0;

        if (usageDoc.exists && usageData?.lastUsed === today) {
            currentCount = usageData.count || 0;
        }

        if (currentCount >= DAILY_LIMIT) {
            return {
                statusCode: 429, // Too Many Requests
                body: JSON.stringify({ error: 'Você atingiu o limite diário de uso. Por favor, tente novamente amanhã.' }),
            };
        }
    } catch (dbError) {
        console.error("Erro ao verificar o limite de uso no Firestore:", dbError);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Não foi possível verificar seu limite de uso. Tente novamente.' }),
        };
    }
    
    // --- LÓGICA PRINCIPAL DA API ---
    if (!event.body) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Request body is missing' }) };
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const { action, payload } = JSON.parse(event.body);
        let responseBody: object;

        switch (action) {
            case 'sendMessage': {
                const { internId, systemInstruction, message, history, files } = payload;
                const modelName = ['agnaldo', 'divina'].includes(internId) ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
                const contents: Content[] = history.map((msg: Message) => ({ role: msg.role, parts: [{ text: msg.content }] }));
                const userParts: Part[] = [{ text: message }];
                if (files && files.length > 0) {
                    files.forEach((file: { mimeType: string; data: string }) => {
                        userParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
                    });
                }
                contents.push({ role: 'user', parts: userParts });
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents,
                    config: {
                      systemInstruction,
                      tools: internId === 'magnolia' ? [{ functionDeclarations: calendarTools }] : undefined,
                    }
                });
                responseBody = { text: response.text };
                break;
            }
            case 'transcribeAudio': {
                const { file } = payload;
                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: { parts: [{ text: "Transcreva o seguinte áudio para português brasileiro:" }, { inlineData: { mimeType: file.mimeType, data: file.data } }] },
                });
                responseBody = { text: response.text };
                break;
            }
            case 'generateImage': {
                const { prompt } = payload;
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt,
                    config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '1:1' }
                });
                if (!response.generatedImages || response.generatedImages.length === 0) throw new Error("A API não retornou nenhuma imagem.");
                const base64Image = response.generatedImages[0].image.imageBytes;
                responseBody = { base64: base64Image, mimeType: 'image/png' };
                break;
            }
            case 'editImage': {
                const { prompt, files } = payload;
                if (!files || files.length === 0) throw new Error("Nenhum arquivo de imagem fornecido para edição.");
                const imagePart = { inlineData: { mimeType: files[0].mimeType, data: files[0].data } };
                const textPart = { text: prompt };
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [imagePart, textPart] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                let base64Image = '';
                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        base64Image = part.inlineData.data;
                        break;
                    }
                }
                if (!base64Image) throw new Error("A API não retornou uma imagem editada.");
                responseBody = { base64: base64Image, mimeType: 'image/png' };
                break;
            }
            default:
                return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${action}` }) };
        }

        // --- ATUALIZAÇÃO DO LIMITE DE USO ---
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(usageDocRef);
                if (!doc.exists || doc.data()?.lastUsed !== today) {
                    transaction.set(usageDocRef, { count: 1, lastUsed: today });
                } else {
                    const newCount = (doc.data()?.count || 0) + 1;
                    transaction.update(usageDocRef, { count: newCount });
                }
            });
        } catch (dbUpdateError) {
            console.error("Erro ao ATUALIZAR o limite de uso no Firestore:", dbUpdateError);
        }

        return { statusCode: 200, body: JSON.stringify(responseBody) };
    } catch (error) {
        console.error(`Erro na função proxy para a ação:`, error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocorreu um erro interno ao processar sua solicitação.' }),
        };
    }
};
