import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ExecutiveReviewData } from '../types';
import { DownloadIcon, LoadingIcon } from './Icons';

interface ExecutiveReviewViewerProps {
  review: ExecutiveReviewData;
}

const StatusIcon: React.FC<{ status: 'approved' | 'pending' | 'error'; checked?: boolean; forPdf?: boolean }> = ({ status, checked, forPdf }) => {
  const statusConfig = {
    approved: { icon: '✅', color: '#22c55e', text: 'Aprovado' },
    pending: { icon: '⚠️', color: '#f59e0b', text: 'Pendência' },
    error: { icon: '❌', color: '#ef4444', text: 'Erro' },
  };
  const config = statusConfig[status];

  return (
    <span style={{ 
        color: forPdf ? config.color : undefined, 
        textDecoration: checked ? 'line-through' : 'none' 
    }}
    className={!forPdf ? `text-lg mr-2 ${checked ? 'opacity-50' : ''}` : ''}
    >
      {config.icon}
    </span>
  );
};

const ExecutiveReviewPDFLayout: React.FC<{ review: ExecutiveReviewData; checkedItems: Record<string, boolean> }> = ({ review, checkedItems }) => {
    const logoUrl = "https://i.imgur.com/9fenf7i.png";

    return (
        <div style={{ width: '800px', padding: '40px', backgroundColor: 'white', color: '#374151', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
                <img src={logoUrl} alt="Logo" style={{ width: '100px' }} crossOrigin="anonymous" />
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', margin: 0, color: '#111827' }}>Relatório de Revisão de Projeto Executivo</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}><strong>Projeto:</strong> {review.project}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}><strong>Arquivo:</strong> {review.file}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}><strong>Data:</strong> {review.date}</p>
                </div>
            </header>

            <main style={{ marginTop: '20px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 15px 0', color: '#1f2937' }}>Sumário Executivo</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                         <div style={{ fontSize: '12px' }}><strong style={{ display: 'block', color: '#4b5563' }}>Status Geral</strong> {review.summary.status}</div>
                         <div style={{ fontSize: '12px', color: '#22c55e' }}><strong style={{ display: 'block', color: '#4b5563' }}>✅ Aprovados</strong> {review.summary.approved}</div>
                         <div style={{ fontSize: '12px', color: '#f59e0b' }}><strong style={{ display: 'block', color: '#4b5563' }}>⚠️ Pendências</strong> {review.summary.pending}</div>
                         <div style={{ fontSize: '12px', color: '#ef4444' }}><strong style={{ display: 'block', color: '#4b5563' }}>❌ Erros</strong> {review.summary.error}</div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#4b5563' }}>Principais Riscos:</h3>
                        <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '12px' }}>
                            {review.summary.topRisks.map((risk, i) => <li key={i}>{risk}</li>)}
                        </ul>
                    </div>
                     <div style={{ marginTop: '10px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0', color: '#4b5563' }}>Plano de Ação:</h3>
                        <p style={{ margin: 0, fontSize: '12px' }}>{review.summary.actionPlan}</p>
                    </div>
                </div>

                <div style={{ marginTop: '25px' }}>
                    {review.sections.map((section, index) => (
                        <div key={index} style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', color: '#1f2937' }}>{section.title}</h3>
                            {section.items.map(item => {
                                const isChecked = checkedItems[item.id] || false;
                                return (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '12px' }}>
                                        <input type="checkbox" checked={isChecked} readOnly style={{ marginTop: '3px' }}/>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <StatusIcon status={item.status} checked={isChecked} forPdf />
                                                <span style={{ fontWeight: '500', textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? '#9ca3af' : '#1f2937' }}>{item.description}</span>
                                            </div>
                                            <p style={{ margin: '4px 0 0', fontSize: '11px', textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? '#9ca3af' : '#6B7280' }}>{item.details}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};


export const ExecutiveReviewViewer: React.FC<ExecutiveReviewViewerProps> = ({ review }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const pdfRef = useRef<HTMLDivElement>(null);

    const handleCheck = (itemId: string) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

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

            pdf.save(`revisao-${review.file}.pdf`);
        } catch (error) {
            console.error("Erro ao gerar PDF da revisão:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <header className="mb-4">
                <h2 className="font-playfair text-2xl font-black text-gray-800">Relatório de Revisão de Projeto</h2>
                <div className="text-xs text-gray-500 flex items-center gap-4 mt-1">
                    <span><strong>Projeto:</strong> {review.project}</span>
                    <span><strong>Arquivo:</strong> {review.file}</span>
                    <span><strong>Data:</strong> {review.date}</span>
                </div>
            </header>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h3 className="font-bold text-gray-700 text-sm mb-3">Sumário Executivo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-4">
                    <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-500">Status Geral</p><p className="font-bold text-sm">{review.summary.status}</p></div>
                    <div className="bg-white p-2 rounded border text-green-600"><p className="text-xs text-gray-500">✅ Aprovados</p><p className="font-bold text-sm">{review.summary.approved}</p></div>
                    <div className="bg-white p-2 rounded border text-amber-600"><p className="text-xs text-gray-500">⚠️ Pendências</p><p className="font-bold text-sm">{review.summary.pending}</p></div>
                    <div className="bg-white p-2 rounded border text-red-600"><p className="text-xs text-gray-500">❌ Erros</p><p className="font-bold text-sm">{review.summary.error}</p></div>
                </div>
                <div>
                     <h4 className="font-semibold text-xs text-gray-600 mb-1">Principais Riscos:</h4>
                    <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                        {review.summary.topRisks.map((risk, i) => <li key={i}>{risk}</li>)}
                    </ul>
                </div>
                 <div className="mt-3">
                     <h4 className="font-semibold text-xs text-gray-600 mb-1">Plano de Ação:</h4>
                    <p className="text-xs text-gray-600">{review.summary.actionPlan}</p>
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto pr-2">
                {review.sections.map((section, index) => (
                    <div key={index} className="mb-4">
                        <h3 className="font-bold text-brand-text-primary border-b border-gray-200 pb-2 mb-2">{section.title}</h3>
                        <div>
                            {section.items.map(item => {
                                const isChecked = checkedItems[item.id] || false;
                                return (
                                    <div key={item.id} className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
                                        <input
                                            type="checkbox"
                                            id={item.id}
                                            checked={isChecked}
                                            onChange={() => handleCheck(item.id)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-details focus:ring-brand-details cursor-pointer"
                                        />
                                        <label htmlFor={item.id} className="flex-1 cursor-pointer">
                                            <div className="flex items-center">
                                                <StatusIcon status={item.status} checked={isChecked} />
                                                <span className={`font-medium text-sm ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.description}</span>
                                            </div>
                                            <p className={`text-xs mt-1 pl-7 ${isChecked ? 'line-through text-gray-400' : 'text-gray-500'}`}>{item.details}</p>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-end">
                 <button 
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-details hover:opacity-90 rounded text-black font-semibold transition-opacity disabled:opacity-50 disabled:cursor-wait"
                >
                    {isGenerating ? <LoadingIcon /> : <DownloadIcon />}
                    {isGenerating ? 'Gerando PDF...' : 'Baixar Relatório .pdf'}
                </button>
            </div>
            
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                <div ref={pdfRef}>
                    <ExecutiveReviewPDFLayout review={review} checkedItems={checkedItems} />
                </div>
            </div>
        </div>
    );
};