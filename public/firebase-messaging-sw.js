importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

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

// Handler para notificações em Segundo Plano
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png', // Fallback icon
        badge: '/badge-icon.png' // Se tiver
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
