import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageLightbox = ({ images, currentIndex, onClose, setIndex }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((currentIndex + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((currentIndex - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, setIndex]);

  if (!images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-fade-in">
      <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-full bg-black/20 hover:bg-white/10 transition"
          title="Fechar (Esc)"
      >
          <X size={32} />
      </button>
      
      {images.length > 1 && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIndex((currentIndex - 1 + images.length) % images.length); }} 
          className="absolute left-4 text-white hover:text-gray-300 p-3 rounded-full bg-black/20 hover:bg-white/10 transition"
        >
          <ChevronLeft size={40} />
        </button>
      )}
      
      <div className="relative max-w-[90vw] max-h-[90vh]">
           <img 
              src={images[currentIndex]} 
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" 
              alt={`Foto ${currentIndex + 1}`} 
           />
           <div className="absolute -bottom-10 left-0 right-0 text-center text-white text-sm font-medium">
              {currentIndex + 1} de {images.length}
           </div>
      </div>
      
      {images.length > 1 && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIndex((currentIndex + 1) % images.length); }} 
          className="absolute right-4 text-white hover:text-gray-300 p-3 rounded-full bg-black/20 hover:bg-white/10 transition"
        >
          <ChevronRight size={40} />
        </button>
      )}
    </div>
  );
};

export default ImageLightbox;