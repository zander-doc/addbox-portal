export function renderTabla(data) {
  const tbody = document.getElementById("tablaMovimientos");
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay movimientos.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${m.productos?.nombre || "—"}</td>
      <td><span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${m.tipo==='entrada'?'rgba(0,210,255,0.15)':'rgba(255,118,117,0.15)'};color:${m.tipo==='entrada'?'#00d2ff':'#ff7675'}">${m.tipo}</span></td>
      <td>${m.cantidad}</td>
      <td>${m.sitio || "—"}</td>
      <td>${new Date(m.creado_en).toLocaleString("es-ES")}</td>
    </tr>
  `).join("");
}

export function renderFiltros(tipoActual) {
  const botones = {
    todos: document.getElementById("btn-todos"),
    entrada: document.getElementById("btn-entrada"),
    salida: document.getElementById("btn-salida")
  };

  Object.keys(botones).forEach(tipo => {
    if (botones[tipo]) {
      if (tipo === tipoActual) {
        botones[tipo].style.background = "var(--primary)";
        botones[tipo].style.color = "#fff";
      } else {
        botones[tipo].style.background = "var(--bg-card)";
        botones[tipo].style.color = "var(--text-light)";
      }
    }
  });
}

export function mostrarError(mensaje) {
  const tbody = document.getElementById("tablaMovimientos");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5">Error: ${mensaje}</td></tr>`;
  }
}

export function mostrarLoading() {
  const tbody = document.getElementById("tablaMovimientos");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5">Cargando movimientos...</td></tr>`;
  }
}

export function limpiarCampos(formulario) {
  if (formulario) {
    formulario.reset();
  }
}
