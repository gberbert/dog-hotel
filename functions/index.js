const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// MODO DEBUG RADICAL: PING PURO
exports.checkScheduledAlerts = functions.https.onRequest(async (req, res) => {
    try {
        const db = admin.firestore();
        const messaging = admin.messaging();
        const appId = 'doghotel-production';

        const devicesRef = db.collection('artifacts').doc(appId).collection('system').doc('notification_devices');
        const devicesSnap = await devicesRef.get();

        if (!devicesSnap.exists) {
            return res.status(200).send("Nenhum dispositivo cadastrado (Coleção vazia).");
        }

        const tokens = devicesSnap.data().tokens || [];
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length === 0) {
            return res.status(200).send("Lista de tokens vazia.");
        }

        const message = {
            notification: {
                title: "🔔 Teste de Notificação",
                body: "Se você leu isso, o sistema funciona! 🎉",
            },
            webpush: {
                notification: {
                    icon: '/icon-192.png'
                },
                fcm_options: {
                    link: 'https://dog-hotel-iota.vercel.app/'
                }
            },
            tokens: uniqueTokens
        };

        const response = await messaging.sendEachForMulticast(message);

        let report = `Tentativa de envio para ${uniqueTokens.length} tokens.\n`;
        report += `Sucesso: ${response.successCount}\n`;
        report += `Falha: ${response.failureCount}\n`;

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    report += `❌ Token [${idx}] falhou: ${resp.error.message}\n`;
                }
            });
        }

        console.log(report);
        res.status(200).send(report);

    } catch (error) {
        console.error("Erro Fatal:", error);
        res.status(500).send("Erro: " + error.message);
    }
});
