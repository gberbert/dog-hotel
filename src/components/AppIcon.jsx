// src/components/AppIcon.jsx
import React from 'react';

export default function AppIcon({ size = 24, className = "" }) {
  // A cor azul oficial da sua marca
  const blueColor = "#000099";

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ícone Uma Casa Boa Pra Cachorro"
    >
      {/* A Forma da Casa (Azul) */}
      <path 
        d="M50 5L95 40V95H5V40L50 5Z" 
        fill={blueColor} 
        stroke={blueColor} 
        strokeWidth="4"
        strokeLinejoin="round"
      />
      
      {/* O Rosto do Cachorro (Branco, dentro da casa) */}
      <g transform="translate(25, 45) scale(0.5)">
        {/* Cabeça */}
        <path
          d="M50 10 C 30 10, 15 25, 15 45 C 15 65, 30 85, 50 85 C 70 85, 85 65, 85 45 C 85 25, 70 10, 50 10 Z"
          fill="white"
        />
        {/* Orelhas Caídas */}
        <path d="M15 45 C 5 45, 0 60, 5 70 C 10 80, 25 75, 30 65" fill="white" />
        <path d="M85 45 C 95 45, 100 60, 95 70 C 90 80, 75 75, 70 65" fill="white" />
        {/* Focinho e Boca (Azul para contraste) */}
        <circle cx="50" cy="55" r="6" fill={blueColor} />
        <path d="M50 61 V 70 M40 75 Q 50 85 60 75" stroke={blueColor} strokeWidth="3" fill="none" strokeLinecap="round"/>
        {/* Olhos (Azul) */}
        <circle cx="38" cy="40" r="4" fill={blueColor} />
        <circle cx="62" cy="40" r="4" fill={blueColor} />
      </g>
    </svg>
  );
}