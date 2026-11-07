// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Tus datos reales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAD94mJ0gFuFGvRwhhrn8qTFe3orsO_sDA",
  authDomain: "finanzas-personales-a1ee9.firebaseapp.com",
  projectId: "finanzas-personales-a1ee9",
  storageBucket: "finanzas-personales-a1ee9.firebasestorage.app",
  messagingSenderId: "253217416131",
  appId: "1:253217416131:web:ce754c98c1e062f9c45376",
  measurementId: "G-K645PYV7JP"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || 'Finora';
  const notificationOptions = {
    body: payload.notification.body || 'Tienes una nueva notificación',
    icon: './logo-192.png',
    badge: './logo-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
