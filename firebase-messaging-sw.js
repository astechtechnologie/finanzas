// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// 🔴 IMPORTANTE: Pega aquí tu configuración de firebase-config.js
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || 'Finora';
  const notificationOptions = {
    body: payload.notification.body || 'Tienes una nueva notificación',
    icon: '/logo-192.png',
    badge: '/logo-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
