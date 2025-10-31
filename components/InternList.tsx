import React from 'react';
import type { Intern } from '../types';
import type { User } from '../services/firebaseService';

interface InternListProps {
  interns: Intern[];
  activeInternId: string;
  onSelectIntern: (intern: Intern) => void;
  user: User | null;
  onSignOut: () => void;
}

export const InternList: React.FC<InternListProps> = ({ interns, activeInternId, onSelectIntern, user, onSignOut }) => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="font-playfair text-3xl font-black mb-6 text-black text-center">ESTAGIÁRIOS</h2>
      
      <ul className="flex-1 flex flex-col gap-3 overflow-y-auto -mr-3 pr-3">
        {interns.map((intern) => (
          <li key={intern.id}>
            <button
              onClick={() => onSelectIntern(intern)}
              className={`w-full text-left p-4 rounded-2xl transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-details focus:ring-opacity-75 flex items-start gap-4 ${
                activeInternId === intern.id
                  ? 'bg-brand-details'
                  : 'bg-transparent hover:bg-gray-100'
              }`}
              aria-current={activeInternId === intern.id ? "true" : "false"}
            >
              {/* Image */}
              {intern.imageUrl && (
                  <img
                      src={intern.imageUrl}
                      alt={`Foto de ${intern.name}`}
                      className="w-16 h-24 rounded-xl object-cover flex-shrink-0 border-2 border-white shadow-md"
                  />
              )}
              
              {/* Name and Description */}
              <div className="flex-1">
                <h3 className={`font-bold text-sm transition-colors ${activeInternId === intern.id ? 'text-black' : 'text-gray-800'}`}>
                  {intern.name}
                </h3>
                <p className={`text-xs mt-1 transition-colors ${activeInternId === intern.id ? 'text-gray-700' : 'text-gray-500'}`}>
                  {intern.description}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

       <div className="mt-auto pt-4 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500 truncate mb-2" title={user?.email || ''}>
              Logado como: <strong>{user?.displayName || user?.email}</strong>
          </p>
          <button
              onClick={onSignOut}
              className="w-full text-center text-sm py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 text-brand-text-secondary hover:text-brand-text-primary font-medium transition-colors"
          >
              Sair
          </button>
        </div>
    </div>
  );
};
