/**
 * Control de Inventario — Controller
 * Módulo premium: Salud, Auditoría Rápida, Historial, Análisis de Impacto
 */
import { supabase } from "../../services/supabase-client.js";

let obras = [];
let stockAudit = [];
let obraAuditActiva = null;

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  configurarTabs();
  configurarEventos();
  await cargarDatos();
});

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function configurarTabs() {
  document.querySelectorAll(".ci-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".ci-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".ci-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = document.getElementById(`panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add("active");

      // Cargar datos del tab al activarlo
      if (tab.dataset.tab === "general") cargarAuditoriaGeneral();
      if (tab.dataset.tab === "historial") cargarHistorial();
      if (tab.dataset.tab === "impacto") cargarImpacto();
    });
  });
}

// ─── Eventos ───────────────────────────────────────────────────────────────────

function configurarEventos() {
  document.getElementById("auditSelectObra").addEventListener("change", async (e) => {
    obraAuditActiva = e.target.value;
    if (obraAuditActiva) await cargarStockAuditoria();
  });

  document.getElementById("btnAplicarAjustes")?.addEventListener("click", aplicarAjustes);
  document.getElementById("btnLimpiarAudit")?.addEventListener("click", limpiarAuditoria);

  document.getElementById("btnFiltrarDiscrepancias")?.addEventListener("click", filtrarDiscrepancias);
  document.getElementById("btnSincronizarTodo")?.addEventListener("click", sincronizarTodo);

  document.getElementById("historialFiltroObra")?.addEventListener("change", cargarHistorial);
  document.getElementById("historialFiltroPeriodo")?.addEventListener("change", cargarHistorial);

  document.getElementById("btnLogout")?.addEventListener("click", () => {
    window.location.href = "../../inicio-de-sesion.html";
  });
}

// ─── Cargar datos iniciales ────────────────────────────────────────────────────

