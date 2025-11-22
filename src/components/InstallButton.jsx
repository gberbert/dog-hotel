import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export default function InstallButton() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Detecta se é iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    
    // Verifica se JÁ está rodando como app (standalone) para não mostrar o botão
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    if (ios && !isInStandaloneMode) {
        setIsIOS(true);
        setSupportsPWA(true);
    }

    // 2. Detecta Android/Desktop (Captura o evento nativo)
    const handler = (e) => {
      e.preventDefault(); // Impede o banner automático feio do Chrome
      setPromptInstall(e); // Guarda o evento para usar no clique do botão
      setSupportsPWA(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    
    // Lógica para iPhone
    if (isIOS) {
        setShowIOSInstructions(true);
        return;
    }

    // Lógica para Android
    if (!promptInstall) {
        return;
    }
    promptInstall.prompt(); // Dispara o popup do sistema
  };

  if (!supportsPWA) return null; // Se já estiver instalado ou não suportar, não mostra nada

  return (
    <>
      {/* O Botão em si (Pode colocar no Menu ou Flutuante) */}
      <button 
        onClick={handleClick}
        className="flex items-center gap-3 p-4 rounded-lg font-bold text-[#0000FF] bg-blue-50 hover:bg-blue-100 w-full transition-colors"
      >
        <Download size={20} />
        <span>Instalar Aplicativo</span>
      </button>

      {/* Modal de Instruções apenas para iPhone */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center animate-fade-in" onClick={() => setShowIOSInstructions(false)}>
            <div className="bg-white w-full max-w-md p-6 rounded-t-2xl shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowIOSInstructions(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X/></button>
                
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                        <img src="/logo.png" alt="Icon" className="w-12 h-12 object-contain" />
                    </div>
                    <h3 className="text-xl font-bold text-[#000099]">Instalar no iPhone</h3>
                    <p className="text-sm text-gray-600">O iOS não permite instalação automática. Siga os passos:</p>
                    
                    <div className="w-full space-y-3 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                        <div className="flex items-center gap-3">
                            <Share size={20} className="text-blue-600" />
                            <span>1. Toque no botão <b>Compartilhar</b> abaixo.</span>
                        </div>
                        <div className="h-px bg-gray-200 w-full"></div>
                        <div className="flex items-center gap-3">
                            <PlusSquare size={20} className="text-gray-600" />
                            <span>2. Role e escolha <b>Adicionar à Tela de Início</b>.</span>
                        </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 pt-2">Toque fora para fechar</div>
                </div>
                
                {/* Seta apontando para baixo (para o botão share do Safari) */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                </div>
            </div>
        </div>
      )}
    </>
  );
}