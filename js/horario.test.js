'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { recordatorioPendiente } = require('./horario');

const base = { activo: true, hora: '20:00', zonaHoraria: 'America/Bogota' };
function verificar(time, cfg = base) { return recordatorioPendiente(cfg, new Date(time)); }

test('Notifica a las 20:07 de Bogotá', () => {
  assert.deepEqual(verificar('2026-11-18T01:07:00Z'), { fecha: '2026-11-17', demoraMinutos: 7 });
});
test('No envía antes de las 20:00', () => {
  assert.equal(verificar('2026-11-18T00:52:00Z'), null);
});
test('Respeta activación y hora válida', () => {
  assert.equal(verificar('2026-11-18T01:07:00Z', { ...base, activo: false }), null);
  assert.equal(verificar('2026-11-18T01:07:00Z', { ...base, hora: '25:70' }), null);
});
test('Evita segundo envío del mismo día', () => {
  assert.equal(verificar('2026-11-18T01:22:00Z', { ...base, ultimoEnviado: '2026-11-17' }), null);
});
test('No envía muchas horas después', () => {
  assert.equal(verificar('2026-11-18T03:00:00Z'), null);
});
test('Cubre horarios próximos a medianoche', () => {
  const cfg = { ...base, hora: '23:55' };
  assert.deepEqual(verificar('2026-11-18T05:07:00Z', cfg), { fecha: '2026-11-17', demoraMinutos: 12 });
  assert.equal(verificar('2026-11-18T05:07:00Z', { ...cfg, ultimoEnviado: '2026-11-17' }), null);
});
test('Admite zona distinta de Bogotá', () => {
  assert.deepEqual(verificar('2026-11-18T01:07:00Z', { ...base, zonaHoraria: 'America/New_York', hora: '20:00' }), { fecha: '2026-11-17', demoraMinutos: 7 });
  assert.equal(verificar('2026-11-18T01:07:00Z', { ...base, zonaHoraria: 'America/New_York', hora: '19:00' }), null);
});
test('Si la zona está mal configurada, usa Bogotá', () => {
  assert.deepEqual(verificar('2026-11-18T01:07:00Z', { ...base, zonaHoraria: 'ZonaInventada' }), { fecha: '2026-11-17', demoraMinutos: 7 });
});