async function cargarDatos() {
  // Cargar obras
  const { data: obrasData } = await supabase
    .from("obras")
    .select("id, nombre, direccion, estado")
    .order("nombre");
  obras = obrasData || [];

  // Poblar selects
  const selectAudit = document.getElementById("auditSelectObra");
  const selectHistorial = document.getElementById("historialFiltroObra");
  obras.filter(o => o.estado === "activa").forEach(o => {
    selectAudit.appendChild(new Option(o.nombre, o.id));
    selectHistorial.appendChild(new Option(o.nombre, o.id));
  });

  await cargarPanelSalud();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: SALUD DEL INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

async function cargarPanelSalud() {
  const activas = obras.filter(o => o.estado === "activa");
  const inactivas = obras.filter(o => o.estado !== "activa");

  document.getElementById("kpiObrasActivas").textContent = activas.length;

  // Valor del inventario
  const { data: prodData } = await supabase.from("productos").select("existencia, costo_prom");
  if (prodData) {
    const valor = prodData.reduce((s, p) => s + ((parseFloat(p.existencia) || 0) * (parseFloat(p.costo_prom) || 0)), 0);
    document.getElementById("kpiValorTotal").textContent = "$" + valor.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  // Auditorías últimos 30 días
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const { data: ajustes30 } = await supabase
    .from("movimientos")
    .select("obra_id, cantidad")
    .eq("tipo", "ajuste")
    .gte("creado_en", hace30.toISOString());

  const obrasAuditadas = new Set((ajustes30 || []).map(a => a.obra_id).filter(Boolean));
  const pendientes = activas.filter(o => !obrasAuditadas.has(o.id)).length;
  document.getElementById("kpiPendientes").textContent = pendientes;

  // Precisión (obras auditadas / obras activas)
  const precision = activas.length > 0 ? Math.round((obrasAuditadas.size / activas.length) * 100) : 0;
  document.getElementById("kpiPrecision").textContent = precision + "%";

  // Stock por obra
  const { data: stockData } = await supabase.from("stock_obra").select("obra_id, cantidad");
  const stockPorObra = {};
  (stockData || []).forEach(s => {
    if (!stockPorObra[s.obra_id]) stockPorObra[s.obra_id] = { items: 0, stock: 0 };
    stockPorObra[s.obra_id].items++;
    stockPorObra[s.obra_id].stock += (s.cantidad || 0);
  });

  // Render obras activas
  const gridActivas = document.getElementById("obrasActivasGrid");
  gridActivas.innerHTML = activas.length === 0
    ? '<div style="color:#9ca3af;font-size:13px;padding:16px;">No hay obras activas.</div>'
    : activas.map(o => renderObraCard(o, stockPorObra[o.id], obrasAuditadas.has(o.id))).join("");

  // Render obras inactivas
  if (inactivas.length > 0) {
    document.getElementById("toggleInactivas").style.display = "flex";
    document.getElementById("countInactivas").textContent = inactivas.length;
    document.getElementById("obrasInactivasGrid").innerHTML =
      inactivas.map(o => renderObraCardInactiva(o, stockPorObra[o.id])).join("");
  }
}

function renderObraCard(obra, stats, auditada) {
  const s = stats || { items: 0, stock: 0 };
  return `
    <div class="ci-obra-card activa">
      <span class="ci-obra-badge ${auditada ? 'ok' : 'pendiente'}">${auditada ? '✓ Auditada' : '⏳ Pendiente'}</span>
      <div class="ci-obra-name">${esc(obra.nombre)}</div>
      ${obra.direccion ? `<div class="ci-obra-dir"><i class="fa fa-map-pin"></i>${esc(obra.direccion)}</div>` : ''}
      <div class="ci-obra-stats">
        <div class="ci-obra-stat"><div class="ci-obra-stat-val">${s.items}</div><div class="ci-obra-stat-lbl">Productos</div></div>
        <div class="ci-obra-stat"><div class="ci-obra-stat-val">${s.stock}</div><div class="ci-obra-stat-lbl">Stock</div></div>
      </div>
    </div>`;
}

function renderObraCardInactiva(obra, stats) {
  const s = stats || { items: 0, stock: 0 };
  return `
    <div class="ci-obra-card inactiva">
      <span class="ci-obra-badge inactiva">Inactiva</span>
      <div class="ci-obra-name">${esc(obra.nombre)}</div>
      ${obra.direccion ? `<div class="ci-obra-dir"><i class="fa fa-map-pin"></i>${esc(obra.direccion)}</div>` : ''}
      <div class="ci-obra-stats">
        <div class="ci-obra-stat"><div class="ci-obra-stat-val">${s.items}</div><div class="ci-obra-stat-lbl">Productos</div></div>
        <div class="ci-obra-stat"><div class="ci-obra-stat-val">${s.stock}</div><div class="ci-obra-stat-lbl">Stock</div></div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: AUDITORÍA RÁPIDA
// ═══════════════════════════════════════════════════════════════════════════════

async function cargarStockAuditoria() {
  const { data, error } = await supabase
    .from("stock_obra")
    .select("producto_id, cantidad, productos(codigo, descripcion, unidad, costo_prom)")
    .eq("obra_id", obraAuditActiva)
    .order("producto_id");

  if (error) { console.error(error); return; }

  stockAudit = (data || []).map(item => ({
    producto_id: item.producto_id,
    codigo: item.productos?.codigo || "—",
    descripcion: item.productos?.descripcion || "—",
    unidad: item.productos?.unidad || "uds",
    costo: parseFloat(item.productos?.costo_prom) || 0,
    stockSistema: item.cantidad || 0,
    conteoReal: null
  }));

  renderTablaAuditoria();
  document.getElementById("auditActions").classList.remove("hidden");
  document.getElementById("auditImpactBar").classList.remove("hidden");
  calcularImpactoTiempoReal();
}

function renderTablaAuditoria() {
  const tbody = document.getElementById("auditTableBody");
  if (stockAudit.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:30px;">Esta obra no tiene productos asignados.</td></tr>';
    return;
  }

  tbody.innerHTML = stockAudit.map((item, i) => `
    <tr>
      <td style="font-family:monospace;font-size:12px;color:#a29bfe;">${esc(item.codigo)}</td>
      <td>${esc(item.descripcion)}</td>
      <td>${item.stockSistema} ${item.unidad}</td>
      <td><input type="number" min="0" data-index="${i}" class="audit-input" placeholder="—" oninput="window.ciOnInput(this)"></td>
      <td class="diff-cell" id="diff-${i}">—</td>
    </tr>
  `).join("");
}

// Input handler global
window.ciOnInput = function(input) {
  const idx = parseInt(input.dataset.index);
  const valor = input.value.trim();
  if (valor === "" || isNaN(parseInt(valor))) {
    stockAudit[idx].conteoReal = null;
    document.getElementById(`diff-${idx}`).textContent = "—";
    document.getElementById(`diff-${idx}`).className = "diff-zero";
  } else {
    stockAudit[idx].conteoReal = parseInt(valor);
    const diff = stockAudit[idx].conteoReal - stockAudit[idx].stockSistema;
    const cell = document.getElementById(`diff-${idx}`);
    if (diff > 0) { cell.textContent = `+${diff}`; cell.className = "diff-pos"; }
    else if (diff < 0) { cell.textContent = `${diff}`; cell.className = "diff-neg"; }
    else { cell.textContent = "0"; cell.className = "diff-zero"; }
  }
  calcularImpactoTiempoReal();
};

function calcularImpactoTiempoReal() {
  let faltantes = 0, sobrantes = 0, productosConDiff = 0, valorImpacto = 0;

  stockAudit.forEach(item => {
    if (item.conteoReal !== null && item.conteoReal !== item.stockSistema) {
      productosConDiff++;
      const diff = item.conteoReal - item.stockSistema;
      if (diff < 0) { faltantes += Math.abs(diff); valorImpacto -= Math.abs(diff) * item.costo; }
      else { sobrantes += diff; valorImpacto += diff * item.costo; }
    }
  });

  document.getElementById("impactProductos").textContent = productosConDiff;
  document.getElementById("impactFaltantes").textContent = `-${faltantes}`;
  document.getElementById("impactSobrantes").textContent = `+${sobrantes}`;
  const signo = valorImpacto >= 0 ? "+" : "";
  document.getElementById("impactValor").textContent = `${signo}$${Math.abs(valorImpacto).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("impactValor").className = `ci-impact-val ${valorImpacto >= 0 ? 'diff-pos' : 'diff-neg'}`;
}

async function aplicarAjustes() {
  const session = supabase.auth.session();
  if (!session) {
    alert("⚠️ Sesión expirada. Inicia sesión nuevamente.");
    window.location.href = "../../inicio-de-sesion.html";
    return;
  }

  const diferencias = stockAudit.filter(item => item.conteoReal !== null && item.conteoReal !== item.stockSistema);
  if (diferencias.length === 0) {
    alert("No hay diferencias que ajustar.");
    return;
  }

  if (!confirm(`¿Aplicar ${diferencias.length} ajuste(s)? Esto modificará el stock en tiempo real.`)) return;

  const obraNombre = document.getElementById("auditSelectObra").selectedOptions[0]?.textContent || "";
  let errores = [], exitosos = 0;

  for (const item of diferencias) {
    const { error: errStock } = await supabase
      .from("stock_obra")
      .update({ cantidad: item.conteoReal })
      .eq("producto_id", item.producto_id)
      .eq("obra_id", obraAuditActiva);

    if (errStock) { errores.push(`${item.codigo}: ${errStock.message}`); continue; }

    const { error: errMov } = await supabase.from("movimientos").insert({
      producto_id: item.producto_id,
      tipo: "ajuste",
      cantidad: item.conteoReal - item.stockSistema,
      obra_id: obraAuditActiva,
      sitio: obraNombre,
      motivo: `Auditoría: conteo real (sistema: ${item.stockSistema}, real: ${item.conteoReal})`,
      creado_en: new Date().toISOString()
    });

    if (errMov) { errores.push(`${item.codigo}: ${errMov.message}`); }
    else { exitosos++; }
  }

  if (errores.length > 0) {
    alert(`⚠️ Parcial: ${exitosos} exitosos, ${errores.length} errores.\n\n${errores.join("\n")}`);
  } else {
    alert(`✅ Auditoría completada. ${exitosos} producto(s) ajustados.`);
  }

  // Recargar
  await cargarStockAuditoria();
  await cargarPanelSalud();
}

function limpiarAuditoria() {
  stockAudit.forEach(item => { item.conteoReal = null; });
  document.querySelectorAll(".audit-input").forEach(input => { input.value = ""; });
  document.querySelectorAll("[id^='diff-']").forEach(cell => { cell.textContent = "—"; cell.className = "diff-zero"; });
  calcularImpactoTiempoReal();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: AUDITORÍA GENERAL
// ═══════════════════════════════════════════════════════════════════════════════

let datosGenerales = [];
let mostrandoSoloDiscrepancias = false;

async function cargarAuditoriaGeneral() {
  // Cargar todos los productos con existencia y costo
  const { data: productos } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, existencia, costo_prom, unidad")
    .order("descripcion");

  // Cargar suma de stock_obra por producto
  const { data: stockObras } = await supabase
    .from("stock_obra")
    .select("producto_id, cantidad");

  // Sumar stock real por producto
  const stockRealMap = {};
  (stockObras || []).forEach(s => {
    stockRealMap[s.producto_id] = (stockRealMap[s.producto_id] || 0) + (s.cantidad || 0);
  });

  // Construir datos
  datosGenerales = (productos || []).map(p => ({
    id: p.id,
    codigo: p.codigo || "—",
    descripcion: p.descripcion || "—",
    unidad: p.unidad || "uds",
    existencia: parseFloat(p.existencia) || 0,
    stockReal: stockRealMap[p.id] || 0,
    costo: parseFloat(p.costo_prom) || 0,
    diferencia: (stockRealMap[p.id] || 0) - (parseFloat(p.existencia) || 0)
  }));

  // KPIs
  const total = datosGenerales.length;
  const discrepancias = datosGenerales.filter(d => d.diferencia !== 0).length;
  const coinciden = total - discrepancias;
  const precision = total > 0 ? Math.round((coinciden / total) * 100) : 100;

  document.getElementById("genTotalProductos").textContent = total;
  document.getElementById("genCoinciden").textContent = coinciden;
  document.getElementById("genDiscrepancias").textContent = discrepancias;
  document.getElementById("genPrecision").textContent = precision + "%";

  // Mostrar/ocultar botón sincronizar
  const btnSync = document.getElementById("btnSincronizarTodo");
  if (discrepancias > 0) btnSync.classList.remove("hidden");
  else btnSync.classList.add("hidden");

  renderTablaGeneral();
}

function renderTablaGeneral() {
  const tbody = document.getElementById("generalTableBody");
  let datos = mostrandoSoloDiscrepancias
    ? datosGenerales.filter(d => d.diferencia !== 0)
    : datosGenerales;

  if (datos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:30px;">No hay datos para mostrar.</td></tr>';
    return;
  }

  // Ordenar: discrepancias primero
  datos = [...datos].sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));

  tbody.innerHTML = datos.map(d => {
    const diffClass = d.diferencia > 0 ? "diff-pos" : d.diferencia < 0 ? "diff-neg" : "diff-zero";
    const diffText = d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia < 0 ? `${d.diferencia}` : "✓";
    const rowBg = d.diferencia !== 0 ? "background:rgba(239,68,68,0.03);" : "";

    return `
      <tr style="${rowBg}">
        <td style="font-family:monospace;font-size:12px;color:#a29bfe;">${esc(d.codigo)}</td>
        <td>${esc(d.descripcion)}</td>
        <td>${d.existencia} ${d.unidad}</td>
        <td>${d.stockReal} ${d.unidad}</td>
        <td class="${diffClass}" style="font-weight:700;">${diffText}</td>
        <td style="font-size:12px;color:#9ca3af;">$${d.costo.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        <td>${d.diferencia !== 0 ? `<button class="ci-btn ci-btn-ghost" style="padding:5px 10px;font-size:11px;" onclick="window.ciSincronizarProducto('${d.id}', ${d.stockReal})"><i class="fa fa-sync"></i></button>` : '<span style="color:#22c55e;font-size:12px;">OK</span>'}</td>
      </tr>`;
  }).join("");
}

function filtrarDiscrepancias() {
  mostrandoSoloDiscrepancias = !mostrandoSoloDiscrepancias;
  const btn = document.getElementById("btnFiltrarDiscrepancias");
  if (mostrandoSoloDiscrepancias) {
    btn.innerHTML = '<i class="fa fa-list"></i> Mostrar todos';
    btn.classList.remove("ci-btn-ghost");
    btn.classList.add("ci-btn-primary");
  } else {
    btn.innerHTML = '<i class="fa fa-filter"></i> Solo discrepancias';
    btn.classList.remove("ci-btn-primary");
    btn.classList.add("ci-btn-ghost");
  }
  renderTablaGeneral();
}

// Sincronizar un producto individual
window.ciSincronizarProducto = async function(productoId, stockReal) {
  const { error } = await supabase
    .from("productos")
    .update({ existencia: stockReal })
    .eq("id", productoId);

  if (error) {
    alert("Error: " + error.message);
    return;
  }

  // Actualizar en memoria
  const item = datosGenerales.find(d => d.id === productoId);
  if (item) { item.existencia = stockReal; item.diferencia = 0; }

  // Re-render
  const total = datosGenerales.length;
  const discrepancias = datosGenerales.filter(d => d.diferencia !== 0).length;
  document.getElementById("genCoinciden").textContent = total - discrepancias;
  document.getElementById("genDiscrepancias").textContent = discrepancias;
  document.getElementById("genPrecision").textContent = (total > 0 ? Math.round(((total - discrepancias) / total) * 100) : 100) + "%";

  if (discrepancias === 0) document.getElementById("btnSincronizarTodo").classList.add("hidden");
  renderTablaGeneral();
};

// Sincronizar todos los productos con discrepancias
async function sincronizarTodo() {
  const discrepancias = datosGenerales.filter(d => d.diferencia !== 0);
  if (discrepancias.length === 0) return;

  if (!confirm(`¿Sincronizar ${discrepancias.length} producto(s)?\n\nEsto actualizará el campo "existencia" para que coincida con el stock real distribuido en obras.`)) return;

  let errores = 0, exitosos = 0;

  for (const d of discrepancias) {
    const { error } = await supabase
      .from("productos")
      .update({ existencia: d.stockReal })
      .eq("id", d.id);

    if (error) { errores++; console.error(error); }
    else { exitosos++; d.existencia = d.stockReal; d.diferencia = 0; }
  }

  if (errores > 0) {
    alert(`⚠️ Parcial: ${exitosos} sincronizados, ${errores} errores.`);
  } else {
    alert(`✅ ${exitosos} producto(s) sincronizados correctamente.`);
  }

  // Actualizar KPIs y tabla
  const total = datosGenerales.length;
  const restantes = datosGenerales.filter(d => d.diferencia !== 0).length;
  document.getElementById("genCoinciden").textContent = total - restantes;
  document.getElementById("genDiscrepancias").textContent = restantes;
  document.getElementById("genPrecision").textContent = (total > 0 ? Math.round(((total - restantes) / total) * 100) : 100) + "%";
  if (restantes === 0) document.getElementById("btnSincronizarTodo").classList.add("hidden");
  renderTablaGeneral();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: HISTORIAL
// ═══════════════════════════════════════════════════════════════════════════════

async function cargarHistorial() {
  const obraFiltro = document.getElementById("historialFiltroObra").value;
  const dias = parseInt(document.getElementById("historialFiltroPeriodo").value) || 30;

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  let query = supabase
    .from("movimientos")
    .select("creado_en, cantidad, motivo, sitio, obra_id, productos(codigo, descripcion)")
    .eq("tipo", "ajuste")
    .gte("creado_en", desde.toISOString())
    .order("creado_en", { ascending: false })
    .limit(50);

  if (obraFiltro) query = query.eq("obra_id", obraFiltro);

  const { data, error } = await query;
  const tbody = document.getElementById("historialTableBody");

  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:30px;">No hay ajustes en este periodo.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(m => {
    const diff = m.cantidad;
    const diffClass = diff > 0 ? "diff-pos" : diff < 0 ? "diff-neg" : "diff-zero";
    const diffText = diff > 0 ? `+${diff}` : `${diff}`;
    return `
      <tr>
        <td style="font-size:12px;color:#9ca3af;">${new Date(m.creado_en).toLocaleDateString("es-ES")} ${new Date(m.creado_en).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</td>
        <td>${esc(m.sitio || "—")}</td>
        <td>${esc(m.productos?.descripcion || m.productos?.codigo || "—")}</td>
        <td class="${diffClass}" style="font-weight:700;">${diffText}</td>
        <td style="font-size:11px;color:#9ca3af;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${esc(m.motivo || "—")}</td>
      </tr>`;
  }).join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5: ANÁLISIS DE IMPACTO
// ═══════════════════════════════════════════════════════════════════════════════

async function cargarImpacto() {
  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const { data: ajustes } = await supabase
    .from("movimientos")
    .select("cantidad, obra_id, producto_id, sitio, productos(descripcion, costo_prom)")
    .eq("tipo", "ajuste")
    .gte("creado_en", hace30.toISOString());

  if (!ajustes || ajustes.length === 0) {
    document.getElementById("impTotalFaltantes").textContent = "0";
    document.getElementById("impTotalSobrantes").textContent = "0";
    document.getElementById("impValorPerdido").textContent = "$0";
    document.getElementById("impTotalAjustes").textContent = "0";
    document.getElementById("topFaltantes").innerHTML = '<li style="color:#9ca3af;font-size:12px;padding:10px;">Sin datos en los últimos 30 días</li>';
    document.getElementById("topSobrantes").innerHTML = '<li style="color:#9ca3af;font-size:12px;padding:10px;">Sin datos en los últimos 30 días</li>';
    return;
  }

  let totalFaltantes = 0, totalSobrantes = 0, valorPerdido = 0;
  const porProducto = {};
  const porObra = {};

  ajustes.forEach(a => {
    const cant = a.cantidad || 0;
    const costo = parseFloat(a.productos?.costo_prom) || 0;
    const nombre = a.productos?.descripcion || "Desconocido";

    if (cant < 0) { totalFaltantes += Math.abs(cant); valorPerdido += Math.abs(cant) * costo; }
    else if (cant > 0) { totalSobrantes += cant; }

    if (!porProducto[a.producto_id]) porProducto[a.producto_id] = { nombre, faltantes: 0, sobrantes: 0 };
    if (cant < 0) porProducto[a.producto_id].faltantes += Math.abs(cant);
    else porProducto[a.producto_id].sobrantes += cant;

    const obraNombre = a.sitio || "Sin obra";
    if (!porObra[obraNombre]) porObra[obraNombre] = { faltantes: 0, sobrantes: 0 };
    if (cant < 0) porObra[obraNombre].faltantes += Math.abs(cant);
    else porObra[obraNombre].sobrantes += cant;
  });

  document.getElementById("impTotalFaltantes").textContent = `-${totalFaltantes}`;
  document.getElementById("impTotalSobrantes").textContent = `+${totalSobrantes}`;
  document.getElementById("impValorPerdido").textContent = `-$${valorPerdido.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  document.getElementById("impTotalAjustes").textContent = ajustes.length;

  // Top faltantes
  const topFalt = Object.values(porProducto).filter(p => p.faltantes > 0).sort((a, b) => b.faltantes - a.faltantes).slice(0, 8);
  document.getElementById("topFaltantes").innerHTML = topFalt.length === 0
    ? '<li style="color:#9ca3af;font-size:12px;padding:10px;">Sin faltantes</li>'
    : topFalt.map((p, i) => `
      <li class="ci-top-item">
        <span class="ci-top-rank">${i + 1}</span>
        <span class="ci-top-name">${esc(p.nombre)}</span>
        <span class="ci-top-val diff-neg">-${p.faltantes}</span>
      </li>`).join("");

  // Top sobrantes
  const topSob = Object.values(porProducto).filter(p => p.sobrantes > 0).sort((a, b) => b.sobrantes - a.sobrantes).slice(0, 8);
  document.getElementById("topSobrantes").innerHTML = topSob.length === 0
    ? '<li style="color:#9ca3af;font-size:12px;padding:10px;">Sin sobrantes</li>'
    : topSob.map((p, i) => `
      <li class="ci-top-item">
        <span class="ci-top-rank">${i + 1}</span>
        <span class="ci-top-name">${esc(p.nombre)}</span>
        <span class="ci-top-val diff-pos">+${p.sobrantes}</span>
      </li>`).join("");

  // Gráfica por obra
  renderChartDiscrepancias(porObra);
}

function renderChartDiscrepancias(porObra) {
  const el = document.getElementById("chartDiscrepancias");
  if (!el || typeof ApexCharts === "undefined") return;

  const nombres = Object.keys(porObra);
  const faltantes = nombres.map(n => porObra[n].faltantes);
  const sobrantes = nombres.map(n => porObra[n].sobrantes);

  el.innerHTML = "";
  new ApexCharts(el, {
    chart: { type: "bar", height: 280, toolbar: { show: false }, background: "transparent", stacked: false },
    theme: { mode: "dark" },
    series: [
      { name: "Faltantes", data: faltantes },
      { name: "Sobrantes", data: sobrantes }
    ],
    xaxis: { categories: nombres, labels: { style: { colors: "#9ca3af", fontSize: "11px" } } },
    colors: ["#ef4444", "#22c55e"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    grid: { borderColor: "rgba(255,255,255,0.06)" },
    legend: { position: "top", labels: { colors: "#9ca3af" } },
    dataLabels: { enabled: false }
  }).render();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

window.toggleInactivas = function() {
  const grid = document.getElementById("obrasInactivasGrid");
  const chevron = document.getElementById("chevronInact");
  if (grid.classList.contains("hidden")) {
    grid.classList.remove("hidden");
    chevron.style.transform = "rotate(90deg)";
  } else {
    grid.classList.add("hidden");
    chevron.style.transform = "rotate(0deg)";
  }
};
