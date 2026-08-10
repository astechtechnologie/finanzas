// ---------- storage ----------
const CLAVE = 'finanzas_v1';

function obtenerTransacciones() {
  const datos = localStorage.getItem(CLAVE);
  return datos ? JSON.parse(datos) : [];
}

function guardar(transacciones) {
  localStorage.setItem(CLAVE, JSON.stringify(transacciones));
}

function agregarTransaccion(tipo, descripcion, monto) {
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

// ---------- ui y eventos ----------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formTransaccion');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const tipo = document.getElementById('tipo').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const monto = document.getElementById('monto').value;

    if (!descripcion || !monto) return;

    agregarTransaccion(tipo, descripcion, monto);
    form.reset();
    actualizarVista();
  });

  actualizarVista();
});

function actualizarVista() {
  const transacciones = obtenerTransacciones();

  let ingresos = 0, gastos = 0;
  transacciones.forEach(t => {
    if (t.tipo === 'ingreso') ingresos += t.monto;
    else gastos += t.monto;
  });

  document.getElementById('totalIngresos').textContent = $${ingresos.toFixed(2)};
  document.getElementById('totalGastos').textContent = $${gastos.toFixed(2)};
  document.getElementById('balance').textContent = $${(ingresos - gastos).toFixed(2)};

  const lista = document.getElementById('listaTransacciones');
  if (transacciones.length === 0) {
    lista.innerHTML = '<p class="text-gray-400 text-center">No hay movimientos aún</p>';
    return;
  }

  lista.innerHTML = transacciones
    .sort((a, b) => b.id - a.id)
    .map(t => `
      <div class="flex justify-between items-center border-b pb-2">
        <div>
          <span class="font-medium">${t.descripcion}</span>
          <span class="text-xs text-gray-400 ml-2">${new Date(t.fecha).toLocaleDateString()}</span>
        </div>
        <span class="font-bold ${t.tipo === 'ingreso' ? 'text-emerald-500' : 'text-red-500'}">
          ${t.tipo === 'ingreso' ? '+' : '-'}$${t.monto.toFixed(2)}
        </span>
      </div>
    `).join('');
}
