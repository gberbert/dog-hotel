import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, KeyRound, Send, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, appId } from '../utils/firebase.js';

const LoginScreen = ({ onLogin, isDbReady = true }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 8000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isDbReady) {
      alert("Aguardando conexão com o servidor...");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (authMode === 'forgot') {
        // Fluxo de Esqueci a Senha
        await sendPasswordResetEmail(auth, email);
        showMessage('success', 'E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setAuthMode('login');
        
      } else if (authMode === 'login') {
        // Fluxo de Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verifica se o e-mail está validado
        if (!user.emailVerified) {
          await signOut(auth);
          showMessage('error', 'Seu e-mail ainda não foi verificado. Verifique sua caixa de entrada ou spam.');
          return;
        }
        
        // Se passou, o App.jsx escutará a mudança de estado pelo onAuthStateChanged
        
      } else if (authMode === 'register') {
        // Fluxo de Registro
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Envia e-mail de verificação
        await sendEmailVerification(user);
        
        // Define papel inicial (admin ou user)
        const role = email.toLowerCase() === 'lyoni.berbert@gmail.com' ? 'admin' : 'user';
        
        // Salva na nova coleção de perfis
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_roles', user.uid), {
          email: email.toLowerCase(),
          name: name,
          role: role,
          createdAt: new Date().toISOString()
        });

        // Desloga o usuário imediatamente para obrigá-lo a verificar o e-mail
        await signOut(auth);
        
        showMessage('success', 'Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Você precisa clicar nele antes de acessar.');
        setAuthMode('login');
      }
    } catch (error) {
      console.error("Erro na autenticação:", error);
      let msg = "Ocorreu um erro.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') msg = "E-mail ou senha incorretos.";
      if (error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
      if (error.code === 'auth/email-already-in-use') msg = "E-mail já está em uso.";
      if (error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
      if (error.code === 'auth/invalid-email') msg = "Formato de e-mail inválido.";
      showMessage('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabs = () => (
    <div className="flex border-b border-secondary-200">
      <button 
        onClick={() => { setAuthMode('login'); setMessage(null); }}
        className={`flex-1 py-3 text-sm font-bold transition-colors ${authMode === 'login' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-secondary-500 hover:text-primary-500 hover:bg-secondary-50'}`}
      >
        Entrar
      </button>
      <button 
        onClick={() => { setAuthMode('register'); setMessage(null); }}
        className={`flex-1 py-3 text-sm font-bold transition-colors ${authMode === 'register' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-secondary-500 hover:text-primary-500 hover:bg-secondary-50'}`}
      >
        Cadastrar
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-secondary-200">
        
        <div className="bg-primary-50 p-8 text-center border-b border-primary-100 relative">
          {authMode === 'forgot' && (
            <button 
              onClick={() => setAuthMode('login')}
              className="absolute top-4 left-4 text-primary-600 hover:bg-primary-100 p-2 rounded-lg text-sm font-bold transition"
            >
              Voltar
            </button>
          )}
          <div className="inline-flex bg-white p-2 rounded-full shadow-sm mb-4">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 rounded-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-primary-800">Uma Casa Boa</h1>
          <p className="text-primary-600 font-medium uppercase tracking-wider text-sm">Pra Cachorro</p>
        </div>
        
        {authMode !== 'forgot' && renderTabs()}

        <div className="p-8">
          
          {authMode === 'forgot' && (
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-secondary-800 flex items-center justify-center gap-2 mb-2">
                <KeyRound size={20} className="text-primary-600" />
                Recuperar Senha
              </h2>
              <p className="text-sm text-secondary-500">
                Digite seu e-mail cadastrado. Enviaremos um link seguro para você redefinir sua senha.
              </p>
            </div>
          )}

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex gap-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-3 text-secondary-400" size={20} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Seu Nome"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-secondary-400" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            
            {authMode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-secondary-700">Senha</label>
                  {authMode === 'login' && (
                    <button type="button" onClick={() => setAuthMode('forgot')} className="text-xs font-bold text-primary-600 hover:text-primary-800 transition">
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-secondary-400" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isDbReady}
              className="w-full bg-primary-800 text-white py-3 rounded-lg font-bold hover:bg-primary-900 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                'Processando...'
              ) : authMode === 'login' ? (
                <><LogIn size={18} /> Acessar Sistema</>
              ) : authMode === 'register' ? (
                <><UserPlus size={18} /> Criar Conta</>
              ) : (
                <><Send size={18} /> Enviar Link</>
              )}
            </button>
          </form>
          
          {authMode === 'login' && (
            <p className="text-xs text-center text-secondary-400 mt-6">
              Ambiente Seguro • Acesso Restrito
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;