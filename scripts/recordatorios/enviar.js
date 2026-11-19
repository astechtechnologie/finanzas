// Finora - Envío diario de recordatorios sin Cloud Functions.
// GitHub Actions ejecuta este archivo. NO se debe cargar desde index.html.
'use strict';

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { recordatorioPendiente, DEFAULT_ZONE } = require('./horario');

const PROJECT_ID = 'finanzas-personales-a1ee9';
const URL_APP = 'https://astechtechnologie.github.io/finanzas/';

function leerCredencial() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) throw new Error('Falta el secreto FIREBASE_SERVICE_ACCOUNT en GitHub Actions.');
  let cuenta;
  try { cuenta = JSON.parse(json); } catch (_) {
    throw new Error('El secreto FIREBASE_SERVICE_ACCOUNT no es un JSON válido.');
  }
  if (!cuenta.private_key || !cuenta.client_email || cuenta.project_id !== PROJECT_ID) {
    throw new Error('Credenciales de servicio incompletas o de otro proyecto.');
  }
  return cuenta;
}

function tokenInvalido(error) {
  return ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']
    .includes(error?.code);
}

async function main() {
  const cuenta = leerCredencial();
  initializeApp({ credential: cert(cuenta), projectId: PROJECT_ID });
  const db = getFirestore();
  const messaging = getMessaging();

  // Solo usuarios que activaron explícitamente el recordatorio.
  const resultado = await db.collection('usuarios')
    .where('recordatorioPush.activo', '==', true).get();
  let enviados = 0, candidatos = 0, errores = 0;

  for (const perfil of resultado.docs) {
    const previo = recordatorioPendiente(perfil.get('recordatorioPush'), new Date());
    if (!previo || !perfil.get('fcmToken')) continue;
    candidatos++;

    // Se reserva la fecha en transacción antes de enviar para evitar duplicados
    // entre ejecuciones simultáneas. Un fallo de envío no se reintenta ese día.
    let reservado;
    try {
      reservado = await db.runTransaction(async tx => {
        const snap = await tx.get(perfil.ref);
        if (!snap.exists) return null;
        const datos = snap.data();
        const proximo = recordatorioPendiente(datos.recordatorioPush, new Date());
        if (!proximo || !datos.fcmToken) return null;
        tx.update(perfil.ref, { 'recordatorioPush.ultimoEnviado': proximo.fecha });
        return { token: datos.fcmToken, fecha: proximo.fecha };
      });
    } catch (error) {
      errores++;
      console.error('No se pudo reservar recordatorio (UID):', perfil.id, error.code || error.message);
      continue;
    }
    if (!reservado) continue;

    try {
      await messaging.send({
        token: reservado.token,
        notification: {
          title: 'Finora · Registra tus movimientos',
          body: '¿Ya anotaste tus ingresos y gastos de hoy?'
        },
        data: { tipo: 'recordatorio_movimientos', fecha: reservado.fecha },
        webpush: {
          headers: { TTL: '3600' },
          notification: {
            icon: URL_APP + 'logo-192.png',
            badge: URL_APP + 'logo-192.png',
            tag: 'finora-recordatorio-' + reservado.fecha
          },
          fcmOptions: { link: URL_APP + '#accion=nuevo-gasto' }
        }
      });
      enviados++;
    } catch (error) {
      errores++;
      console.error('Error enviando push (UID):', perfil.id, error.code || error.message);
      if (tokenInvalido(error)) {
        try {
          await db.runTransaction(async tx => {
            const actual = await tx.get(perfil.ref);
            if (actual.exists && actual.get('fcmToken') === reservado.token) {
              tx.update(perfil.ref, { fcmToken: FieldValue.delete() });
            }
          });
        } catch (e) {
          console.error('No fue posible limpiar token (UID):', perfil.id, e.message);
        }
      }
    }
  }
  console.log(`Finora: ${resultado.size} usuarios activos; ${candidatos} elegibles; ${enviados} enviados; ${errores} errores. Zona predeterminada: ${DEFAULT_ZONE}.`);
  if (errores) process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
  console.error('Fallo del proceso de recordatorios:', error.message);
  process.exitCode = 1;
});
module.exports = { leerCredencial, tokenInvalido, main };
