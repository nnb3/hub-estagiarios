import React from 'react';
import type { Page } from '../types';

interface HeaderProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage }) => {
  // Lista de links de navegação
  const navLinks: { page: Page; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'quem-sou', label: 'Quem Sou' },
    { page: 'projetos', label: 'Projetos' },
    { page: 'contato', label: 'Contato' },
    { page: 'consultoria', label: 'Consultoria' },
  ];

  return (
    // Estrutura do cabeçalho com Tailwind CSS
    <header className="grid grid-cols-12 shadow-md z-20 bg-white">
      {/* Seção da Logo */}
      <div className="col-span-12 md:col-span-4 lg:col-span-3 flex items-center p-6">
        <img
          src="https://i.imgur.com/9fenf7i.png"
          alt="Logo Arq.nb"
          className="w-16 h-auto cursor-pointer"
          onClick={() => setCurrentPage('home')}
        />
      </div>

      {/* Seção da Navegação */}
      <nav className="col-span-12 md:col-span-8 lg:col-span-9 hidden md:flex items-center justify-end text-xs uppercase tracking-widest">
        {navLinks.map(({ page, label }) => (
          <a
            key={page}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setCurrentPage(page);
            }}
            // Lógica para destacar o link da página ativa
            className={`px-5 py-8 h-full flex items-center transition-colors ${
              currentPage === page ? 'text-brand-details' : 'hover:text-brand-details'
            }`}
          >
            {label}
          </a>
        ))}
        {/* Exemplo de um botão com destaque */}
        <div className="bg-brand-details h-full">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-8 text-black hover:bg-opacity-80 h-full flex items-center transition-colors"
          >
            Entre em Contato
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Header;