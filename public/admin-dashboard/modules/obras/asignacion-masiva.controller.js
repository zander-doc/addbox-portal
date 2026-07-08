/**
 * asignacion-masiva.controller.js
 * Permite asignar múltiples productos a una obra de una sola vez.
 * Usa el RPC registrar_movimiento para cada producto (tipo: entrada).
 */
import { supabase } from "../../services/supabase-client.js";
import { crearDocumentoInventario } from "../documentos/documentos_inventario.service.js";

let productos = [];
let obras = [];
let categorias = [];
let filtroActual = { texto: "", categoria: "" };
let seleccionPersistente = new Map(); // id → { cantidad, nombre, categoria }

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await cargarObras();
  await cargarProductos();
  configurarEventos();
});

// ─── Cargar datos ──────────────────────────────────────────────────────────────

async function cargarObras() {
  const { data } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .order("nombre");

  obras = data || [];
  const select = document.getElementById("selectObraDestino");
  select.innerHTML = `<option value="">Seleccionar obra...</option>`;
  obras.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.nombre;
    select.appendChild(opt);
  });
}

async function cargarProductos() {
  const { data } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, nombre, unidad, stock, categoria")
    .order("categoria, descripcion");

  productos = data || [];

  // Extraer categorías únicas
  categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort();
  const selectCat = document.getElementById("filtroCategoria");
  selectCat.innerHTML = `<option value="">Todas las categorías</option>`;
  categorias.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    selectCat.appendChild(opt);
  });

  renderProductos(productos);
}

// ─── Render productos ──────────────────────────────────────────────────────────

function renderProductos(lista) {
  const container = document.getElementById("productosLista");

  if (lista.length === 0) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:#636e72;">No se encontraron productos.</div>`;
    return;
  }

  // Agrupar por categoría
  const grupos = {};
  lista.forEach(p => {
    const cat = p.categoria || "Sin categoría";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });

  let html = "";
  Object.keys(grupos).sort().forEach(cat => {
    const items = grupos[cat];
    html += `<div class="categoria-header" data-cat="${escapeHtml(cat)}">
      <span class="cat-icon">📦</span>
      <span class="cat-name">${escapeHtml(cat)}</span>
      <span class="cat-count">${items.length}</span>
    </div>`;
    items.forEach(p => {
      html += `
        <div class="producto-row" data-id="${p.id}" data-cat="${escapeHtml(p.categoria || '')}">
          <input type="checkbox" class="prod-check" data-id="${p.id}">
          <div class="prod-info">
            <div class="prod-name">${escapeHtml(p.descripcion || p.nombre || "Sin nombre")}</div>
            <div class="prod-code">${p.codigo || "—"} · ${p.unidad || "uds"} · Stock: ${p.stock || 0}</div>
          </div>
          <input type="number" class="prod-qty" data-id="${p.id}" min="1" max="99999" value="1" placeholder="Cant.">
        </div>`;
    });
  });

  container.innerHTML = html;

  // Eventos en checkboxes y cantidades
  container.querySelectorAll(".prod-check").forEach(cb => {
    // Restaurar estado desde seleccionPersistente
    if (seleccionPersistente.has(cb.dataset.id)) {
      cb.checked = true;
      const qtyInput = container.querySelector(`.prod-qty[data-id="${cb.dataset.id}"]`);
      if (qtyInput) qtyInput.value = seleccionPersistente.get(cb.dataset.id).cantidad;
    }
    cb.addEventListener("change", () => {
      sincronizarSeleccion();
      actualizarResumen();
    });
  });
  container.querySelectorAll(".prod-qty").forEach(input => {
    input.addEventListener("input", () => {
      sincronizarSeleccion();
      actualizarResumen();
    });
  });

  // Click en header de categoría selecciona/deselecciona toda la categoría
  container.querySelectorAll(".categoria-header").forEach(header => {
    header.addEventListener("click", () => {
      const cat = header.dataset.cat;
      const rows = container.querySelectorAll(`.producto-row[data-cat="${cat}"] .prod-check`);
      const allChecked = [...rows].every(c => c.checked);
      rows.forEach(c => { c.checked = !allChecked; });
      sincronizarSeleccion();
      actualizarResumen();
    });
  });
}

