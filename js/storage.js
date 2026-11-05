// storage.js – Acceso a Firestore (Completo con Espacios Compartidos)
(function() {
  const App = window.App;
  const db = App.db;

  function uid() {
    const user = App.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    return user.uid;
  }

  // ===== LÓGICA DE RUTAS =====
  function obtenerRutaTransacciones() {
  const espacioId = localStorage.getItem('espacioActivoId');
  const perfilActivo = localStorage.getItem('perfilActivo') || 'personal'; // Nuevo

  // Si hay un espacio Y estamos en modo espacio, usamos el espacio
  if (espacioId && perfilActivo === 'espacio') {
    return db.collection('espacios').doc(espacioId).collection('transacciones');
  }
  // De lo contrario, usamos la cuenta personal
  return db.collection('usuarios').doc(uid()).collection('transacciones');
}

  // ===== TRANSACCIONES =====
  App.obtenerTransacciones = function(callback, espacioIdCuenta, mes) {
    try {
      const ref = obtenerRutaTransacciones();
      let query = ref;
      const esEspacio = !!localStorage.getItem('espacioActivoId') && localStorage.getItem('espacioActivoId') !== 'personal';

      if (!esEspacio && espacioIdCuenta && espacioIdCuenta !== 'personal') {
        query = query.where('espacioId', '==', espacioIdCuenta);
      }

      if (mes) {
        const inicio = mes + '-01';
        const fin = mes + '-99';
        query = query.where('fecha', '>=', inicio).where('fecha', '<=', fin);
      }

      query = query.orderBy('fecha', 'desc');

      return query.onSnapshot(
        function(snap) {
          const arr = [];
          snap.forEach(function(doc) { arr.push(Object.assign({ id: doc.id }, doc.data())); });
          callback(arr);
        },
        function(error) { console.error('Error transacciones:', error); callback([]); }
      );
    } catch (error) {
      console.error(error);
      callback([]);
      return function() {};
    }
  };

  App.agregarTransaccion = function(tipo, categoria, subcategoria, descripcion, monto, fecha, metodoPago, espacioIdCuenta) {
    const ref = obtenerRutaTransacciones();
    const esEspacio = !!localStorage.getItem('espacioActivoId') && localStorage.getItem('espacioActivoId') !== 'personal';
    
    return ref.add({
      tipo: tipo,
      categoria: categoria,
      subcategoria: subcategoria || null,
      descripcion: descripcion,
      monto: parseFloat(monto),
      fecha: fecha,
      metodoPago: metodoPago || null,
      espacioId: esEspacio ? 'compartido' : (espacioIdCuenta || 'personal'),
      creadoPor: uid()
    });
  };

  App.actualizarTransaccion = function(id, datos) {
    return obtenerRutaTransacciones().doc(id).update(datos);
  };

  App.eliminarTransaccion = function(id) {
    return obtenerRutaTransacciones().doc(id).delete();
  };

  // ===== ESPACIOS COMPARTIDOS =====
  App.crearEspacioCompartido = function(nombre, callback) {
    const userId = uid();
    const codigoInvitacion = 'PAREJA-' + Math.floor(1000 + Math.random() * 9000);
    
    return db.collection('espacios').doc(codigoInvitacion).set({
      nombre: nombre,
      adminId: userId,
      miembros: [userId],
      codigoInvitacion: codigoInvitacion,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      callback(codigoInvitacion, codigoInvitacion);
    });
  };

  App.unirseAEspacio = function(codigo, callback) {
    const userId = uid();
    const codigoLimpio = codigo.trim().toUpperCase();
    const espacioRef = db.collection('espacios').doc(codigoLimpio);

    return espacioRef.get().then(function(doc) {
      if (!doc.exists) throw new Error('El código de invitación no existe.');
      return espacioRef.update({
        miembros: firebase.firestore.FieldValue.arrayUnion(userId)
      }).then(function() {
        callback(codigoLimpio, doc.data().nombre);
      });
    });
  };

  // ===== CATEGORÍAS =====
  App.obtenerCategorias = function(callback) {
    return db.collection('usuarios/' + uid() + '/categorias').onSnapshot(
      function(snap) {
        const cats = [];
        snap.forEach(function(doc) { cats.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(cats);
      },
      function(error) { console.error('Error categorías:', error); callback([]); }
    );
  };

  App.inicializarCategoriasPorDefecto = function() {
    const categoriasRef = db.collection('usuarios/' + uid() + '/categorias');
    return categoriasRef.limit(1).get().then(function(snap) {
      if (snap.empty) {
        const pre = [
          { nombre: 'salud', icono: 'ph-heartbeat', color: '#ef4444', tipo: 'gasto' },
          { nombre: 'comida', icono: 'ph-utensils', color: '#FF6384', tipo: 'gasto' },
          { nombre: 'transporte', icono: 'ph-bus', color: '#36A2EB', tipo: 'gasto' },
          { nombre: 'ocio', icono: 'ph-game-controller', color: '#FFCE56', tipo: 'gasto' },
          { nombre: 'servicios', icono: 'ph-lightbulb', color: '#4BC0C0', tipo: 'gasto' },
          { nombre: 'salario', icono: 'ph-money', color: '#10b981', tipo: 'ingreso' },
          { nombre: 'freelance', icono: 'ph-laptop', color: '#34d399', tipo: 'ingreso' }
        ];
        const batch = db.batch();
        pre.forEach(function(c) { batch.set(categoriasRef.doc(), c); });
        return batch.commit();
      }
    });
  };

  App.agregarCategoria = function(nombre, icono, color, tipo) {
    return db.collection('usuarios/' + uid() + '/categorias').add({
      nombre: nombre.trim().toLowerCase(), icono: icono || 'ph-house', color: color || '#e8c84c', tipo: tipo || 'gasto'
    });
  };

  App.actualizarCategoria = function(id, datos) {
    return db.collection('usuarios/' + uid() + '/categorias').doc(id).update(datos);
  };

  App.eliminarCategoria = function(id) {
    return db.collection('usuarios/' + uid() + '/categorias').doc(id).delete();
  };

  App.agregarSubcategoria = function(categoriaNombre, subcategoriaNombre) {
    return db.collection('usuarios/' + uid() + '/categorias').where('nombre', '==', categoriaNombre).get().then(function(query) {
      if (query.empty) throw new Error('Categoría no encontrada');
      const catRef = db.collection('usuarios/' + uid() + '/categorias').doc(query.docs[0].id);
      return catRef.update({ subcategorias: firebase.firestore.FieldValue.arrayUnion(subcategoriaNombre.trim().toLowerCase()) });
    });
  };

  // ===== CUENTAS =====
  App.obtenerCuentas = function(callback) {
    const userId = uid();
    return db.collection('usuarios/' + userId + '/cuentas').onSnapshot(
      function(snap) {
        const cuentas = [];
        snap.forEach(function(doc) { cuentas.push(Object.assign({ id: doc.id }, doc.data())); });
        if (cuentas.length === 0) {
          db.collection('usuarios/' + userId + '/cuentas').add({ nombre: 'Personal', tipo: 'personal', color: '#e8c84c' });
          return;
        }
        callback(cuentas);
      },
      function(error) { console.error(error); }
    );
  };

  App.agregarCuenta = function(nombre, tipo, color) {
    return db.collection('usuarios/' + uid() + '/cuentas').add({
      nombre: nombre.trim(), tipo: tipo || 'personal', color: color || '#e8c84c'
    });
  };

  App.eliminarCuenta = function(cuentaId) {
    return db.collection('usuarios/' + uid() + '/cuentas').doc(cuentaId).delete();
  };

  // ===== MÉTODOS DE PAGO =====
  App.obtenerMetodosPago = function(callback) {
    return db.collection('usuarios/' + uid() + '/metodos_pago').onSnapshot(
      function(snap) {
        const metodos = [];
        snap.forEach(function(doc) { metodos.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(metodos);
      },
      function(error) { console.error(error); }
    );
  };

  App.agregarMetodoPago = function(nombre) {
    return db.collection('usuarios/' + uid() + '/metodos_pago').add({ nombre: nombre.trim() });
  };

  App.eliminarMetodoPago = function(id) {
    return db.collection('usuarios/' + uid() + '/metodos_pago').doc(id).delete();
  };

  // ===== PRESUPUESTOS =====
  App.obtenerLimitesCategorias = function(mes, callback) {
    db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes).get().then(function(doc) {
      if (!doc.exists) return callback({ gastos: {}, ingresos: {} });
      const data = doc.data();
      callback({ gastos: data.gastos || {}, ingresos: data.ingresos || {} });
    }).catch(function(error) {
      console.error('Error obteniendo límites:', error);
      callback({ gastos: {}, ingresos: {} });
    });
  };

  App.obtenerLimitesCategoriasDeUsuario = function(usuarioUid, mes, callback) {
    db.collection('usuarios').doc(usuarioUid).collection('presupuestos').doc(mes).get().then(function(doc) {
      if (!doc.exists) return callback({ gastos: {}, ingresos: {} });
      const data = doc.data();
      callback({ gastos: data.gastos || {}, ingresos: data.ingresos || {} });
    }).catch(function(error) {
      console.error(error);
      callback({ gastos: {}, ingresos: {} });
    });
  };

  App.guardarLimiteCategoria = function(mes, tipo, categoria, limite, callback) {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(function(transaction) {
      return transaction.get(ref).then(function(doc) {
        const data = doc.exists ? doc.data() : {};
        const campo = tipo === 'ingreso' ? 'ingresos' : 'gastos';
        const categorias = data[campo] || {};
        if (!categorias[categoria]) categorias[categoria] = { limite: 0, subcategorias: {} };
        categorias[categoria].limite = limite;
        data[campo] = categorias;
        return transaction.set(ref, data, { merge: true });
      });
    }).then(callback).catch(function(err) { console.error(err); });
  };

  App.guardarLimiteSubcategoria = function(mes, categoriaPadre, subcategoriaNombre, limite, callback) {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(function(transaction) {
      return transaction.get(ref).then(function(doc) {
        const data = doc.exists ? doc.data() : {};
        const categorias = data.gastos || {};
        if (!categorias[categoriaPadre]) categorias[categoriaPadre] = { limite: 0, subcategorias: {} };
        if (!categorias[categoriaPadre].subcategorias) categorias[categoriaPadre].subcategorias = {};
        if (!categorias[categoriaPadre].subcategorias[subcategoriaNombre]) {
          categorias[categoriaPadre].subcategorias[subcategoriaNombre] = { limite: 0 };
        }
        categorias[categoriaPadre].subcategorias[subcategoriaNombre].limite = limite;
        data.gastos = categorias;
        return transaction.set(ref, data, { merge: true });
      });
    }).then(callback).catch(function(err) { console.error(err); });
  };

  // ===== METAS =====
  App.obtenerMetas = function(callback) {
    return db.collection('usuarios/' + uid() + '/metas').onSnapshot(
      function(snap) {
        const metas = [];
        snap.forEach(function(doc) { metas.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(metas);
      },
      function(error) { console.error('Error en metas:', error); }
    );
  };

  App.obtenerMetasDeUsuario = function(usuarioUid, callback) {
    return db.collection('usuarios/' + usuarioUid + '/metas').onSnapshot(
      function(snap) {
        const metas = [];
        snap.forEach(function(doc) { metas.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(metas);
      },
      function(error) { console.error(error); }
    );
  };

  App.agregarMeta = function(meta) {
    return db.collection('usuarios/' + uid() + '/metas').add(meta);
  };

  App.aportarMeta = function(id, montoAporte) {
    const ref = db.collection('usuarios/' + uid() + '/metas').doc(id);
    return db.runTransaction(function(transaction) {
      return transaction.get(ref).then(function(doc) {
        if (!doc.exists) throw "La meta no existe";
        const data = doc.data();
        const nuevoAhorrado = (data.ahorrado || 0) + montoAporte;
        return transaction.update(ref, { ahorrado: nuevoAhorrado });
      });
    });
  };

  App.actualizarMeta = function(id, datos) {
    return db.collection('usuarios/' + uid() + '/metas').doc(id).update(datos);
  };

  App.eliminarMeta = function(id) {
    return db.collection('usuarios/' + uid() + '/metas').doc(id).delete();
  };

  // ===== ADMIN =====
  App.obtenerRolUsuario = function(callback) {
    const userId = uid();
    db.collection('usuarios').doc(userId).get().then(function(doc) {
      const rol = doc.exists ? (doc.data().rol || 'normal') : 'normal';
      callback(rol);
    }).catch(function(error) {
      console.warn('No se pudo obtener rol, usando normal', error);
      callback('normal');
    });
  };

  App.obtenerUsuariosVinculados = function(callback) {
    return db.collection('usuarios').doc(uid()).collection('vinculados').onSnapshot(
      function(snap) {
        const usuarios = [];
        snap.forEach(function(doc) { usuarios.push(Object.assign({ uid: doc.id }, doc.data())); });
        callback(usuarios);
      },
      function(error) { console.error(error); }
    );
  };

  App.obtenerUsuarioPorId = function(usuarioUid, callback) {
    db.collection('usuarios').doc(usuarioUid).get().then(function(doc) {
      callback(doc.exists ? Object.assign({ uid: doc.id }, doc.data()) : null);
    }).catch(function(error) { console.error(error); callback(null); });
  };

  App.actualizarRolUsuario = function(usuarioUid, nuevoRol) {
    return db.collection('usuarios').doc(usuarioUid).update({ rol: nuevoRol });
  };

  App.actualizarEstadoUsuario = function(usuarioUid, activo) {
    return db.collection('usuarios').doc(usuarioUid).update({ activo: activo });
  };

  App.obtenerTransaccionesDeUsuario = function(usuarioUid, callback) {
    return db.collection('usuarios/' + usuarioUid + '/transacciones').orderBy('fecha', 'desc').limit(100).onSnapshot(
      function(snap) {
        const arr = [];
        snap.forEach(function(doc) { arr.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(arr);
      },
      function(error) { console.error(error); callback([]); }
    );
  };

  App.buscarUsuarioPorEmail = function(email, callback) {
    if (!email) {
      callback({ encontrado: false, mensaje: 'Ingresa un correo electrónico' });
      return;
    }
    db.collection('usuarios').where('email', '==', email.trim().toLowerCase()).get().then(function(query) {
      if (!query.empty) {
        const doc = query.docs[0];
        callback({ encontrado: true, usuario: Object.assign({ uid: doc.id }, doc.data()) });
      } else {
        callback({ encontrado: false, mensaje: 'No se encontró un usuario con ese email' });
      }
    }).catch(function(error) {
      console.error(error);
      callback({ encontrado: false, mensaje: 'Error: ' + error.message });
    });
  };

  App.verificarSiYaVinculado = function(usuarioUid, callback) {
    const adminUid = uid();
    db.collection('usuarios').doc(adminUid).collection('vinculados').doc(usuarioUid).get().then(function(doc) {
      callback(doc.exists);
    }).catch(function() { callback(false); });
  };

  App.vincularUsuarioPorEmail = function(email, callback) {
    if (!email) return;
    const emailLimpio = email.trim().toLowerCase();
    db.collection('usuarios').where('email', '==', emailLimpio).get().then(function(query) {
      if (!query.empty) {
        const usuario = query.docs[0];
        const adminUid = uid();
        return db.collection('usuarios').doc(adminUid).collection('vinculados').doc(usuario.id).set({ email: emailLimpio })
          .then(function() { if (callback) callback(); });
      }
    }).catch(function(error) { console.error(error); });
  };

  App.eliminarVinculacion = function(usuarioUid) {
    return db.collection('usuarios').doc(uid()).collection('vinculados').doc(usuarioUid).delete();
  };

  App.crearOrganizacion = function(nombre) {
    return db.collection('organizaciones').add({ nombre: nombre, adminId: uid() });
  };

  App.obtenerOrganizaciones = function(callback) {
    return db.collection('organizaciones').where('adminId', '==', uid()).onSnapshot(
      function(snap) {
        const orgs = [];
        snap.forEach(function(doc) { orgs.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(orgs);
      },
      function(error) { console.error(error); }
    );
  };

  App.eliminarOrganizacion = function(orgId) {
    return db.collection('organizaciones').doc(orgId).delete();
  };

  App.obtenerAuditoria = function(callback) {
    return db.collection('usuarios').doc(uid()).collection('auditoria').orderBy('fecha', 'desc').limit(50).onSnapshot(
      function(snap) {
        const registros = [];
        snap.forEach(function(doc) { registros.push(Object.assign({ id: doc.id }, doc.data())); });
        callback(registros);
      },
      function(error) { console.error(error); }
    );
  };

  App.obtenerEstadisticasGlobales = function(callback) {
    App.obtenerUsuariosVinculados(function(usuarios) {
      if (usuarios.length === 0) {
        callback({ usuarios: 0, transacciones: 0, ingresos: 0, gastos: 0 });
        return;
      }
      let totalTransacciones = 0, totalIngresos = 0, totalGastos = 0;
      let pendientes = usuarios.length;

      usuarios.forEach(function(usuario) {
        App.obtenerTransaccionesDeUsuario(usuario.uid, function(transacciones) {
          transacciones.forEach(function(t) {
            totalTransacciones++;
            if (t.tipo === 'ingreso') totalIngresos += t.monto;
            else totalGastos += t.monto;
          });
          pendientes--;
          if (pendientes === 0) {
            callback({ usuarios: usuarios.length, transacciones: totalTransacciones, ingresos: totalIngresos, gastos: totalGastos });
          }
        });
      });
    });
  };

})();
