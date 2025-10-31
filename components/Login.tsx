import React, { useState } from 'react';
import { signUpWithEmailPassword, signInWithEmailPassword } from '../services/firebaseService';
import { LoadingIcon } from './Icons';

export const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLoginView) {
        if (!email || !password) {
            setError("Por favor, preencha o email e a senha.");
            setIsLoading(false);
            return;
        }
        await signInWithEmailPassword(email, password);
      } else {
         if (!email || !password || !displayName) {
            setError("Por favor, preencha todos os campos.");
            setIsLoading(false);
            return;
        }
        await signUpWithEmailPassword(email, password, displayName);
      }
      // O onAuthStateChanged em App.tsx cuidará do que acontece após o login/cadastro
    } catch (err) {
      console.error("Erro de autenticação:", err);
      // Mapeia códigos de erro do Firebase para mensagens amigáveis
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Email ou senha inválidos.');
          break;
        case 'auth/invalid-email':
          setError('O formato do email é inválido.');
          break;
        case 'auth/email-already-in-use':
          setError('Este email já está cadastrado.');
          break;
        case 'auth/weak-password':
          setError('A senha deve ter no mínimo 6 caracteres.');
          break;
        default:
          setError('Ocorreu um erro. Tente novamente.');
      }
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md text-center bg-white p-8 rounded-3xl shadow-lg border border-gray-300/20">
        <img
            src="https://i.imgur.com/9fenf7i.png"
            alt="Logo Arq.nb"
            className="w-24 h-auto mx-auto mb-4"
        />
        <h1 className="font-playfair text-3xl font-black text-brand-text-primary">
            {isLoginView ? 'Bem-vindo(a) de volta!' : 'Crie sua Conta'}
        </h1>
        <p className="mt-2 text-brand-text-secondary">
            {isLoginView ? 'Faça login para acessar sua equipe de especialistas.' : 'Preencha os dados para começar.'}
        </p>
        
        <form className="mt-8 text-left" onSubmit={handleSubmit}>
            {!isLoginView && (
                 <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="displayName">Nome</label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-details"
                        disabled={isLoading}
                    />
                </div>
            )}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-details"
                    disabled={isLoading}
                />
            </div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Senha</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-details"
                    disabled={isLoading}
                />
            </div>

            {error && <p className="mb-4 text-sm text-center text-red-500">{error}</p>}
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-details text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? <LoadingIcon /> : (isLoginView ? 'Entrar' : 'Criar Conta')}
            </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-600">
            {isLoginView ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button onClick={toggleView} className="font-semibold text-brand-details hover:underline ml-1">
                {isLoginView ? 'Crie uma agora' : 'Faça o login'}
            </button>
        </p>

      </div>
    </div>
  );
};