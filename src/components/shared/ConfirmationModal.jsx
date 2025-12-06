import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDanger = false
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 border border-secondary-200">
                <div className={`p-4 flex items-center gap-3 ${isDanger ? 'bg-red-50 border-b border-red-100' : 'bg-secondary-50 border-b border-secondary-100'}`}>
                    {isDanger ? <AlertTriangle className="text-red-500" /> : <AlertTriangle className="text-yellow-500" />}
                    <h3 className={`font-bold text-lg ${isDanger ? 'text-red-700' : 'text-secondary-800'}`}>{title}</h3>
                    <button onClick={onClose} className="ml-auto text-secondary-400 hover:text-secondary-600 p-1 rounded-full hover:bg-black/5 transition"><X size={20} /></button>
                </div>

                <div className="p-6">
                    <p className="text-secondary-600 font-medium leading-relaxed text-sm">{message}</p>
                </div>

                <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 text-secondary-600 font-bold hover:bg-gray-200 rounded-lg transition text-sm">{cancelText}</button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`px-4 py-2 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition text-sm ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}
                    >
                        {isDanger && <Trash2 size={16} />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
