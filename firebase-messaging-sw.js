// firebase-messaging-sw.js — FCM Web Push para Finora
// Los mensajes que contienen `notification` son mostrados automáticamente por FCM
// cuando la app está en segundo plano. No llamar showNotification() aquí:
// provocaría duplicados de las notificaciones programadas.
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAD94mJ0gFuFGvRwhhrn8qTFe3orsO_sDA',
  authDomain: 'finanzas-personales-a1ee9.firebaseapp.com',
  projectId: 'finanzas-personales-a1ee9',
  storageBucket: 'finanzas-personales-a1ee9.firebasestorage.app',
  messagingSenderId: '253217416131',
  appId: '1:253217416131:web:ce754c98c1e062f9c45376'
});

firebase.messaging();
