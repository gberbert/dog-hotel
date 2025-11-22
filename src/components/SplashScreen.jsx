import React, { useEffect, useState } from 'react';
import { PawPrint } from 'lucide-react';
// 1. Importamos nosso novo ícone SVG
import AppIcon from './AppIcon';

export default function SplashScreen({ onFinish }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // --- ÁUDIO ---
    const audioUrl = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_70433997e6.mp3?filename=dog-bark-17998.mp3'; 
    const playBark = () => {
      const audio = new Audio(audioUrl);
      audio.volume = 0.4; 
      audio.play().catch(() => {});
    };

    // --- SEQUÊNCIA DE ANIMAÇÃO ---
    const timer1 = setTimeout(() => setStep(1), 500);
    const bark1 = setTimeout(() => playBark(), 600);
    const bark2 = setTimeout(() => playBark(), 1100);
    const timer2 = setTimeout(() => setStep(2), 1500);
    const bark3 = setTimeout(() => playBark(), 1800);
    const timer3 = setTimeout(() => setStep(3), 4500);
    const timer4 = setTimeout(onFinish, 5000);

    return () => {
      clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4);
      clearTimeout(bark1); clearTimeout(bark2); clearTimeout(bark3);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000099] transition-opacity duration-700 ${step === 3 ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Container Central */}
      <div className="relative flex flex-col items-center mb-8">
        
        {/* --- ÍCONE PRINCIPAL --- */}
        <div className={`transition-all duration-700 transform ${step >= 1 ? 'scale-100 translate-y-0 opacity-100' : 'scale-0 translate-y-10 opacity-0'}`}>
          {/* Mantive o círculo branco atrás para dar destaque ao ícone azul,
             exatamente como na imagem que você gerou.
          */}
          <div className="relative bg-white w-40 h-40 rounded-full shadow-2xl animate-bounce flex items-center justify-center p-4">
             {/* 2. Usamos o novo ícone aqui, bem grande */}
             <AppIcon size={120} />
          </div>
        </div>
        {/* ----------------------- */}

        {/* Texto Centralizado */}
        <div className={`text-center mt-8 transition-all duration-1000 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-wide leading-none">
              Uma Casa Boa
            </h1>
            <p className="text-xl md:text-3xl font-bold text-white/90 tracking-[0.2em] uppercase mt-2">
              Pra Cachorro
            </p>
        </div>
        
        {/* Barra de carregamento */}
        <div className="mt-8 w-56 h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
            <div className={`h-full bg-white rounded-full transition-all duration-[4000ms] ease-out ${step >= 1 ? 'w-full' : 'w-0'}`}></div>
        </div>
      </div>

      {/* Animação das Patinhas (Mantida) */}
      {step >= 2 && (
        <div className="absolute bottom-16 md:bottom-24 flex gap-8 opacity-40">
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '0ms', transform: 'rotate(-20deg)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '300ms', transform: 'rotate(20deg) translateY(-15px)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '600ms', transform: 'rotate(-20deg)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '900ms', transform: 'rotate(20deg) translateY(-15px)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '1200ms', transform: 'rotate(-20deg)' }} />
        </div>
      )}
      
      <div className="absolute bottom-4 text-white/30 text-[10px] font-medium uppercase tracking-widest">
        Carregando sistema...
      </div>
    </div>
  );
}