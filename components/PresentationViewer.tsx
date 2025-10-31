import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { PresentationData, Slide } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, LoadingIcon } from './Icons';

interface PresentationViewerProps {
  presentation: PresentationData;
}

const SlideFrame: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <div className={`aspect-video w-full bg-white shadow-lg rounded-lg overflow-hidden flex font-inter text-brand-text-primary ${className}`}>
        {children}
    </div>
);

const SlideImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className = "w-1/2" }) => (
    <div className={`${className} h-full`}>
        <img src={src} alt={alt} className="w-full h-full object-cover" crossOrigin="anonymous" />
    </div>
);

// New, more professional image URLs
const logoUrl = "https://i.imgur.com/9fenf7i.png";
const titleBgUrl = "https://i.ibb.co/Cbfb2vB/title-bg.jpg";
const introImgUrl = "https://i.ibb.co/qDQKQx8/intro-img.jpg";
const deliverablesImgUrl = "https://i.ibb.co/3zd5vcv/deliverables-img.jpg";
const visualizationImgUrl = "https://i.ibb.co/F8C06Cg/visualization-img.jpg";
const executiveImgUrl = "https://i.ibb.co/fH11B7s/executive-img.jpg";
const investmentImgUrl = "https://i.ibb.co/z5yTfC7/investment-img.jpg";
const deadlinesImgUrl = "https://i.ibb.co/7gf7yML/deadlines-img.jpg";
const thankyouBgUrl = "https://i.ibb.co/bFNNLqg/thankyou-bg.jpg";

const AccentBar: React.FC<{className?: string}> = ({className = ''}) => <div className={`w-20 h-1 bg-brand-details my-6 ${className}`}></div>;

