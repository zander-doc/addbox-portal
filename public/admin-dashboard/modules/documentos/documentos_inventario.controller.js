/**
 * documentos_inventario.controller.js
 * Controlador para Documentos de Inventario.
 * Tipos: TRASLADO, REQ_MATERIALES, REQ_HERRAMIENTA
 */

import { obtenerDocumentos, obtenerDocumentoConDetalle, crearDocumentoInventario, eliminarDocumento } from "./documentos_inventario.service.js";
import { showToast } from "../../services/toastService.js";
import { buscarProductos, buscarProductosAvanzado, obtenerCategorias } from "../productos/productos.service.js";

// --- Init ---
document.addEventListener("DOMContentLoaded", init);

async function init() {
  configurarEventos();
  await cargarDocumentos();
}

// --- Cargar lista ---
async function cargarDocumentos() {
  const tbody = document.getElementById("docsBody");
  if (!tbody) return;

  const tipo = document.getElementById("filtroTipo")?.value || "";
  const desde = document.getElementById("filtroDesde")?.value || "";
  const hasta = document.getElementById("filtroHasta")?.value || "";

  try {
    const docs = await obtenerDocumentos({ tipo, desde, hasta });
    if (!docs || docs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;">No hay documentos registrados</td></tr>`;
      return;
    }

    tbody.innerHTML = docs.map(d => {
      const fecha = d.creado_en ? new Date(d.creado_en).toLocaleDateString("es-MX") : "—";
      return `<tr>
        <td>${esc(d.numero)}</td>
        <td>${mapTipo(d.tipo)}</td>
        <td>${esc(d.proyecto || d.obra_nombre || "—")}</td>
        <td>${esc(d.solicitado_por || "—")}</td>
        <td>${fecha}</td>
        <td><button class="btn-pdf" data-id="${d.id}"><i class="fa fa-file-pdf"></i> PDF</button> <button class="btn-excel" data-id="${d.id}"><i class="fa fa-file-excel"></i></button> <button class="btn-del" data-id="${d.id}"><i class="fa fa-trash"></i></button></td>
      </tr>`;
    }).join("");

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
  }
}

