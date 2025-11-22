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
    <div className="min-h-screen bg-gradient-to-br from-[#0000FF] to-[#0000AA] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-50 p-8 text-center">
           <div className="inline-flex bg-white p-4 rounded-full shadow-md mb-4">
             <Dog size={48} className="text-[#FF7F00]" />
           </div>
           <h1 className="text-2xl font-bold text-[#0000FF]">DogHotel Manager</h1>
           <p className="text-[#FF7F00]">Gestão Compartilhada</p>
        </div>
        <div className="p-8">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-[#0000FF]" size={20} />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0000FF] outline-none" 
                    placeholder="seu@email.com" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-[#0000FF]" size={20} />
                  <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0000FF] outline-none" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading || !isDbReady} 
                className="w-full bg-[#0000FF] text-white py-3 rounded-lg font-bold hover:bg-[#0000AA] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? 'Verificando...' : 'Acessar Sistema'}
              </button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-4">
                Status: {isDbReady ? <span className="text-[#00FF00] font-bold">Online</span> : <span className="text-[#FF0000]">Conectando...</span>}
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;