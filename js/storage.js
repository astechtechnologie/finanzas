// storage.js – acceso a Firestore con modo negocio
(function() {
  const App = window.App;
  const db = App.db;
  function uid() { return App.auth.currentUser.uid; }

  // ===== TRANSACCIONES =====
  App.obtenerTransacciones = function(callback, espacioId) {
    const ref = db.collection('usuarios/' + uid() + '/transacciones');
    const query = espacioId ? ref.where('espacioId', '==', espacioId) : ref;
    return query.orderBy('fecha', 'desc').onSnapshot(function(snap) {
      const arr = [];
      snap.forEach(function(doc) { arr.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(arr);
    });
  };

  App.agregarTransaccion = function(tipo, categoria, subcategoria, descripcion, monto, fecha, metodoPago, espacioId) {
    return db.collection('usuarios/' + uid() + '/transacciones').add({
      tipo: tipo,
      categoria: categoria,
      subcategoria: subcategoria || null,
      descripcion: descripcion,
      monto: parseFloat(monto),
      fecha: fecha,
      metodoPago: metodoPago || null,
      espacioId: espacioId || 'personal'
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
          { nombre: 'salud', icono: 'ph-heartbeat', color: '#ef4444', tipo: 'gasto' },
          { nombre: 'comida', icono: 'ph-utensils', color: '#FF6384', tipo: 'gasto' },
          { nombre: 'transporte', icono: 'ph-bus', color: '#36A2EB', tipo: 'gasto' },
          { nombre: 'ocio', icono: 'ph-game-controller', color: '#FFCE56', tipo: 'gasto' },
          { nombre: 'servicios', icono: 'ph-lightbulb', color: '#4BC0C0', tipo: 'gasto' },
          { nombre: 'salario', icono: 'ph-money', color: '#10b981', tipo: 'ingreso' },
          { nombre: 'freelance', icono: 'ph-laptop', color: '#34d399', tipo: 'ingreso' }
        ];
        const batch = db.batch();
        pre.forEach(function(c) { batch.set(db.collection('usuarios/' + uid() + '/categorias').doc(), c); });
        batch.commit();
        return;
      }
      callback(cats);
    });
  };

  App.agregarCategoria = function(nombre, icono, color, tipo) {
    return db.collection('usuarios/' + uid() + '/categorias').add({
      nombre: nombre.trim().toLowerCase(),
      icono: icono || 'ph-house',
      color: color || '#e8c84c',
      tipo: tipo || 'gasto'
    });
  };

  App.eliminarCategoria = function(id) {
    return db.collection('usuarios/' + uid() + '/categorias').doc(id).delete();
  };

  // ===== PRESUPUESTOS =====
  App.obtenerLimitesCategorias = function(mes, callback) {
    db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes).get().then(function(doc) {
      if (!doc.exists) return callback({ gastos: {}, ingresos: {} });
      const data = doc.data();
      callback({ gastos: data.gastos || {}, ingresos: data.ingresos || {} });
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

  // ===== METAS =====
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
    return db.collection('usuarios').doc(uid()).collection('vinculados').onSnapshot(function(snap) {
      const usuarios = [];
      snap.forEach(function(doc) { usuarios.push(Object.assign({ uid: doc.id }, doc.data())); });
      callback(usuarios);
    });
  };

  App.obtenerTransaccionesDeUsuario = function(usuarioUid, callback) {
    return db.collection('usuarios/' + usuarioUid + '/transacciones').orderBy('fecha', 'desc').onSnapshot(function(snap) {
      const arr = [];
      snap.forEach(function(doc) { arr.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(arr);
    });
  };

  // ===== MODO NEGOCIO =====
  App.agregarCliente = function(nombre, email) {
    return db.collection('usuarios/' + uid() + '/clientes').add({ nombre: nombre, email: email });
  };

  App.obtenerClientes = function(callback) {
    return db.collection('usuarios/' + uid() + '/clientes').onSnapshot(function(snap) {
      const clientes = [];
      snap.forEach(function(doc) { clientes.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(clientes);
    });
  };

  App.registrarVenta = function(clienteId, monto, descripcion) {
    return db.collection('usuarios/' + uid() + '/ventas').add({
      clienteId: clienteId,
      monto: parseFloat(monto),
      descripcion: descripcion,
      fecha: new Date().toISOString()
    });
  };

  App.obtenerVentas = function(callback) {
    return db.collection('usuarios/' + uid() + '/ventas').onSnapshot(function(snap) {
      const ventas = [];
      snap.forEach(function(doc) { ventas.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(ventas);
    });
  };

  // ===== CUENTAS =====
  App.obtenerCuentas = function(callback) {
    const userId = uid();
    return db.collection('usuarios/' + userId + '/cuentas').onSnapshot(function(snap) {
      const cuentas = [];
      snap.forEach(function(doc) { cuentas.push(Object.assign({ id: doc.id }, doc.data())); });
      if (cuentas.length === 0) {
        db.collection('usuarios/' + userId + '/cuentas').add({ nombre: 'Personal', tipo: 'personal', color: '#e8c84c' });
        return;
      }
      callback(cuentas);
    });
  };

  App.agregarCuenta = function(nombre, tipo, color) {
    const userId = uid();
    return db.collection('usuarios/' + userId + '/cuentas').add({
      nombre: nombre.trim(),
      tipo: tipo || 'personal',
      color: color || '#e8c84c'
    });
  };

  App.eliminarCuenta = function(cuentaId) {
    const userId = uid();
    return db.collection('usuarios/' + userId + '/cuentas').doc(cuentaId).delete();
  };
})();
