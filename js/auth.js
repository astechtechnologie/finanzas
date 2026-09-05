(function() {
  const App = window.App;
  const auth = App.auth;
  const db = App.db;

  let modoAuth = 'login';

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
    document.getElementById('authError').classList.add('hidden');
    document.getElementById('authSuccess').classList.add('hidden');
  }

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('tabLogin').addEventListener('click', function() { alternarModo('login'); });
    document.getElementById('tabRegistro').addEventListener('click', function() { alternarModo('registro'); });

    document.getElementById('btnAuthAction').addEventListener('click', function() {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || !password) return;

      if (modoAuth === 'login') {
        auth.signInWithEmailAndPassword(email, password).catch(function(e) {
          document.getElementById('authError').textContent = e.message;
          document.getElementById('authError').classList.remove('hidden');
        });
      } else {
        auth.createUserWithEmailAndPassword(email, password).then(function(userCredential) {
          const user = userCredential.user;
          const admins = ['tucorreo@gmail.com']; // ← Reemplaza con tu correo
          const rol = admins.includes(user.email) ? 'admin' : 'normal';
          return db.collection('usuarios').doc(user.uid).set({
            rol: rol,
            email: user.email
          });
        }).catch(function(e) {
          document.getElementById('authError').textContent = e.message;
          document.getElementById('authError').classList.remove('hidden');
        });
      }
    });

    document.getElementById('btnResetPassword').addEventListener('click', function() {
      const email = document.getElementById('email').value.trim();
      if (!email) {
        document.getElementById('authError').textContent = 'Ingresa tu correo electrónico.';
        document.getElementById('authError').classList.remove('hidden');
        return;
      }
      auth.sendPasswordResetEmail(email).then(function() {
        document.getElementById('authSuccess').textContent = 'Correo de restablecimiento enviado.';
        document.getElementById('authSuccess').classList.remove('hidden');
      }).catch(function(e) {
        document.getElementById('authError').textContent = e.message;
        document.getElementById('authError').classList.remove('hidden');
      });
    });

    document.getElementById('btnLogout').addEventListener('click', function() { auth.signOut(); });

    document.getElementById('btnCambiarPasswordAjustes').addEventListener('click', function() {
      document.getElementById('panelCambioPassword').classList.toggle('hidden');
    });

    document.getElementById('btnUpdatePassword').addEventListener('click', function() {
      const current = document.getElementById('currentPassword').value;
      const nueva = document.getElementById('newPassword').value;
      if (!current || !nueva || nueva.length < 6) return;
      const user = auth.currentUser;
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
      user.reauthenticateWithCredential(credential).then(function() {
        return user.updatePassword(nueva);
      }).then(function() {
        document.getElementById('passwordSuccess').textContent = 'Contraseña actualizada.';
        document.getElementById('passwordSuccess').classList.remove('hidden');
        setTimeout(function() {
          document.getElementById('panelCambioPassword').classList.add('hidden');
          document.getElementById('passwordSuccess').classList.add('hidden');
        }, 2000);
      }).catch(function(e) {
        document.getElementById('passwordError').textContent = e.message;
        document.getElementById('passwordError').classList.remove('hidden');
      });
    });

    window.togglePasswordVisibility = function() {
      const input = document.getElementById('password');
      const icon = document.querySelector('.toggle-password');
      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
      } else {
        input.type = 'password';
        icon.textContent = '👁️';
      }
    };

    auth.onAuthStateChanged(function(user) {
      if (user) {
        App.mostrarApp();
        if (typeof App.cargarDatosIniciales === 'function') App.cargarDatosIniciales();
      } else {
        App.mostrarAuth();
      }
    });
  });
})();
