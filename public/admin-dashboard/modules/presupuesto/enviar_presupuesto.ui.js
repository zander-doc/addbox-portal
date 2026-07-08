export function mostrarError(mensaje) {
  const mensajeDiv = document.getElementById("mensajeResultado");
  if (mensajeDiv) {
    mensajeDiv.innerHTML = `<p style="color: var(--error);">Error: ${mensaje}</p>`;
  }
}

export function mostrarLoading() {
  const mensajeDiv = document.getElementById("mensajeResultado");
  if (mensajeDiv) {
    mensajeDiv.innerHTML = `<p>Cargando...</p>`;
  }
}

export function limpiarCampos(formulario) {
  if (formulario) {
    formulario.reset();
  }
}
