(function() {
  const App = window.App;
  const auth = App.auth;

  let modoAuth = 'login'; // 'login' o 'registro'

  App.mostrarAuth = function() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
  };

  App.mostrarApp = function() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
  };

  function alternarModo(modo) {
    modoAuth = modo;
    document.getElementById('tabLogin').classList.toggle('active', modo === 'login');
    document.getElementById('tabRegistro').classList.toggle('active', modo === 'registro');
    document.getElementById('btnAuthAction').textContent = modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    // Limpiar errores al cambiar de modo
    document.getElementById('authError').classList.add('hidden');
    document.getElementById('authSuccess').classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Pestañas
    document.getElementById('tabLogin').addEventListener('click', () => alternarModo('login'));
    document.getElementById('tabRegistro').addEventListener('click', () => alternarModo('registro'));

    // Acción principal
    document.getElementById('btnAuthAction').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) return;

      if (modoAuth === 'login') {
        auth.signInWithEmailAndPassword(email, password)
          .then(() => {})
          .catch(e => {
            document.getElementById('authError').textContent = e.message;
            document.getElementById('authError').classList.remove('hidden');
          });
      } else {
        auth.createUserWithEmailAndPassword(email, password)
          .then(() => {})
          .catch(e => {
            document.getElementById('authError').textContent = e.message;
            document.getElementById('authError').classList.remove('hidden');
          });
      }
    });

    // Restablecer contraseña
    document.getElementById('btnResetPassword').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      if (!email) {
        document.getElementById('authError').textContent = 'Ingresa tu correo electrónico.';
        document.getElementById('authError').classList.remove('hidden');
        return;
      }
      auth.sendPasswordResetEmail(email)
        .then(() => {
          document.getElementById('authSuccess').textContent = 'Correo de restablecimiento enviado.';
          document.getElementById('authSuccess').classList.remove('hidden');
        })
        .catch(e => {
          document.getElementById('authError').textContent = e.message;
          document.getElementById('authError').classList.remove('hidden');
        });
    });

    // Observador de estado
    auth.onAuthStateChanged(user => {
      if (user) {
        App.mostrarApp();
        if (typeof App.cargarDatosIniciales === 'function') App.cargarDatosIniciales();
      } else {
        App.mostrarAuth();
      }
    });

    // Toggle visibilidad contraseña (función global)
    window.togglePasswordVisibility = function() {
      const passInput = document.getElementById('password');
      const toggleIcon = document.querySelector('.toggle-password');
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleIcon.textContent = '🙈';
      } else {
        passInput.type = 'password';
        toggleIcon.textContent = '👁️';
      }
    };
  });
})();
