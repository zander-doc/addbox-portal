// ============================================================
// ADDBOX — inventario-valorado.js
// Módulo de Inventario Valorado con exportaciones premium
// Integrado al sistema admin-dashboard
// ============================================================

let paginaActual = 1;
const registrosPorPagina = 20;
let filtrosActivos = {};

const ADDBOX_COLORS = {
  primary: '1B2A4A', accent: '00C6AE', dark: '0F1B33', white: 'FFFFFF',
  lightGray: 'F4F6F9', midGray: 'D1D5DB', textDark: '1F2937',
  success: '10B981', danger: 'EF4444', warning: 'F59E0B'
};

function formatearFecha(fecha) {
  if (!fecha) return "-";
  const f = new Date(fecha);
  return f.toLocaleDateString("es-VE") + " " + f.toLocaleTimeString("es-VE");
}
function _fechaArchivo() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function _placeholderBase64() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="8" fill="#F4F6F9"/><rect x="30" y="25" width="60" height="50" rx="4" fill="#D1D5DB"/><circle cx="48" cy="45" r="5" fill="#9CA3AF"/><polygon points="35,70 55,50 75,70" fill="#9CA3AF"/><polygon points="60,70 72,55 85,70" fill="#B0B7C3"/><text x="60" y="95" text-anchor="middle" font-family="Arial" font-size="10" fill="#9CA3AF">Sin foto</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  cargarCategorias();
});


