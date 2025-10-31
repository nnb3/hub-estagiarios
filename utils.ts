import type { Message, PresentationData, BriefingData, ExecutiveReviewData, QuotationData } from './types';

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // O resultado é "data:application/pdf;base64,...."
        // Nós precisamos remover o prefixo
        const base64String = result.split(',')[1];
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error("Failed to extract base64 string from file."));
        }
      };
      reader.onerror = (error) => reject(error);
    });
}


function tryParseJson(jsonString: string): any | null {
    let cleanJsonString = jsonString.trim();

    // Primeiro, tenta extrair de um bloco de código markdown
    const markdownMatch = cleanJsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        cleanJsonString = markdownMatch[1];
    } else {
        // Se não houver bloco de markdown, encontra o primeiro '{' e o último '}' para isolar o objeto JSON
        const firstBrace = cleanJsonString.indexOf('{');
        const lastBrace = cleanJsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            cleanJsonString = cleanJsonString.substring(firstBrace, lastBrace + 1);
        }
    }

    try {
        // Tenta fazer o parse da string limpa
        return JSON.parse(cleanJsonString);
    } catch (e) {
        // Se o parse falhar, retorna null
        return null;
    }
}

export function parseFinalResponse(
    internId: string,
    responseContent: string,
    userMessage: Message
): Message {
    const parsedData = tryParseJson(responseContent);

    if (parsedData) {
        switch (internId) {
            case 'agnaldo':
                if (parsedData.slides && Array.isArray(parsedData.slides)) {
                    return {
                        role: 'model',
                        content: 'Sua apresentação está pronta! Use o visualizador abaixo para navegar pelos slides e baixar o arquivo em .pdf.',
                        presentation: parsedData as PresentationData,
                    };
                }
                break;

            case 'benedito':
                if (parsedData.briefing) {
                    return {
                        role: 'model',
                        content: parsedData.followUpQuestion || "Seu documento está pronto! Você pode visualizá-lo abaixo e fazer o download em .pdf.",
                        briefing: parsedData.briefing as BriefingData,
                    };
                }
                break;
            
            case 'divina':
                if (parsedData.executiveReview) {
                    const reviewData = parsedData.executiveReview as ExecutiveReviewData;
                    // The userMessage might not have files if it was a text prompt that triggered a file-based analysis from history
                    const fileForContext = userMessage.files?.[0] ?? userMessage.attachments?.[0];
                    if (fileForContext) {
                        reviewData.file = fileForContext.name;
                    }
                    reviewData.date = new Date().toLocaleDateString('pt-BR');
                    
                    return {
                        role: 'model',
                        content: "Sua análise de projeto executivo está pronta! Confira o checklist abaixo.",
                        executiveReview: reviewData,
                    };
                }
                break;

             case 'mauricia':
                if (parsedData.quotation) {
                    return { role: 'model', content: '', quotation: parsedData.quotation as QuotationData };
                }
                break;
        }
    }
    
    // If no special format matches, return a standard text message.
    return { role: 'model', content: responseContent };
}