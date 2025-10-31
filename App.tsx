import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InternList } from './components/InternList';
import { ChatWindow } from './components/ChatWindow';
import { Login } from './components/Login';
import { LoadingIcon } from './components/Icons';
import { auth, onAuthStateChanged, signOut, User } from './services/firebaseService';
import { 
  sendMessageToIntern, 
  transcribeAudio,
  generateImageWithImagen,
  editImageWithNanoBanana
} from './services/geminiService';
import { INTERNS } from './constants';
import { fileToBase64, parseFinalResponse } from './utils';
import type { Intern, Message, MessageFile } from './types';

const getInitialMessageForIntern = (intern: Intern): Message[] => {
  if (intern.id === 'mauricia') {
    return [{
      role: 'model',
      content: 'Olá! Sou a Maurícia, sua especialista em materiais. Precisa de uma sugestão, identificar um produto, criar uma textura ou montar uma lista de orçamento? É só pedir!',
    }];
  } else if (intern.id === 'magnolia') {
    return [{
        role: 'model',
        content: `Olá, sou Magnólia, sua assistente. Posso te ajudar a criar mensagens para clientes ou organizar sua agenda. O que você precisa?`,
        quickReplies: [
            { label: 'Mensagem de boas-vindas', prompt: 'Mensagem de boas vindas' },
            { label: 'Responder sobre valores', prompt: 'Cliente quer saber dos valores'},
            { label: 'Explicar etapas do projeto', prompt: 'Cliente não entendeu a proposta' },
            { label: 'Cliente fechou o projeto', prompt: 'Cliente fechou' },
            { label: 'Cobrança', prompt: 'Cobrança' },
        ]
    }];
  } else if (intern.id === 'agnaldo') {
    return [{
      role: 'model',
      content: 'Oi, tudo bem? Sou o Agnaldo, o estagiário de orçamento. Vamos ver como você quer calcular seu projeto: por m² ou por hora?',
    }];
  } else if (intern.id === 'rogerio') {
    return [{
      role: 'model',
      content: 'Fala aí! 😎 Bora começar?\nVocê quer renderizar uma imagem, criar um moodboard, criar um vídeo, editar alguma coisa ou criar um novo ângulo de uma imagem existente?',
    }];
  } else if (intern.id === 'divina') {
    return [{
      role: 'model',
      content: 'Olá! Sou a Divina. Confiro os projetos executivos, marcenaria e granito. É só me enviar o PDF do projeto que eu começo a analisar.',
    }];
  } else if (intern.id === 'leonor') {
    return [{
      role: 'model',
      content: 'Olá! Eu sou o Leonor, seu estagiário de iluminação. Vou te ajudar a identificar quais as melhores luminárias para o seu projeto. Como posso ajudar?',
    }];
  } else if (intern.id === 'benedito') {
     return [{
        role: 'model',
        content: 'Olá, sou o Benedito. Me envie o áudio ou a transcrição da sua reunião com o cliente e eu vou transformá-la em um briefing completo. Precisa de um modelo de questionário para enviar ao seu cliente? É só pedir!',
        quickReplies: [
            { label: 'Gerar roteiro de briefing', prompt: 'Me envie um roteiro de briefing para eu enviar para o meu cliente' },
        ]
    }];
  } else if (intern.id === 'antonio') {
     return [{
        role: 'model',
        content: 'Olá! Sou o Antonio, seu social media. Estou pronto para criar o cronograma de conteúdo da semana, adaptar um roteiro para reels ou escrever uma copy para vender seu novo curso. O que vamos fazer hoje?',
        quickReplies: [
            { label: 'Monta meu cronograma da semana', prompt: 'Monta o cronograma da semana' },
            { label: 'Adapta um roteiro', prompt: 'Preciso adaptar um roteiro' },
            { label: 'Escreve uma copy de vendas', prompt: 'Preciso de uma copy de vendas' },
        ]
    }];
  } else {
    // Fallback for any intern not explicitly handled
    const pronoun = ['leonor', 'benedito', 'antonio', 'agnaldo', 'rogerio'].includes(intern.id) ? 'seu estagiário' : 'sua estagiária';
    const baseMessage = `Olá! Eu sou ${intern.name.split(' ')[0]}, ${pronoun} de IA para ${intern.description.toLowerCase().replace('especialista em ', '').replace('expert em ', '').replace('mestre da ', '')}. Como posso ajudar?`;
    return [{
        role: 'model',
        content: baseMessage,
    }];
  }
};

