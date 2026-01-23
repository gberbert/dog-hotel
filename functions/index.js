const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { isSameDay, parse, addDays, getMinutes, getHours } = require('date-fns');
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
            // 1. CHECAGEM DE VACINAS (1x ao Dia - 09:00~09:30)
            // ----------------------------------------------------
            if (currentHour === 9 && currentMinute < 30) {
                const checkVaccine = (dateStr, type) => {
                    if (!dateStr) return;
                    const lastDose = new Date(dateStr); // Assume string date YYYY-MM-DD
                    // Precisamos garantir que a data da vacina seja interpretada no mesmo fuso ou sem fuso
                    // date-fns parseISO é bom

                    const validUntil = addDays(lastDose, 365);
                    const warningDate = addDays(validUntil, -7);

                    // Compara apenas DIA/MÊS/ANO, ignora hora
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
            // 2. CHECAGEM DE MEDICAÇÕES (A cada 30 min)
            // ----------------------------------------------------
            // Formato esperado de medications: [{ name: 'Dipirona', time: '10:00', dosage: '1g' }, ...]
            if (client.medications && Array.isArray(client.medications)) {
                client.medications.forEach(med => {
                    if (!med.time) return;

                    // Extrai hora e minuto da medicação (ex: "10:00")
                    const [medHourStr, medMinuteStr] = med.time.split(':');
                    const medHour = parseInt(medHourStr);
                    const medMinute = parseInt(medMinuteStr);

                    // Lógica de "Janela de Disparo":
                    // Como o cron roda de 30 em 30 min (ex: 10:00, 10:30, 11:00),
                    // verificamos se a medicação está agendada para o intervalo "agora" até "agora + 29 min"
                    // OU se bate exatamente com a hora atual (margem de erro de 2 min para garantir)

                    // Exemplo: Agora é 10:01. Medicação é 10:00.
                    // Math.abs(10 - 10) === 0 e Math.abs(1 - 0) < 5 -> Dispara.

                    const hourDiff = Math.abs(currentHour - medHour);
                    const minuteDiff = Math.abs(currentMinute - medMinute);

                    // Aceita se estiver na mesma hora e diferença de minutos for pequena (< 25 min)
                    // (Considerando que o cron roda a cada 30 min, se rodarmos as 10:00 e a medicação for 10:15, pegaremos no próximo? Não.
                    // Melhor abordagem: Verificar se a medicação está DENTRO da janela da rodada atual.

                    // Se rodou as 10:00, pega tudo das 09:45 até 10:15? Não, melhor, pega da hora cheia.
                    // Vamos simplificar: Se Hora == MedHora E (abs(Minuto - MedMinuto) <= 15)

                    if (hourDiff === 0 && minuteDiff <= 15) {
                        // Para evitar disparar "Teste (1g)" duas vezes se o cron rodar 10:05 e 10:10, 
                        // idealmente teríamos um flag de 'enviado', mas sem backend complexo, 
                        // assumimos que o cron é fiel aos 30 min (ex: 10:00, 10:30).

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
