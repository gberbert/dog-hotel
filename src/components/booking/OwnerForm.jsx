import React from 'react';
import { User, MessageCircle, Lock } from 'lucide-react';

export default function OwnerForm({ formData, handleChange, showReadOnly }) {
    // Helper para ReadOnlyField
    const ReadOnlyField = ({ label, value, icon: Icon }) => (
        <div className="mb-3">
            <span className="text-xs font-bold text-secondary-400 uppercase flex items-center gap-1 mb-1">
                {Icon && <Icon size={12} />} {label}
            </span>
            <div className="text-sm font-medium text-secondary-800 break-words">
                {value || <span className="text-secondary-300 italic">-</span>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h3 className="text-secondary-800 font-bold border-b pb-2 flex items-center gap-2"><User size={18} /> Dados do Tutor</h3>

            {showReadOnly ? (
                <div className="bg-secondary-50 p-3 rounded-lg border border-secondary-200 relative">
                    <div className="absolute top-2 right-2 text-secondary-300"><Lock size={14} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <ReadOnlyField label="Tutor 1" value={formData.ownerName} icon={User} />
                        <ReadOnlyField label="WhatsApp 1" value={formData.whatsapp} icon={MessageCircle} />
                        <ReadOnlyField label="Tutor 2" value={formData.ownerName2} icon={User} />
                        <ReadOnlyField label="WhatsApp 2" value={formData.whatsapp2} icon={MessageCircle} />
                    </div>
                    <ReadOnlyField label="Endereço" value={formData.address} />
                    <div className="mt-2">
                        <span className="text-xs font-bold text-secondary-400 uppercase block mb-1">Histórico do Tutor</span>
                        <p className="text-sm text-secondary-700 bg-white p-2 rounded border border-secondary-100 italic">
                            {formData.ownerHistory || "Sem observações."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium">Tutor 1</label><input name="ownerName" value={formData.ownerName} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                        <div><label className="text-sm font-medium">WhatsApp 1</label><input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="w-full p-2 border rounded" placeholder="(00) 00000-0000" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium">Tutor 2</label><input name="ownerName2" value={formData.ownerName2} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                        <div><label className="text-sm font-medium">WhatsApp 2</label><input name="whatsapp2" value={formData.whatsapp2} onChange={handleChange} className="w-full p-2 border rounded" placeholder="(00) 00000-0000" /></div>
                    </div>
                    <div><label className="text-sm font-medium">Endereço</label><input name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                    <div><label className="text-sm font-medium">Histórico do Tutor</label><textarea name="ownerHistory" value={formData.ownerHistory} onChange={handleChange} rows={2} className="w-full p-2 border rounded" /></div>
                </div>
            )}
        </div>
    );
}