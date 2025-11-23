import React, { useState } from 'react';
import { Mail, Lock, Dog } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

const LoginScreen = ({ onLogin, db, appId, isDbReady = true }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!isDbReady) {
      alert("Aguardando conexão com o servidor...");
      return;
    }

    setIsLoading(true);

    try {
      const loginsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logins');
      const q = query(loginsRef, where("email", "==", email), where("password", "==", password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        onLogin();
      } else {
        alert("Email ou senha incorretos. Verifique suas credenciais.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      alert(`Erro de conexão: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-secondary-200">
        <div className="bg-primary-50 p-8 text-center border-b border-primary-100">
          <div className="inline-flex bg-white p-2 rounded-full shadow-sm mb-4">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 rounded-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-primary-800">Uma Casa Boa</h1>
          <p className="text-primary-600 font-medium uppercase tracking-wider text-sm">Pra Cachorro</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-secondary-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-secondary-900"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-secondary-400" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all text-secondary-900"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !isDbReady}
              className="w-full bg-primary-800 text-white py-3 rounded-lg font-bold hover:bg-primary-900 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando...' : 'Acessar Sistema'}
            </button>
          </form>
          <p className="text-xs text-center text-secondary-400 mt-6">
            Status: {isDbReady ? <span className="text-success font-bold">Online</span> : <span className="text-warning">Conectando...</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;