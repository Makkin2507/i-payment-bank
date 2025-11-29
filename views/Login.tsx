
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';

const Login = () => {
  const { login, language, setLanguage } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const t = TRANSLATIONS[language];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-gray-700 rounded-2xl p-8 shadow-2xl">
        
        <div className="flex flex-col items-center justify-center mb-10">
            <h1 className="text-3xl font-bold text-white tracking-widest text-center border-b-2 border-primary pb-2 uppercase">
                I-PAYMENT BANK
            </h1>
        </div>
        
        <div className="flex justify-center gap-2 mb-8">
          {(['en', 'ku', 'ar'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1 rounded-full text-sm border transition-all ${
                language === lang 
                  ? 'bg-secondary text-background border-secondary font-bold' 
                  : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-medium text-center mb-6 text-gray-300">{t.welcome_back}</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <input
              type="text"
              placeholder={t.username_placeholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none transition-all placeholder:text-gray-600"
            />
          </div>
          <div className="space-y-1">
            <input
              type="password"
              placeholder={t.password_placeholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none transition-all placeholder:text-gray-600"
            />
          </div>
          
          {error && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg"><p className="text-error text-sm text-center font-medium">{error}</p></div>}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-primary/20"
          >
            {t.login}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;