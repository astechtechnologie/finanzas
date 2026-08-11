// Acceso a Firestore: transacciones, categorías, presupuestos
(function() {
  const App = window.App;
  const db = App.db;

  function uid() { return App.auth.currentUser.uid; }

  // Transacciones
  App.obtenerTransacciones = function(callback) {
    return db.collection('usuarios/' + uid() + '/transacciones').orderBy('fecha', 'desc').onSnapshot(snap => {
      const arr = [];
      snap.forEach(doc => arr.push(Object.assign({ id: doc.id }, doc.data())));
      callback(arr);
    });
  };

  App.agregarTransaccion = function(tipo, categoria, descripcion, monto, fecha) {
    return db.collection('usuarios/' + uid() + '/transacciones').add({ tipo, categoria, descripcion, monto: parseFloat(monto), fecha });
  };

  App.eliminarTransaccion = function(id) {
    return db.collection('usuarios/' + uid() + '/transacciones').doc(id).delete();
  };

  // Categorías (ahora con campo 'tipo': 'ingreso' o 'gasto')
  App.obtenerCategorias = function(callback) {
    return db.collection('usuarios/' + uid() + '/categorias').onSnapshot(snap => {
      const categorias = [];
      snap.forEach(doc => categorias.push(Object.assign({ id: doc.id }, doc.data())));
      if (categorias.length === 0) {
        const predefinidas = [
          { nombre: 'salario', emoji: '💼', color: '#10b981', tipo: 'ingreso' },
          { nombre: 'freelance', emoji: '💻', color: '#34d399', tipo: 'ingreso' },
          { nombre: 'comida', emoji: '🍔', color: '#FF6384', tipo: 'gasto' },
          { nombre: 'transporte', emoji: '🚌', color: '#36A2EB', tipo: 'gasto' },
          { nombre: 'ocio', emoji: '🎮', color: '#FFCE56', tipo: 'gasto' },
          { nombre: 'servicios', emoji: '💡', color: '#4BC0C0', tipo: 'gasto' },
          { nombre: 'otros', emoji: '📦', color: '#9966FF', tipo: 'gasto' }
        ];
        const batch = db.batch();
        predefinidas.forEach(cat => batch.set(db.collection('usuarios/' + uid() + '/categorias').doc(), cat));
        batch.commit();
        return;
      }
      callback(categorias);
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

  // Presupuestos (por categoría de gasto)
  App.obtenerLimitesCategorias = function(mes, callback) {
    db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes).get().then(doc => {
      const limites = doc.exists ? (doc.data().categorias || {}) : {};
      callback(limites);
    });
  };

  App.guardarLimiteCategoria = function(mes, categoria, limite, callback) {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(transaction => {
      return transaction.get(ref).then(doc => {
        const data = doc.exists ? doc.data() : {};
        const categorias = data.categorias || {};
        categorias[categoria] = limite;
        return transaction.set(ref, { categorias }, { merge: true });
      });
    }).then(callback);
  };

  App.obtenerHistorialPresupuestos = function(callback) {
    const meses = [];
    const fecha = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(fecha.getFullYear(), fecha.getMonth() - i, 1);
      const mesStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      meses.push(mesStr);
    }
    Promise.all(meses.map(m => db.collection('usuarios').doc(uid()).collection('presupuestos').doc(m).get()))
      .then(docs => {
        const historial = [];
        docs.forEach((doc, idx) => {
          const mes = meses[idx];
          const limites = doc.exists ? (doc.data().categorias || {}) : {};
          const totalLimite = Object.values(limites).reduce((sum, val) => sum + val, 0);
          historial.push({ mes, limiteTotal: totalLimite });
        });
        callback(historial);
      });
  };
})();
