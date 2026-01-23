const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { isSameDay, addDays, getMinutes, getHours } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

admin.initializeApp();

// Função que será chamada pelo CRON a cada 30 minutos
exports.checkScheduledAlerts = functions.https.onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const messaging = admin.messaging();
        const appId = 'doghotel-production';

        // --- CONVERSÃO DE FUSO HORÁRIO (CRÍTICO) ---
        // Converte o "agora" do servidor (UTC) para o "agora" do Brasil (SP)
        const timeZone = 'America/Sao_Paulo';
        const nowUTC = new Date();
        const nowBRT = toZonedTime(nowUTC, timeZone);

        const currentHour = getHours(nowBRT);
        const currentMinute = getMinutes(nowBRT);
        console.log(`Hora Atual Brasil: ${currentHour}:${currentMinute}`);

        const notificationsToSend = [];

        // BUSCA TODOS OS CLIENTES
        const clientsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('clients');
        const clientsSnapshot = await clientsRef.get();

        clientsSnapshot.forEach(doc => {
            const client = doc.data();

            // ----------------------------------------------------
            // 1. CHECAGEM DE VACINAS (MODO TESTE: Sempre Executa)
            // ----------------------------------------------------
            // Removida a restrição de horário (currentHour === 9) para facilitar testes.
            // Em produção, isso significa que se você rodar a URL manualmente várias vezes ao dia,
            // receberá o alerta várias vezes. Pelo Cron (30 em 30 min), receberia 48x.
            // Para uso pessoal ok, para escalar precisaria da trava de volta.
            {
                const checkVaccine = (dateStr, type) => {
                    if (!dateStr) return;
                    const lastDose = new Date(dateStr);

                    const validUntil = addDays(lastDose, 365);
                    const warningDate = addDays(validUntil, -7);

                    // Compara apenas DIA/MÊS/ANO
                    if (isSameDay(nowBRT, warningDate)) {
                        notificationsToSend.push({
                            title: `💉 Vacina a Vencer: ${client.dogName}`,
                            body: `A vacina ${type} de ${client.dogName} vence em 7 dias!`
                        });
                    }
                    if (isSameDay(nowBRT, validUntil)) {
                        notificationsToSend.push({
                            title: `⚠️ Vacina Venceu Hoje: ${client.dogName}`,
                            body: `A vacina ${type} expirou hoje.`
                        });
                    }
                };
                checkVaccine(client.lastAntiRabica, 'Anti-Rábica');
                checkVaccine(client.lastMultipla, 'Múltipla');
            }

            // ----------------------------------------------------
            // 2. CHECAGEM DE MEDICAÇÕES (MODO TESTE: Janela Estendida)
            // ----------------------------------------------------
            if (client.medications && Array.isArray(client.medications)) {
                client.medications.forEach(med => {
                    if (!med.time) return;

                    const [medHourStr] = med.time.split(':');
                    const medHour = parseInt(medHourStr);

                    // MODO TESTE/PERMISSIVO:
                    // Aceita se a hora atual for igual ou adjacente (+/- 1 hora) à hora do remédio.
                    // Isso cobre casos de teste manual onde o relógio não bate exato.
                    const hourDiff = Math.abs(currentHour - medHour);

                    if (hourDiff <= 1) {
                        notificationsToSend.push({
                            title: `💊 Hora do Remédio: ${client.dogName}`,
                            body: `Dar ${med.name} (${med.dosage}) para ${client.dogName} agora (${med.time})!`
                        });
                    }
                });
            }
        });

        // 3. ENVIA AS NOTIFICAÇÕES (BROADCAST)
        if (notificationsToSend.length > 0) {
            const devicesRef = db.collection('artifacts').doc(appId).collection('system').doc('notification_devices');
            const devicesSnap = await devicesRef.get();

            if (devicesSnap.exists) {
                const tokens = devicesSnap.data().tokens || [];
                // Filtra duplicatas
                const uniqueTokens = [...new Set(tokens)];

                if (uniqueTokens.length > 0) {
                    for (const note of notificationsToSend) {
                        const message = {
                            notification: {
                                title: note.title,
                                body: note.body,
                            },
                            tokens: uniqueTokens
                        };

                        try {
                            const response = await messaging.sendMulticast(message);
                            console.log(`Enviado: ${note.title} (Success: ${response.successCount})`);
                        } catch (err) {
                            console.error("Erro multicast:", err);
                        }
                    }
                }
            }
        }

        res.status(200).send(`Verificação @ ${currentHour}:${currentMinute} (BRT). ${notificationsToSend.length} alertas.`);
    } catch (error) {
        console.error("Erro Fatal:", error);
        res.status(500).send("Erro: " + error.message);
    }
});
