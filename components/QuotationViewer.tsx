import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { QuotationData } from '../types';
import { DownloadIcon, LoadingIcon } from './Icons';

interface QuotationViewerProps {
  quotation: QuotationData;
}

const QuotationPDFLayout: React.FC<{ quotation: QuotationData; grandTotal: number; }> = ({ quotation, grandTotal }) => {
    const logoUrl = "https://i.imgur.com/9fenf7i.png";
    const today = new Date().toLocaleDateString('pt-BR');

    return (
        <div style={{ width: '800px', padding: '40px', backgroundColor: 'white', color: '#374151', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px' }}>
                <img src={logoUrl} alt="Logo" style={{ width: '100px' }} crossOrigin="anonymous" />
                <div>
                    <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', margin: 0, textAlign: 'right', color: '#111827' }}>Lista de Materiais</h1>
                    <p style={{ margin: '4px 0 0', textAlign: 'right', fontSize: '14px', color: '#6B7280' }}>Data: {today}</p>
                </div>
            </header>

            <main style={{ marginTop: '30px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '10px', textAlign: 'left', textTransform: 'uppercase', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Produto</th>
                            <th style={{ padding: '10px', textAlign: 'left', textTransform: 'uppercase', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Qtde.</th>
                            <th style={{ padding: '10px', textAlign: 'left', textTransform: 'uppercase', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Valor Unit.</th>
                            <th style={{ padding: '10px', textAlign: 'right', textTransform: 'uppercase', color: '#4b5563', borderBottom: '1px solid #e5e7eb' }}>Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '10px', display: 'flex', alignItems: 'center' }}>
                                    <img src={item.imageUrl || 'https://via.placeholder.com/50'} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', marginRight: '10px' }} crossOrigin="anonymous"/>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{item.name}</div>
                                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{item.brand} - {item.model} ({item.size})</div>
                                        <a href={item.brandUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#C9CB5D', textDecoration: 'none' }}>Ver no site</a>
                                    </div>
                                </td>
                                <td style={{ padding: '10px' }}>{item.quantity}</td>
                                <td style={{ padding: '10px' }}>R$ {item.unitPrice}</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>R$ {item.totalPrice}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <footer style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#4b5563' }}>VALOR TOTAL:</span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#C9CB5D', marginLeft: '10px' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                    </span>
                </div>
                <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '5px' }}>Valores baseados em pesquisa de mercado e podem variar. Orçamento válido por 7 dias.</p>
            </footer>
        </div>
    );
};


export const QuotationViewer: React.FC<QuotationViewerProps> = ({ quotation }) => {
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
            
            pdf.save('lista-de-materiais.pdf');
        } catch (error) {
            console.error("Erro ao gerar PDF da lista de materiais:", error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Calculate totals for display
    const grandTotal = quotation.items.reduce((acc, item) => {
        const price = parseFloat(item.totalPrice.replace(/\./g, '').replace(',', '.'));
        return acc + (isNaN(price) ? 0 : price);
    }, 0);


    return (
        <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h3 className="font-playfair text-2xl font-black text-gray-800 mb-1">Lista de Materiais</h3>
            <p className="text-sm text-gray-500 mb-4">Confira abaixo o orçamento detalhado dos materiais selecionados.</p>
            
            <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">Produto</th>
                            <th scope="col" className="px-4 py-3">Qtde.</th>
                            <th scope="col" className="px-4 py-3 text-right">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items.map((item, index) => (
                            <tr key={index} className="bg-white border-b">
                                <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-3">
                                    <img src={item.imageUrl || 'https://via.placeholder.com/40'} alt={item.name} className="w-10 h-10 object-cover rounded-md" crossOrigin="anonymous"/>
                                    <div>
                                        {item.name}
                                        <span className="block text-xs text-gray-400">{item.brand} - {item.model}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-semibold">R$ {item.totalPrice}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-gray-100 rounded-lg flex justify-between items-center">
                <span className="font-bold text-gray-800">VALOR TOTAL</span>
                <span className="text-xl font-bold text-brand-details">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}
                </span>
            </div>

            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-details hover:opacity-90 rounded text-black font-semibold transition-opacity disabled:opacity-50 disabled:cursor-wait"
                >
                    {isGenerating ? <LoadingIcon /> : <DownloadIcon />}
                    {isGenerating ? 'Gerando PDF...' : 'Baixar Lista em .pdf'}
                </button>
            </div>
            
            {/* Off-screen component for PDF generation */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                <div ref={pdfRef}>
                    <QuotationPDFLayout quotation={quotation} grandTotal={grandTotal} />
                </div>
            </div>
        </div>
    );
};