// --- Eventos ---
function configurarEventos() {
  document.getElementById("btnNuevoDoc")?.addEventListener("click", abrirModal);
  document.getElementById("btnCancelarDoc")?.addEventListener("click", cerrarModal);
  document.getElementById("btnAgregarLinea")?.addEventListener("click", agregarLinea);
  document.getElementById("btnGuardarDoc")?.addEventListener("click", guardarDocumento);
  document.getElementById("btnFiltrar")?.addEventListener("click", cargarDocumentos);

  // Mostrar/ocultar campos origen/destino según tipo
  document.getElementById("docTipo")?.addEventListener("change", toggleCamposTraslado);

  // Búsqueda rápida de productos (autocompletado)
  const buscarInput = document.getElementById("buscarProducto");
  const resultadoDiv = document.getElementById("resultadoBusqueda");
  let debounceTimer = null;

  if (buscarInput) {
    buscarInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const term = buscarInput.value.trim();
      if (term.length < 2) {
        resultadoDiv.style.display = "none";
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          const productos = await buscarProductos(term);
          if (productos.length === 0) {
            resultadoDiv.innerHTML = `<div class="item-busqueda" style="color:#9ca3af;">Sin resultados</div>`;
          } else {
            resultadoDiv.innerHTML = productos.map(p =>
              `<div class="item-busqueda" data-codigo="${esc(p.codigo)}" data-desc="${esc(p.descripcion)}" data-unidad="${esc(p.unidad || "")}">
                <strong>${esc(p.codigo)}</strong> — ${esc(p.descripcion)} (${p.existencia || 0} ${esc(p.unidad || "")})
              </div>`
            ).join("");
          }
          resultadoDiv.style.display = "block";

          resultadoDiv.querySelectorAll(".item-busqueda[data-codigo]").forEach(item => {
            item.addEventListener("click", () => {
              agregarProductoDesdeBusqueda(item.dataset);
              resultadoDiv.style.display = "none";
              buscarInput.value = "";
            });
          });
        } catch (err) {
          console.error("Error buscando:", err);
        }
      }, 300);
    });

    // Cerrar dropdown al hacer click fuera
    document.addEventListener("click", (e) => {
      if (!buscarInput.contains(e.target) && !resultadoDiv.contains(e.target)) {
        resultadoDiv.style.display = "none";
      }
    });
  }

  // Catálogo modal
  document.getElementById("btnAbrirCatalogo")?.addEventListener("click", abrirCatalogo);
  document.getElementById("btnCerrarCatalogo")?.addEventListener("click", () => {
    document.getElementById("modalCatalogo")?.classList.remove("show");
  });
  document.getElementById("catalogoBuscar")?.addEventListener("input", cargarCatalogo);
  document.getElementById("catalogoCategoria")?.addEventListener("change", cargarCatalogo);

  // Event delegation para botones PDF en la tabla
  document.getElementById("docsBody")?.addEventListener("click", async (e) => {
    const btnPdf = e.target.closest(".btn-pdf");
    if (btnPdf) {
      try {
        const doc = await obtenerDocumentoConDetalle(btnPdf.dataset.id);
        await generarPDF(doc);
      } catch (err) {
        showToast("Error generando PDF: " + err.message, "error");
      }
      return;
    }

    const btnExcel = e.target.closest(".btn-excel");
    if (btnExcel) {
      try {
        const doc = await obtenerDocumentoConDetalle(btnExcel.dataset.id);
        generarExcel(doc);
      } catch (err) {
        showToast("Error generando Excel: " + err.message, "error");
      }
      return;
    }

    const btnDel = e.target.closest(".btn-del");
    if (btnDel) {
      if (!confirm("¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.")) return;
      try {
        const row = btnDel.closest("tr");
        if (row) row.remove();
        await eliminarDocumento(btnDel.dataset.id);
        showToast("Documento eliminado", "success");
        await cargarDocumentos();
      } catch (err) {
        showToast("Error eliminando: " + err.message, "error");
        await cargarDocumentos();
      }
    }
  });
}

function toggleCamposTraslado() {
  const tipo = document.getElementById("docTipo")?.value;
  const esTraslado = tipo === "TRASLADO";
  document.getElementById("campoOrigen").style.display = esTraslado ? "" : "none";
  document.getElementById("campoDestino").style.display = esTraslado ? "" : "none";
}

// --- Modal ---
function abrirModal() {
  document.getElementById("modalDoc")?.classList.add("show");
  limpiarFormulario();
}

function cerrarModal() {
  document.getElementById("modalDoc")?.classList.remove("show");
}

function limpiarFormulario() {
  document.getElementById("docTipo").value = "TRASLADO";
  document.getElementById("docProyecto").value = "";
  document.getElementById("docOrigen").value = "";
  document.getElementById("docDestino").value = "";
  document.getElementById("docSolicitadoPor").value = "";
  document.getElementById("docAutorizadoPor").value = "";
  document.getElementById("docTransportista").value = "";
  document.getElementById("docObservaciones").value = "";
  document.getElementById("docMaterialesBody").innerHTML = "";
  toggleCamposTraslado();
}

