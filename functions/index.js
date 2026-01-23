const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { isSameDay, addDays, getMinutes, getHours } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

admin.initializeApp();

exports.checkScheduledAlerts = functions.https.onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const messaging = admin.messaging();
        const appId = 'doghotel-production';

        // 1. Configurar Datas e Horários
        const timeZone = 'America/Sao_Paulo';
        const nowUTC = new Date();
        const nowBRT = toZonedTime(nowUTC, timeZone);
        const currentHour = getHours(nowBRT);
        const currentMinute = getMinutes(nowBRT);
        console.log(`Hora Atual Brasil: ${currentHour}:${currentMinute}`);

        const notificationsToSend = [];

        // 2. Buscar Clientes
        const clientsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('clients');
        const clientsSnapshot = await clientsRef.get();
        console.log(`Scan em ${clientsSnapshot.size} clientes.`);

        clientsSnapshot.forEach(doc => {
            const client = doc.data();
            const clientId = doc.id;

            // --- VACINAS (Sempre checa) ---
            const checkVaccine = (dateStr, type) => {
                if (!dateStr) return;
                const lastDose = new Date(dateStr);
                const validUntil = addDays(lastDose, 365);
                const warningDate = addDays(validUntil, -7);

                if (isSameDay(nowBRT, warningDate)) {
                    notificationsToSend.push({
                        title: `💉 Vacina a Vencer`,
                        body: `A vacina ${type} do pet ${client.dogName} vence em 7 dias!`,
                        type: 'vaccine',
                        dogName: client.dogName,
                        clientId: clientId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                if (isSameDay(nowBRT, validUntil)) {
                    notificationsToSend.push({
                        title: `⚠️ Vacina Venceu Hoje`,
                        body: `A vacina ${type} do pet ${client.dogName} venceu hoje.`,
                        type: 'vaccine',
                        dogName: client.dogName,
                        clientId: clientId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            };
            checkVaccine(client.lastAntiRabica, 'Anti-Rábica');
            checkVaccine(client.lastMultipla, 'Múltipla');

            // --- MEDICAÇÕES (Janela +/- 1 Hora) ---
            if (client.medications && Array.isArray(client.medications)) {
                client.medications.forEach(med => {
                    if (!med.time) return;
                    const [medHourStr] = med.time.split(':');
                    const medHour = parseInt(medHourStr);
                    const hourDiff = Math.abs(currentHour - medHour);

                    if (hourDiff <= 1) {
                        notificationsToSend.push({
                            title: `💊 Hora do Remédio`,
                            body: `Dar ${med.name} (${med.dosage}) para ${client.dogName} agora (${med.time})!`,
                            type: 'medication',
                            dogName: client.dogName,
                            clientId: clientId,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            medicationName: med.name
                        });
                    }
                });
            }
        });

        // 3. Persistir Notificações no DB e Enviar Push
        if (notificationsToSend.length > 0) {

            // A) Salvar no Firestore (Inbox do App)
            const inboxRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('notifications');
            const batch = db.batch();

            notificationsToSend.forEach(note => {
                const newDocInfo = inboxRef.doc();
                batch.set(newDocInfo, {
                    ...note,
                    read: false, // Nova notificação começa como não lida
                    createdAt: nowBRT.toISOString()
                });
            });
            await batch.commit();
            console.log(`${notificationsToSend.length} notificações salvas no Inbox.`);


            // B) Enviar Push (Para Celulares)
            const devicesRef = db.collection('artifacts').doc(appId).collection('system').doc('notification_devices');
            const devicesSnap = await devicesRef.get();

            if (devicesSnap.exists) {
                const tokens = devicesSnap.data().tokens || [];
                const uniqueTokens = [...new Set(tokens)];
                const validTokens = [];
                const invalidTokens = [];

                if (uniqueTokens.length > 0) {

                    // Envia cada notificação como um push separado
                    // (Poderia agrupar, mas enviar separado garante atenção)
                    for (const note of notificationsToSend) {
                        const message = {
                            notification: {
                                title: note.title,
                                body: note.body,
                            },
                            webpush: {
                                notification: {
                                    icon: '/icon-192.png',
                                    badge: '/badge-icon.png' // Tentativa de badge icon
                                },
                                fcm_options: {
                                    link: 'https://dog-hotel-iota.vercel.app/'
                                }
                                // headers: {TTL: "4500"} // Opcional
                            },
                            data: {
                                badge: '1', // Para tratamento customizado no SW se necessário
                                url: '/notifications' // Para deep link futuro
                            },
                            tokens: uniqueTokens
                        };

                        try {
                            const response = await messaging.sendEachForMulticast(message);

                            // Processar erros para limpeza de token
                            response.responses.forEach((resp, idx) => {
                                if (!resp.success) {
                                    if (['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(resp.error.code)) {
                                        invalidTokens.push(uniqueTokens[idx]);
                                    }
                                }
                            });

                            console.log(`Push Enviado: "${note.title}". Success: ${response.successCount}/${uniqueTokens.length}`);

                        } catch (err) {
                            console.error("Erro no envio multicast:", err);
                        }
                    }

                    // C) Limpeza Automática de Tokens Inválidos
                    if (invalidTokens.length > 0) {
                        const uniqueInvalid = [...new Set(invalidTokens)];
                        console.log(`Removendo ${uniqueInvalid.length} tokens inválidos...`);
                        await devicesRef.update({
                            tokens: admin.firestore.FieldValue.arrayRemove(...uniqueInvalid)
                        });
                    }
                }
            }
        }

        res.status(200).send(`Processamento Concluído. ${notificationsToSend.length} alertas gerados e salvos.`);

    } catch (error) {
        console.error("Erro Fatal:", error);
        res.status(500).send("Erro: " + error.message);
    }
});
