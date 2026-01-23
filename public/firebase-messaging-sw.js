importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyACJGg6OZiZ16aEBOTFaUq9kqQmLxV6OU0",
    authDomain: "doghotel-eca69.firebaseapp.com",
    projectId: "doghotel-eca69",
    storageBucket: "doghotel-eca69.firebasestorage.app",
    messagingSenderId: "845677452140",
    appId: "1:845677452140:web:eb3d58618809c16dccf149"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    // Simplificação para Android: Sem Badge customizado, sem actions extras.
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png'
    };

    // Tenta atualizar o Badge do App (Bolinha vermelha com número)
    if (payload.data && payload.data.badge && 'setAppBadge' in navigator) {
        const badgeCount = parseInt(payload.data.badge);
        if (!isNaN(badgeCount)) {
            navigator.setAppBadge(badgeCount).catch(e => console.log('Erro badge:', e));
        }
    }

    return self.registration.showNotification(notificationTitle, notificationOptions);
});
