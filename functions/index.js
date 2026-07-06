const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { isSameDay, addDays, getMinutes, getHours, parseISO, isWithinInterval, startOfDay, endOfDay, format } = require('date-fns');
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { toZonedTime } = require('date-fns-tz');

admin.initializeApp();

exports.migrateUsers = functions.https.onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const appId = 'doghotel-production';
        
        let nextPageToken;
        let count = 0;
        
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            const batch = db.batch();
            
            listUsersResult.users.forEach((userRecord) => {
                if (userRecord.email) {
                    const role = userRecord.email.toLowerCase() === 'lyoni.berbert@gmail.com' ? 'admin' : 'user';
                    const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('user_roles').doc(userRecord.uid);
                    batch.set(docRef, {
                        email: userRecord.email.toLowerCase(),
                        name: userRecord.displayName || userRecord.email.split('@')[0],
                        role: role,
                        createdAt: userRecord.metadata.creationTime || new Date().toISOString()
                    }, { merge: true });
                    count++;
                }
            });
            
            await batch.commit();
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        res.status(200).send(`Migração concluída: ${count} usuários sincronizados.`);
    } catch (error) {
        console.error("Erro na migração:", error);
        res.status(500).send("Erro: " + error.message);
    }
});

exports.scheduledAlerts = onSchedule("every 10 minutes", async (event) => {
    try {
        const db = admin.firestore();
        const messaging = admin.messaging();
        const appId = 'doghotel-production';

        // 1. Configurar Datas e Horários (BRT)
        const timeZone = 'America/Sao_Paulo';
        const nowUTC = new Date();
        const nowBRT = toZonedTime(nowUTC, timeZone);

        const currentHour = getHours(nowBRT);
        const currentMinute = getMinutes(nowBRT);
        const todayStr = format(nowBRT, 'yyyy-MM-dd'); // Formato usado nas datas de checkin/out

        console.log(`[Cron] Execução: ${todayStr} ${currentHour}:${currentMinute} (BRT)`);

        const notificationsToSend = [];

        // 2. Buscar Dados Necessários (Bookings e Clients)
        const dataRef = db.collection('artifacts').doc(appId).collection('public').doc('data');

        const [clientsSnap, bookingsSnap] = await Promise.all([
            dataRef.collection('clients').get(),
            dataRef.collection('bookings').where('checkOut', '>=', todayStr).get()
        ]);

        // Mapear clientes para acesso rápido
        const clientsMap = {};
        clientsSnap.forEach(doc => {
            clientsMap[doc.id] = { id: doc.id, ...doc.data() };
        });

        console.log(`[Cron] Database: ${bookingsSnap.size} bookings, ${clientsSnap.size} clientes.`);

        // 3. Processar Bookings
        bookingsSnap.forEach(doc => {
            const booking = doc.data();
            const bookingId = doc.id;
            const client = clientsMap[booking.clientId];

            if (!client) return; // Booking órfão, ignora

            // --- A) EVENTOS DE CHECK-IN / CHECK-OUT (Briefing Diário) ---
            // Regra Anti-Spam: Dispara apenas nos primeiros 15 min de cada hora comercial (8h-19h)
            // Isso garante aviso mas evita notificar a cada 10 min o dia todo.
            const isBriefingTime = (currentMinute <= 15) && (currentHour >= 8 && currentHour <= 19);

            if (isBriefingTime) {
                if (booking.checkIn === todayStr) {
                    notificationsToSend.push({
                        title: `🏨 Check-in Hoje`,
                        body: `${client.dogName} chega hoje! (Tutor: ${client.ownerName || 'N/A'})`,
                        type: 'checkin',
                        dogName: client.dogName,
                        clientId: client.id,
                        targetRole: 'admin',
                        bookingId: bookingId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                if (booking.checkOut === todayStr) {
                    notificationsToSend.push({
                        title: `👋 Check-out Hoje`,
                        body: `${client.dogName} sai hoje. Preparar pertences.`,
                        type: 'checkout',
                        dogName: client.dogName,
                        clientId: client.id,
                        targetRole: 'admin',
                        bookingId: bookingId,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            // --- B) HOSPEDAGEM ATIVA: REMÉDIOS ---
            // Verifica se hoje está dentro do período (inclusivo)
            // Comparação de Strings yyyy-MM-dd funciona lexicograficamente
            const isActive = (todayStr >= booking.checkIn && todayStr <= booking.checkOut);

            if (isActive) {
                // Varre medicação do cliente associado
                if (client.medications && Array.isArray(client.medications)) {
                    client.medications.forEach(med => {
                        if (!med.time) return;

                        const [medHourStr, medMinStr] = med.time.split(':');
                        const medHour = parseInt(medHourStr);
                        const medMin = parseInt(medMinStr || '0');

                        // Converto tudo para minutos absolutos do dia
                        const currentTotalMinutes = (currentHour * 60) + currentMinute;
                        const medTotalMinutes = (medHour * 60) + medMin;

                        // Diferença: Tem que ser positivo (no futuro) e menor que limite (ex: 20 min)
                        // Cron roda a cada 10 min. Janela segura: 0 a 15 min.
                        // Ex: Med 14:00 (840 min).
                        // Cron 13:40 (820 min) -> Diff 20 (falso, muito cedo)
                        // Cron 13:50 (830 min) -> Diff 10 (true, AVISA 10 min antes)
                        // Cron 14:00 (840 min) -> Diff 0 (falso, ja foi ou agora. Se quiser avisar "em cima", usa >= 0)
                        // Aviso: "Em breve" ou "Agora"

                        const diffMinutes = medTotalMinutes - currentTotalMinutes;

                        // Logica ajustada: Avisar se estiver entre 1 min e 12 minutos antes.
                        // Isso garante que em um ciclo de 10 min, ele pega pelo menos uma vez.
                        // E não repete na próxima (pois terá passado ou diff será negativo ou muito grande)
                        if (diffMinutes > 0 && diffMinutes <= 15) {
                            notificationsToSend.push({
                                title: `💊 Hora do Remédio em ${diffMinutes} min`,
                                body: `Dar ${med.name} (${med.dosage}) para ${client.dogName} às ${med.time}!`,
                                type: 'medication',
                                dogName: client.dogName,
                                clientId: client.id,
                                targetRole: 'admin',
                                medicationName: med.name,
                                timestamp: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }
                    });
                }
            }
        });

        // 4. Persistir e Enviar Push
        if (notificationsToSend.length > 0) {
            console.log(`[Cron] Gerando ${notificationsToSend.length} notificações...`);

            const batch = db.batch();
            const notificationsRef = dataRef.collection('notifications');

            // A) Salvar no Inbox
            notificationsToSend.forEach(note => {
                const newDocInfo = notificationsRef.doc();
                batch.set(newDocInfo, {
                    ...note,
                    read: false,
                    createdAt: nowBRT.toISOString()
                });
            });
            await batch.commit();

            // B) Enviar Push Notification
            const devicesRef = db.collection('artifacts').doc(appId).collection('system').doc('notification_devices');
            const devicesSnap = await devicesRef.get();

            if (devicesSnap.exists) {
                const tokens = devicesSnap.data().tokens || [];
                const uniqueTokens = [...new Set(tokens)]; // Dedup tokens
                const invalidTokens = [];

                if (uniqueTokens.length > 0) {
                    console.log(`[Cron] Enviando push para ${uniqueTokens.length} dispositivos.`);

                    for (const note of notificationsToSend) {
                        const message = {
                            notification: {
                                title: note.title,
                                body: note.body,
                            },
                            webpush: {
                                notification: {
                                    icon: '/logo.png', // Logo relativa (precisa estar na public do hosting) ou absoluta
                                    badge: '/logo.png'
                                },
                                fcm_options: { link: '/' }
                            },
                            tokens: uniqueTokens
                        };

                        try {
                            const response = await messaging.sendEachForMulticast(message);

                            // Coleta tokens inválidos para limpeza
                            response.responses.forEach((resp, idx) => {
                                if (!resp.success) {
                                    const errCode = resp.error.code;
                                    if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-argument') {
                                        invalidTokens.push(uniqueTokens[idx]);
                                    }
                                }
                            });

                        } catch (err) {
                            console.error("[Cron] Erro envio Push:", err.message);
                        }
                    }

                    // C) Limpeza de Tokens
                    if (invalidTokens.length > 0) {
                        const uniqueInvalid = [...new Set(invalidTokens)];
                        console.log(`[Cron] Removendo ${uniqueInvalid.length} tokens inválidos.`);
                        await devicesRef.update({
                            tokens: admin.firestore.FieldValue.arrayRemove(...uniqueInvalid)
                        });
                    }
                } else {
                    console.log("[Cron] Sem dispositivos cadastrados para push.");
                }
            }
        } else {
            console.log("[Cron] Nenhuma notificação necessária neste ciclo.");
        }

        console.log(`[Cron] Ciclo OK. Alertas gerados: ${notificationsToSend.length}`);
        return null;

    } catch (error) {
        console.error("[Cron] Erro Fatal:", error);
        return null;
    }
});

exports.onBookingRequestUpdated = onDocumentUpdated(
    'artifacts/{appId}/public/data/booking_requests/{requestId}',
    async (event) => {
        const newValue = event.data.after.data();
        const previousValue = event.data.before.data();
        const appId = event.params.appId;
        const messaging = admin.messaging();
        const db = admin.firestore();

        if (previousValue.status === 'pending' && newValue.status === 'approved') {
            const clientId = newValue.clientId;
            if (!clientId) return null;

            try {
                // 1. Salvar no Inbox do App (Sininho)
                const notificationRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('notifications').doc();
                await notificationRef.set({
                    title: `✅ Hospedagem Aprovada!`,
                    body: `Sua solicitação de hospedagem para ${newValue.dogName} foi confirmada na agenda.`,
                    type: 'booking_approved',
                    dogName: newValue.dogName,
                    clientId: clientId,
                    targetUserId: clientId,
                    requestId: event.params.requestId,
                    read: false,
                    createdAt: new Date().toISOString()
                });

                // 2. Notificar via Push Notification
                const clientSnap = await db.collection('artifacts').doc(appId)
                    .collection('public').doc('data')
                    .collection('clients').doc(clientId).get();

                if (clientSnap.exists) {
                    const clientData = clientSnap.data();
                    const tokens = clientData.fcmTokens || [];

                    if (tokens.length > 0) {
                        const message = {
                            notification: {
                                title: `✅ Hospedagem Aprovada!`,
                                body: `Sua solicitação de hospedagem para ${newValue.dogName} foi confirmada na agenda.`,
                            },
                            android: {
                                notification: {
                                    sound: 'default'
                                }
                            },
                            apns: {
                                payload: {
                                    aps: {
                                        sound: 'default',
                                        badge: 1
                                    }
                                }
                            },
                            webpush: {
                                notification: {
                                    icon: '/logo.png',
                                    badge: '/logo.png'
                                },
                                fcm_options: { link: '/' }
                            },
                            tokens: [...new Set(tokens)]
                        };

                        const response = await messaging.sendEachForMulticast(message);
                        console.log(`[Push] Solicitação Aprovada para ${clientId}. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`);
                    } else {
                        console.log(`[Push] Cliente ${clientId} não possui tokens registrados.`);
                    }
                }
            } catch (err) {
                console.error("[Push] Erro ao enviar notificação de aprovação:", err);
            }
        }
        return null;
    });

exports.onBookingRequestCreated = onDocumentCreated(
    'artifacts/{appId}/public/data/booking_requests/{requestId}',
    async (event) => {
        const newValue = event.data.data();
        const appId = event.params.appId;
        const messaging = admin.messaging();
        const db = admin.firestore();

        if (newValue.status === 'pending') {
            try {
                // 1. Salvar no Inbox do App (Sininho)
                const notificationRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('notifications').doc();
                await notificationRef.set({
                    title: `🐶 Nova Solicitação de Hospedagem!`,
                    body: `${newValue.ownerName} solicitou uma vaga para ${newValue.dogName}.`,
                    type: 'booking_request',
                    dogName: newValue.dogName,
                    clientId: newValue.clientId || '',
                    targetRole: 'admin',
                    requestId: event.params.requestId,
                    read: false,
                    createdAt: new Date().toISOString()
                });

                // 2. Notificar o admin via Push Notification
                const devicesRef = db.collection('artifacts').doc(appId).collection('system').doc('notification_devices');
                const devicesSnap = await devicesRef.get();

                if (devicesSnap.exists) {
                    const tokens = devicesSnap.data().tokens || [];
                    const uniqueTokens = [...new Set(tokens)];
                    
                    if (uniqueTokens.length > 0) {
                        const message = {
                            notification: {
                                title: `🐶 Nova Solicitação de Hospedagem!`,
                                body: `${newValue.ownerName} solicitou uma vaga para ${newValue.dogName}.`,
                            },
                            android: {
                                notification: {
                                    sound: 'default'
                                }
                            },
                            apns: {
                                payload: {
                                    aps: {
                                        sound: 'default',
                                        badge: 1
                                    }
                                }
                            },
                            webpush: {
                                notification: {
                                    icon: '/logo.png',
                                    badge: '/logo.png'
                                },
                                fcm_options: { link: '/' }
                            },
                            tokens: uniqueTokens
                        };

                        const response = await messaging.sendEachForMulticast(message);
                        console.log(`[Push] Nova Solicitação. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`);
                    }
                }
            } catch (err) {
                console.error("[Push] Erro ao enviar notificação de nova solicitação:", err);
            }
        }
        return null;
    });