const StageSlide: React.FC<{ stage: string, title: string, items: string[], imageUrl: string, imageAlt: string, reverse?: boolean }> = ({ stage, title, items, imageUrl, imageAlt, reverse = false }) => (
    <SlideFrame className={`flex-col md:flex-row ${reverse ? 'md:flex-row-reverse' : ''}`}>
        <SlideImage src={imageUrl} alt={imageAlt} className="w-full md:w-2/5 h-1/2 md:h-full" />
        <div className="w-full md:w-3/5 flex flex-col p-8 md:p-14 justify-center">
            <h3 className="text-sm font-bold text-gray-400 tracking-widest">{stage}</h3>
            <h2 className="font-playfair text-4xl md:text-5xl font-black mt-2 text-gray-800">{title}</h2>
            <AccentBar />
            <ul className="text-sm list-none mt-4 space-y-3 text-gray-600">
                {items.map((item, index) => (
                    <li key={index} className="flex items-start">
                        <span className="text-brand-details font-bold mr-3 mt-1">&#10003;</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    </SlideFrame>
);

const renderSlide = (slide: Slide): React.ReactNode => {
    switch (slide.type) {
        case 'title':
            return (
                 <SlideFrame className="relative text-white flex-col justify-center items-center text-center p-8">
                    <div className="absolute inset-0 bg-black z-0">
                      <img src={titleBgUrl} alt="Fundo abstrato de arquitetura" className="w-full h-full object-cover opacity-40"/>
                    </div>
                    <div className="z-20 relative">
                         <img src={logoUrl} alt="Logo Arq.nb" className="w-24 h-auto mx-auto mb-6"/>
                         <p className="text-base tracking-[0.2em] opacity-80">PROPOSTA DE PROJETO DE ARQUITETURA</p>
                         <h1 className="font-playfair text-5xl md:text-7xl font-black mt-4">Residência L|C</h1>
                         <p className="mt-8 text-sm opacity-80">{slide.data.date}</p>
                    </div>
                </SlideFrame>
            );
        case 'introProgram':
            return (
                <SlideFrame>
                    <div className="w-3/5 flex flex-col p-14 justify-center">
                        <h2 className="font-playfair text-5xl font-black text-gray-800">Olá!</h2>
                        <AccentBar />
                        <p className="text-sm text-gray-600 max-w-md">
                            Fico muito feliz com o seu interesse em meu trabalho! Materializo sonhos e será um prazer estar presente nessa nova etapa da vida de vocês, unindo conforto, estética e funcionalidade para criar o lar que sempre desejaram.
                        </p>
                         <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="font-bold text-gray-800">O Projeto</h3>
                            <p className="text-sm text-gray-600 mt-2">Como conversamos, estamos prestes a projetar uma <strong>{slide.data.projectType}</strong> em um lote de <strong>{slide.data.area}</strong>, incluindo:</p>
                             <ul className="text-xs text-gray-500 mt-3 space-y-1.5 columns-2">
                                {slide.data.deliverables.map((item: string, index: number) => <li key={index}>- {item}</li>)}
                            </ul>
                         </div>
                    </div>
                    <SlideImage src={introImgUrl} alt="Nathalia Bernardes, arquiteta" className="w-2/5" />
                </SlideFrame>
            );
        case 'deliverables':
            return (
                <StageSlide
                    stage="ETAPA 01: PRÉ-PROJETO"
                    title="Planejamento e Estratégia"
                    items={[
                        'Levantamento técnico detalhado do local',
                        'Briefing aprofundado para captar suas necessidades e desejos',
                        'Estudo de layout funcional e otimizado',
                        'Desenvolvimento de cortes e registros técnicos iniciais'
                    ]}
                    imageUrl={deliverablesImgUrl}
                    imageAlt="Planta do projeto"
                />
            );
        case 'visualization':
            return (
                 <StageSlide
                    stage="ETAPA 02: VISUALIZAÇÃO"
                    title="Dando Vida ao Projeto"
                    items={[
                        'Criação da maquete eletrônica (3D) de todos os ambientes',
                        'Imagens renderizadas para visualização realista do resultado',
                        'Pesquisa e seleção de revestimentos, acabamentos e paleta de cores'
                    ]}
                    imageUrl={visualizationImgUrl}
                    imageAlt="Render 3D de um ambiente"
                    reverse={true}
                />
            );
        case 'executive':
            return (
                <StageSlide
                    stage="ETAPA 03: PROJETO EXECUTIVO"
                    title="O Manual da Obra"
                    items={[
                        'Detalhamento completo de marcenaria e iluminação',
                        'Plantas de revestimentos, elétrica e hidráulica',
                        'Compatibilização de todos os projetos complementares',
                        'Caderno de detalhamentos gerais para uma execução perfeita'
                    ]}
                    imageUrl={executiveImgUrl}
                    imageAlt="Detalhe construtivo do projeto"
                />
            );
        case 'investment':
             return (
                <SlideFrame>
                    <SlideImage src={investmentImgUrl} alt="Ambiente de escritório moderno" className="w-2/5" />
                    <div className="w-3/5 flex flex-col p-14 justify-center bg-gray-50">
                        <h2 className="font-playfair text-5xl font-black text-gray-800">Investimento</h2>
                         <AccentBar />
                        <p className="text-sm text-gray-600 mb-6">O valor engloba as três etapas do projeto, garantindo uma entrega completa, do conceito ao detalhamento executivo.</p>
                        <div className="my-4 bg-white p-6 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-500">Investimento total do projeto</p>
                            <p className="text-5xl font-bold text-brand-details my-1">R$ {slide.data.totalValue}</p>
                            <p className="text-sm text-gray-600">({slide.data.totalValueText})</p>
                        </div>
                         <div className="mt-auto text-sm">
                            <p className="font-bold text-gray-800">FORMA DE PAGAMENTO</p>
                            <p className="whitespace-pre-wrap text-gray-600">{slide.data.paymentMethod}</p>
                        </div>
                    </div>
                </SlideFrame>
            );
        case 'deadlines':
             return (
                <SlideFrame>
                    <div className="w-3/5 flex flex-col p-14 justify-center">
                        <h2 className="font-playfair text-5xl font-black text-gray-800">Prazos de Entrega</h2>
                        <AccentBar />
                        <div className="space-y-4 text-sm text-gray-600">
                            {slide.data.stages.map((stage: {description: string}, index: number) => (
                                <div key={index} className="flex items-start p-3 bg-gray-50 rounded-md">
                                    <div className="bg-brand-details text-gray-800 font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">{index + 1}</div>
                                    <p>{stage.description}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-8 text-sm text-center font-bold bg-gray-100 p-4 rounded-md">Prazo total estimado: <span className="text-brand-details">{slide.data.totalDays}</span>.</p>
                    </div>
                    <SlideImage src={deadlinesImgUrl} alt="Calendário e planejamento" className="w-2/5" />
                </SlideFrame>
            );
        case 'thankyou':
            return (
                <SlideFrame className="relative text-white flex-col justify-center items-center text-center p-8">
                    <div className="absolute inset-0 bg-black z-0">
                        <img src={thankyouBgUrl} alt="Textura de concreto" className="w-full h-full object-cover opacity-30"/>
                    </div>
                    <div className="z-20 relative">
                        <h2 className="font-playfair text-6xl font-black">Obrigada!</h2>
                        <AccentBar className="mx-auto" />
                        <p className="max-w-lg mx-auto">Agradeço a confiança em meu trabalho! Será um prazer materializar seus sonhos e participar dessa nova etapa.</p>
                        <div className="mt-12 border-t border-white/20 w-full max-w-sm mx-auto pt-6 text-sm text-white/80 space-y-1">
                            <p><strong>Nathalia Bernardes</strong> | Arquiteta e Urbanista</p>
                            <p>contato@arqnb.com.br | (61) 9605-5655 | @arqnb</p>
                        </div>
                    </div>
                </SlideFrame>
            );
        default:
            return <p>Tipo de slide desconhecido: {slide.type}</p>;
    }
};


export const PresentationViewer: React.FC<PresentationViewerProps> = ({ presentation }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const slidesContainerRef = useRef<HTMLDivElement>(null);

    const goToPrevious = () => {
        setCurrentSlideIndex((prevIndex) => (prevIndex === 0 ? presentation.slides.length - 1 : prevIndex - 1));
    };

    const goToNext = () => {
        setCurrentSlideIndex((prevIndex) => (prevIndex === presentation.slides.length - 1 ? 0 : prevIndex + 1));
    };

    useEffect(() => {
        if (!isGenerating) return;

        const generatePdf = async () => {
            if (!slidesContainerRef.current) {
                console.error("Referência do contêiner de slides não disponível.");
                setIsGenerating(false);
                return;
            }

            const slideElements = slidesContainerRef.current.querySelectorAll<HTMLElement>('.slide-capture-wrapper');
            if (slideElements.length === 0) {
                 console.error("Nenhum slide encontrado para captura.");
                 setIsGenerating(false);
                 return;
            }
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1920, 1080]
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < slideElements.length; i++) {
                const slideElement = slideElements[i];
                try {
                    const canvas = await html2canvas(slideElement, {
                        scale: 2, // Maior escala para melhor qualidade
                        useCORS: true, // Essencial para imagens externas
                        allowTaint: true,
                        logging: false,
                    });
                    const imgData = canvas.toDataURL('image/jpeg', 0.95); // Usar JPEG para tamanho de arquivo menor
                    if (i > 0) pdf.addPage([1920, 1080], 'landscape');
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                } catch (error) {
                    console.error(`Erro ao capturar slide ${i}:`, error);
                }
            }

            pdf.save('apresentacao.pdf');
            setIsGenerating(false);
        };
        
        const timer = setTimeout(generatePdf, 100);
        return () => clearTimeout(timer);

    }, [isGenerating, presentation.slides]);
    
    const handleDownloadPdf = () => {
        if (isGenerating) return;
        setIsGenerating(true);
    };

    const currentSlide = presentation.slides[currentSlideIndex];

    return (
        <div className="w-full">
            {renderSlide(currentSlide)}

            {isGenerating && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                    <div ref={slidesContainerRef} style={{ width: '1280px' }}>
                        {presentation.slides.map((slide, index) => (
                            <div key={index} className="slide-capture-wrapper" style={{ width: '1280px', height: '720px' }}>
                                {renderSlide(slide)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex items-center justify-between mt-2 px-2">
                 <div className="flex items-center gap-2">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-brand-details hover:opacity-90 rounded text-black transition-opacity disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isGenerating ? <LoadingIcon /> : <DownloadIcon />}
                        {isGenerating ? 'Gerando PDF...' : 'Baixar .pdf'}
                    </button>
                 </div>
                <div className="flex items-center gap-4">
                    <button onClick={goToPrevious} aria-label="Slide anterior" className="p-1 rounded-full hover:bg-gray-200" disabled={isGenerating}>
                        <ChevronLeftIcon />
                    </button>
                    <span className="text-sm font-medium text-brand-text-secondary">
                        {currentSlideIndex + 1} / {presentation.slides.length}
                    </span>
                    <button onClick={goToNext} aria-label="Próximo slide" className="p-1 rounded-full hover:bg-gray-200" disabled={isGenerating}>
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};