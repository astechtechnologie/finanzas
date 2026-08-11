// Autenticación y gestión de sesión
(function() {
  const App = window.App;
  const auth = App.auth;

  // Helpers para mostrar pantallas
  App.mostrarAuth = function() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
    document.getElementById('presupuestoScreen').classList.add('hidden');
  };
  App.mostrarApp = function() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    document.getElementById('presupuestoScreen').classList.add('hidden');
  };

  // Login
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnLogin').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) return;
      auth.signInWithEmailAndPassword(email, password).catch(e => {
        document.getElementById('authError').textContent = e.message;
        document.getElementById('authError').classList.remove('hidden');
        document.getElementById('authSuccess').classList.add('hidden');
      });
    });

    // Registro
    document.getElementById('btnRegister').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) return;
      auth.createUserWithEmailAndPassword(email, password).catch(e => {
        document.getElementById('authError').textContent = e.message;
        document.getElementById('authError').classList.remove('hidden');
        document.getElementById('authSuccess').classList.add('hidden');
      });
    });

    // Reset password
    document.getElementById('btnResetPassword').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      if (!email) {
        document.getElementById('authError').textContent = 'Ingresa tu correo electrónico.';
        document.getElementById('authError').classList.remove('hidden');
        return;
      }
      auth.sendPasswordResetEmail(email).then(() => {
        document.getElementById('authSuccess').textContent = 'Correo enviado. Revisa tu bandeja de entrada.';
        document.getElementById('authSuccess').classList.remove('hidden');
        document.getElementById('authError').classList.add('hidden');
      }).catch(e => {
        document.getElementById('authError').textContent = e.message;
        document.getElementById('authError').classList.remove('hidden');
        document.getElementById('authSuccess').classList.add('hidden');
      });
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut());

    // Cambio de contraseña (se gestiona en ui-main.js o aquí)
    // Lo dejamos en ui-main.js para mantener coherencia, pero podemos escuchar el clic desde aquí
    document.getElementById('btnCambiarPassword').addEventListener('click', () => {
      const panel = document.getElementById('panelCambioPassword');
      panel.classList.toggle('hidden');
      document.getElementById('passwordError').classList.add('hidden');
      document.getElementById('passwordSuccess').classList.add('hidden');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
    });

    document.getElementById('btnUpdatePassword').addEventListener('click', () => {
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      if (!currentPassword || !newPassword) {
        document.getElementById('passwordError').textContent = 'Ambos campos son obligatorios.';
        document.getElementById('passwordError').classList.remove('hidden');
        return;
      }
      if (newPassword.length < 6) {
        document.getElementById('passwordError').textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
        document.getElementById('passwordError').classList.remove('hidden');
        return;
      }
      const user = auth.currentUser;
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      user.reauthenticateWithCredential(credential).then(() => {
        return user.updatePassword(newPassword);
      }).then(() => {
        document.getElementById('passwordSuccess').textContent = 'Contraseña actualizada correctamente.';
        document.getElementById('passwordSuccess').classList.remove('hidden');
        document.getElementById('passwordError').classList.add('hidden');
        setTimeout(() => {
          document.getElementById('panelCambioPassword').classList.add('hidden');
          document.getElementById('passwordSuccess').classList.add('hidden');
        }, 2000);
      }).catch(e => {
        document.getElementById('passwordError').textContent = e.message;
        document.getElementById('passwordError').classList.remove('hidden');
        document.getElementById('passwordSuccess').classList.add('hidden');
      });
    });

    // Toggle visibilidad contraseña
    window.togglePasswordVisibility = function() {
      const passInput = document.getElementById('password');
      const toggleIcon = document.getElementById('togglePassword');
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleIcon.textContent = '🙈';
      } else {
        passInput.type = 'password';
        toggleIcon.textContent = '👁️';
      }
    };

    // Observador de estado de autenticación
    auth.onAuthStateChanged(user => {
      if (user) {
        App.mostrarApp();
        if (typeof App.cargarDatosIniciales === 'function') App.cargarDatosIniciales();
      } else {
        App.mostrarAuth();
      }
    });
  });
})();
