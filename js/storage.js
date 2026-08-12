// storage.js – acceso a Firestore con presupuesto dual
(function() {
  const App = window.App;
  const db = App.db;
  function uid() { return App.auth.currentUser.uid; }

  App.obtenerTransacciones = (callback) => db.collection('usuarios/' + uid() + '/transacciones').orderBy('fecha','desc').onSnapshot(snap => {
    const arr = [];
    snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    callback(arr);
  });

  App.agregarTransaccion = (tipo, categoria, descripcion, monto, fecha) =>
    db.collection('usuarios/' + uid() + '/transacciones').add({ tipo, categoria, descripcion, monto: parseFloat(monto), fecha });

  App.actualizarTransaccion = (id, datos) =>
    db.collection('usuarios/' + uid() + '/transacciones').doc(id).update(datos);

  App.eliminarTransaccion = (id) =>
    db.collection('usuarios/' + uid() + '/transacciones').doc(id).delete();

  // Categorías
  App.obtenerCategorias = (callback) => db.collection('usuarios/' + uid() + '/categorias').onSnapshot(snap => {
    const cats = [];
    snap.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
    if (cats.length === 0) {
      const pre = [
        { nombre:'salario', emoji:'💼', color:'#10b981', tipo:'ingreso' },
        { nombre:'freelance', emoji:'💻', color:'#34d399', tipo:'ingreso' },
        { nombre:'comida', emoji:'🍔', color:'#FF6384', tipo:'gasto' },
        { nombre:'transporte', emoji:'🚌', color:'#36A2EB', tipo:'gasto' },
        { nombre:'ocio', emoji:'🎮', color:'#FFCE56', tipo:'gasto' },
        { nombre:'servicios', emoji:'💡', color:'#4BC0C0', tipo:'gasto' },
        { nombre:'otros', emoji:'📦', color:'#9966FF', tipo:'gasto' }
      ];
      const batch = db.batch();
      pre.forEach(c => batch.set(db.collection('usuarios/' + uid() + '/categorias').doc(), c));
      batch.commit();
      return;
    }
    callback(cats);
  });

  App.agregarCategoria = (nombre, emoji, color, tipo) =>
    db.collection('usuarios/' + uid() + '/categorias').add({ nombre: nombre.trim().toLowerCase(), emoji: emoji||'📌', color: color||'#10b981', tipo: tipo||'gasto' });

  App.eliminarCategoria = (id) => db.collection('usuarios/' + uid() + '/categorias').doc(id).delete();

  // Presupuestos (ahora con tipo: 'gasto' o 'ingreso')
  App.obtenerLimitesCategorias = (mes, callback) => {
    db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes).get().then(doc => {
      if (!doc.exists) return callback({ gastos: {}, ingresos: {} });
      const data = doc.data();
      callback({
        gastos: data.gastos || data.categorias || {},  // compatibilidad con versión anterior
        ingresos: data.ingresos || {}
      });
    });
  };

  App.guardarLimiteCategoria = (mes, tipo, categoria, limite, callback) => {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(t => t.get(ref).then(doc => {
      const data = doc.exists ? doc.data() : {};
      const campo = tipo === 'ingreso' ? 'ingresos' : 'gastos';
      const map = data[campo] || {};
      map[categoria] = limite;
      data[campo] = map;
      return t.set(ref, data, { merge: true });
    })).then(callback);
  };

  App.eliminarLimiteCategoria = (mes, tipo, categoria, callback) => {
    const ref = db.collection('usuarios').doc(uid()).collection('presupuestos').doc(mes);
    db.runTransaction(t => t.get(ref).then(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      const campo = tipo === 'ingreso' ? 'ingresos' : 'gastos';
      if (data[campo]) {
        delete data[campo][categoria];
        if (Object.keys(data[campo]).length === 0) delete data[campo];
      }
      return t.set(ref, data, { merge: true });
    })).then(callback);
  };

  App.obtenerHistorialPresupuestos = (callback) => {
    const meses = [];
    const hoy = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
    }
    Promise.all(meses.map(m => db.collection('usuarios').doc(uid()).collection('presupuestos').doc(m).get())).then(docs => {
      callback(docs.map((doc,i) => ({
        mes: meses[i],
        gastos: doc.exists ? Object.values(doc.data().gastos || doc.data().categorias || {}).reduce((a,b)=>a+b,0) : 0,
        ingresos: doc.exists ? Object.values(doc.data().ingresos || {}).reduce((a,b)=>a+b,0) : 0
      })));
    });
  };
})();
