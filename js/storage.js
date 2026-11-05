// storage.js – Acceso a Firestore (Con soporte para Espacios Compartidos)
(function() {
  const App = window.App;
  const db = App.db;

  function uid() {
    const user = App.auth.currentUser;
    if (!user) throw new Error('Usuario no autenticado');
    return user.uid;
  }

  // ===== LÓGICA DE RUTAS (PERSONAL VS ESPACIO) =====
  // Esta función decide dónde guardar/leer las transacciones
  function obtenerRutaTransacciones() {
    const espacioId = localStorage.getItem('espacioActivoId');
    if (espacioId) {
      return db.collection('espacios').doc(espacioId).collection('transacciones');
    }
    return db.collection('usuarios').doc(uid()).collection('transacciones');
  }

  // ===== TRANSACCIONES =====
  App.obtenerTransacciones = function(callback, espacioIdCuenta, mes) {
    try {
      const ref = obtenerRutaTransacciones();
      let query = ref;

      // Si estamos en modo personal, filtramos por la cuenta (Personal, Efectivo, etc.)
      // Si estamos en modo espacio, mostramos todo (o podrías filtrar por cuenta también)
      if (!localStorage.getItem('espacioActivoId') && espacioIdCuenta && espacioIdCuenta !== 'personal') {
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
    const esEspacio = !!localStorage.getItem('espacioActivoId');
    
    return ref.add({
      tipo: tipo,
      categoria: categoria,
      subcategoria: subcategoria || null,
      descripcion: descripcion,
      monto: parseFloat(monto),
      fecha: fecha,
      metodoPago: metodoPago || null,
      espacioId: esEspacio ? 'compartido' : (espacioIdCuenta || 'personal'), // Si es espacio, no filtramos por cuenta personal
      creadoPor: uid() // Guardamos quién lo creó
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
    
    return db.collection('espacios').add({
      nombre: nombre,
      adminId: userId,
      miembros: [userId],
      codigoInvitacion: codigoInvitacion,
      creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(docRef) {
      callback(docRef.id, codigoInvitacion);
    });
  };

  App.unirseAEspacio = function(codigo, callback) {
    const userId = uid();
    return db.collection('espacios').where('codigoInvitacion', '==', codigo).get().then(function(query) {
      if (query.empty) throw new Error('Código no válido');
      const espacioDoc = query.docs[0];
      const espacioId = espacioDoc.id;
      
      return db.collection('espacios').doc(espacioId).update({
        miembros: firebase.firestore.FieldValue.arrayUnion(userId)
      }).then(function() {
        callback(espacioId, espacioDoc.data().nombre);
      });
    });
  };

  App.obtenerEspaciosDeUsuario = function(callback) {
    const userId = uid();
    return db.collection('espacios').where('miembros', 'array-contains', userId).onSnapshot(function(snap) {
      const espacios = [];
      snap.forEach(function(doc) { espacios.push(Object.assign({ id: doc.id }, doc.data())); });
      callback(espacios);
    });
  };

  // ===== EL RESTO DE FUNCIONES (CATEGORÍAS, PRESUPUESTOS, ETC.) =====
  // Mantenemos estas funciones igual, asociadas al usuario que las creó.
  // En un futuro, podrías moverlas al espacio compartido.

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

  App.obtenerRolUsuario = function(callback) {
    db.collection('usuarios').doc(uid()).get().then(function(doc) {
      callback(doc.exists ? (doc.data().rol || 'normal') : 'normal');
    }).catch(function() { callback('normal'); });
  };

  // ... (Puedes mantener las demás funciones como obtenerMetas, presupuestos, etc., sin cambios)
})();
