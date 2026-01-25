// Script simples para adicionar uma notificação de teste via Admin SDK local (se autenticado)
// Caso não esteja, vai falhar, mas é a melhor tentativa programática limpa.

const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // Caminho hipotético

// Se não tiver chave, tenta applicationDefault (funciona se tiver 'firebase login' e 'gcloud auth application-default login')
try {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
} catch (e) {
    admin.initializeApp(); // Tenta sem credenciais (emulators ou environment variables)
}

const db = admin.firestore();

async function addTestNotification() {
    console.log("Inserindo notificação de teste...");
    try {
        await db.collection('artifacts').doc('doghotel-production')
            .collection('public').doc('data')
            .collection('notifications').add({
                title: "🧪 Teste de Swipe",
                body: "Arraste para a esquerda para ver os botões de ação (Mobile) ou use os ícones (Desktop).",
                read: false,
                type: 'test',
                createdAt: new Date().toISOString()
            });
        console.log("Sucesso!");
    } catch (error) {
        console.error("Erro:", error.message);
    }
}

addTestNotification();
