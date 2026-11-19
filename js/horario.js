'use strict';

const DEFAULT_ZONE = 'America/Bogota';
const MINUTOS_TOLERANCIA = 40;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Retorna la fecha de recordatorio cuyo horario ya se cumplió (hasta 40 min
 * de retraso) en la zona horaria del usuario. Incluye cruces de medianoche.
 * No se envían notificaciones si el horario no es válido o está desactivado.
 */
function recordatorioPendiente(config, ahoraUTC, tolerancia = MINUTOS_TOLERANCIA) {
  if (!config || config.activo !== true || !RE_HORA.test(config.hora || '')) return null;
  if (!(ahoraUTC instanceof Date) || Number.isNaN(ahoraUTC.getTime())) return null;

  let formateador;
  try {
    formateador = new Intl.DateTimeFormat('en-US', {
      timeZone: config.zonaHoraria || DEFAULT_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  } catch (_) {
    formateador = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  }

  const partes = Object.fromEntries(formateador.formatToParts(ahoraUTC)
    .filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const hoy = `${partes.year}-${partes.month}-${partes.day}`;
  const actualMinutos = Number(partes.hour) * 60 + Number(partes.minute);
  const [hora, minuto] = config.hora.split(':').map(Number);
  const programadoMinutos = hora * 60 + minuto;
  const diferenciaHoy = actualMinutos - programadoMinutos;

  if (diferenciaHoy >= 0 && diferenciaHoy <= tolerancia) {
    return config.ultimoEnviado === hoy ? null : { fecha: hoy, demoraMinutos: diferenciaHoy };
  }

  // Ej.: recordatorio a las 23:55, proceso ejecutado a las 00:07.
  if (diferenciaHoy < 0 && diferenciaHoy + 1440 <= tolerancia) {
    const anterior = new Date(Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day)) - 86400000)
      .toISOString().slice(0, 10);
    return config.ultimoEnviado === anterior ? null : { fecha: anterior, demoraMinutos: diferenciaHoy + 1440 };
  }

  return null;
}

module.exports = { recordatorioPendiente, DEFAULT_ZONE, MINUTOS_TOLERANCIA };
