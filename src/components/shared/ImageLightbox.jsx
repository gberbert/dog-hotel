import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Share2 } from 'lucide-react';

const ImageLightbox = ({ images, currentIndex, onClose, setIndex }) => {
  // Estados para Zoom e Posição
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Referências para cálculos de movimento
  const imageRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const lastDist = useRef(null);

  // Resetar ao mudar de imagem
  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  // Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (scale === 1) { // Só navega se não estiver com zoom
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, scale]);

  const nextImage = () => setIndex((currentIndex + 1) % images.length);
  const prevImage = () => setIndex((currentIndex - 1 + images.length) % images.length);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastPos.current = { x: 0, y: 0 };
  };

  // --- CONTROLES DE ZOOM ---
  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setScale(s => Math.min(s + 0.5, 4));
  };
  
  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setScale(s => {
        const newScale = Math.max(s - 0.5, 1);
        if (newScale === 1) setPosition({x:0, y:0});
        return newScale;
    });
  };

  // --- FUNÇÃO DE COMPARTILHAMENTO ---
  const handleShare = async (e) => {
    e?.stopPropagation();
    if (isSharing) return;
    setIsSharing(true);

    const imageUrl = images[currentIndex];

    try {
        if (navigator.share) {
            // Tenta buscar a imagem para compartilhar como ARQUIVO (Melhor UX)
            let fileShared = false;
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], `pet_photo_${currentIndex}.jpg`, { type: blob.type });
                
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Foto do Pet',
                        text: 'Olha que foto legal!'
                    });
                    fileShared = true;
                }
            } catch (err) {
                console.warn("Não foi possível compartilhar o arquivo, tentando URL...", err);
            }

            // Se falhar o arquivo, compartilha a URL
            if (!fileShared) {
                await navigator.share({
                    title: 'Foto do Pet',
                    url: imageUrl
                });
            }
        } else {
            // Fallback para Desktop antigo: Copiar Link
            await navigator.clipboard.writeText(imageUrl);
            alert("Link da imagem copiado para a área de transferência!");
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Erro ao compartilhar:", error);
        }
    } finally {
        setIsSharing(false);
    }
  };

  // --- LÓGICA DE TOQUE (TOUCH EVENTS) ---
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Início do Pinça (Pinch)
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastDist.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      // Início do Arrastar (Pan) - Só se tiver zoom
      setIsDragging(true);
      startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPos.current = { ...position };
    }
  };

  const onTouchMove = (e) => {
    // Impede o comportamento padrão (scroll da página)
    e.preventDefault();

    if (e.touches.length === 2) {
      // Movimento de Pinça (Zoom)
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastDist.current) {
        const diff = dist - lastDist.current;
        const newScale = Math.min(Math.max(1, scale + diff * 0.005), 4);
        setScale(newScale);
        lastDist.current = dist;
      }
    } else if (e.touches.length === 1 && scale > 1 && isDragging) {
      // Movimento de Arrastar (Pan)
      const dx = e.touches[0].clientX - startPos.current.x;
      const dy = e.touches[0].clientY - startPos.current.y;
      
      let newX = lastPos.current.x + dx;
      let newY = lastPos.current.y + dy;

      setPosition({ x: newX, y: newY });
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    lastDist.current = null;
    lastPos.current = { ...position };
  };

  // Double Tap para Zoom Rápido
  let lastTap = 0;
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (scale > 1) resetZoom();
      else setScale(2.5);
    }
    lastTap = now;
  };

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-fade-in overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }} // Impede gestos nativos do navegador
    >
      {/* --- BARRA DE CONTROLES --- */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
         {/* Contador */}
         <div className="pointer-events-auto">
             <span className="text-white font-medium bg-black/40 px-3 py-1 rounded-full text-sm border border-white/10">
               {currentIndex + 1} / {images.length}
             </span>
         </div>
         
         {/* Botões de Ação */}
         <div className="pointer-events-auto flex gap-2">
             <button onClick={handleShare} className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 border border-white/10" title="Compartilhar">
                {isSharing ? <span className="animate-pulse">...</span> : <Share2 size={20}/>}
             </button>
             <button onClick={resetZoom} className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 border border-white/10" title="Resetar Zoom"><RotateCcw size={20}/></button>
             <button onClick={handleZoomOut} className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 border border-white/10"><ZoomOut size={20}/></button>
             <button onClick={handleZoomIn} className="p-2 rounded-full bg-black/40 text-white hover:bg-white/20 border border-white/10"><ZoomIn size={20}/></button>
             <button onClick={onClose} className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-600 ml-2 shadow-lg"><X size={20}/></button>
         </div>
      </div>

      {/* --- SETAS DE NAVEGAÇÃO (Escondidas se tiver zoom para não atrapalhar) --- */}
      {images.length > 1 && scale === 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-2 md:left-4 text-white p-2 md:p-3 rounded-full bg-black/20 hover:bg-white/10 z-50 transition-colors">
            <ChevronLeft size={32} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-2 md:right-4 text-white p-2 md:p-3 rounded-full bg-black/20 hover:bg-white/10 z-50 transition-colors">
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* --- ÁREA DA IMAGEM --- */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={handleDoubleTap}
      >
           <img 
              ref={imageRef}
              src={images[currentIndex]} 
              className="max-h-full max-w-full object-contain transition-transform duration-75 ease-out will-change-transform"
              style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                cursor: scale > 1 ? 'grab' : 'default'
              }}
              draggable={false}
              alt={`Foto ${currentIndex + 1}`} 
           />
      </div>
      
      {/* Dica visual rápida se estiver no mobile */}
      {scale === 1 && (
        <div className="absolute bottom-10 text-white/50 text-xs pointer-events-none animate-pulse">
          Toque duplo ou pinça para zoom
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;