// ─── Eventos ───────────────────────────────────────────────────────────────────

function configurarEventos() {
  // Búsqueda por texto
  document.getElementById("searchProductos").addEventListener("input", (e) => {
    filtroActual.texto = e.target.value.toLowerCase();
    aplicarFiltros();
  });

  // Filtro por categoría
  document.getElementById("filtroCategoria").addEventListener("change", (e) => {
    filtroActual.categoria = e.target.value;
    aplicarFiltros();
  });

  // Borrar selección
  document.getElementById("btnClearSelection").addEventListener("click", () => {
    document.querySelectorAll(".prod-check").forEach(c => { c.checked = false; });
    seleccionPersistente.clear();
    actualizarResumen();
  });

  // Botón asignar
  document.getElementById("btnAsignarMasivo").addEventListener("click", ejecutarAsignacion);
}

function aplicarFiltros() {
  const filtrados = productos.filter(p => {
    const matchTexto = !filtroActual.texto ||
      (p.descripcion || "").toLowerCase().includes(filtroActual.texto) ||
      (p.nombre || "").toLowerCase().includes(filtroActual.texto) ||
      (p.codigo || "").toLowerCase().includes(filtroActual.texto);
    const matchCategoria = !filtroActual.categoria || p.categoria === filtroActual.categoria;
    return matchTexto && matchCategoria;
  });
  renderProductos(filtrados);
}

// ─── Resumen ───────────────────────────────────────────────────────────────────

function actualizarResumen() {
  const seleccionados = getSeleccionados();
  const resumen = document.getElementById("resumenAsignacion");
  const resumenCat = document.getElementById("resumenPorCategoria");
  const btn = document.getElementById("btnAsignarMasivo");
  const obraId = document.getElementById("selectObraDestino").value;
  const obra = obras.find(o => o.id === obraId);
  const contador = document.getElementById("contadorSeleccion");

  // Actualizar contador
  if (contador) {
    contador.textContent = `${seleccionados.length} seleccionado${seleccionados.length !== 1 ? "s" : ""}`;
    contador.style.color = seleccionados.length > 0 ? "#00CEC9" : "#9ca3af";
  }

  if (seleccionados.length === 0) {
    resumen.innerHTML = `<div class="summary-line">Selecciona productos arriba para ver el resumen.</div>`;
    resumenCat.innerHTML = "";
    btn.disabled = true;
    return;
  }

  // Agrupar seleccionados por categoría
  const porCategoria = {};
  seleccionados.forEach(s => {
    const cat = s.categoria || "Sin categoría";
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(s);
  });

  // Render tarjetas por categoría
  resumenCat.innerHTML = `<div class="resumen-cat-cards">` +
    Object.keys(porCategoria).sort().map(cat => {
      const items = porCategoria[cat];
      const totalQty = items.reduce((acc, i) => acc + i.cantidad, 0);
      return `
        <div class="resumen-cat-card">
          <div class="rcc-header">
            <span class="rcc-title">📦 ${escapeHtml(cat)}</span>
            <span class="rcc-count">${items.length} prod · ${totalQty} uds</span>
          </div>
          <div class="rcc-items">
            ${items.map(i => `<div class="rcc-item"><span class="rcc-item-name">${escapeHtml(i.nombre)}</span><span class="rcc-item-qty">×${i.cantidad}</span></div>`).join("")}
          </div>
        </div>`;
    }).join("") + `</div>`;

  // Resumen total
  const totalItems = seleccionados.length;
  const totalUnidades = seleccionados.reduce((acc, s) => acc + s.cantidad, 0);
  const totalCategorias = Object.keys(porCategoria).length;

  resumen.innerHTML = `
    <div class="summary-line"><strong>Obra destino:</strong> ${obra ? escapeHtml(obra.nombre) : "⚠️ Selecciona una obra"}</div>
    <div class="summary-line"><strong>Categorías:</strong> ${totalCategorias}</div>
    <div class="summary-line"><strong>Productos:</strong> ${totalItems} seleccionados</div>
    <div class="summary-total">${totalUnidades} unidades en ${totalCategorias} categoría${totalCategorias !== 1 ? "s" : ""}</div>
  `;

  btn.disabled = !obraId || seleccionados.length === 0;
  const btnDoc = document.getElementById("btnGenerarDoc");
  if (btnDoc) btnDoc.disabled = !obraId || seleccionados.length === 0;
}