async function cargarProductos(filtros = {}, pagina = 1) {
  filtrosActivos = filtros;
  paginaActual = pagina;
  const desde = (pagina - 1) * registrosPorPagina;
  const hasta = desde + registrosPorPagina - 1;
  const tbody = document.getElementById("inv-tbody");
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;">Cargando productos...</td></tr>`;

  let query = window.supabaseClient.from("productos").select("*", { count: "exact" }).order("codigo", { ascending: true }).range(desde, hasta);
  if (filtros.codigo) query = query.ilike("codigo", `%${filtros.codigo}%`);
  if (filtros.descripcion) query = query.ilike("descripcion", `%${filtros.descripcion}%`);
  if (filtros.categoria) query = query.eq("categoria", filtros.categoria);
  if (filtros.existencia) {
    if (filtros.existencia === "sin_stock") query = query.eq("existencia", 0);
    if (filtros.existencia === "bajo_stock") query = query.lte("existencia", 5);
    if (filtros.existencia === "normal") query = query.gt("existencia", 5);
  }

  const { data, error, count } = await query;
  if (error) { console.error(error); showToast("Error cargando productos.", "error", "Inventario"); return; }

  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;">No hay productos.</td></tr>`;
    renderPaginacion(0); return;
  }

  data.forEach(prod => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${prod.codigo}</td>
      <td>${prod.descripcion}</td>
      <td>${prod.unidad}</td>
      <td style="text-align:right;">${Number(prod.costo_promedio || 0).toFixed(2)}</td>
      <td style="text-align:right;">${Number(prod.existencia || 0).toFixed(2)}</td>
      <td style="text-align:right;">${Number(prod.existencia_anterior || 0).toFixed(2)}</td>
      <td>${formatearFecha(prod.updated_at)}</td>
      <td>
        <button class="topbar-btn" onclick="verFichaTecnica('${prod.codigo}')"><i class="fa fa-id-card"></i> Ficha</button>
        <button class="topbar-btn" onclick="verKardex('${prod.codigo}')"><i class="fa fa-list"></i> Kardex</button>
      </td>`;
    tbody.appendChild(tr);
  });
  renderPaginacion(count);
}

function renderPaginacion(total) {
  const paginas = Math.ceil(total / registrosPorPagina);
  const cont = document.getElementById("paginacion");
  if (paginas <= 1) { cont.innerHTML = ""; return; }
  cont.innerHTML = `
    <button class="paginacion-btn ${paginaActual===1?'disabled':''}" onclick="cambiarPagina(${paginaActual-1})">◀ Anterior</button>
    <span style="color:#ccc;font-size:12px;">Página ${paginaActual} de ${paginas}</span>
    <button class="paginacion-btn ${paginaActual===paginas?'disabled':''}" onclick="cambiarPagina(${paginaActual+1})">Siguiente ▶</button>`;
}
function cambiarPagina(p) { cargarProductos(filtrosActivos, p); }

function aplicarFiltros() {
  cargarProductos({
    codigo: document.getElementById("filtroCodigo").value.trim(),
    descripcion: document.getElementById("filtroDescripcion").value.trim(),
    categoria: document.getElementById("filtroCategoria").value,
    existencia: document.getElementById("filtroExistencia").value
  });
}
document.getElementById("filtroCodigo").addEventListener("input", aplicarFiltros);
document.getElementById("filtroDescripcion").addEventListener("input", aplicarFiltros);
document.getElementById("filtroCategoria").addEventListener("change", aplicarFiltros);
document.getElementById("filtroExistencia").addEventListener("change", aplicarFiltros);

async function cargarCategorias() {
  const { data } = await window.supabaseClient.from("productos").select("categoria");
  if (!data) return;
  const cats = [...new Set(data.map(p => (p.categoria||'').trim()).filter(c => c))].sort();
  const sel = document.getElementById("filtroCategoria");
  sel.innerHTML = '<option value="">Todas las categorías</option>';
  cats.forEach(c => { sel.innerHTML += `<option value="${c}">${c}</option>`; });
}

// === KARDEX ===
async function verKardex(codigo) {
  document.getElementById("modalKardex").style.display = "flex";
  document.getElementById("kardexTitulo").textContent = "Producto: " + codigo;
  const tbody = document.getElementById("kardex-tbody");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">Cargando...</td></tr>`;
  const { data, error } = await window.supabaseClient.from("kardex").select("*").eq("codigo", codigo).order("fecha", { ascending: true });
  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">${error ? 'Error' : 'Sin movimientos'}</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(m => `<tr><td>${formatearFecha(m.fecha)}</td><td>${m.tipo}</td><td style="text-align:right;">${Number(m.cantidad).toFixed(2)}</td><td style="text-align:right;">${Number(m.costo_unitario).toFixed(2)}</td><td style="text-align:right;">${Number(m.costo_total).toFixed(2)}</td><td style="text-align:right;">${Number(m.saldo).toFixed(2)}</td></tr>`).join("");
}
function cerrarModalKardex() { document.getElementById("modalKardex").style.display = "none"; }

