import React from 'react';
import { Instagram, MessageCircle } from 'lucide-react';

export default function PDFHeader() {
    return (
        <div
            className="w-full bg-primary-800 text-white p-6 flex justify-between items-center border-b-4 border-primary-600 mb-6"
            style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
        >
            {/* Logo e Nome */}
            <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-full shadow-lg">
                    <img src="/logo.png" alt="Logo" className="w-14 h-14 object-cover rounded-full" />
                </div>
                <div>
                    <h1 className="font-bold text-2xl leading-none tracking-wide text-white">
                        Uma Casa Boa
                    </h1>
                    <p className="text-xs font-bold text-primary-200 leading-tight uppercase tracking-[0.2em] mt-1">
                        Pra Cachorro
                    </p>
                </div>
            </div>

            {/* Contato */}
            <div className="text-right text-sm font-medium text-white space-y-1.5">
                <div className="flex items-center justify-end gap-2 text-primary-50">
                    <Instagram size={16} />
                    <span>@1casaboapracachorro</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-primary-50">
                    <MessageCircle size={16} />
                    <span>(21) 99277 1596</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-primary-50">
                    <MessageCircle size={16} />
                    <span>(21) 99511 8908</span>
                </div>
            </div>
        </div>
    );
}
