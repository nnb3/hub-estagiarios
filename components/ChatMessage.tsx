import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PresentationViewer } from './PresentationViewer';
import { QuotationViewer } from './QuotationViewer';
import { BriefingViewer } from './BriefingViewer';
import { ExecutiveReviewViewer } from './ExecutiveReviewViewer';
import type { Message } from '../types';
import { ClipboardIcon, DownloadIcon } from './Icons';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

const SoraPromptDisplay: React.FC<{ prompt: string; language: string }> = ({ prompt, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <h4 className="font-semibold text-sm text-brand-text-primary">Prompt em {language}</h4>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                    <ClipboardIcon />
                    {copied ? 'Copiado!' : 'Copiar'}
                </button>
            </div>
            <p className="text-xs p-2 bg-gray-100 rounded font-mono">{prompt}</p>
        </div>
    );
};


export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const isModel = message.role === 'model';

  if (isLoading) {
    return (
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 bg-white px-4 py-3 rounded-md rounded-bl-none max-w-xl">
          <div className="w-2 h-2 bg-brand-details rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-brand-details rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-brand-details rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  const messageClasses = isModel
    ? 'bg-white text-brand-text-primary rounded-bl-none'
    : 'bg-brand-details text-black rounded-br-none';

  const containerClasses = isModel ? 'justify-start' : 'justify-end';
  
  return (
    <div className={`flex ${containerClasses}`}>
        {message.executiveReview ? (
            <div className="w-full max-w-3xl">
                 {message.content && <p className="text-sm text-brand-text-secondary mb-2">{message.content}</p>}
                <ExecutiveReviewViewer review={message.executiveReview} />
            </div>
        ) : message.briefing ? (
             <div className="w-full max-w-2xl">
                {message.content && <p className="text-sm text-brand-text-secondary mb-2">{message.content}</p>}
                <BriefingViewer briefing={message.briefing} />
            </div>
        ) : message.presentation ? (
            <div className="w-full max-w-2xl">
                {message.content && <p className="text-sm text-brand-text-secondary mb-2">{message.content}</p>}
                <PresentationViewer presentation={message.presentation} />
            </div>
        ) : message.quotation ? (
            <div className="w-full max-w-2xl">
                <QuotationViewer quotation={message.quotation} />
            </div>
        ) : (
            <div className={`px-4 py-3 rounded-md max-w-xl shadow-sm ${messageClasses}`}>
                {message.content && (
                    <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className={isModel ? 'text-brand-details underline' : 'text-gray-800 underline'} />
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
                
                {message.soraPrompt && (
                    <div className="space-y-3 mt-4 pt-3 border-t border-gray-300">
                        <SoraPromptDisplay prompt={message.soraPrompt.pt} language="Português" />
                        <SoraPromptDisplay prompt={message.soraPrompt.en} language="Inglês" />
                    </div>
                )}

                {message.imageUrl && (
                    <div className="mt-2 rounded-md overflow-hidden border border-black border-opacity-10 relative group">
                        <img src={message.imageUrl} alt="Conteúdo gerado" className="max-w-full h-auto" />
                        <a
                            href={message.imageUrl}
                            download="imagem-gerada.png"
                            className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white px-3 py-1.5 rounded-md text-xs flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            aria-label="Baixar imagem"
                        >
                            <DownloadIcon />
                            <span>Baixar</span>
                        </a>
                    </div>
                )}

                {message.videoUrl && (
                     <div className="mt-2 rounded-md overflow-hidden border border-black border-opacity-10">
                        <video controls src={message.videoUrl} className="max-w-full h-auto">
                            Seu navegador não suporta a tag de vídeo.
                        </video>
                    </div>
                )}

                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                             <div key={index} className="p-2 bg-black bg-opacity-10 rounded-md flex items-center gap-2 border-t border-black border-opacity-20">
                                <span role="img" aria-label="Anexo">📄</span>
                                <span className="text-sm font-medium truncate">{attachment.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};