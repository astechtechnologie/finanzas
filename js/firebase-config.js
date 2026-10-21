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

  // ==================== APP CHECK (SEGURIDAD) ====================
  try {
    // Usamos el proveedor de reCAPTCHA Enterprise explícitamente
    const appCheck = firebase.appCheck();
    
    // La clave que copiaste de Google Cloud
    const siteKey = '6Ld2CvktAAAAAI-Mxml6-l0OVmVmwdXuepktt-0';
    
    // Inicializamos con el proveedor correcto
    appCheck.activate(
      new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey),
      true // Auto-refresh del token
    );
    
    console.log("✅ App Check activado correctamente con reCAPTCHA Enterprise.");
  } catch (error) {
    console.error("❌ Error al activar App Check:", error);
  }
})();
