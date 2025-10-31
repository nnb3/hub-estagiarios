import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { BriefingData } from '../types';
import { DownloadIcon, LoadingIcon } from './Icons';

interface BriefingViewerProps {
  briefing: BriefingData;
}

// Helper para formatar o conteúdo de uma seção (texto, negrito, listas) para HTML
const formatSectionContentForHTML = (content: string) => {
    let html = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negrito
        .replace(/^\s*\*\s(.*)/gm, '<li>$1</li>') // Itens de lista
        .replace(/^\s*\(\s\)\s(.*)/gm, '<li class="checkbox-item">$1</li>') // Itens de checklist
        .replace(/\n/g, '<br />'); // Novas linhas

    // Agrupa <li> em <ul>
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>').replace(/<\/ul><br \/><ul>/g, '');
    html = html.replace(/(<li class="checkbox-item">.*?<\/li>)/gs, '<ul class="checklist">$1</ul>').replace(/<\/ul><br \/><ul>/g, '');
    
    return { __html: html };
}

const BriefingPDFLayout: React.FC<{ briefing: BriefingData }> = ({ briefing }) => {
    const logoUrl = "https://i.imgur.com/9fenf7i.png";
    const today = new Date().toLocaleDateString('pt-BR');

    const formatContentForPDF = (text: string) => {
        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const lines = formattedText.split('\n').filter(line => line.trim() !== '');

        const elements = lines.map((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('* ')) {
                return `<li style="margin-left: 20px; padding-left: 5px; margin-bottom: 8px;">${trimmedLine.substring(2)}</li>`;
            }
             if (trimmedLine.startsWith('( ) ')) {
                return `<li style="margin-left: 0px; padding-left: 5px; margin-bottom: 8px; list-style-type: none;">☐ ${trimmedLine.substring(4)}</li>`;
            }
            return `<p style="margin-bottom: 12px;">${trimmedLine}</p>`;
        }).join('');
        
        return { __html: elements.replace(/<\/li><li/g, '</li><li').replace(/(<li.*<\/li>)/gs, '<ul style="padding-left: 20px;">$1</ul>').replace(/<\/ul><ul>/g, '') };
    };

    return (
        <div style={{ width: '800px', padding: '40px', backgroundColor: 'white', color: '#374151', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
                <img src={logoUrl} alt="Logo" style={{ width: '100px' }} crossOrigin="anonymous" />
                <div>
                    <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', margin: 0, textAlign: 'right', color: '#111827' }}>{briefing.title}</h1>
                    <p style={{ margin: '4px 0 0', textAlign: 'right', fontSize: '14px', color: '#6B7280' }}>Data: {today}</p>
                </div>
            </header>

            <main style={{ marginTop: '20px', fontSize: '14px', lineHeight: '1.7' }}>
                {briefing.sections.map((section, index) => (
                    <div key={index}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', color: '#1f2937' }}>{section.title}</h3>
                        <div dangerouslySetInnerHTML={formatContentForPDF(section.content)}></div>
                    </div>
                ))}
            </main>
        </div>
    );
};


export const BriefingViewer: React.FC<BriefingViewerProps> = ({ briefing }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (isGenerating || !pdfRef.current) return;
        setIsGenerating(true);

        try {
            const sourceElement = pdfRef.current;
            const canvas = await html2canvas(sourceElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            const imgFinalWidth = pdfWidth;
            const imgFinalHeight = imgFinalWidth / ratio;
            
            let heightLeft = imgFinalHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgFinalWidth, imgFinalHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgFinalWidth, imgFinalHeight);
                heightLeft -= pdfHeight;
            }
            
            const fileName = briefing.title.toLowerCase().replace(/\s+/g, '-') + '.pdf';
            pdf.save(fileName);
        } catch (error) {
            console.error("Erro ao gerar PDF do briefing:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full max-w-3xl bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h2 className="font-playfair text-2xl font-black text-gray-800 mb-4">{briefing.title}</h2>
            
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {briefing.sections.map((section, index) => (
                    <div key={index} className="mb-4 last:mb-0">
                        <h3 className="font-playfair font-bold text-lg text-brand-text-primary border-b border-gray-200 pb-2 mb-3">{section.title}</h3>
                        <div 
                             className="prose prose-sm max-w-none text-gray-700 leading-relaxed 
                                        prose-strong:text-brand-text-primary 
                                        prose-ul:list-disc prose-ul:pl-5 
                                        [&_.checklist]:list-none [&_.checklist]:p-0 
                                        [&_.checkbox-item]:flex [&_.checkbox-item]:items-center 
                                        before:[&_.checkbox-item]:content-['☐'] before:[&_.checkbox-item]:mr-2 before:[&_.checkbox-item]:text-lg"
                            dangerouslySetInnerHTML={formatSectionContentForHTML(section.content)}
                        />
                    </div>
                ))}
            </div>


            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-details hover:opacity-90 rounded text-black font-semibold transition-opacity disabled:opacity-50 disabled:cursor-wait"
                >
                    {isGenerating ? <LoadingIcon /> : <DownloadIcon />}
                    {isGenerating ? 'Gerando PDF...' : 'Baixar .pdf'}
                </button>
            </div>
            
            {/* Componente fora da tela para geração do PDF */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                <div ref={pdfRef}>
                    <BriefingPDFLayout briefing={briefing} />
                </div>
            </div>
        </div>
    );
};