// storage.js – acceso a Firestore: transacciones, categorías, presupuestos y metas
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

  App.agregarTransaccion = function(tipo, categoria, descripcion, monto, fecha) {
    return db.collection('usuarios/' + uid() + '/transacciones').add({ tipo: tipo, categoria: categoria, descripcion: descripcion, monto: parseFloat(monto), fecha: fecha });
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
          { nombre: 'salario', emoji: '💼', color: '#10b981', tipo: 'ingreso' },
          { nombre: 'freelance', emoji: '💻', color: '#34d399', tipo: 'ingreso' },
          { nombre: 'comida', emoji: '🍔', color: '#FF6384', tipo: 'gasto' },
          { nombre: 'transporte', emoji: '🚌', color: '#36A2EB', tipo: 'gasto' },
          { nombre: 'ocio', emoji: '🎮', color: '#FFCE56', tipo: 'gasto' },
          { nombre: 'servicios', emoji: '💡', color: '#4BC0C0', tipo: 'gasto' },
          { nombre: 'otros', emoji: '📦', color: '#9966FF', tipo: 'gasto' }
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
    return db.collection('usuarios/' + uid() + '/categorias').add({ nombre: nombre.trim().toLowerCase(), emoji: emoji || '📌', color: color || '#10b981', tipo: tipo || 'gasto' });
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
        gastos: data.gastos || data.categorias || {},
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
        const map = data[campo] || {};
        map[categoria] = limite;
        data[campo] = map;
        return transaction.set(ref, data, { merge: true });
      });
    }).then(callback);
  };

  App.eliminarLimiteCategoria = function(mes, tipo, categoria, callback) {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(function(transaction) {
      return transaction.get(ref).then(function(doc) {
        if (!doc.exists) return;
        const data = doc.data();
        const campo = tipo === 'ingreso' ? 'ingresos' : 'gastos';
        if (data[campo]) {
          delete data[campo][categoria];
          if (Object.keys(data[campo]).length === 0) delete data[campo];
        }
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

  // Items de una meta
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
})();
