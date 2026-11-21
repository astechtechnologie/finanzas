/* Finora: sincronización visual del encabezado. No consulta ni escribe en Firebase. */
(function () {
  'use strict';

  function iniciar() {
    const titulo = document.getElementById('tituloSeccion');
    const subtitulo = document.getElementById('subtituloSeccion');
    const contexto = document.getElementById('contextoSeccion');
    const perfil = document.getElementById('selectorPerfil');
    const cuenta = document.getElementById('selectorCuenta');
    const envolverCuenta = document.getElementById('envolturaSelectorCuenta');
    if (!titulo || !perfil) return;

    const mensajes = {
      'inicio': 'Tu dinero, bajo control.',
      'presupuesto': 'Tus objetivos y límites, al día.',
      'categorías': 'Organiza cada movimiento.',
      'ajustes': 'Haz Finora tuya.',
      'admin': 'Gestión y seguimiento.',
      'mercado': 'Planifica tus próximas compras.'
    };

    function actualizarVista() {
      const vista = (titulo.textContent || 'Inicio').trim();
      const compartido = perfil.value === 'espacio';
      if (contexto) contexto.textContent = compartido ? 'ESPACIO COMPARTIDO' : 'MI ESPACIO';
      if (subtitulo) {
        subtitulo.textContent = compartido && vista.toLowerCase() === 'inicio'
          ? 'Tus finanzas compartidas, de un vistazo.'
          : (mensajes[vista.toLowerCase()] || 'Organiza tus finanzas con Finora.');
      }
      if (envolverCuenta && cuenta) {
        envolverCuenta.hidden = window.getComputedStyle(cuenta).display === 'none';
      }
    }

    perfil.addEventListener('change', actualizarVista);
    if (cuenta) cuenta.addEventListener('change', actualizarVista);
    new MutationObserver(actualizarVista).observe(titulo, { childList: true, characterData: true, subtree: true });
    new MutationObserver(actualizarVista).observe(perfil, { childList: true, attributes: true, attributeFilter: ['value'] });
    if (cuenta) new MutationObserver(actualizarVista).observe(cuenta, { attributes: true, attributeFilter: ['style', 'class'] });
    actualizarVista();
    // El módulo de espacios puede terminar de configurar el selector después del DOMContentLoaded.
    window.addEventListener('load', actualizarVista, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
