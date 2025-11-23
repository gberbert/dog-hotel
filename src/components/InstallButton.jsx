import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, MoreVertical } from 'lucide-react';

export default function InstallButton({ deferredPrompt }) {
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [showAndroidInstructions, setShowAndroidInstructions] = useState(false); // Novo estado para manual do Android
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detecta se já está instalado (Standalone) para esconder o botão
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
        setIsStandalone(isStandaloneMode);

        // Detecta iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        if (ios && !isStandaloneMode) {
            setIsIOS(true);
        }
    }, []);

    const handleClick = async (e) => {
        e.preventDefault();

        // --- Lógica iPhone ---
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        // --- Lógica Android ---
        // Cenário 1: Temos o evento automático guardado
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('Instalação aceita');
            }
            // O deferredPrompt geralmente só pode ser usado uma vez.
        }
        // Cenário 2: NÃO temos o evento (Plano B - Manual)
        else {
            setShowAndroidInstructions(true);
        }
    };

    // Se já estiver rodando como app instalado, não mostra nada.
    if (isStandalone) return null;

    // --- REMOVEMOS A LINHA QUE ESCONDIA O BOTÃO SE NÃO TIVESSE O PROMPT ---
    // O botão agora sempre tenta renderizar se não for standalone.

    return (
        <>
            {/* O Botão do Menu */}
            <button
                onClick={handleClick}
                className="flex items-center gap-3 p-4 rounded-lg font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 w-full transition-colors border border-primary-100"
            >
                <Download size={20} />
                <span>Instalar App</span>
            </button>

            {/* --- MODAL DE INSTRUÇÕES MANUAL ANDROID (NOVO) --- */}
            {showAndroidInstructions && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center animate-fade-in p-4" onClick={() => setShowAndroidInstructions(false)}>
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowAndroidInstructions(false)} className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600"><X /></button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-secondary-100 rounded-xl flex items-center justify-center mb-2">
                                <img src="/logo.png" alt="Icon" className="w-12 h-12 object-contain" />
                            </div>
                            <h3 className="text-xl font-bold text-primary-800">Instalação Manual</h3>
                            <p className="text-sm text-secondary-600">A instalação automática não está disponível agora. Faça manualmente:</p>

                            <div className="w-full space-y-3 text-left bg-secondary-50 p-4 rounded-xl border border-secondary-100 text-sm">
                                <div className="flex items-center gap-3">
                                    <MoreVertical size={20} className="text-secondary-600" />
                                    <span>1. Toque nos <b>três pontinhos</b> no canto superior do navegador.</span>
                                </div>
                                <div className="h-px bg-secondary-200 w-full"></div>
                                <div className="flex items-center gap-3">
                                    <Download size={20} className="text-primary-600" />
                                    <span>2. Selecione <b>"Instalar aplicativo"</b> ou <b>"Adicionar à tela inicial"</b>.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE INSTRUÇÕES IPHONE (MANTIDO IGUAL) --- */}
            {showIOSInstructions && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center animate-fade-in" onClick={() => setShowIOSInstructions(false)}>
                    <div className="bg-white w-full max-w-md p-6 rounded-t-2xl shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowIOSInstructions(false)} className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600"><X /></button>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-secondary-100 rounded-xl flex items-center justify-center mb-2">
                                <img src="/logo.png" alt="Icon" className="w-12 h-12 object-contain" />
                            </div>
                            <h3 className="text-xl font-bold text-primary-800">Instalar no iPhone</h3>
                            <p className="text-sm text-secondary-600">Siga os passos abaixo:</p>

                            <div className="w-full space-y-3 text-left bg-secondary-50 p-4 rounded-xl border border-secondary-100 text-sm">
                                <div className="flex items-center gap-3">
                                    <Share size={20} className="text-primary-600" />
                                    <span>1. Toque em <b>Compartilhar</b>.</span>
                                </div>
                                <div className="h-px bg-secondary-200 w-full"></div>
                                <div className="flex items-center gap-3">
                                    <PlusSquare size={20} className="text-secondary-600" />
                                    <span>2. Escolha <b>Adicionar à Tela de Início</b>.</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white"></div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}