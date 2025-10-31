import React, { useState } from 'react';
import { signInWithGoogle } from '../services/firebaseService';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // O onAuthStateChanged em App.tsx cuidará do redirecionamento
    } catch (err) {
      console.error("Erro de autenticação:", err);
      setError("Não foi possível fazer o login. Por favor, tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md text-center bg-white p-8 rounded-3xl shadow-lg border border-gray-300/20">
        <img
            src="https://i.imgur.com/9fenf7i.png"
            alt="Logo Arq.nb"
            className="w-24 h-auto mx-auto mb-4"
        />
        <h1 className="font-playfair text-3xl font-black text-brand-text-primary">Hub de Estagiários AI</h1>
        <p className="mt-2 text-brand-text-secondary">Faça login para continuar e acessar sua equipe de especialistas.</p>
        
        <div className="mt-8">
            <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-brand-details text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 398.4 0 256S110.3 0 244 0c73 0 134.3 28.1 181.8 73.2L358.3 147.1C328.7 121.9 291.1 106 244 106c-79.6 0-143.9 65.6-143.9 146.4s64.3 146.4 143.9 146.4c87.3 0 114.7-65.6 118.8-98.2H244v-71.6h244c1.3 12.8 2.2 26.1 2.2 39.8z"></path>
                    </svg>
                )}
                {isLoading ? 'Entrando...' : 'Entrar com Google'}
            </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
};