import React from 'react';
import { Star, Smile, Meh, Frown, Angry, Laugh } from 'lucide-react';

export const StarRating = ({ rating, setRating, readonly = false, size = 24 }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={(e) => { e.preventDefault(); !readonly && setRating && setRating(star); }}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none transition-colors duration-200`}
          disabled={readonly}
          title={`Nota ${star}`}
        >
          <Star
            size={readonly ? (size > 16 ? 16 : size) : size}
            className={`${star <= rating ? 'fill-current text-[#FFD700]' : 'text-gray-300'}`}
            strokeWidth={star <= rating ? 0 : 2}
            stroke={star <= rating ? 'none' : '#9CA3AF'}
          />
        </button>
      ))}
    </div>
  );
};

export const FaceRating = ({ rating, setRating, readonly = false, size = 24 }) => {
  const faces = [
    { val: 1, icon: Angry, color: 'text-[#FF0000]', label: 'Raiva' },
    { val: 2, icon: Frown, color: 'text-[#FF7F00]', label: 'Triste' },
    { val: 3, icon: Meh, color: 'text-[#FFD700]', label: 'Neutro' },
    { val: 4, icon: Smile, color: 'text-[#00FF00]', label: 'Bom' },
    { val: 5, icon: Laugh, color: 'text-[#00AA00]', label: 'Excelente' },
  ];

  const safeRating = Number(rating) || 3;

  return (
    <div className="flex space-x-3">
      {faces.map((face) => {
        const Icon = face.icon;
        const isSelected = safeRating === face.val;
        
        return (
          <button
            key={face.val}
            type="button"
            onClick={(e) => { e.preventDefault(); !readonly && setRating && setRating(face.val); }}
            className={`
              ${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none transition-colors duration-200
              flex flex-col items-center gap-1 focus:outline-none group
            `}
            disabled={readonly}
            title={face.label}
          >
            <Icon
              size={size}
              className={`
                ${isSelected ? face.color : 'text-gray-300'} 
                ${isSelected && !readonly ? 'fill-current opacity-100 stroke-[2.5px]' : 'group-hover:text-gray-400'}
                transition-all duration-200
              `}
              strokeWidth={isSelected ? 2.5 : 2}
            />
          </button>
        );
      })}
    </div>
  );
};