const getInitialHistories = (): Record<string, Message[][]> => {
    const histories: Record<string, Message[][]> = {};
    for (const intern of INTERNS) {
        histories[intern.id] = [getInitialMessageForIntern(intern)];
    }
    return histories;
};

const getInitialActiveIndices = (): Record<string, number> => {
    const indices: Record<string, number> = {};
    for (const intern of INTERNS) {
        indices[intern.id] = 0;
    }
    return indices;
}


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeIntern, setActiveIntern] = useState<Intern>(INTERNS[0]);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[][]>>(getInitialHistories);
  const [activeChatIndices, setActiveChatIndices] = useState<Record<string, number>>(getInitialActiveIndices);
  
  const [userInput, setUserInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const activeInternId = activeIntern.id;
  const activeChatIndex = activeChatIndices[activeInternId];
  const currentChatSession = chatHistories[activeInternId];
  const currentMessages = currentChatSession[activeChatIndex];

  const handleSelectIntern = useCallback((intern: Intern) => {
    setActiveIntern(intern);
    setSelectedFiles([]); // Clear file when switching interns
  }, []);
  
  const handleFileAdd = (newFiles: File[]) => {
    setSelectedFiles(prevFiles => {
      const existingFileKeys = new Set(prevFiles.map(f => `${f.name}|${f.size}`));
      const uniqueNewFiles = newFiles.filter(f => !existingFileKeys.has(`${f.name}|${f.size}`));
      return [...prevFiles, ...uniqueNewFiles];
    });
  };

  const handleClearFile = (fileToRemove: File) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };
  
  const handleNewChat = useCallback(() => {
    setChatHistories(prev => {
        const newSessions = [...prev[activeInternId], getInitialMessageForIntern(activeIntern)];
        return { ...prev, [activeInternId]: newSessions };
    });
    setActiveChatIndices(prev => ({ ...prev, [activeInternId]: currentChatSession.length }));
  }, [activeIntern, activeInternId, currentChatSession.length]);

  const handleSelectChat = useCallback((index: number) => {
      setActiveChatIndices(prev => ({ ...prev, [activeInternId]: index }));
  }, [activeInternId]);

  const handleSendMessage = async (messageToSend?: string, filesOverride?: File[]) => {
    const filesToProcess = filesOverride || selectedFiles;
    const messageContent = messageToSend || userInput;
    if ((!messageContent.trim() && filesToProcess.length === 0) || isLoading) return;

    setIsLoading(true);
    setUserInput('');
    if (!filesOverride) {
        setSelectedFiles([]);
    }


    let filesForApi: { name: string, mimeType: string; data: string }[] = [];
    let filesForHistory: MessageFile[] = [];
    if (filesToProcess.length > 0) {
        try {
            filesForHistory = await Promise.all(filesToProcess.map(async (file) => {
                const base64Data = await fileToBase64(file);
                return {
                    mimeType: file.type,
                    data: base64Data,
                    name: file.name,
                };
            }));
            filesForApi = filesForHistory.map(file => ({...file}));
        } catch (error) {
            console.error("Error converting file to base64:", error);
            const errorMessage: Message = { role: 'model', content: "Desculpe, houve um erro ao processar seus arquivos." };
            setChatHistories(prev => {
                const newHistories = { ...prev };
                const internHistories = [...newHistories[activeInternId]];
                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                newHistories[activeInternId] = internHistories;
                return newHistories;
            });
            setIsLoading(false);
            if (!filesOverride) {
                setSelectedFiles([]);
            }
            return;
        }
    }

    const userMessage: Message = { 
      role: 'user', 
      content: messageContent,
      attachments: filesToProcess.length > 0 ? filesToProcess.map(f => ({ name: f.name })) : undefined,
      files: filesForHistory.length > 0 ? filesForHistory : undefined,
    };
    
    const updatedHistory = [...currentMessages, userMessage];

    setChatHistories(prev => {
        const newHistories = { ...prev };
        const internHistories = [...newHistories[activeInternId]];
        internHistories[activeChatIndex] = updatedHistory;
        newHistories[activeInternId] = internHistories;
        return newHistories;
    });

    if (!filesOverride) {
        setSelectedFiles([]);
    }

    // Special flow for Benedito or Magnolia with an audio file
    if ((activeIntern.id === 'benedito' || activeIntern.id === 'magnolia') && filesForApi.length > 0 && filesForApi[0].mimeType.startsWith('audio/')) {
        const transcribingMessage: Message = { role: 'model', content: 'Recebi seu áudio! Estou transcrevendo para poder te ajudar...' };
        setChatHistories(prev => {
            const newHistories = { ...prev };
            const internHistories = [...newHistories[activeInternId]];
            internHistories[activeChatIndex] = [...internHistories[activeChatIndex], transcribingMessage];
            newHistories[activeInternId] = internHistories;
            return newHistories;
        });
        
        const transcription = await transcribeAudio(filesForApi[0]);

        if (transcription.startsWith("Desculpe,")) {
            const errorMessage: Message = { role: 'model', content: transcription };
                setChatHistories(prev => {
                const newHistories = { ...prev };
                const internHistories = [...newHistories[activeInternId]];
                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                newHistories[activeInternId] = internHistories;
                return newHistories;
            });
            setIsLoading(false);
            return;
        }
        
        const combinedPrompt = messageContent 
            ? `${messageContent}\n\n**Transcrição do Áudio:**\n${transcription}`
            : `Use a seguinte transcrição para gerar o briefing:\n\n${transcription}`;

        const briefingResponse = await sendMessageToIntern(
            activeIntern.id,
            activeIntern.systemInstruction,
            combinedPrompt,
            updatedHistory, // History includes the original message with the audio file for context
            [] // No new files for this final step
        );
        
        const briefingMessage = parseFinalResponse(activeIntern.id, briefingResponse, userMessage);

        setChatHistories(prev => {
            const newHistories = { ...prev };
            const internHistories = [...newHistories[activeInternId]];
            // Add the final briefing after the "transcribing" message.
            internHistories[activeChatIndex] = [...internHistories[activeChatIndex], briefingMessage];
            newHistories[activeInternId] = internHistories;
            return newHistories;
        });

        setIsLoading(false);
        return;
    }


    const responseContent = await sendMessageToIntern(
        activeIntern.id, 
        activeIntern.systemInstruction, 
        messageContent,
        currentMessages, // Pass history *before* new user message
        filesForApi.map(({name, ...rest}) => rest)
    );
    
    // Handle multi-step action flows that require further API calls
    if (activeIntern.id === 'rogerio' || activeIntern.id === 'mauricia') {
        let jsonString = responseContent.trim();
        const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
        if (match && match[1]) { jsonString = match[1]; }

        try {
            const parsed = JSON.parse(jsonString);

            // ROGÉRIO ACTIONS
            if (activeIntern.id === 'rogerio') {
                if (parsed.action === 'generate_sora_prompt') {
                    const soraMessage: Message = {
                        role: 'model',
                        content: parsed.response_to_user,
                        soraPrompt: { pt: parsed.prompt_pt, en: parsed.prompt_en }
                    };
                    setChatHistories(prev => {
                        const newHistories = { ...prev };
                        const internHistories = [...newHistories[activeInternId]];
                        internHistories[activeChatIndex] = [...internHistories[activeChatIndex], soraMessage];
                        newHistories[activeInternId] = internHistories;
                        return newHistories;
                    });
                    setIsLoading(false);
                    return;
                }
                
                if (parsed.action === 'generate_image') {
                    const confirmationMessage: Message = { role: 'model', content: parsed.response_to_user };
                    setChatHistories(prev => {
                        const newHistories = { ...prev };
                        const internHistories = [...newHistories[activeInternId]];
                        internHistories[activeChatIndex] = [...internHistories[activeChatIndex], confirmationMessage];
                        return { ...newHistories, [activeInternId]: internHistories };
                    });

                    try {
                        const imageResult = await generateImageWithImagen(parsed.prompt);
                        if (imageResult) {
                            const imageMessage: Message = {
                                role: 'model',
                                content: 'Seu moodboard tá na mão! O que achou? 😎\n\nSe quiser sugestões de materiais reais pra usar baseado nesse moodboard, manda a imagem pra Maurícia.',
                                imageUrl: `data:${imageResult.mimeType};base64,${imageResult.base64}`
                            };
                            setChatHistories(prev => {
                                const newHistories = { ...prev };
                                const internHistories = [...newHistories[activeInternId]];
                                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], imageMessage];
                                return { ...newHistories, [activeInternId]: internHistories };
                            });
                        } else {
                            throw new Error("Não foi possível obter a imagem gerada da resposta da API.");
                        }
                    } catch (error) {
                        console.error("Error generating image:", error);
                        const errorMessage: Message = { role: 'model', content: 'Eita, deu ruim aqui na hora de gerar o moodboard. Tenta de novo, talvez com um prompt diferente?' };
                        setChatHistories(prev => {
                            const newHistories = { ...prev };
                            const internHistories = [...newHistories[activeInternId]];
                            internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                            return { ...newHistories, [activeInternId]: internHistories };
                        });
                    }
                    setIsLoading(false);
                    return;
                }
                
                if (parsed.action === 'edit_image') {
                    const confirmationMessage: Message = { role: 'model', content: parsed.response_to_user };
                    setChatHistories(prev => {
                        const newHistories = { ...prev };
                        const internHistories = [...newHistories[activeInternId]];
                        internHistories[activeChatIndex] = [...internHistories[activeChatIndex], confirmationMessage];
                        return { ...newHistories, [activeInternId]: internHistories };
                    });

                    try {
                        let imageToEditPayload: {mimeType: string, data: string}[] = filesForApi.map(({name, ...rest}) => rest);
                        if (imageToEditPayload.length === 0) {
                            const lastUserMessageWithImage = [...updatedHistory].reverse().find(m => m.role === 'user' && m.files && m.files.length > 0);
                            if (lastUserMessageWithImage?.files) {
                                imageToEditPayload = lastUserMessageWithImage.files.map(({ name, ...rest }) => rest);
                            }
                        }

                        if (imageToEditPayload.length === 0) throw new Error("Nenhum arquivo encontrado para editar a imagem.");
                        
                        const finalPrompt = parsed.prompt.replace('[PROMPT DO USUÁRIO AQUI]', messageContent);

                        const imageResult = await editImageWithNanoBanana(finalPrompt, imageToEditPayload);

                        if (imageResult) {
                            const imageMessage: Message = {
                                role: 'model',
                                content: 'Prontinho! ✨ Aqui está sua imagem editada:',
                                imageUrl: `data:${imageResult.mimeType};base64,${imageResult.base64}`
                            };
                            setChatHistories(prev => {
                                const newHistories = { ...prev };
                                const internHistories = [...newHistories[activeInternId]];
                                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], imageMessage];
                                return { ...newHistories, [activeInternId]: internHistories };
                            });
                        } else { throw new Error("Não foi possível obter a imagem editada da resposta da API."); }
                    } catch (error) {
                        console.error("Error editing image:", error);
                        const errorMessage: Message = { role: 'model', content: 'Ops, algo deu errado ao editar a imagem. Tente novamente.' };
                         setChatHistories(prev => {
                            const newHistories = { ...prev };
                            const internHistories = [...newHistories[activeInternId]];
                            internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                            return { ...newHistories, [activeInternId]: internHistories };
                        });
                    }
                    setIsLoading(false);
                    return;
                }
            }

            // MAURÍCIA ACTIONS
            if (activeIntern.id === 'mauricia') {
                if (parsed.action === 'generate_texture_from_text') {
                    const userFriendlyPrompt = parsed.response_to_user.replace('[PROMPT DO USUÁRIO AQUI]', messageContent);
                    const confirmationMessage: Message = { role: 'model', content: userFriendlyPrompt };
                    setChatHistories(prev => {
                        const newHistories = { ...prev };
                        const internHistories = [...newHistories[activeInternId]];
                        internHistories[activeChatIndex] = [...internHistories[activeChatIndex], confirmationMessage];
                        return { ...newHistories, [activeInternId]: internHistories };
                    });

                    try {
                        const finalPrompt = parsed.prompt.replace('[PROMPT DO USUÁRIO AQUI]', messageContent);
                        const imageResult = await generateImageWithImagen(finalPrompt);

                        if (imageResult) {
                            const imageMessage: Message = {
                                role: 'model',
                                content: 'Sua textura está pronta! O que achou? Agora é só baixar e usar no seu projeto. ✨',
                                imageUrl: `data:${imageResult.mimeType};base64,${imageResult.base64}`
                            };
                            setChatHistories(prev => {
                                const newHistories = { ...prev };
                                const internHistories = [...newHistories[activeInternId]];
                                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], imageMessage];
                                return { ...newHistories, [activeInternId]: internHistories };
                            });
                        } else {
                            throw new Error("Não foi possível obter a imagem gerada da resposta da API.");
                        }
                    } catch (error) {
                        console.error("Error generating texture:", error);
                        const errorMessage: Message = { role: 'model', content: 'Ops, algo deu errado ao criar a textura. Tente novamente.' };
                        setChatHistories(prev => {
                            const newHistories = { ...prev };
                            const internHistories = [...newHistories[activeInternId]];
                            internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                            return { ...newHistories, [activeInternId]: internHistories };
                        });
                    }
                    setIsLoading(false);
                    return;
                }

                if (parsed.action === 'create_seamless_texture_from_image') {
                    const confirmationMessage: Message = { role: 'model', content: parsed.response_to_user };
                    setChatHistories(prev => {
                        const newHistories = { ...prev };
                        const internHistories = [...newHistories[activeInternId]];
                        internHistories[activeChatIndex] = [...internHistories[activeChatIndex], confirmationMessage];
                        return { ...newHistories, [activeInternId]: internHistories };
                    });
                    
                    try {
                        let imageToEditPayload: {mimeType: string, data: string}[] = filesForApi.map(({name, ...rest}) => rest);
                        if (imageToEditPayload.length === 0) {
                             const lastUserMessageWithImage = [...updatedHistory].reverse().find(m => m.role === 'user' && m.files && m.files.length > 0);
                             if (lastUserMessageWithImage?.files) {
                                imageToEditPayload = lastUserMessageWithImage.files.map(({ name, ...rest }) => rest);
                             }
                        }

                        if (imageToEditPayload.length === 0) throw new Error("Nenhuma imagem encontrada para criar a textura.");
                        
                        const imageResult = await editImageWithNanoBanana(parsed.prompt, imageToEditPayload);

                        if (imageResult) {
                            const imageMessage: Message = {
                                role: 'model',
                                content: 'Prontinho! ✨ Aqui está sua textura seamless:',
                                imageUrl: `data:${imageResult.mimeType};base64,${imageResult.base64}`
                            };
                            setChatHistories(prev => {
                                const newHistories = { ...prev };
                                const internHistories = [...newHistories[activeInternId]];
                                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], imageMessage];
                                return { ...newHistories, [activeInternId]: internHistories };
                            });
                        } else { throw new Error("Não foi possível obter a textura da resposta da API."); }

                    } catch(error) {
                        console.error("Error creating seamless texture:", error);
                        const errorMessage: Message = { role: 'model', content: 'Ops, algo deu errado ao criar a textura. Tente novamente.' };
                         setChatHistories(prev => {
                            const newHistories = { ...prev };
                            const internHistories = [...newHistories[activeInternId]];
                            internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                            return { ...newHistories, [activeInternId]: internHistories };
                        });
                    }

                    setIsLoading(false);
                    return;
                }
            }
        } catch (e) {
            // Not a JSON for an action, fall through to final response parsing below.
        }
    }

    // Handle all final responses (including text, structured data, and fallbacks from action flows)
    const modelMessage = parseFinalResponse(activeIntern.id, responseContent, userMessage);
    
    setChatHistories(prev => {
      const newHistories = { ...prev };
      const internHistories = [...newHistories[activeInternId]];
      internHistories[activeChatIndex] = [...internHistories[activeChatIndex], modelMessage];
      newHistories[activeInternId] = internHistories;
      return newHistories;
    });

    setIsLoading(false);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "gravacao.webm", { type: "audio/webm" });
                handleSendMessage("Analise este áudio gravado.", [audioFile]);
                stream.getTracks().forEach(track => track.stop()); // Clean up resources
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            const errorMessage: Message = { role: 'model', content: "Não consegui acessar o microfone. Verifique as permissões do seu navegador e tente novamente." };
            setChatHistories(prev => {
                const newHistories = { ...prev };
                const internHistories = [...newHistories[activeInternId]];
                internHistories[activeChatIndex] = [...internHistories[activeChatIndex], errorMessage];
                newHistories[activeInternId] = internHistories;
                return newHistories;
            });
        }
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white/50 backdrop-blur-sm">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
            <div className="w-16 h-16 text-brand-details mx-auto">
              <LoadingIcon />
            </div>
            <p className="mt-4 text-brand-text-primary font-semibold">Verificando sua sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col h-screen">
       <header className="pt-4 pb-2 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-end items-center">
            <img src="https://i.imgur.com/HqOiRCv.png" alt="Logo Arq.nb" className="h-20" />
          </div>
      </header>
      <div className="flex-1 px-4 sm:px-6 lg:px-8 flex justify-center overflow-y-auto pb-4">
        <div className="flex flex-row gap-4 h-full w-full max-w-7xl mx-auto">
          <aside className="w-full max-w-sm flex flex-col bg-white p-4 md:p-6 text-brand-text-primary rounded-3xl shadow-lg border border-gray-300/20 overflow-hidden">
            <InternList
              interns={INTERNS}
              activeInternId={activeIntern.id}
              onSelectIntern={handleSelectIntern}
              user={user}
              onSignOut={handleSignOut}
            />
          </aside>
          <main className="flex-1 flex flex-col bg-white/60 backdrop-blur-md rounded-3xl shadow-lg border border-gray-300/20 overflow-hidden">
            <ChatWindow
              intern={activeIntern}
              messages={currentMessages}
              sessions={currentChatSession}
              activeChatIndex={activeChatIndex}
              onNewChat={handleNewChat}
              onSelectChat={handleSelectChat}
              userInput={userInput}
              onUserInput={setUserInput}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              selectedFiles={selectedFiles}
              onFileSelect={handleFileAdd}
              onClearFile={handleClearFile}
              isRecording={isRecording}
              onToggleRecording={handleToggleRecording}
            />
          </main>
        </div>
      </div>
       <footer className="py-2 text-center text-xs text-gray-500">
        arqIA Studio powered by @arqnb
      </footer>
    </div>
  );
};

export default App;