import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { SendIcon, LoadingIcon, PaperclipIcon, PlusIcon, MicrophoneIcon, StopIcon } from './Icons';
import type { Intern, Message } from '../types';

interface ChatWindowProps {
  intern: Intern;
  messages: Message[];
  sessions: Message[][];
  activeChatIndex: number;
  onNewChat: () => void;
  onSelectChat: (index: number) => void;
  userInput: string;
  onUserInput: (input: string) => void;
  onSendMessage: (message?: string, files?: File[]) => void;
  isLoading: boolean;
  selectedFiles: File[];
  onFileSelect: (files: File[]) => void;
  onClearFile: (fileToRemove: File) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  intern,
  messages,
  sessions,
  activeChatIndex,
  onNewChat,
  onSelectChat,
  userInput,
  onUserInput,
  onSendMessage,
  isLoading,
  selectedFiles,
  onFileSelect,
  onClearFile,
  isRecording,
  onToggleRecording,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  
  useEffect(() => {
    // Scroll active tab into view
    const activeTab = tabsContainerRef.current?.querySelector(`[data-active='true']`) as HTMLElement;
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeChatIndex]);


  useEffect(() => {
    // Reseta o input de arquivo quando os arquivos selecionados são limpos pelo componente pai.
    // Isso garante que o evento `onChange` dispare novamente para futuros uploads.
    if (selectedFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFiles]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      onSendMessage();
    }
  };
  
  const handleQuickReplyClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(Array.from(e.target.files));
    }
  };
  
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const getAcceptableFileTypes = (internId: string): string => {
    switch(internId) {
        case 'divina':
        case 'leonor':
            return 'application/pdf';
        case 'rogerio':
        case 'mauricia':
            return 'image/*';
        case 'benedito':
            return 'audio/*, application/pdf';
        case 'magnolia':
            return 'audio/*';
        default:
            // For Agnaldo
            return '*/*';
    }
  };

  const persistentQuickReplies = ['magnolia', 'antonio'].includes(intern.id)
    ? messages.find(msg => msg.role === 'model' && Array.isArray(msg.quickReplies) && msg.quickReplies.length > 0)?.quickReplies
    : undefined;
    
  const canAttachFile = ['divina', 'leonor', 'rogerio', 'benedito', 'agnaldo', 'magnolia', 'mauricia'].includes(intern.id);

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 border-b border-black/10">
        <div className="flex items-center gap-5">
            {intern.imageUrl && (
                <img
                    src={intern.imageUrl}
                    alt={`Foto de ${intern.name}`}
                    className="w-20 h-28 rounded-2xl object-cover flex-shrink-0 border-4 border-white shadow-lg"
                />
            )}
            <div>
                <h1 className="text-4xl font-black font-playfair text-black">{intern.name}</h1>
                <p className="text-sm text-brand-text-primary mt-1 font-inter">{intern.description}</p>
            </div>
        </div>
         <div className="mt-4 flex items-center border-b border-gray-200">
          <div ref={tabsContainerRef} className="flex-grow flex items-center gap-2 overflow-x-auto pb-px">
            {sessions.map((_, index) => (
              <button
                key={index}
                onClick={() => onSelectChat(index)}
                data-active={index === activeChatIndex}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  index === activeChatIndex
                    ? 'border-brand-details text-brand-text-primary'
                    : 'border-transparent text-brand-text-secondary hover:border-gray-300 hover:text-brand-text-primary'
                }`}
              >
                Chat {index + 1}
              </button>
            ))}
          </div>
          <button onClick={onNewChat} className="ml-2 p-2 rounded-md hover:bg-gray-100 transition-colors" aria-label="Nova conversa">
            <PlusIcon />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && <ChatMessage message={{role: 'model', content: ''}} isLoading={true} />}
        <div ref={messagesEndRef} />
      </div>

      {persistentQuickReplies && (
        <div className="p-4 border-t border-black/10 flex flex-wrap gap-2">
          {persistentQuickReplies.map((reply) => (
            <button key={reply.label} onClick={() => handleQuickReplyClick(reply.prompt)} className="px-3 py-1.5 text-sm bg-white/70 rounded-md hover:bg-white transition-colors text-brand-text-primary">
              {reply.label}
            </button>
          ))}
        </div>
      )}
      
      <div className="p-4 border-t border-black/10">
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-200 rounded-full pl-3 pr-2 py-1 text-sm">
                <span className="truncate max-w-xs">{file.name}</span>
                <button onClick={() => onClearFile(file)} className="text-gray-500 hover:text-gray-800 flex-shrink-0">
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          {canAttachFile && (
            <button 
              onClick={handleAttachClick} 
              className="text-gray-400 hover:text-brand-details p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              aria-label="Anexar arquivo"
              disabled={isRecording || isLoading}
            >
              <PaperclipIcon />
            </button>
          )}
          <input
            type="text"
            value={userInput}
            onChange={(e) => onUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
                isRecording ? "Gravando... clique no botão para parar"
                : isLoading ? "Aguarde..."
                : `Converse com ${intern.name.split(' ')[0]}...`
            }
            className="flex-1 bg-gray-100 border-none px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-details"
            disabled={isLoading || isRecording}
            aria-label="Caixa de mensagem"
          />
          {['benedito', 'magnolia'].includes(intern.id) && (
             <button
                onClick={onToggleRecording}
                disabled={isLoading}
                className={`p-3 rounded-lg transition-all duration-300 flex-shrink-0 ${
                    isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação de áudio'}
            >
                {isRecording ? <StopIcon /> : <MicrophoneIcon />}
            </button>
          )}
          <button
            onClick={() => onSendMessage()}
            disabled={isLoading || isRecording || (!userInput.trim() && selectedFiles.length === 0)}
            className="bg-brand-details text-black rounded-lg p-3 disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
            aria-label="Enviar mensagem"
          >
            {isLoading ? <LoadingIcon /> : <SendIcon />}
          </button>
        </div>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple={intern.id === 'rogerio'}
            accept={getAcceptableFileTypes(intern.id)}
            aria-hidden="true"
        />
      </div>
    </div>
  );
};