/* Finora Mercado — Motor de predicción (sin Firebase). */
(function (raiz, fabrica) {
  const motor = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = motor;
  if (raiz) raiz.FinoraMercadoMotor = motor;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
  const DOS_DIGITOS = n => String(n).padStart(2, '0');
  function fechaLocal(fecha) {
    const d = fecha instanceof Date ? fecha : new Date();
    return d.getFullYear() + '-' + DOS_DIGITOS(d.getMonth() + 1) + '-' + DOS_DIGITOS(d.getDate());
  }
  function leerFecha(texto) {
    if (typeof texto !== 'string' || !RE_FECHA.test(texto)) return null;
    const [y, m, d] = texto.split('-').map(Number);
    const fecha = new Date(y, m - 1, d, 12, 0, 0, 0);
    if (fecha.getFullYear() !== y || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) return null;
    return fecha;
  }
  function sumarDias(texto, dias) {
    const d = leerFecha(texto);
    if (!d || !Number.isInteger(dias)) return null;
    d.setDate(d.getDate() + dias);
    return fechaLocal(d);
  }
  function diferenciaDias(inicio, fin) {
    if (!leerFecha(inicio) || !leerFecha(fin)) return null;
    const a = Date.UTC(...inicio.split('-').map((x,i) => i === 1 ? Number(x)-1 : Number(x)));
    const b = Date.UTC(...fin.split('-').map((x,i) => i === 1 ? Number(x)-1 : Number(x)));
    return Math.round((b-a)/86400000);
  }
  function proximoMes(mes) {
    if (!RE_MES.test(mes)) return null;
    const [y, m] = mes.split('-').map(Number);
    return m === 12 ? (y+1)+'-01' : y+'-'+DOS_DIGITOS(m+1);
  }
  function mediana(valores) {
    const validos = (Array.isArray(valores) ? valores : [])
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 365).slice(-8).sort((a,b)=>a-b);
    if (!validos.length) return null;
    const mitad = Math.floor(validos.length/2);
    return validos.length%2 ? validos[mitad] : Math.round((validos[mitad-1]+validos[mitad])/2);
  }
  function diasEstimados(producto) {
    return mediana(producto?.duraciones) ||
      (Number.isInteger(producto?.duracionManual) && producto.duracionManual >= 1 && producto.duracionManual <= 365 ? producto.duracionManual : 30);
  }
  function fechaRevision(compra, dias) {
    if (!leerFecha(compra)) return null;
    const d = Math.min(365, Math.max(1, Math.round(Number(dias) || 30)));
    // Revisión anticipada: 80 % del intervalo, al menos 2 días antes si la duración >= 10.
    return sumarDias(compra, Math.max(1, d - Math.max(2, Math.ceil(d*.20))));
  }
  function debeRevisarse(producto, hoy) {
    return Boolean(producto && producto.estado === 'en_casa' && !producto.mesLista &&
      leerFecha(producto.fechaRevision) && leerFecha(hoy) && producto.fechaRevision <= hoy);
  }
  function alComprar(producto, fecha) {
    if (!leerFecha(fecha)) throw new Error('Fecha de compra inválida.');
    const historial = Array.isArray(producto.historial) ? producto.historial : [];
    const dias = diasEstimados(producto);
    return {
      estado: 'en_casa', fechaUltimaCompra: fecha, fechaUltimoAgotado: null,
      fechaRevision: fechaRevision(fecha, dias), mesLista: null,
      historial: historial.concat({ tipo: 'compra', fecha }).slice(-25)
    };
  }
  function alAgotar(producto, fecha) {
    if (!leerFecha(fecha)) throw new Error('Fecha de agotamiento inválida.');
    const dias = diferenciaDias(producto.fechaUltimaCompra, fecha);
    if (dias !== null && dias < 0) throw new Error('El agotamiento no puede ser anterior a la compra.');
    const duraciones = (Array.isArray(producto.duraciones) ? producto.duraciones : []).slice(-7);
    if (dias !== null && dias > 0 && dias <= 365) duraciones.push(dias);
    const historial = Array.isArray(producto.historial) ? producto.historial : [];
    return {
      estado: 'agotado', fechaUltimoAgotado: fecha, fechaRevision: null, duraciones,
      historial: historial.concat({ tipo: 'agotado', fecha, duracionDias: dias }).slice(-25)
    };
  }
  return { fechaLocal, leerFecha, sumarDias, diferenciaDias, proximoMes,
    mediana, diasEstimados, fechaRevision, debeRevisarse, alComprar, alAgotar };
});
