import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export default function CustomAlert({
    isOpen,
    type = 'warning',
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancelar'
}) {
    if (!isOpen) return null;

    // Configurações de estilo baseadas no tipo
    const styles = {
        warning: {
            bg: 'bg-white',
            border: 'border-l-8 border-yellow-500',
            icon: <AlertTriangle size={56} className="text-yellow-500" />,
            titleColor: 'text-gray-800',
            btnBg: 'bg-yellow-500 hover:bg-yellow-600'
        },
        error: { // Estilo "Vermelho com ícone amarelo" solicitado
            bg: 'bg-white',
            border: 'border-l-8 border-red-600',
            // O ícone deve ser AMARELO conforme pedido, mas o tema geral é vermelho (erro/alerta grave)
            icon: <AlertTriangle size={56} className="text-yellow-500 fill-yellow-100" />,
            titleColor: 'text-red-700',
            btnBg: 'bg-red-600 hover:bg-red-700'
        },
        success: {
            bg: 'bg-white',
            border: 'border-l-8 border-green-500',
            icon: <CheckCircle size={56} className="text-green-500" />,
            titleColor: 'text-green-800',
            btnBg: 'bg-green-600 hover:bg-green-700'
        }
    };

    const currentStyle = styles[type] || styles.warning;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 relative transform transition-all scale-100 ${currentStyle.border}`}>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 bg-gray-50 p-4 rounded-full shadow-inner">
                        {currentStyle.icon}
                    </div>

                    <h3 className={`text-xl font-black uppercase mb-3 ${currentStyle.titleColor}`}>
                        {title}
                    </h3>

                    <p className="text-gray-600 mb-8 text-base leading-relaxed whitespace-pre-line font-medium">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full justify-center">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 font-bold transition-all"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onConfirm}
                            className={`flex-1 px-6 py-3 rounded-lg text-white font-bold shadow-lg shadow-black/10 transition-transform active:scale-95 ${currentStyle.btnBg}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
