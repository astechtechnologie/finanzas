(function() {
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
  window.App = window.App || {};
  window.App.auth = firebase.auth();
  window.App.db = firebase.firestore();
})();