// === FICHA TÉCNICA ===
async function verFichaTecnica(codigo) {
  const { data, error } = await window.supabaseClient.from("productos").select("*").eq("codigo", codigo).single();
  if (error || !data) { showToast("Error cargando ficha.", "error"); return; }
  document.getElementById("fichaTitulo").textContent = data.descripcion;
  document.getElementById("fichaCodigo").textContent = data.codigo;
  document.getElementById("fichaUnidad").textContent = data.unidad;
  document.getElementById("fichaCategoria").textContent = data.categoria || "N/A";
  document.getElementById("fichaCosto").textContent = Number(data.costo_promedio||0).toFixed(2);
  document.getElementById("fichaExistencia").textContent = Number(data.existencia||0).toFixed(2);
  document.getElementById("fichaFecha").textContent = formatearFecha(data.updated_at);
  document.getElementById("fichaFoto").src = _placeholderBase64();
  if (typeof QRCode !== 'undefined') { const cont = document.getElementById("fichaQR"); cont.innerHTML = ""; QRCode.toCanvas(cont, data.codigo, { width: 120 }); }
  cargarMovimientosFicha(data.codigo);
  document.getElementById("modalFicha").style.display = "flex";
}
function cerrarModalFicha() { document.getElementById("modalFicha").style.display = "none"; }
async function cargarMovimientosFicha(codigo) {
  const { data } = await window.supabaseClient.from("kardex").select("*").eq("codigo", codigo).order("fecha", { ascending: false }).limit(10);
  const tbody = document.getElementById("fichaMovimientos");
  if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="4">Sin movimientos</td></tr>`; return; }
  tbody.innerHTML = data.map(m => `<tr><td>${formatearFecha(m.fecha)}</td><td>${m.tipo}</td><td>${Number(m.cantidad).toFixed(2)}</td><td>${Number(m.costo_unitario).toFixed(2)}</td></tr>`).join("");
}

// === MOVIMIENTO ===
function abrirModalMovimiento() { document.getElementById("modalMovimiento").style.display = "flex"; cargarProductosEnModal(); cargarObrasEnModal(); }
function cerrarModalMovimiento() { document.getElementById("modalMovimiento").style.display = "none"; }
async function cargarProductosEnModal() {
  const { data } = await window.supabaseClient.from("productos").select("*").order("codigo");
  const sel = document.getElementById("movProducto");
  sel.innerHTML = `<option value="">Seleccione producto</option>`;
  (data||[]).forEach(p => { sel.innerHTML += `<option value="${p.id}">${p.codigo} — ${p.descripcion}</option>`; });
}
async function cargarObrasEnModal() {
  const { data } = await window.supabaseClient.from("obras").select("*").order("nombre");
  const sel = document.getElementById("movObra");
  sel.innerHTML = `<option value="">Ninguna</option>`;
  (data||[]).forEach(o => { sel.innerHTML += `<option value="${o.id}">${o.nombre}</option>`; });
}
async function guardarMovimiento() {
  const producto_id = document.getElementById("movProducto").value;
  const tipo = document.getElementById("movTipo").value;
  const cantidad = parseFloat(document.getElementById("movCantidad").value);
  const costo_unitario = parseFloat(document.getElementById("movCostoUnitario").value) || 0;
  const obra_id = document.getElementById("movObra").value || null;
  if (!producto_id || !tipo || !cantidad || cantidad <= 0) { alert("Complete los campos obligatorios."); return; }
  const { error } = await window.supabaseClient.from("movimientos").insert({ producto_id, tipo, cantidad, costo_unitario, costo_total: costo_unitario * cantidad, obra_id });
  if (error) { showToast("Error guardando movimiento.", "error"); return; }
  cerrarModalMovimiento(); cargarProductos(); showToast("Movimiento registrado.", "success", "Inventario");
}


// === EXPORTAR INVENTARIO A EXCEL ===
async function exportarExcel() {
  const { data, error } = await window.supabaseClient.from("productos").select("*").order("codigo", { ascending: true });
  if (error || !data || data.length === 0) { showToast("No hay datos para exportar.", "info"); return; }
  const rows = [["Código", "Descripción", "Unidad", "Costo Promedio", "Existencia Actual", "Existencia Anterior", "Última Actualización"]];
  data.forEach(p => { rows.push([p.codigo, p.descripcion, p.unidad, Number(p.costo_promedio), Number(p.existencia), Number(p.existencia_anterior), formatearFecha(p.updated_at)]); });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0].map((_, i) => ({ wch: Math.max(...rows.map(r => (r[i] ? r[i].toString().length : 0))) + 2 }));
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref] || (ws[ref] = {});
      cell.s = cell.s || {};
      if (R === 0) { cell.s.fill = { fgColor: { rgb: "1B2A4A" } }; cell.s.font = { bold: true, color: { rgb: "FFFFFF" } }; cell.s.alignment = { horizontal: "center" }; }
      else if (C >= 3) { cell.s.alignment = { horizontal: "right" }; }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, `Inventario_ADDBOX_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast("Inventario exportado a Excel.", "success", "Inventario");
}

