// storage.js – acceso a Firestore con funciones de administración avanzadas
(function() {
  const App = window.App;
  const db = App.db;
  function uid() { return App.auth.currentUser.uid; }

  // ===== TRANSACCIONES =====
  App.obtenerTransacciones = function(callback) {
    return db.collection('usuarios/' + uid() + '/transacciones').orderBy('fecha', 'desc').onSnapshot(function(snap) {
      const arr = [];
      snap.forEach(function(doc) { arr.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(arr);
    });
  };

  App.agregarTransaccion = function(tipo, categoria, subcategoria, descripcion, monto, fecha, metodoPago) {
    return db.collection('usuarios/' + uid() + '/transacciones').add({
      tipo: tipo,
      categoria: categoria,
      subcategoria: subcategoria || null,
      descripcion: descripcion,
      monto: parseFloat(monto),
      fecha: fecha,
      metodoPago: metodoPago || null
    });
  };

  App.actualizarTransaccion = function(id, datos) {
    return db.collection('usuarios/' + uid() + '/transacciones').doc(id).update(datos);
  };

  App.eliminarTransaccion = function(id) {
    return db.collection('usuarios/' + uid() + '/transacciones').doc(id).delete();
  };

  // ===== CATEGORÍAS =====
  App.obtenerCategorias = function(callback) {
    return db.collection('usuarios/' + uid() + '/categorias').onSnapshot(function(snap) {
      const cats = [];
      snap.forEach(function(doc) { cats.push(Object.assign({ id: doc.id }, doc.data())); });
      if (cats.length === 0) {
        const pre = [
          { nombre: 'salud', emoji: '⚕️', color: '#ef4444', tipo: 'gasto' },
          { nombre: 'comida', emoji: '🍔', color: '#FF6384', tipo: 'gasto' },
          { nombre: 'transporte', emoji: '🚌', color: '#36A2EB', tipo: 'gasto' },
          { nombre: 'ocio', emoji: '🎮', color: '#FFCE56', tipo: 'gasto' },
          { nombre: 'servicios', emoji: '💡', color: '#4BC0C0', tipo: 'gasto' },
          { nombre: 'otros', emoji: '📦', color: '#9966FF', tipo: 'gasto' },
          { nombre: 'salario', emoji: '💼', color: '#10b981', tipo: 'ingreso' },
          { nombre: 'freelance', emoji: '💻', color: '#34d399', tipo: 'ingreso' }
        ];
        const batch = db.batch();
        pre.forEach(function(c) { batch.set(db.collection('usuarios/' + uid() + '/categorias').doc(), c); });
        batch.commit();
        return;
      }
      callback(cats);
    });
  };

  App.agregarCategoria = function(nombre, emoji, color, tipo) {
    return db.collection('usuarios/' + uid() + '/categorias').add({
      nombre: nombre.trim().toLowerCase(),
      emoji: emoji || '📌',
      color: color || '#10b981',
      tipo: tipo || 'gasto'
    });
  };

  App.eliminarCategoria = function(id) {
    return db.collection('usuarios/' + uid() + '/categorias').doc(id).delete();
  };

  // ===== PRESUPUESTOS MENSUALES =====
  App.obtenerLimitesCategorias = function(mes, callback) {
    db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes).get().then(function(doc) {
      if (!doc.exists) return callback({ gastos: {}, ingresos: {} });
      const data = doc.data();
      callback({
        gastos: data.gastos || {},
        ingresos: data.ingresos || {}
      });
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
    }).then(callback);
  };

  App.guardarLimiteSubcategoria = function(mes, tipo, categoria, subcategoria, limite, callback) {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(function(transaction) {
      return transaction.get(ref).then(function(doc) {
        const data = doc.exists ? doc.data() : {};
        const campo = tipo === 'ingreso' ? 'ingresos' : 'gastos';
        const categorias = data[campo] || {};
        if (!categorias[categoria]) categorias[categoria] = { limite: 0, subcategorias: {} };
        if (!categorias[categoria].subcategorias) categorias[categoria].subcategorias = {};
        categorias[categoria].subcategorias[subcategoria] = { limite: limite };
        data[campo] = categorias;
        return transaction.set(ref, data, { merge: true });
      });
    }).then(callback);
  };

  App.eliminarLimiteSubcategoria = function(mes, tipo, categoria, subcategoria, callback) {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(function(transaction) {
      return transaction.get(ref).then(function(doc) {
        if (!doc.exists) return;
        const data = doc.data();
        const campo = tipo === 'ingreso' ? 'ingresos' : 'gastos';
        const categorias = data[campo] || {};
        if (categorias[categoria] && categorias[categoria].subcategorias) {
          delete categorias[categoria].subcategorias[subcategoria];
          if (Object.keys(categorias[categoria].subcategorias).length === 0) {
            delete categorias[categoria].subcategorias;
          }
        }
        data[campo] = categorias;
        return transaction.set(ref, data, { merge: true });
      });
    }).then(callback);
  };

  App.obtenerHistorialPresupuestos = function(callback) {
    const meses = [];
    const hoy = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    Promise.all(meses.map(function(m) {
      return db.collection('usuarios').doc(uid()).collection('presupuestos').doc(m).get();
    })).then(function(docs) {
      callback(docs.map(function(doc, i) {
        return {
          mes: meses[i],
          gastos: doc.exists ? Object.values(doc.data().gastos || doc.data().categorias || {}).reduce(function(a, b) { return a + b; }, 0) : 0,
          ingresos: doc.exists ? Object.values(doc.data().ingresos || {}).reduce(function(a, b) { return a + b; }, 0) : 0
        };
      }));
    });
  };

  // ===== METAS DE AHORRO =====
  App.obtenerMetas = function(callback) {
    return db.collection('usuarios/' + uid() + '/metas').onSnapshot(function(snap) {
      const metas = [];
      snap.forEach(function(doc) { metas.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(metas);
    });
  };

  App.agregarMeta = function(meta) {
    return db.collection('usuarios/' + uid() + '/metas').add(meta);
  };

  App.actualizarMeta = function(id, datos) {
    return db.collection('usuarios/' + uid() + '/metas').doc(id).update(datos);
  };

  App.eliminarMeta = function(id) {
    return db.collection('usuarios/' + uid() + '/metas').doc(id).delete();
  };

  App.obtenerItemsMeta = function(metaId, callback) {
    return db.collection('usuarios/' + uid() + '/metas').doc(metaId).collection('items').onSnapshot(function(snap) {
      const items = [];
      snap.forEach(function(doc) { items.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(items);
    });
  };

  App.agregarItemMeta = function(metaId, item) {
    return db.collection('usuarios/' + uid() + '/metas').doc(metaId).collection('items').add(item);
  };

  App.actualizarItemMeta = function(metaId, itemId, datos) {
    return db.collection('usuarios/' + uid() + '/metas').doc(metaId).collection('items').doc(itemId).update(datos);
  };

  App.eliminarItemMeta = function(metaId, itemId) {
    return db.collection('usuarios/' + uid() + '/metas').doc(metaId).collection('items').doc(itemId).delete();
  };

  // ===== SUSCRIPCIONES =====
  App.obtenerSuscripciones = function(callback) {
    return db.collection('usuarios/' + uid() + '/suscripciones').onSnapshot(function(snap) {
      const suscripciones = [];
      snap.forEach(function(doc) { suscripciones.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(suscripciones);
    });
  };

  App.agregarSuscripcion = function(suscripcion) {
    return db.collection('usuarios/' + uid() + '/suscripciones').add(suscripcion);
  };

  App.actualizarSuscripcion = function(id, datos) {
    return db.collection('usuarios/' + uid() + '/suscripciones').doc(id).update(datos);
  };

  App.eliminarSuscripcion = function(id) {
    return db.collection('usuarios/' + uid() + '/suscripciones').doc(id).delete();
  };

  // ===== MÉTODOS DE PAGO =====
  App.obtenerMetodosPago = function(callback) {
    return db.collection('usuarios/' + uid() + '/metodos_pago').onSnapshot(function(snap) {
      const metodos = [];
      snap.forEach(function(doc) { metodos.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(metodos);
    });
  };

  App.agregarMetodoPago = function(nombre) {
    return db.collection('usuarios/' + uid() + '/metodos_pago').add({ nombre: nombre.trim() });
  };

  App.eliminarMetodoPago = function(id) {
    return db.collection('usuarios/' + uid() + '/metodos_pago').doc(id).delete();
  };

  // ===== PRÉSTAMOS =====
  App.obtenerPrestamos = function(callback) {
    return db.collection('usuarios/' + uid() + '/prestamos').onSnapshot(function(snap) {
      const prestamos = [];
      snap.forEach(function(doc) { prestamos.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(prestamos);
    });
  };

  App.agregarPrestamo = function(prestamo) {
    return db.collection('usuarios/' + uid() + '/prestamos').add(prestamo);
  };

  App.actualizarPrestamo = function(id, datos) {
    return db.collection('usuarios/' + uid() + '/prestamos').doc(id).update(datos);
  };

  App.eliminarPrestamo = function(id) {
    return db.collection('usuarios/' + uid() + '/prestamos').doc(id).delete();
  };

  // ===== ADMINISTRADOR =====
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
    return db.collection('usuarios').doc(uid()).collection('vinculados').onSnapshot(function(snap) {
      const usuarios = [];
      snap.forEach(function(doc) {
        usuarios.push(Object.assign({ uid: doc.id }, doc.data()));
      });
      callback(usuarios);
    });
  };

  App.vincularUsuarioPorEmail = function(email, callback) {
    if (!email) {
      alert('Ingresa un correo electrónico');
      return;
    }
    db.collection('usuarios').where('email', '==', email).get().then(function(query) {
      if (!query.empty) {
        const usuario = query.docs[0];
        const adminUid = uid();
        return db.collection('usuarios').doc(adminUid).collection('vinculados').doc(usuario.id).set({
          email: email
        }).then(function() {
          alert('Usuario vinculado correctamente');
          if (callback) callback();
        }).catch(function(error) {
          console.error('Error al vincular:', error);
          alert('Error al vincular: ' + error.message);
        });
      } else {
        alert('No se encontró usuario con ese email');
      }
    }).catch(function(error) {
      console.error('Error buscando usuario:', error);
      alert('Error buscando: ' + error.message);
    });
  };

  App.eliminarVinculacion = function(usuarioUid) {
    return db.collection('usuarios').doc(uid()).collection('vinculados').doc(usuarioUid).delete();
  };

  App.obtenerTransaccionesDeUsuario = function(usuarioUid, callback) {
    return db.collection('usuarios/' + usuarioUid + '/transacciones').orderBy('fecha', 'desc').onSnapshot(function(snap) {
      const arr = [];
      snap.forEach(function(doc) { arr.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(arr);
    });
  };

  App.actualizarRolUsuario = function(usuarioUid, nuevoRol) {
    return db.collection('usuarios').doc(usuarioUid).update({ rol: nuevoRol });
  };

  App.actualizarEstadoUsuario = function(usuarioUid, activo) {
    return db.collection('usuarios').doc(usuarioUid).update({ activo: activo });
  };

  App.obtenerUsuarioPorId = function(usuarioUid, callback) {
    db.collection('usuarios').doc(usuarioUid).get().then(function(doc) {
      callback(doc.exists ? Object.assign({ uid: doc.id }, doc.data()) : null);
    });
  };

  // ===== ORGANIZACIONES =====
  App.crearOrganizacion = function(nombre) {
    return db.collection('organizaciones').add({
      nombre: nombre,
      adminId: uid()
    });
  };

  App.obtenerOrganizaciones = function(callback) {
    return db.collection('organizaciones').where('adminId', '==', uid()).onSnapshot(function(snap) {
      const orgs = [];
      snap.forEach(function(doc) {
        orgs.push(Object.assign({ id: doc.id }, doc.data()));
      });
      callback(orgs);
    });
  };

  App.eliminarOrganizacion = function(orgId) {
    return db.collection('organizaciones').doc(orgId).delete();
  };

  // ===== AUDITORÍA =====
  App.registrarAuditoria = function(accion, detalle) {
    return db.collection('usuarios').doc(uid()).collection('auditoria').add({
      accion: accion,
      detalle: detalle,
      fecha: new Date().toISOString()
    });
  };

  App.obtenerAuditoria = function(callback) {
    return db.collection('usuarios').doc(uid()).collection('auditoria').orderBy('fecha', 'desc').onSnapshot(function(snap) {
      const registros = [];
      snap.forEach(function(doc) { registros.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(registros);
    });
  };

  // ===== MENSAJERÍA =====
  App.enviarMensajeAUsuario = function(usuarioUid, mensaje) {
    return db.collection('usuarios').doc(usuarioUid).collection('mensajes').add({
      mensaje: mensaje,
      de: uid(),
      fecha: new Date().toISOString()
    });
  };

  App.obtenerMensajesDeUsuario = function(usuarioUid, callback) {
    return db.collection('usuarios').doc(usuarioUid).collection('mensajes').orderBy('fecha', 'desc').onSnapshot(function(snap) {
      const mensajes = [];
      snap.forEach(function(doc) { mensajes.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(mensajes);
    });
  };

  // ===== ESTADÍSTICAS GLOBALES =====
  App.obtenerEstadisticasGlobales = function(callback) {
    // Obtener todos los usuarios vinculados
    App.obtenerUsuariosVinculados(function(usuarios) {
      if (usuarios.length === 0) {
        callback({ usuarios: 0, transacciones: 0, ingresos: 0, gastos: 0 });
        return;
      }
      let totalTransacciones = 0;
      let totalIngresos = 0;
      let totalGastos = 0;
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
            callback({
              usuarios: usuarios.length,
              transacciones: totalTransacciones,
              ingresos: totalIngresos,
              gastos: totalGastos
            });
          }
        });
      });
    });
  };

  // ===== EXPORTAR / IMPORTAR DATOS =====
  App.exportarDatosUsuario = function(usuarioUid, callback) {
    // Esta función es un ejemplo; en producción usarías Cloud Functions.
    alert('Exportación de datos aún en desarrollo');
    if (callback) callback();
  };
})();
