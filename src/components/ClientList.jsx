import React, { useState } from 'react';
import { Users, Search, Plus, FileText, Trash2, History, Dog, X, Loader } from 'lucide-react';
import { FaceRating } from './shared/RatingComponents';
import { useData } from '../context/DataContext';

export default function ClientList({ onEdit, onDelete }) {
    const { clients, fetchClients, loadingClients, hasMore } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchClients(searchTerm);
    };

    const handleLoadMore = () => {
        fetchClients(searchTerm, true);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 min-h-[500px]">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
                    <Users className="text-primary-600" /> Cadastros
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {/* BARRA DE PESQUISA */}
                    <form onSubmit={handleSearch} className="relative flex-1 w-full flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nome do cão..."
                                className="pl-10 pr-4 py-3 border rounded-lg w-full lg:w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <Search className="absolute left-3 top-3.5 text-primary-500" size={18} />
                        </div>
                        <button 
                            type="submit"
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 shadow"
                        >
                            Pesquisar
                        </button>
                    </form>

                    <button
                        onClick={() => onEdit(null)}
                        className="bg-success text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow hover:bg-green-600 whitespace-nowrap w-full sm:w-auto"
                    >
                        <Plus size={20} /> Novo Cadastro
                    </button>
                </div>
            </div>

            {clients.length === 0 && !loadingClients ? (
                <div className="text-center py-20 text-secondary-500 border-2 border-dashed rounded-xl bg-secondary-50">
                    {searchTerm ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clients.map(client => (
                            <div key={client.id} className="border rounded-xl p-4 hover:shadow-md transition bg-secondary-50 flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-14 h-14 bg-white rounded-full overflow-hidden border flex-shrink-0 cursor-pointer group"
                                        onClick={() => client.photos && client.photos[0] && setSelectedImage(client.photos[0])}
                                    >
                                        {client.photos && client.photos[0] ? (
                                            <img
                                                src={client.photos[0]}
                                                alt="Dog"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            />
                                        ) : (
                                            <Dog className="p-3 text-secondary-400 w-full h-full" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg truncate text-secondary-900">{client.dogName}</h3>
                                        <p className="text-sm text-secondary-600 truncate">{client.ownerName}</p>
                                    </div>
                                </div>

                                <div className="text-sm space-y-1 mt-1">
                                    <div className="flex items-center gap-2 text-secondary-600">
                                        <FaceRating rating={client.dogBehaviorRating || 3} readonly size={16} />
                                        <span className="text-xs">(Avaliação Geral)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-secondary-600">
                                        <History size={14} className="text-primary-600" /> {client.pastBookings?.length || 0} Hospedagens
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-auto pt-3">
                                    <button
                                        onClick={() => onEdit(client)}
                                        className="flex-1 bg-white border border-primary-200 text-primary-600 py-2 rounded-lg font-medium hover:bg-primary-50 flex items-center justify-center gap-2"
                                    >
                                        <FileText size={16} /> Detalhes
                                    </button>
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(client.id)}
                                            className="p-2 text-error hover:bg-red-50 rounded-lg"
                                            title="Excluir Cliente"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* BOTÃO CARREGAR MAIS (PAGINAÇÃO) */}
                    {hasMore && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingClients}
                                className="bg-secondary-100 text-secondary-700 px-6 py-3 rounded-lg font-bold hover:bg-secondary-200 flex items-center gap-2 disabled:opacity-50"
                            >
                                {loadingClients ? (
                                    <><Loader className="animate-spin" size={20} /> Carregando...</>
                                ) : (
                                    'Carregar Mais Clientes'
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Fullscreen Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Fullscreen Dog"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}