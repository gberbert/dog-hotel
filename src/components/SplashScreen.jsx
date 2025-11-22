import React, { useEffect, useState } from 'react';
import { Dog, PawPrint } from 'lucide-react';

export default function SplashScreen({ onFinish }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Sequência de animação
    const timer1 = setTimeout(() => setStep(1), 500);  // Dog aparece
    const timer2 = setTimeout(() => setStep(2), 1500); // Patas começam
    const timer3 = setTimeout(() => setStep(3), 4500); // Fade out inicia
    const timer4 = setTimeout(onFinish, 5000);         // Encerra (5s total)

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000099] transition-opacity duration-700 ${step === 3 ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* Container Central */}
      <div className="relative flex flex-col items-center">
        
        {/* O Cachorro Pulando */}
        <div className={`transition-all duration-700 transform ${step >= 1 ? 'scale-100 translate-y-0 opacity-100' : 'scale-0 translate-y-10 opacity-0'}`}>
          <div className="bg-white p-6 rounded-full shadow-2xl animate-bounce">
            <Dog size={80} className="text-[#000099]" strokeWidth={2.5} />
          </div>
        </div>

        {/* Texto com efeito de digitação/fade */}
        <h1 className={`mt-6 text-3xl md:text-5xl font-bold text-white tracking-wider transition-all duration-1000 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          DogManager
        </h1>
        
        {/* Loading bar estilizado */}
        <div className="mt-4 w-48 h-1.5 bg-blue-900 rounded-full overflow-hidden">
            <div className={`h-full bg-white rounded-full transition-all duration-[4000ms] ease-out ${step >= 1 ? 'w-full' : 'w-0'}`}></div>
        </div>
      </div>

      {/* Animação das Patinhas (Walking Paws) */}
      {step >= 2 && (
        <div className="absolute bottom-20 md:bottom-32 flex gap-8 opacity-50">
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '0ms', transform: 'rotate(-20deg)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '300ms', transform: 'rotate(20deg) translateY(-15px)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '600ms', transform: 'rotate(-20deg)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '900ms', transform: 'rotate(20deg) translateY(-15px)' }} />
          <PawPrint size={30} className="text-white animate-pulse" style={{ animationDelay: '1200ms', transform: 'rotate(-20deg)' }} />
        </div>
      )}
      
      <div className="absolute bottom-6 text-white/30 text-xs font-medium">
        Carregando seu hotel...
      </div>
    </div>
  );
}