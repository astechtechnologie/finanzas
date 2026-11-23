
 // Finora Mercado — Avisos de revisión desde GitHub Actions.
 // Ejecutar SOLO en GitHub Actions. No cargar en index.html.
 'use strict';

 const { initializeApp, cert } = require('firebase-admin/app');
 const { getFirestore } = require('firebase-admin/firestore');
 const { getMessaging } = require('firebase-admin/messaging');

 const PROJECT_ID = 'finanzas-personales-a1ee9';
 const APP_URL = 'https://astechtechnologie.github.io/finanzas/?mercado=1';
 const ICON_URL = 'https://astechtechnologie.github.io/finanzas/logo-192.png';
 const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

 function fechaYHoraEnZona(fecha, zona) {
   try {
     const piezas = new Intl.DateTimeFormat('en-GB', {
       timeZone: zona || 'America/Bogota',
       year: 'numeric',
       month: '2-digit',
       day: '2-digit',
       hour: '2-digit',
       minute: '2-digit',
       hourCycle: 'h23'
     }).formatToParts(fecha);

     const p = {};
     for (const x of piezas) {
       if (x.type !== 'literal') p[x.type] = x.value;
     }

     return {
       fecha: p.year + '-' + p.month + '-' + p.day,
       hora: p.hour + ':' + p.minute
     };
   } catch (_) {
     return fechaYHoraEnZona(fecha, 'America/Bogota');
   }
 }

 function diasEntre(a, b) {
   if (!FECHA_RE.test(a || '') || !FECHA_RE.test(b || '')) {
     return null;
   }

   return Math.round(
     (
       Date.parse(b + 'T00:00:00Z') -
       Date.parse(a + 'T00:00:00Z')
     ) / 86400000
   );
 }

 function puedeNotificar(config, ahora) {
   if (
     !config ||
     config.activo !== true ||
     !/^([01]\d|2[0-3]):[0-5]\d$/.test(config.hora || '')
   ) {
     return false;
   }

   const local = fechaYHoraEnZona(ahora, config.zonaHoraria);

   if (local.hora < config.hora) return false;

   // Máximo un aviso cada 7 días.
   const diferencia = diasEntre(
     config.ultimoEnviado,
     local.fecha
   );

   return diferencia === null || diferencia >= 7;
 }

 async function obtenerProductos(db, perfil, config, fecha) {
   let referencia;

   if (config.modo === 'espacio') {
     if (
       typeof config.espacioId !== 'string' ||
       !config.espacioId
     ) {
       return [];
     }

     const espacio = await db
       .collection('espacios')
       .doc(config.espacioId)
       .get();

     if (
       !espacio.exists ||
       !Array.isArray(espacio.get('miembros')) ||
       !espacio.get('miembros').includes(perfil.id)
     ) {
       return [];
     }

     referencia = espacio.ref.collection('mercado');
   } else {
     referencia = perfil.ref.collection('mercado');
   }

   const snap = await referencia
     .where('estado', '==', 'en_casa')
     .get();

   return snap.docs
     .map(d => d.data())
     .filter(p =>
       typeof p.fechaRevision === 'string' &&
       FECHA_RE.test(p.fechaRevision) &&
       p.fechaRevision <= fecha &&
       !p.mesLista
     );
 }

 async function main() {
   const cadena = process.env.FIREBASE_SERVICE_ACCOUNT;

   if (!cadena) {
     throw new Error(
       'Falta el secreto FIREBASE_SERVICE_ACCOUNT.'
     );
   }

   const cuenta = JSON.parse(cadena);

   if (
     cuenta.project_id !== PROJECT_ID ||
     !cuenta.private_key ||
     !cuenta.client_email
   ) {
     throw new Error('Credencial de Firebase incorrecta.');
   }

   initializeApp({
     credential: cert(cuenta),
     projectId: PROJECT_ID
   });

   const db = getFirestore();
   const messaging = getMessaging();
   const instante = new Date();

   const usuarios = await db.collection('usuarios')
     .where('mercadoPush.activo', '==', true)
     .get();

   let revisados = 0;
   let elegibles = 0;
   let enviados = 0;
   let errores = 0;

   for (const perfil of usuarios.docs) {
     try {
       const config = perfil.get('mercadoPush');

       if (
         !perfil.get('fcmToken') ||
         !puedeNotificar(config, instante)
       ) {
         continue;
       }

       revisados++;

       const local = fechaYHoraEnZona(
         instante,
         config.zonaHoraria
       );

       const productos = await obtenerProductos(
         db,
         perfil,
         config,
         local.fecha
       );

       if (!productos.length) continue;

       elegibles++;

       const reservar = await db.runTransaction(
         async tx => {
           const actual = await tx.get(perfil.ref);

           if (
             !actual.exists ||
             !actual.get('fcmToken') ||
             !puedeNotificar(
               actual.get('mercadoPush'),
               instante
             )
           ) {
             return null;
           }

           const nuevo = actual.get('mercadoPush');

           if (
             nuevo.modo !== config.modo ||
             nuevo.espacioId !== config.espacioId
           ) {
             return null;
           }

           tx.update(perfil.ref, {
             'mercadoPush.ultimoEnviado': local.fecha
           });

           return {
             token: actual.get('fcmToken')
           };
         }
       );

       if (!reservar) continue;

       const primero = String(
         productos[0].nombre || 'un producto'
       ).slice(0, 40);

       const texto = productos.length === 1
         ? '¿Aún tienes ' + primero +
           '? Revísalo y decide si va en el próximo mercado.'
         : 'Hay ' + productos.length +
           ' productos para revisar (incluido ' +
           primero + ').';

       await messaging.send({
         token: reservar.token,
         notification: {
           title: 'Finora · Revisa tu despensa',
           body: texto
         },
         data: {
           tipo: 'recordatorio_mercado',
           fecha: local.fecha
         },
         webpush: {
           notification: {
             icon: ICON_URL,
             badge: ICON_URL,
             tag: 'finora-mercado-' + local.fecha
           },
           fcmOptions: {
             link: APP_URL
           },
           headers: {
             TTL: '86400'
           }
         }
       });

       enviados++;
     } catch (e) {
       errores++;

       console.error(
         'Mercado: no se pudo procesar un perfil:',
         perfil.id,
         e.code || e.message
       );
     }
   }

   console.log(
     `Finora Mercado: ${usuarios.size} opt-in; ` +
     `${revisados} revisados; ` +
     `${elegibles} con productos pendientes; ` +
     `${enviados} avisos; ` +
     `${errores} errores.`
   );

   if (errores) {
     process.exitCode = 1;
   }
 }

 if (require.main === module) {
   main().catch(e => {
     console.error('Error de Mercado:', e.message);
     process.exitCode = 1;
   });
 }

 module.exports = {
   fechaYHoraEnZona,
   diasEntre,
   puedeNotificar,
   obtenerProductos,
   main
 };