function agregarLinea() {
  const tbody = document.getElementById("docMaterialesBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="inp-codigo" placeholder="Código"></td>
    <td><input type="text" class="inp-descripcion" placeholder="Descripción"></td>
    <td><input type="text" class="inp-unidad" placeholder="pza"></td>
    <td><input type="number" class="inp-cantidad" min="0.01" step="0.01" placeholder="0"></td>
    <td><input type="text" class="inp-obs" placeholder="Obs."></td>
    <td><button type="button" class="btn-rm"><i class="fa fa-times"></i></button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector(".btn-rm").addEventListener("click", () => tr.remove());
}

// --- Guardar ---
async function guardarDocumento() {
  try {
    const payload = recolectarPayload();
    const doc = await crearDocumentoInventario(payload);
    showToast("Documento creado: " + doc.numero, "success");
    cerrarModal();
    await cargarDocumentos();
    await generarPDF(doc);
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
}

function recolectarPayload() {
  const tipo = document.getElementById("docTipo").value;
  const proyecto = document.getElementById("docProyecto").value.trim();
  const origen = document.getElementById("docOrigen").value.trim();
  const destino = document.getElementById("docDestino").value.trim();
  const solicitado_por = document.getElementById("docSolicitadoPor").value.trim();
  const autorizado_por = document.getElementById("docAutorizadoPor").value.trim();
  const transportista = document.getElementById("docTransportista").value.trim();
  const observaciones = document.getElementById("docObservaciones").value.trim();

  if (!proyecto) throw new Error("El proyecto/obra es obligatorio");
  if (!solicitado_por) throw new Error("'Solicitado por' es obligatorio");

  const materiales = [];
  document.querySelectorAll("#docMaterialesBody tr").forEach((tr) => {
    const codigo = tr.querySelector(".inp-codigo").value.trim();
    const descripcion = tr.querySelector(".inp-descripcion").value.trim();
    const unidad = tr.querySelector(".inp-unidad").value.trim();
    const cantidad = parseFloat(tr.querySelector(".inp-cantidad").value || "0");
    const obs = tr.querySelector(".inp-obs").value.trim();
    if (!codigo && !descripcion) return;
    if (cantidad <= 0) throw new Error("Todas las cantidades deben ser > 0");
    materiales.push({ codigo, descripcion, unidad, cantidad, observaciones: obs });
  });

  if (materiales.length === 0) throw new Error("Debe agregar al menos una línea");

  return { tipo, proyecto, origen, destino, solicitado_por, autorizado_por, transportista, observaciones, materiales };
}

// --- Catálogo de productos ---
async function abrirCatalogo() {
  document.getElementById("modalCatalogo")?.classList.add("show");
  // Cargar categorías
  try {
    const categorias = await obtenerCategorias();
    const select = document.getElementById("catalogoCategoria");
    // Limpiar opciones previas (excepto la primera)
    while (select.options.length > 1) select.remove(1);
    categorias.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    // Pre-seleccionar categoría según tipo de documento
    const tipoDoc = document.getElementById("docTipo")?.value;
    if (tipoDoc === "REQ_HERRAMIENTA") {
      select.value = "Herramientas";
    }
  } catch (err) { /* ignore */ }
  await cargarCatalogo();
}

async function cargarCatalogo() {
  const term = document.getElementById("catalogoBuscar")?.value.trim() || "";
  const categoria = document.getElementById("catalogoCategoria")?.value || "";
  const tbody = document.getElementById("catalogoBody");
  if (!tbody) return;

  try {
    const productos = await buscarProductosAvanzado({ term, categoria });
    if (productos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9ca3af;">Sin resultados</td></tr>`;
      return;
    }
    tbody.innerHTML = productos.map(p => `
      <tr>
        <td>${esc(p.codigo)}</td>
        <td>${esc(p.descripcion)}</td>
        <td>${esc(p.unidad || "")}</td>
        <td>${p.existencia || 0}</td>
        <td><button class="btn-agregar-cat" data-codigo="${esc(p.codigo)}" data-desc="${esc(p.descripcion)}" data-unidad="${esc(p.unidad || "")}" data-categoria="${esc(p.categoria || "")}">Agregar</button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-agregar-cat").forEach(btn => {
      btn.addEventListener("click", () => {
        agregarProductoDesdeBusqueda(btn.dataset);
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
  }
}

// --- Agregar producto desde búsqueda/catálogo ---
function agregarProductoDesdeBusqueda(p) {
  const tbody = document.getElementById("docMaterialesBody");
  const codigo = p.codigo || "";

  // Verificar si el producto ya fue agregado
  if (codigo) {
    const existente = tbody.querySelector(`.inp-codigo[value="${codigo}"]`);
    if (existente) {
      showToast("Este producto ya fue agregado a la lista", "error");
      return;
    }
  }

  const tr = document.createElement("tr");
  const unidad = p.unidad || "";
  tr.innerHTML = `
    <td><input type="text" class="inp-codigo" value="${esc(codigo)}" readonly style="background:#1a1a2e;"></td>
    <td><input type="text" class="inp-descripcion" value="${esc(p.desc || p.descripcion || "")}" readonly style="background:#1a1a2e;"></td>
    <td><input type="text" class="inp-unidad" value="${esc(unidad)}" placeholder="pza" ${unidad ? 'readonly style="background:#1a1a2e;"' : ''}></td>
    <td><input type="number" class="inp-cantidad" value="1" min="0.01" step="0.01"></td>
    <td><input type="text" class="inp-obs" placeholder="Obs."></td>
    <td><button type="button" class="btn-rm"><i class="fa fa-times"></i></button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector(".btn-rm").addEventListener("click", () => tr.remove());
  tr.querySelector(".inp-cantidad").focus();
  tr.querySelector(".inp-cantidad").select();
  showToast("Producto agregado", "success");
}

// --- Generar PDF con jsPDF + autoTable (multi-página con encabezado repetido) ---
async function generarPDF(doc) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // --- Función para dibujar encabezado en primera página ---
  function dibujarEncabezadoCompleto(startY) {
    let y = startY;

    // Empresa
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("ADDBOX LLC, C.A", margin, y);
    y += 5;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text("RIF: J-41211531-6", margin, y); y += 3.5;
    pdf.text("Urb. Guayabitos Vegas y Potreros de Guayabal,", margin, y); y += 3.5;
    pdf.text("lote F, galpon 1, callejon La Cana, sector Guayabal.", margin, y);
    pdf.setTextColor(0);

    // Título (derecha)
    const tipoTitulo = mapTipo(doc.tipo);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(tipoTitulo, pageWidth - margin, startY, { align: "right" });
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("N: " + doc.numero, pageWidth - margin, startY + 5, { align: "right" });
    pdf.text("Fecha: " + new Date(doc.creado_en).toLocaleString("es-MX"), pageWidth - margin, startY + 9, { align: "right" });

    // QR
    try {
      const qrCanvas = document.createElement("canvas");
      new QRious({ element: qrCanvas, value: JSON.stringify({ id: doc.id, numero: doc.numero, tipo: doc.tipo }), size: 200 });
      const qrData = qrCanvas.toDataURL("image/png");
      pdf.addImage(qrData, "PNG", pageWidth - margin - 22, startY + 12, 22, 22);
    } catch (e) { /* QR opcional */ }

    y += 6;

    // Línea separadora (solo hasta antes del QR)
    pdf.setDrawColor(50);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin - 30, y);
    y += 5;

    // Meta datos
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("Proyecto / Obra: " + (doc.proyecto || doc.obra_nombre || ""), margin, y); y += 4;
    if (doc.tipo === "TRASLADO") {
      pdf.text("Origen: " + (doc.origen || "") + "    Destino: " + (doc.destino || ""), margin, y); y += 4;
    }
    pdf.text("Solicitado por: " + (doc.solicitado_por || ""), margin, y); y += 4;
    pdf.text("Autorizado por: " + (doc.autorizado_por || ""), margin, y); y += 4;
    pdf.text("Transportista: " + (doc.transportista || ""), margin, y); y += 6;

    return y;
  }

  // Dibujar encabezado completo en primera página
  let startY = dibujarEncabezadoCompleto(margin);

  // --- Tabla de materiales con autoTable ---
  const materiales = (doc.materiales || []).map(m => [
    m.codigo || "",
    m.descripcion || "",
    m.unidad || "",
    String(m.cantidad || ""),
    m.observaciones || ""
  ]);

  pdf.autoTable({
    startY: startY,
    head: [["Codigo", "Descripcion", "Unidad", "Cantidad", "Obs."]],
    body: materiales,
    margin: { left: margin, right: margin, top: 20 },
    styles: { fontSize: 9, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.3 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30 }
    },
    showHead: "everyPage",
    didDrawPage: function(data) {
      // En páginas 2+, agregar mini-encabezado
      if (data.pageNumber > 1) {
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(mapTipo(doc.tipo) + " - N: " + doc.numero, margin, 10);
        pdf.setFont("helvetica", "normal");
        pdf.text("Proyecto: " + (doc.proyecto || ""), margin, 14);
      }
      // Número de página
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        "Pagina " + data.pageNumber,
        pageWidth - margin,
        pageHeight - 5,
        { align: "right" }
      );
      pdf.setTextColor(0);
    }
  });

  // --- Observaciones y firmas después de la tabla ---
  let finalY = pdf.lastAutoTable.finalY + 8;

  // Si no hay espacio para observaciones + firmas, nueva página
  if (finalY + 50 > pageHeight - 10) {
    pdf.addPage();
    finalY = 20;
  }

  // Observaciones
  if (doc.observaciones) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text("Observaciones:", margin, finalY);
    pdf.setFont("helvetica", "normal");
    finalY += 4;
    pdf.text(doc.observaciones, margin, finalY);
    finalY += 8;
  }

  // Firmas
  finalY += 15;
  const firmaWidth = contentWidth / 4;
  const firmas = ["Solicitante", "Almacen", "Autorizado", "Transportista"];
  firmas.forEach((firma, i) => {
    const x = margin + (firmaWidth * i) + firmaWidth / 2;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(x - 20, finalY, x + 20, finalY);
    pdf.setFontSize(8);
    pdf.text(firma, x, finalY + 4, { align: "center" });
  });

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(150);
  pdf.text("Documento interno de inventario generado por ADDBOX", pageWidth - margin, pageHeight - 5, { align: "right" });

  // Guardar
  pdf.save("DocInventario_" + doc.numero + ".pdf");
}

