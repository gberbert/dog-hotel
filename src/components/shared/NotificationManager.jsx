import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { messaging, db, appId, auth } from '../../utils/firebase';

export default function NotificationManager() {
    const [permissionState, setPermissionState] = useState(Notification.permission);
    const [loading, setLoading] = useState(false);
    const [fcmToken, setFcmToken] = useState(null);

    // Vapid Key (Necessária para identificar o servidor de envio)
    // Para teste local, muitas vezes funciona sem, mas para produção recomenda-se gerar no Console do Firebase.
    // Se não tiver, o getToken tenta buscar a padrão do projeto.

    useEffect(() => {
        // Checa se já tem token salvo no localStorage para UI state
        const savedToken = localStorage.getItem('doghotel_fcm_token');
        if (savedToken) setFcmToken(savedToken);

        // Listener para mensagens em Foreground (App Aberto)
        const setupListener = async () => {
            const msg = await messaging;
            if (!msg) return;

            // É necessário importar onMessage dinamicamente ou do pacote
            const { onMessage } = await import('firebase/messaging');

            onMessage(msg, (payload) => {
                console.log('Mensagem recebida em Foreground:', payload);
                const { title, body } = payload.notification;

                // Exibe alerta visual (Toaster ou a própria notificação do sistema se permitido)
                // Nota: Navegadores NÃO mostram notificação nativa se a aba estiver focada por padrão.
                // Temos que forçar ou mostrar um UI customizado.
                // Mas podemos tentar invocar Notification() direto
                if (Notification.permission === 'granted') {
                    new Notification(title, {
                        body: body,
                        icon: '/icon-192.png'
                    });
                }

                // Backup: Alerta sonoro / Visual no App
                alert(`🔔 ${title}\n${body}`);
            });
        };

        setupListener();
    }, []);

    const requestPermission = async () => {
        setLoading(true);
        try {
            const permission = await Notification.requestPermission();
            setPermissionState(permission);
            if (permission === 'granted') {
                await generateToken();
            } else {
                alert("Permissão necessária para avisar sobre vacinas vencidas.");
            }
        } catch (error) {
            console.error("Erro ao pedir permissão:", error);
            alert("Erro ao ativar notificações.");
        } finally {
            setLoading(false);
        }
    };

    const generateToken = async () => {
        try {
            const msg = await messaging;
            if (!msg) {
                alert("Notificações não suportadas neste navegador.");
                return;
            }

            const token = await getToken(msg, {
                vapidKey: 'BDgyNCYdBi8QHHnGfWPP1xLOTWOQ8QXqKRHL952wnPinxDN-vsBinGFbiYq4qz7tv_l9YUZYdWmcGOh_NrSwLRg'
            });

            if (token) {
                console.log("FCM Token:", token);
                setFcmToken(token);
                localStorage.setItem('doghotel_fcm_token', token);
                await saveTokenToDatabase(token);
                alert("Notificações Ativadas! 🔔");
            } else {
                console.log("No registration token available. Request permission to generate one.");
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
            alert("Erro ao obter token de notificação: " + err.message);
        }
    };

    const saveTokenToDatabase = async (token) => {
        // Salva numa coleção de 'devices' ou no perfil do usuário se estiver logado
        // Como o app é single-user ou multi-device, vamos criar uma coleção dedicada de devices para broadcast.
        try {
            const deviceRef = doc(db, 'artifacts', appId, 'system', 'notification_devices');

            // Verifica se o documento existe, se não cria
            const docSnap = await getDoc(deviceRef);
            if (!docSnap.exists()) {
                await setDoc(deviceRef, { tokens: [token] });
            } else {
                await updateDoc(deviceRef, {
                    tokens: arrayUnion(token)
                });
            }
        } catch (e) {
            console.error("Erro ao salvar token no Firestore:", e);
        }
    };

    const handleReset = () => {
        localStorage.removeItem('doghotel_fcm_token');
        setFcmToken(null);
        setPermissionState('default');
        window.location.reload();
    };

    if (permissionState === 'granted' && fcmToken) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                    <Bell size={14} /> Ativo
                </div>
                <button
                    onClick={() => { if (confirm("Reativar notificações para corrigir problemas?")) handleReset(); }}
                    className="text-[10px] text-secondary-400 underline hover:text-secondary-600"
                >
                    Refazer
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={requestPermission}
            disabled={loading || permissionState === 'denied'}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors
                ${permissionState === 'denied'
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                }`}
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <BellOff size={14} />}
            {permissionState === 'denied' ? 'Bloqueado' : 'Ativar Alertas'}
        </button>
    );
}
