// Autenticación y gestión de sesión
(function() {
  const App = window.App;
  const auth = App.auth;

  // Helpers para mostrar pantallas
  App.mostrarAuth = function() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
  };
  App.mostrarApp = function() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
  };

  document.addEventListener('DOMContentLoaded', function() {
    // Login
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

    // Logout (ahora en vista Ajustes)
    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut());

    // Cambio de contraseña (ahora en vista Ajustes con nuevo ID)
    document.getElementById('btnCambiarPasswordAjustes').addEventListener('click', () => {
      const panel = document.getElementById('panelCambioPassword');
      panel.classList.toggle('hidden');
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

    // Toggle visibilidad contraseña en login
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
