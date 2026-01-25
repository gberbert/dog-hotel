import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { db, appId } from '../../utils/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

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

            const unread = data.filter(n => !n.read).length;
            setUnreadCount(unread);

            if ('setAppBadge' in navigator) {
                if (unread > 0) navigator.setAppBadge(unread).catch(() => { });
                else navigator.clearAppBadge().catch(() => { });
            }
        });

        return () => unsubscribe();
    }, []);

    const markAsRead = async (id) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), { read: true });
        } catch (e) { console.error("Erro ao marcar lido:", e); }
    };

    const deleteNotification = async (id, skipConfirm = false) => {
        if (!skipConfirm && !confirm("Apagar notificação?")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id));
        } catch (e) { console.error(e); }
    };

    const clearAllNotifications = async () => {
        if (!notifications.length) return;
        if (!confirm("Tem certeza que deseja apagar TODAS as notificações?")) return;

        try {
            const batch = writeBatch(db);
            notifications.forEach(n => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id);
                batch.delete(ref);
            });
            await batch.commit();
        } catch (e) {
            console.error("Erro ao limpar notificações:", e);
            alert("Erro ao limpar. Tente novamente.");
        }
    };

    return (
        <div className="relative">
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

            {showDropdown && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="
                        fixed top-16 left-4 right-4 max-h-[70vh]
                        md:absolute md:top-full md:left-auto md:right-0 md:w-80 md:max-h-[80vh]
                        bg-white border border-gray-200 shadow-2xl rounded-xl z-50 overflow-hidden flex flex-col
                    ">
                        <div className="bg-primary-50 p-3 border-b border-primary-100 flex justify-between items-center">
                            <h3 className="font-bold text-primary-800 text-sm">Notificações</h3>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAllNotifications}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                                        title="Apagar Todas"
                                    >
                                        <Trash2 size={12} /> Limpar Tudo
                                    </button>
                                )}
                                <button onClick={() => setShowDropdown(false)}><X size={16} className="text-primary-400" /></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-2 space-y-2 overflow-x-hidden">
                            {notifications.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-8">Nenhuma notificação</p>
                            ) : (
                                notifications.map(notif => (
                                    <SwipeableNotificationItem
                                        key={notif.id}
                                        notif={notif}
                                        onRead={() => markAsRead(notif.id)}
                                        onDelete={() => deleteNotification(notif.id, true)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Subcomponente de Swiper para Mobile
function SwipeableNotificationItem({ notif, onRead, onDelete }) {
    const [startX, setStartX] = useState(0);
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    // Configurações

    // Detectando se é mobile/touch para ativar comportamento (opcional, pode deixar ativo sempre)
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleTouchStart = (e) => {
        setStartX(e.touches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;

        // Só permite swipe para esquerda (valores negativos)
        if (diff < 0 && diff > -150) {
            setTranslateX(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        // Se arrastou mais de 60px, snap open (-120px)
        if (translateX < -60) {
            setTranslateX(-120);
        } else {
            setTranslateX(0); // Snap close
        }
    };

    // Reseta se clicar fora ou algo assim (simplificado)
    const resetSwipe = () => setTranslateX(0);

    return (
        <div className="relative overflow-hidden rounded-lg min-h-[80px]">
            {/* Camada de Fundo (Ações) */}
            <div className={`absolute inset-y-0 right-0 w-[120px] flex rounded-lg overflow-hidden transition-all ${Math.abs(translateX) > 20 ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}>
                {/* Botão Ler */}
                {!notif.read && (
                    <button
                        onClick={() => { onRead(); resetSwipe(); }}
                        className="flex-1 bg-green-500 text-white flex items-center justify-center active:bg-green-600"
                    >
                        <Check size={18} />
                    </button>
                )}
                {/* Botão Excluir */}
                <button
                    onClick={() => { onDelete(); resetSwipe(); }}
                    className={`flex-1 bg-red-500 text-white flex items-center justify-center active:bg-red-600 ${notif.read ? 'w-full' : ''}`}
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Camada de Frente (Conteúdo) */}
            <div
                className={`relative z-10 p-3 rounded-lg border text-left transition-transform duration-200 ease-out bg-white
                    ${notif.read ? 'border-gray-100 opacity-80' : 'bg-blue-50 border-blue-200 shadow-sm'}
                `}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={resetSwipe} // Clicar fecha
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

                    {/* Botões Desktop (Apenas se não estiver no modo Swipe ou em Desktop Mouse) */}
                    <div className="hidden md:flex flex-col gap-2">
                        {!notif.read && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRead(); }}
                                title="Marcar como lido"
                                className="p-1.5 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                            >
                                <Check size={14} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            title="Apagar"
                            className="p-1.5 bg-gray-100 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-500"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Dica Visual de Swipe (apenas mobile nao lido) */}
                <div className="md:hidden absolute right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-200 rounded-full opacity-50" />
            </div>
        </div>
    );
}
