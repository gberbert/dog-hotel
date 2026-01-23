import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { db, appId } from '../../utils/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Escuta a coleção de notificações em tempo real
        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(data);

            // Conta quantas não lidas
            const unread = data.filter(n => !n.read).length;
            setUnreadCount(unread);

            // Atualiza Badge do Navegador (PWA/Desktop)
            if ('setAppBadge' in navigator) {
                if (unread > 0) navigator.setAppBadge(unread).catch(() => { });
                else navigator.clearAppBadge().catch(() => { });
            }
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), {
                read: true
            });
        } catch (e) {
            console.error("Erro ao marcar lido:", e);
        }
    };

    const deleteNotification = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Apagar notificação?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id));
        } catch (e) { console.error(e); }
    };

    return (
        <div className="relative">
            {/* Botão do Sino */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown de Notificações */}
            {showDropdown && (
                <>
                    {/* Backdrop invisível para fechar ao clicar fora */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

                    {/* Container Responsivo: Fixed Centralizado no Mobile / Absolute Right no Desktop */}
                    <div className="
                        fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm
                        md:absolute md:top-full md:left-auto md:right-0 md:translate-x-0 md:translate-y-2 md:w-80
                        bg-white border border-gray-200 shadow-2xl rounded-xl z-50 overflow-hidden max-h-[80vh] flex flex-col
                    ">
                        <div className="bg-primary-50 p-3 border-b border-primary-100 flex justify-between items-center">
                            <h3 className="font-bold text-primary-800 text-sm">Notificações</h3>
                            <button onClick={() => setShowDropdown(false)}><X size={16} className="text-primary-400" /></button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {notifications.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-8">Nenhuma notificação</p>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`relative p-3 rounded-lg border text-left transition-all
                                            ${notif.read ? 'bg-white border-gray-100 opacity-60' : 'bg-blue-50 border-blue-200 shadow-sm'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-semibold ${notif.read ? 'text-gray-600' : 'text-blue-800'}`}>
                                                    {notif.title}
                                                </h4>
                                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                    {notif.body}
                                                </p>
                                                <span className="text-[10px] text-gray-400 mt-2 block">
                                                    {new Date(notif.createdAt).toLocaleString('pt-BR')}
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {!notif.read && (
                                                    <button
                                                        onClick={() => markAsRead(notif.id)}
                                                        title="Marcar como lido"
                                                        className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => deleteNotification(notif.id, e)}
                                                    title="Apagar"
                                                    className="p-1.5 bg-gray-100 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
