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
  // V2: precios históricos por compra, separados del historial de consumo V1.
  function precioValido(valor) {
    return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 && valor <= 1000000000;
  }
  function historialDePrecios(producto) {
    return (Array.isArray(producto?.historialPrecios) ? producto.historialPrecios : [])
      .filter(r => r && leerFecha(r.fecha) && precioValido(r.total) && precioValido(r.cantidad))
      .map(r => ({ fecha:r.fecha, cantidad:r.cantidad, total:r.total,
        unitario: r.total / r.cantidad, tienda:normalizarTienda(r.tienda), unidad:r.unidad||producto?.unidad||'unidad' }))
      .slice(-30);
  }
  function precioEstimado(producto) {
    const registros=historialDePrecios(producto);
    const cantidad=precioValido(producto?.cantidad) ? producto.cantidad : 1;
    // La referencia escrita manualmente tiene prioridad hasta la próxima compra con precio.
    if (precioValido(producto?.precioReferencia)) return Math.round(producto.precioReferencia);
    if (!registros.length) return null;
    const ultimos=registros.slice(-3).map(r => r.unitario).sort((a,b)=>a-b);
    const mitad=Math.floor(ultimos.length/2);
    const med=ultimos.length%2 ? ultimos[mitad] : (ultimos[mitad-1]+ultimos[mitad])/2;
    return Math.round(med*cantidad);
  }
  function guardarPrecioDeCompra(producto, fecha, total, cantidad, tienda) {
    if (!leerFecha(fecha) || !precioValido(total) || !precioValido(cantidad)) throw new Error('Precio o fecha inválidos.');
    const historial=historialDePrecios(producto);
    const actualizado=historial.concat({ fecha, cantidad, total, unitario:total/cantidad,
      tienda:normalizarTienda(tienda), unidad:producto.unidad||'unidad' }).slice(-30);
    return { historialPrecios:actualizado, precioUltimo:total, precioReferencia:null };
  }
  function cambioPrecio(producto) {
    const r=historialDePrecios(producto);
    if (r.length<2 || !precioValido(r[r.length-2].unitario)) return null;
    const anterior=r[r.length-2].unitario;
    return Math.round((r[r.length-1].unitario-anterior)/anterior*1000)/10;
  }
  function ultimoDiaMes(mes) {
    if (!RE_MES.test(mes)) return null;
    const [y,m]=mes.split('-').map(Number);
    return fechaLocal(new Date(y,m,0,12));
  }
  function sugerencias(productos, mes, fechaActual) {
    const fin=ultimoDiaMes(mes);
    if (!fin || !leerFecha(fechaActual)) return [];
    return (Array.isArray(productos)?productos:[]).filter(p => p && !p.mesLista).map(p => {
      let motivo=null, prioridad=3;
      if (p.estado==='agotado') {motivo='Agotado: conviene reponerlo';prioridad=0;}
      else if (p.estado==='en_casa' && leerFecha(p.fechaRevision) && p.fechaRevision<=fin) {
        motivo=p.fechaRevision<=fechaActual?'Ya corresponde revisarlo':'Podría necesitar revisión durante este mes';
        prioridad=1;
      } else if (p.favorito===true) {motivo='Producto favorito';prioridad=2;}
      return motivo?{...p,motivo,prioridad,estimado:precioEstimado(p)}:null;
    }).filter(Boolean).sort((a,b)=>a.prioridad-b.prioridad || String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  }
  function presupuestoMes(productos, mes) {
    if (!RE_MES.test(mes)) return { total:0, conPrecio:0, sinPrecio:0, cantidad:0 };
    const seleccionados=(Array.isArray(productos)?productos:[]).filter(p=>p && p.mesLista===mes);
    let total=0,conPrecio=0,sinPrecio=0;
    seleccionados.forEach(p=>{ const valor=precioEstimado(p);
      if(valor === null) sinPrecio++; else { total+=valor;conPrecio++; }
    });
    return {total,conPrecio,sinPrecio,cantidad:seleccionados.length};
  }
  // V3 — comparador con precios aportados manualmente por el usuario.
  // Nunca realiza consultas de comercios ni modifica transacciones financieras.
  function normalizarTienda(valor) {
    return typeof valor === 'string' ? valor.trim().replace(/\s+/g,' ').slice(0,60) : '';
  }
  function llaveTienda(valor) {
    return normalizarTienda(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  }
  function tiendaValida(valor) {
    return typeof valor==='string' && valor.trim().length>=2 && valor.trim().length<=60 &&
      !/[\u0000-\u001f<>]/.test(valor);
  }
  function ofertasValidas(producto) {
    return (Array.isArray(producto?.ofertasTiendas) ? producto.ofertasTiendas : [])
      .filter(r => r && tiendaValida(r.tienda) && leerFecha(r.fecha) && precioValido(r.total) && precioValido(r.cantidad))
      .map(r=>({ tienda:normalizarTienda(r.tienda), fecha:r.fecha, cantidad:r.cantidad,
        total:r.total, unitario:r.total/r.cantidad, unidad:r.unidad||producto?.unidad||'unidad',fuente:'cotización' }))
      .slice(-40);
  }
  function guardarOferta(producto, oferta) {
    const {tienda,fecha,total,cantidad} = oferta || {};
    if (!tiendaValida(tienda) || !leerFecha(fecha) || !precioValido(total) || !precioValido(cantidad))
      throw new Error('Ingresa una tienda, fecha, cantidad y precio válidos.');
    const nueva={tienda:normalizarTienda(tienda),fecha,total,cantidad,
      unidad:producto?.unidad||'unidad'};
    return { ofertasTiendas: ofertasValidas(producto).concat(nueva).slice(-40) };
  }
  function cotizaciones(producto,fechaActual,diasVigencia=90) {
    if (!leerFecha(fechaActual)) return [];
    const limite=Number.isInteger(diasVigencia)&&diasVigencia>=1&&diasVigencia<=365 ? diasVigencia : 90;
    const unidad=producto?.unidad||'unidad';
    const historicas=historialDePrecios(producto).filter(r=>tiendaValida(r.tienda))
      .map(r=>({...r,fuente:'compra'}));
    const candidatas=historicas.concat(ofertasValidas(producto));
    const ultimas=new Map();
    for (const r of candidatas) {
      if (r.unidad!==unidad || !precioValido(r.cantidad) || !precioValido(r.total)) continue;
      const diferencia=diferenciaDias(r.fecha,fechaActual);
      if(diferencia===null || diferencia<0 || diferencia>limite) continue;
      const llave=llaveTienda(r.tienda);
      const anterior=ultimas.get(llave);
      if(!anterior || anterior.fecha<r.fecha ||
        (anterior.fecha===r.fecha && anterior.fuente==='cotización' && r.fuente==='compra')) {
        ultimas.set(llave,{...r,unitario:r.total/r.cantidad});
      }
    }
    const cantidad=precioValido(producto?.cantidad)?producto.cantidad:1;
    return [...ultimas.values()].map(r=>({...r,
      estimado:Math.round(r.unitario*cantidad*100)/100}))
      .sort((a,b)=>a.estimado-b.estimado || a.tienda.localeCompare(b.tienda,'es'));
  }
  function compararTiendas(productos,mes,fechaActual,diasVigencia=90) {
    if(!RE_MES.test(mes)||!leerFecha(fechaActual)) return [];
    const lista=(Array.isArray(productos)?productos:[]).filter(p=>p&&p.mesLista===mes);
    const tiendas=new Map();
    for(const producto of lista){
      for(const precio of cotizaciones(producto,fechaActual,diasVigencia)){
        const llave=llaveTienda(precio.tienda);
        if(!tiendas.has(llave)) tiendas.set(llave,{tienda:precio.tienda,completos:0,total:0,productos:[],cantidad:lista.length});
        const t=tiendas.get(llave);
        t.completos++;t.total+=precio.estimado;
        t.productos.push({id:producto.id||null,nombre:producto.nombre||'Producto',estimado:precio.estimado,
          fecha:precio.fecha,fuente:precio.fuente});
      }
    }
    return [...tiendas.values()].map(t=>({...t,total:Math.round(t.total*100)/100,
      faltantes:t.cantidad-t.completos,esCompleta:t.completos===t.cantidad && t.cantidad>0}))
      .sort((a,b)=>Number(b.esCompleta)-Number(a.esCompleta) ||
        (a.esCompleta ? a.total-b.total : b.completos-a.completos) || a.tienda.localeCompare(b.tienda,'es'));
  }
  // Presupuesto general: conserva referencias V2 y aprovecha precios de tienda
  // cuando un producto todavía no tiene historial de compra con precio.
  function presupuestoConTiendas(productos,mes,fechaActual,diasVigencia=90) {
    if(!RE_MES.test(mes)||!leerFecha(fechaActual)) return {total:0,conPrecio:0,sinPrecio:0,cantidad:0,conCotizacion:0};
    const lista=(Array.isArray(productos)?productos:[]).filter(p=>p&&p.mesLista===mes);
    let total=0,conPrecio=0,sinPrecio=0,conCotizacion=0;
    for(const p of lista){
      let precio=precioEstimado(p);
      if(precio===null){const c=cotizaciones(p,fechaActual,diasVigencia);if(c.length){precio=c[0].estimado;conCotizacion++;}}
      if(precio===null) sinPrecio++;else {total+=precio;conPrecio++;}
    }
    return {total:Math.round(total*100)/100,conPrecio,sinPrecio,cantidad:lista.length,conCotizacion};
  }
  function planMasEconomico(productos,mes,fechaActual,diasVigencia=90) {
    if(!RE_MES.test(mes)||!leerFecha(fechaActual)) return {total:0,conPrecio:0,sinPrecio:0,detalle:[],cantidad:0};
    const lista=(Array.isArray(productos)?productos:[]).filter(p=>p&&p.mesLista===mes);
    let total=0,conPrecio=0,sinPrecio=0;
    const detalle=lista.map(p=>{
      const precios=cotizaciones(p,fechaActual,diasVigencia);
      if(!precios.length){sinPrecio++;return {id:p.id||null,nombre:p.nombre||'Producto',estimado:null,tienda:null};}
      const mejor=precios[0]; total+=mejor.estimado;conPrecio++;
      return {id:p.id||null,nombre:p.nombre||'Producto',estimado:mejor.estimado,
        tienda:mejor.tienda,fecha:mejor.fecha};
    });
    return {total:Math.round(total*100)/100,conPrecio,sinPrecio,cantidad:lista.length,detalle};
  }
  return { fechaLocal, leerFecha, sumarDias, diferenciaDias, proximoMes,
    mediana, diasEstimados, fechaRevision, debeRevisarse, alComprar, alAgotar,
    precioValido, historialDePrecios, precioEstimado, guardarPrecioDeCompra, cambioPrecio,
    ultimoDiaMes, sugerencias, presupuestoMes, normalizarTienda, llaveTienda, tiendaValida,
    ofertasValidas, guardarOferta, cotizaciones, compararTiendas, planMasEconomico, presupuestoConTiendas };
});