function getSeleccionados() {
  return [...seleccionPersistente.values()];
}

/** Sincroniza los checkboxes visibles con la selección persistente */
function sincronizarSeleccion() {
  const container = document.getElementById("productosLista");
  // Agregar/actualizar los marcados
  container.querySelectorAll(".prod-check").forEach(cb => {
    const id = cb.dataset.id;
    if (cb.checked) {
      const qtyInput = container.querySelector(`.prod-qty[data-id="${id}"]`);
      const cantidad = parseInt(qtyInput?.value) || 1;
      const producto = productos.find(p => p.id === id);
      seleccionPersistente.set(id, {
        id,
        cantidad,
        nombre: producto?.descripcion || producto?.nombre || "?",
        categoria: producto?.categoria || "Sin categoría"
      });
    } else {
      seleccionPersistente.delete(id);
    }
  });
}

// ─── Ejecutar asignación masiva ────────────────────────────────────────────────

async function ejecutarAsignacion() {
  const obraId = document.getElementById("selectObraDestino").value;
  const seleccionados = getSeleccionados();
  const btn = document.getElementById("btnAsignarMasivo");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");
  const resultMsg = document.getElementById("resultMsg");

  if (!obraId || seleccionados.length === 0) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Procesando...`;
  progressBar.classList.add("active");
  resultMsg.className = "result-msg";
  resultMsg.style.display = "none";

  const usuario = supabase.auth.user();
  let exitosos = 0;
  let errores = [];

  for (let i = 0; i < seleccionados.length; i++) {
    const item = seleccionados[i];
    const progreso = Math.round(((i + 1) / seleccionados.length) * 100);
    progressFill.style.width = `${progreso}%`;

    try {
      const { data, error } = await supabase.rpc("registrar_movimiento", {
        p_tipo: "entrada",
        p_producto_id: item.id,
        p_obra_id: obraId,
        p_cantidad: item.cantidad,
        p_usuario_id: usuario?.id || null,
        p_observacion: "Asignación masiva"
      });

      if (error) {
        errores.push(`${item.nombre}: ${error.message}`);
      } else if (data && data.success === false) {
        errores.push(`${item.nombre}: ${data.error}`);
      } else {
        exitosos++;
      }
    } catch (err) {
      errores.push(`${item.nombre}: ${err.message}`);
    }
  }

  // Resultado
  progressFill.style.width = "100%";
  btn.innerHTML = `<i class="fa fa-paper-plane"></i> Asignar productos a la obra`;
  btn.disabled = false;

  if (errores.length === 0) {
    resultMsg.className = "result-msg success";
    resultMsg.textContent = `✅ ${exitosos} producto(s) asignados correctamente a la obra.`;
    resultMsg.style.display = "block";
    // Desmarcar todos
    document.querySelectorAll(".prod-check").forEach(c => { c.checked = false; });
    actualizarResumen();
  } else {
    resultMsg.className = "result-msg error";
    resultMsg.innerHTML = `⚠️ ${exitosos} exitosos, ${errores.length} con error:<br>` + errores.slice(0, 5).join("<br>");
    resultMsg.style.display = "block";
  }

  setTimeout(() => { progressBar.classList.remove("active"); }, 2000);
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Escuchar cambio de obra para actualizar resumen
document.getElementById("selectObraDestino")?.addEventListener("change", actualizarResumen);


// ─── Generar documento de salida ───────────────────────────────────────────────

document.getElementById("btnGenerarDoc")?.addEventListener("click", mostrarPreview);
document.getElementById("btnCerrarPreview")?.addEventListener("click", () => {
  document.getElementById("modalPreview").style.display = "none";
});
document.getElementById("modalPreview")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = "none";
});
document.getElementById("btnConfirmarDoc")?.addEventListener("click", descargarPDF);
document.getElementById("btnGuardarDoc")?.addEventListener("click", guardarDocEnSistema);

function mostrarPreview() {
  const seleccionados = getSeleccionados();
  const obraId = document.getElementById("selectObraDestino").value;
  const obra = obras.find(o => o.id === obraId);

  if (seleccionados.length === 0 || !obra) return;

  // Agrupar por categoría
  const porCategoria = {};
  seleccionados.forEach(s => {
    const cat = s.categoria || "Sin categoría";
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(s);
  });

  const totalUnidades = seleccionados.reduce((acc, s) => acc + s.cantidad, 0);
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const numero = "SAL-" + Date.now().toString().slice(-6);

  // Render preview
  const preview = document.getElementById("previewContent");
  preview.innerHTML = `
    <div style="border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:18px;background:rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff;">ADDBOX LLC, C.A</div>
          <div style="font-size:11px;color:#9ca3af;">RIF: J-41211531-6</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:600;color:#00CEC9;">ORDEN DE SALIDA</div>
          <div style="font-size:11px;color:#9ca3af;">N°: ${numero}</div>
          <div style="font-size:11px;color:#9ca3af;">Fecha: ${fecha}</div>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;margin-bottom:12px;">
        <div style="font-size:12px;color:#ddd;margin-bottom:4px;"><strong>Obra destino:</strong> ${escapeHtml(obra.nombre)}</div>
        <div style="font-size:12px;color:#ddd;margin-bottom:4px;"><strong>Productos:</strong> ${seleccionados.length} | <strong>Unidades:</strong> ${totalUnidades}</div>
        <div style="font-size:12px;color:#ddd;"><strong>Categorías:</strong> ${Object.keys(porCategoria).length}</div>
      </div>
      ${Object.keys(porCategoria).sort().map(cat => {
        const items = porCategoria[cat];
        return `
          <div style="margin-bottom:12px;">
            <div style="font-size:12px;font-weight:600;color:#6c5ce7;margin-bottom:6px;border-bottom:1px solid rgba(108,92,231,0.2);padding-bottom:4px;">📦 ${escapeHtml(cat)} (${items.length})</div>
            <table style="width:100%;font-size:11px;color:#ddd;">
              ${items.map(i => `<tr><td style="padding:2px 0;">${escapeHtml(i.nombre)}</td><td style="text-align:right;width:50px;font-weight:600;">×${i.cantidad}</td></tr>`).join("")}
            </table>
          </div>`;
      }).join("")}
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;margin-top:10px;display:flex;justify-content:space-between;">
        <div style="font-size:11px;color:#636e72;">_________________<br>Solicitante</div>
        <div style="font-size:11px;color:#636e72;">_________________<br>Almacén</div>
        <div style="font-size:11px;color:#636e72;">_________________<br>Autorizado</div>
      </div>
    </div>
  `;

  // Guardar datos para PDF
  preview.dataset.numero = numero;
  preview.dataset.obraNombre = obra.nombre;
  preview.dataset.fecha = fecha;

  document.getElementById("modalPreview").style.display = "flex";
}

function descargarPDF() {
  const seleccionados = getSeleccionados();
  const preview = document.getElementById("previewContent");
  const obraNombre = preview.dataset.obraNombre;
  const fecha = preview.dataset.fecha;

  // Generar número igual que el servicio
  const ahora = new Date();
  const numero = `TM-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}${String(ahora.getSeconds()).padStart(2, "0")}`;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 12;
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = margin;

  // Header empresa
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("ADDBOX LLC, C.A", margin, y); y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100);
  pdf.text("RIF: J-41211531-6", margin, y); y += 3.5;
  pdf.text("Urb. Guayabitos Vegas y Potreros de Guayabal,", margin, y); y += 3.5;
  pdf.text("lote F, galpon 1, callejon La Cana, sector Guayabal.", margin, y);
  pdf.setTextColor(0);

  // Título derecha
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Traslado de materiales", pageWidth - margin, margin, { align: "right" });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("N: " + numero, pageWidth - margin, margin + 5, { align: "right" });
  pdf.text("Fecha: " + fecha, pageWidth - margin, margin + 9, { align: "right" });

  y += 6;
  pdf.setDrawColor(50);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Meta datos
  pdf.setFontSize(9);
  pdf.text("Proyecto / Obra: " + obraNombre, margin, y); y += 4;
  pdf.text("Origen: Almacén principal    Destino: " + obraNombre, margin, y); y += 4;
  pdf.text("Solicitado por: " + (sessionStorage.getItem("nombre") || ""), margin, y); y += 4;
  pdf.text("Autorizado por: ", margin, y); y += 4;
  pdf.text("Transportista: ", margin, y); y += 6;

  // Tabla
  const rows = seleccionados.map(s => {
    const prod = productos.find(p => p.id === s.id);
    return [prod?.codigo || "", s.nombre, prod?.unidad || "", String(s.cantidad), ""];
  });

  pdf.autoTable({
    startY: y,
    head: [["Codigo", "Descripcion", "Unidad", "Cantidad", "Obs."]],
    body: rows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.3 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 }, 4: { cellWidth: 30 } },
    showHead: "everyPage",
    didDrawPage: function(data) {
      if (data.pageNumber > 1) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text("Traslado de materiales - N: " + numero, margin, 10);
        pdf.setFont("helvetica", "normal");
        pdf.text("Proyecto: " + obraNombre, margin, 14);
      }
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text("Pagina " + data.pageNumber, pageWidth - margin, pdf.internal.pageSize.getHeight() - 5, { align: "right" });
      pdf.setTextColor(0);
    }
  });

  // Firmas
  let finalY = pdf.lastAutoTable.finalY + 20;
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (finalY + 30 > pageHeight - 10) { pdf.addPage(); finalY = 20; }

  const firmas = ["Solicitante", "Almacen", "Autorizado", "Transportista"];
  const firmaWidth = (pageWidth - margin * 2) / 4;
  firmas.forEach((f, i) => {
    const x = margin + (firmaWidth * i) + firmaWidth / 2;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(x - 20, finalY, x + 20, finalY);
    pdf.setFontSize(8);
    pdf.text(f, x, finalY + 4, { align: "center" });
  });

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text("Documento interno de inventario generado por ADDBOX", pageWidth - margin, pageHeight - 5, { align: "right" });

  pdf.save("Traslado_" + numero + ".pdf");
}

async function guardarDocEnSistema() {
  const seleccionados = getSeleccionados();
  const preview = document.getElementById("previewContent");
  const obraNombre = preview.dataset.obraNombre;

  const materiales = seleccionados.map(s => ({
    codigo: productos.find(p => p.id === s.id)?.codigo || "",
    descripcion: s.nombre,
    unidad: productos.find(p => p.id === s.id)?.unidad || "uds",
    cantidad: s.cantidad,
    observaciones: ""
  }));

  const payload = {
    tipo: "TRASLADO",
    proyecto: obraNombre,
    origen: "Almacén principal",
    destino: obraNombre,
    solicitado_por: sessionStorage.getItem("nombre") || "Sistema",
    autorizado_por: "",
    transportista: "",
    observaciones: "Generado desde asignación masiva",
    materiales
  };

  try {
    const doc = await crearDocumentoInventario(payload);
    alert("✅ Documento guardado: " + doc.numero + "\nPuedes verlo en Documentos de Inventario.");
    document.getElementById("modalPreview").style.display = "none";
  } catch (err) {
    alert("Error guardando documento: " + err.message);
  }
}
