const CLAVE = 'finanzas_v1';

export function obtenerTransacciones() {
  const datos = localStorage.getItem(CLAVE);
  return datos ? JSON.parse(datos) : [];
}

function guardar(transacciones) {
  localStorage.setItem(CLAVE, JSON.stringify(transacciones));
}

export function agregarTransaccion(tipo, descripcion, monto) {
  const transacciones = obtenerTransacciones();
  transacciones.push({
    id: Date.now(),
    tipo,
    descripcion,
    monto: parseFloat(monto),
    fecha: new Date().toISOString()
  });
  guardar(transacciones);
}
