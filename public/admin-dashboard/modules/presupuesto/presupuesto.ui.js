export function renderTabla(data) {
  const tbody = document.getElementById("tablaPresupuestos");
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay presupuestos.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.nombre || "—"}</td>
      <td>${p.cliente || "—"}</td>
      <td>${p.monto ? new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(p.monto) : "—"}</td>
      <td><span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${p.estado==='enviado'?'rgba(0,210,255,0.15)':'rgba(255,118,117,0.15)'};color:${p.estado==='enviado'?'#00d2ff':'#ff7675'}">${p.estado}</span></td>
      <td>${new Date(p.creado_en).toLocaleString("es-ES")}</td>
    </tr>
  `).join("");
}

export function renderFiltros(estadoActual) {
  const botones = {
    todos: document.getElementById("btn-todos"),
    enviados: document.getElementById("btn-enviados"),
    pendientes: document.getElementById("btn-pendientes")
  };

  Object.keys(botones).forEach(estado => {
    if (botones[estado]) {
      if (estado === estadoActual) {
        botones[estado].style.background = "var(--primary)";
        botones[estado].style.color = "#fff";
      } else {
        botones[estado].style.background = "var(--bg-card)";
        botones[estado].style.color = "var(--text-light)";
      }
    }
  });
}

export function mostrarError(mensaje) {
  const tbody = document.getElementById("tablaPresupuestos");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5">Error: ${mensaje}</td></tr>`;
  }
}

export function mostrarLoading() {
  const tbody = document.getElementById("tablaPresupuestos");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5">Cargando presupuestos...</td></tr>`;
  }
}

export function limpiarCampos(formulario) {
  if (formulario) {
    formulario.reset();
  }
}