// === EXPORTAR KARDEX PDF ===
async function exportarKardexPDF() {
  const codigo = document.getElementById("kardexTitulo").textContent.replace("Producto: ", "");
  const { data } = await window.supabaseClient.from("kardex").select("*").eq("codigo", codigo).order("fecha", { ascending: true });
  if (!data || data.length === 0) { showToast("Sin movimientos.", "info"); return; }
  const filas = data.map(m => `<tr><td>${formatearFecha(m.fecha)}</td><td>${m.tipo}</td><td style="text-align:right;">${Number(m.cantidad).toFixed(2)}</td><td style="text-align:right;">${Number(m.costo_unitario).toFixed(2)}</td><td style="text-align:right;">${Number(m.costo_total).toFixed(2)}</td><td style="text-align:right;">${Number(m.saldo).toFixed(2)}</td></tr>`).join("");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Kardex ${codigo}</title><style>body{font-family:Arial;font-size:12px;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #444;padding:6px;}th{background:#1B2A4A;color:#fff;}</style></head><body><h1>KARDEX — ${codigo}</h1><p>Generado: ${new Date().toLocaleString("es-VE")}</p><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Costo Unit.</th><th>Costo Total</th><th>Saldo</th></tr></thead><tbody>${filas}</tbody></table><script>window.print();</script></body></html>`);
  w.document.close();
}

// === EXPORTAR KARDEX EXCEL ===
async function exportarKardexExcel() {
  const codigo = document.getElementById("kardexTitulo").textContent.replace("Producto: ", "");
  const { data } = await window.supabaseClient.from("kardex").select("*").eq("codigo", codigo).order("fecha", { ascending: true });
  if (!data || data.length === 0) { showToast("Sin movimientos.", "info"); return; }
  const rows = [["Fecha", "Tipo", "Cantidad", "Costo Unitario", "Costo Total", "Saldo"]];
  data.forEach(m => { rows.push([formatearFecha(m.fecha), m.tipo, Number(m.cantidad), Number(m.costo_unitario), Number(m.costo_total), Number(m.saldo)]); });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Kardex");
  XLSX.writeFile(wb, `Kardex_${codigo}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast("Kardex exportado.", "success");
}

// === EXPORTAR FICHA PDF ===
async function exportarFichaPDF() {
  const codigo = document.getElementById("fichaCodigo").textContent;
  if (!codigo) return;
  if (typeof window.jspdf === 'undefined') { showToast("jsPDF no disponible.", "error"); return; }
  const { data: prod } = await window.supabaseClient.from("productos").select("*").eq("codigo", codigo).single();
  if (!prod) return;
  const { jsPDF: JPDF } = window.jspdf;
  const doc = new JPDF('p', 'mm', 'letter');
  const W = doc.internal.pageSize.getWidth(), M = 14;
  doc.setFillColor(27,42,74); doc.rect(0,0,W,28,'F');
  doc.setFillColor(0,198,174); doc.rect(0,28,W,1.2,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(18);
  doc.text('ADDBOX — Ficha Técnica', M, 18);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('Generado: ' + new Date().toLocaleString('es-VE'), W-M, 24, { align:'right' });
  let y = 38;
  doc.setTextColor(31,41,55); doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text(prod.descripcion || '', M, y); y += 8;
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
  const info = [
    ['Código', prod.codigo], ['Unidad', prod.unidad], ['Categoría', prod.categoria||'General'],
    ['Costo Promedio', '$ '+Number(prod.costo_promedio||0).toFixed(2)],
    ['Existencia', Number(prod.existencia||0).toFixed(2)],
    ['Valor Inventario', '$ '+(Number(prod.existencia||0)*Number(prod.costo_promedio||0)).toFixed(2)]
  ];
  info.forEach(([k,v]) => { doc.setFont('helvetica','bold'); doc.setTextColor(27,42,74); doc.text(k+':', M, y); doc.setFont('helvetica','normal'); doc.setTextColor(55,65,81); doc.text(v, M+45, y); y+=6; });
  doc.save('Ficha_'+codigo+'_'+_fechaArchivo()+'.pdf');
  showToast('PDF generado.', 'success');
}

// === EXPORTAR FICHA EXCEL ===
async function exportarFichaExcel() {
  const codigo = document.getElementById("fichaCodigo").textContent;
  if (!codigo || typeof XLSX === 'undefined') return;
  const { data: prod } = await window.supabaseClient.from("productos").select("*").eq("codigo", codigo).single();
  if (!prod) return;
  const ws1Data = [
    ['ADDBOX — Ficha Técnica', '', '', ''],
    ['Código', prod.codigo, 'Descripción', prod.descripcion],
    ['Unidad', prod.unidad, 'Categoría', prod.categoria||'General'],
    ['Costo Promedio', Number(prod.costo_promedio||0), 'Existencia', Number(prod.existencia||0)],
    ['Valor Inventario', Number(prod.existencia||0)*Number(prod.costo_promedio||0), '', '']
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws1Data);
  XLSX.utils.book_append_sheet(wb, ws, "Ficha");
  XLSX.writeFile(wb, 'Ficha_'+codigo+'_'+_fechaArchivo()+'.xlsx');
  showToast('Ficha exportada.', 'success');
}

// === REPORTE SENIAT ===
async function generarReporteSeniat() {
  showToast("Generando Reporte SENIAT...", "info", "SENIAT");
  const { data: productos } = await window.supabaseClient.from("productos").select("*").order("codigo", { ascending: true });
  if (!productos || productos.length === 0) { showToast("Sin productos.", "info"); return; }
  const { data: kardexData } = await window.supabaseClient.from("kardex").select("codigo, tipo, cantidad, costo_unitario");
  const movPorProducto = {};
  if (kardexData) {
    kardexData.forEach(k => {
      if (!movPorProducto[k.codigo]) movPorProducto[k.codigo] = { entrada:0, salida:0, retiro:0, autoconsumo:0 };
      const tipo = (k.tipo||'').toLowerCase();
      const cant = Number(k.cantidad)||0;
      if (tipo.includes('entrada')||tipo.includes('compra')) movPorProducto[k.codigo].entrada += cant;
      else if (tipo.includes('salida')) movPorProducto[k.codigo].salida += cant;
      else if (tipo.includes('retiro')) movPorProducto[k.codigo].retiro += cant;
      else if (tipo.includes('autoconsumo')||tipo.includes('consumo')) movPorProducto[k.codigo].autoconsumo += cant;
    });
  }
  function fmtBs(v) { return (!v||v===0) ? '-' : 'Bs.S '+Number(v).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtUnd(v) { return (!v||v===0) ? '-' : Number(v).toLocaleString('es-VE',{minimumFractionDigits:0,maximumFractionDigits:2}); }
  let totalFinal = 0;
  const filas = productos.map(p => {
    const c = Number(p.costo_promedio)||0, ea = Number(p.existencia_anterior)||0, ef = Number(p.existencia)||0;
    const m = movPorProducto[p.codigo]||{entrada:0,salida:0,retiro:0,autoconsumo:0};
    totalFinal += ef*c;
    return `<tr><td>${p.codigo}</td><td>${p.descripcion}</td><td class="r">${fmtBs(c)}</td><td class="r">${fmtUnd(ea)}</td><td class="r">${fmtBs(ea*c)}</td><td class="r">${fmtUnd(m.entrada)}</td><td class="r">${fmtBs(m.entrada*c)}</td><td class="r">${fmtUnd(m.salida)}</td><td class="r">${fmtBs(m.salida*c)}</td><td class="r">${fmtUnd(m.retiro)}</td><td class="r">${fmtBs(m.retiro*c)}</td><td class="r">${fmtUnd(m.autoconsumo)}</td><td class="r">${fmtBs(m.autoconsumo*c)}</td><td class="r">${fmtUnd(ef)}</td><td class="r">${fmtBs(ef*c)}</td></tr>`;
  }).join("");
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const ahora = new Date();
  const r = window.open("","_blank");
  r.document.write(`<html><head><title>Reporte SENIAT - ADDBOX</title><style>@page{size:landscape;margin:10mm;}body{font-family:Arial;font-size:9px;padding:15px;background:#fff;}table{width:100%;border-collapse:collapse;font-size:8px;}th,td{border:1px solid #888;padding:3px 5px;}th{background:#1B2A4A;color:#fff;text-align:center;}th.group{background:#2d4a7a;font-size:9px;}th.sub{background:#3b5998;font-size:7.5px;}td.r{text-align:right;white-space:nowrap;}tr:nth-child(even) td{background:#f4f6f9;}.totales-row td{background:#1B2A4A!important;color:#fff;font-weight:bold;border-top:2px solid #00C6AE;}.header-box{border:2px solid #1B2A4A;padding:12px 18px;margin-bottom:12px;background:#f8f9fb;}.header-box h1{font-size:14px;color:#1B2A4A;}.header-row{display:flex;justify-content:space-between;}.header-row p{margin:2px 0;font-size:10px;}.accent-bar{height:3px;background:#00C6AE;margin-bottom:10px;}</style></head><body><div class="accent-bar"></div><div class="header-box"><h1>Registro de Entrada, Salida, Retiro y Autoconsumo del Inventario</h1><div class="header-row"><div><p><strong>Nombre o Razón Social:</strong> ADDBOX LLC C.A.</p><p><strong>RIF:</strong> J-412115316</p></div><div><p><strong>Mes:</strong> ${meses[ahora.getMonth()]}</p><p><strong>Año:</strong> ${ahora.getFullYear()}</p><p><strong>Generado:</strong> ${ahora.toLocaleString('es-VE')}</p></div></div></div><table><thead><tr><th rowspan="2">Código</th><th rowspan="2">Descripción</th><th rowspan="2">Costo Prom.</th><th colspan="2" class="group">Exist. Anterior</th><th colspan="2" class="group">Entrada</th><th colspan="2" class="group">Salida</th><th colspan="2" class="group">Retiro</th><th colspan="2" class="group">Autoconsumo</th><th colspan="2" class="group">Exist. Final</th></tr><tr><th class="sub">Und</th><th class="sub">Bs</th><th class="sub">Und</th><th class="sub">Bs</th><th class="sub">Und</th><th class="sub">Bs</th><th class="sub">Und</th><th class="sub">Bs</th><th class="sub">Und</th><th class="sub">Bs</th><th class="sub">Und</th><th class="sub">Bs</th></tr></thead><tbody>${filas}<tr class="totales-row"><td colspan="14" style="text-align:right;">TOTAL INVENTARIO FINAL:</td><td class="r">${fmtBs(totalFinal)}</td></tr></tbody></table><div style="margin-top:12px;font-size:8px;color:#888;display:flex;justify-content:space-between;"><span>ADDBOX LLC C.A.</span><span>Formato SENIAT • Generado automáticamente</span></div><script>window.onload=function(){setTimeout(function(){window.print();},400);};</script></body></html>`);
  r.document.close();
  showToast("Reporte SENIAT generado.", "success", "SENIAT");
}

// === TOAST ===
function showToast(message, type = "info", title = "") {
  const container = document.getElementById("toast-container");
  if (!container) { console.log(`[${type}] ${title}: ${message}`); return; }
  const toast = document.createElement("div");
  toast.style.cssText = `padding:12px 16px;border-radius:8px;color:#fff;font-size:13px;display:flex;align-items:center;gap:8px;animation:fadeIn 0.2s;background:${type==='success'?'#10B981':type==='error'?'#EF4444':'#6c5ce7'};`;
  toast.innerHTML = `<span>${title?'<strong>'+title+'</strong> ':''} ${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, 3500);
}