// --- Generar Excel ---
function generarExcel(doc) {
  const encabezado = [
    ["ADDBOX LLC, C.A"],
    [mapTipo(doc.tipo) + " - N: " + doc.numero],
    ["Fecha: " + new Date(doc.creado_en).toLocaleString("es-MX")],
    ["Proyecto / Obra: " + (doc.proyecto || doc.obra_nombre || "")],
  ];
  if (doc.tipo === "TRASLADO") {
    encabezado.push(["Origen: " + (doc.origen || "") + " - Destino: " + (doc.destino || "")]);
  }
  encabezado.push(["Solicitado por: " + (doc.solicitado_por || "")]);
  encabezado.push(["Autorizado por: " + (doc.autorizado_por || "")]);
  encabezado.push(["Transportista: " + (doc.transportista || "")]);
  encabezado.push([]);
  encabezado.push(["Codigo", "Descripcion", "Unidad", "Cantidad", "Observaciones"]);

  const filas = (doc.materiales || []).map(m => [
    m.codigo || "",
    m.descripcion || "",
    m.unidad || "",
    m.cantidad || 0,
    m.observaciones || ""
  ]);

  const data = [...encabezado, ...filas];

  if (doc.observaciones) {
    data.push([]);
    data.push(["Observaciones: " + doc.observaciones]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Documento");
  XLSX.writeFile(wb, "DocInventario_" + doc.numero + ".xlsx");
}

// --- Utilidades ---
function mapTipo(tipo) {
  if (tipo === "TRASLADO") return "Traslado de materiales";
  if (tipo === "REQ_MATERIALES") return "Requisición de materiales";
  if (tipo === "REQ_HERRAMIENTA") return "Requisición de herramienta";
  return tipo || "—";
}

function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
