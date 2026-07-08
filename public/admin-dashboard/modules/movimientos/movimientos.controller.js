/**
 * movimientos.controller.js — Controlador limpio
 * Gestiona ENTRADAS y SALIDAS del inventario.
 * Estructura: costo_unitario SIEMPRE en USD.
 */

import { supabase } from "../../services/supabase-client.js";
import { audit } from "../services/auditService.js";
import { showToast } from "../services/toastService.js";
import { exportarDatos } from "../services/excelExport.js";
import { insertarMovimiento, actualizarMovimiento, eliminarMovimiento, obtenerMovimientos, obtenerProductos } from "./movimientos.service.js";

// --- Estado local ---
let movimientosCache = [];
const LIMIT = 50;
let pagina = 0;
let totalMovimientos = 0;

// --- Funciones de loading ---
function mostrarLoading() {
  const loading = document.getElementById("movimientos-loading");
  if (loading) loading.style.display = "block";
}

function ocultarLoading() {
  const loading = document.getElementById("movimientos-loading");
  if (loading) loading.style.display = "none";
}

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", async () => {
  await cargarObras();
  await cargarProductos();
  await cargarMovimientos();
  await cargarKPIs();
  configurarEventos();
});

// --- Cargar obras en el filtro ---
async function cargarObras() {
  try {
    const { data } = await supabase
      .from("obras")
      .select("id, nombre")
      .eq("estado", "activa")
      .order("nombre");

    const select = document.getElementById("filtroObra");
    if (select) {
      select.innerHTML = '<option value="">Todas las obras</option>';
      (data || []).forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.id;
        opt.textContent = o.nombre;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Error cargando obras:", err);
  }
}

// --- Cargar productos en el selector ---
async function cargarProductos() {
  try {
    const { data } = await supabase
      .from("productos")
      .select("id, codigo, descripcion")
      .eq("estado", "activo")
      .order("codigo");

    const select = document.getElementById("producto_id");
    if (select) {
      select.innerHTML = '<option value="">Selecciona un producto</option>';
      (data || []).forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.codigo} - ${p.descripcion}`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Error cargando productos:", err);
  }
}

// --- Cargar movimientos ---
async function cargarMovimientos() {
  mostrarLoading();

  const tipo = document.getElementById("filtroTipo")?.value || "";
  const obra = document.getElementById("filtroObra")?.value || "";
  const desde = document.getElementById("filtroDesde")?.value || "";
  const hasta = document.getElementById("filtroHasta")?.value || "";

  let query = supabase
    .from("movimientos")
    .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(pagina * LIMIT, (pagina + 1) * LIMIT - 1);

  if (tipo) query = query.eq("tipo", tipo);
  if (obra) query = query.eq("producto_id", obra); // Nota: obra se filtra por producto_id en esta versión
  if (desde) query = query.gte("created_at", desde + "T00:00:00");
  if (hasta) query = query.lte("created_at", hasta + "T23:59:59");

  try {
    const { data, error, count } = await query;

    if (error) {
      console.error("Error cargando movimientos:", error);
      showToast("Error cargando movimientos: " + error.message, "error");
      ocultarLoading();
      return;
    }

    movimientosCache = data || [];
    totalMovimientos = count || 0;
    renderTabla(movimientosCache);
    actualizarPaginacion();
    ocultarLoading();
  } catch (err) {
    console.error("Error en cargarMovimientos:", err);
    showToast("Error: " + err.message, "error");
    ocultarLoading();
  }
}

// --- KPIs ---
async function cargarKPIs() {
  try {
    const { count: total } = await supabase.from("movimientos").select("id", { count: "exact", head: true });
    const { count: entradas } = await supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("tipo", "entrada");
    const { count: salidas } = await supabase.from("movimientos").select("id", { count: "exact", head: true }).eq("tipo", "salida");

    const elTotal = document.getElementById("kpiTotal");
    const elEntradas = document.getElementById("kpiEntradas");
    const elSalidas = document.getElementById("kpiSalidas");

    if (elTotal) elTotal.textContent = total || 0;
    if (elEntradas) elEntradas.textContent = entradas || 0;
    if (elSalidas) elSalidas.textContent = salidas || 0;
  } catch (err) {
    console.error("Error cargando KPIs:", err);
  }
}

// --- Render tabla ---
function renderTabla(movimientos) {
  const tbody = document.getElementById("movTbody");
  if (!tbody) return;

  if (movimientos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px;">No hay movimientos con estos filtros.</td></tr>`;
    return;
  }

  tbody.innerHTML = movimientos.map(m => {
    const fecha = m.fecha || (m.created_at ? new Date(m.created_at).toLocaleDateString("es-MX") : "—");
    const hora = m.created_at ? new Date(m.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—";
    const producto = m.productos?.descripcion || m.productos?.nombre || m.productos?.codigo || "—";
    const tipo = m.tipo || "—";
    const badgeClass = getBadgeClass(tipo);
    const costoUnitario = m.costo_unitario != null ? "$" + Number(m.costo_unitario).toFixed(2) : "—";

    return `
    <tr data-id="${m.id}">
      <td>${fecha}</td>
      <td>${hora}</td>
      <td>${esc(producto)}</td>
      <td><span class="badge-mov ${badgeClass}">${formatTipo(tipo)}</span></td>
      <td>${m.cantidad || 0}</td>
      <td>${costoUnitario}</td>
      <td>${esc(m.motivo || "—")}</td>
      <td>
        <button class="btn-editar" data-id="${m.id}" style="background:#6c5ce7;border:none;color:#fff;padding:4px 8px;border-radius:4px;cursor:pointer;margin-right:4px;" title="Editar">
          <i class="fa fa-pen"></i>
        </button>
        <button class="btn-eliminar" data-id="${m.id}" style="background:#d63031;border:none;color:#fff;padding:4px 8px;border-radius:4px;cursor:pointer;" title="Eliminar">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join("");
}

function getBadgeClass(tipo) {
  if (tipo === "entrada") return "badge-entrada";
  if (tipo === "salida") return "badge-salida";
  return "";
}

function formatTipo(tipo) {
  const map = {
    entrada: "Entrada",
    salida: "Salida"
  };
  return map[tipo] || tipo;
}

// --- Paginación ---
function actualizarPaginacion() {
  const totalPaginas = Math.ceil(totalMovimientos / LIMIT) || 1;
  const elInfo = document.getElementById("paginaInfo");
  const elPrev = document.getElementById("btnPrev");
  const elNext = document.getElementById("btnNext");

  if (elInfo) elInfo.textContent = `Página ${pagina + 1} de ${totalPaginas}`;
  if (elPrev) elPrev.disabled = pagina === 0;
  if (elNext) elNext.disabled = pagina >= totalPaginas - 1;
}

// --- Eventos ---
function configurarEventos() {
  const btnFiltrar = document.getElementById("btnFiltrar");
  if (btnFiltrar) btnFiltrar.addEventListener("click", () => {
    pagina = 0;
    cargarMovimientos();
  });

  const filtroTipo = document.getElementById("filtroTipo");
  if (filtroTipo) filtroTipo.addEventListener("change", () => {
    pagina = 0;
    cargarMovimientos();
  });

  const filtroObra = document.getElementById("filtroObra");
  if (filtroObra) filtroObra.addEventListener("change", () => {
    pagina = 0;
    cargarMovimientos();
  });

  const filtroDesde = document.getElementById("filtroDesde");
  if (filtroDesde) filtroDesde.addEventListener("change", () => {
    pagina = 0;
    cargarMovimientos();
  });

  const filtroHasta = document.getElementById("filtroHasta");
  if (filtroHasta) filtroHasta.addEventListener("change", () => {
    pagina = 0;
    cargarMovimientos();
  });

  const btnLimpiar = document.getElementById("btnLimpiar");
  if (btnLimpiar) btnLimpiar.addEventListener("click", () => {
    if (filtroTipo) filtroTipo.value = "";
    if (filtroObra) filtroObra.value = "";
    if (filtroDesde) filtroDesde.value = "";
    if (filtroHasta) filtroHasta.value = "";
    pagina = 0;
    cargarMovimientos();
  });

  const btnPrev = document.getElementById("btnPrev");
  if (btnPrev) btnPrev.addEventListener("click", () => {
    if (pagina > 0) { pagina--; cargarMovimientos(); }
  });

  const btnNext = document.getElementById("btnNext");
  if (btnNext) btnNext.addEventListener("click", () => {
    pagina++;
    cargarMovimientos();
  });

  const btnExportar = document.getElementById("btnExportar");
  if (btnExportar) btnExportar.addEventListener("click", exportarExcel);

  // Delegación de eventos en tabla
  const tabla = document.getElementById("movTbody");
  if (tabla) {
    tabla.addEventListener("click", handleTablaClick);
  }
}

function handleTablaClick(e) {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.classList.contains("btn-editar")) {
    editarMovimiento(id);
  }

  if (btn.classList.contains("btn-eliminar")) {
    if (confirm("¿Estás seguro de eliminar este movimiento?")) {
      eliminarMovimiento(id);
    }
  }
}

// --- CRUD Handlers ---
async function handleCrear(e) {
  e.preventDefault();

  const payload = {
    producto_id: document.getElementById("producto_id").value,
    tipo: document.getElementById("tipo").value,
    cantidad: document.getElementById("cantidad").value,
    costo_unitario: document.getElementById("costo_unitario").value,
    fecha: document.getElementById("fecha").value,
    motivo: document.getElementById("motivo").value,
    observacion: document.getElementById("observacion").value,
  };

  // Validación
  if (!payload.producto_id) {
    showToast("Selecciona un producto", "error");
    return;
  }
  if (!payload.tipo) {
    showToast("Selecciona el tipo de movimiento", "error");
    return;
  }
  if (!payload.cantidad || Number(payload.cantidad) <= 0) {
    showToast("La cantidad debe ser mayor a 0", "error");
    return;
  }
  if (!payload.costo_unitario || Number(payload.costo_unitario) < 0) {
    showToast("El costo unitario debe ser >= 0", "error");
    return;
  }

  try {
    const movimiento = await insertarMovimiento(payload);
    await audit("movimientos", "crear", `Movimiento creado: ${movimiento.tipo} de ${movimiento.cantidad} unidades`);
    showToast("Movimiento creado correctamente", "success");
    cerrarModalCrear();
    await cargarMovimientos();
  } catch (err) {
    showToast("Error al crear movimiento: " + err.message, "error");
  }
}

async function handleEditar(e) {
  e.preventDefault();

  const id = document.getElementById("edit_id").value;
  const payload = {
    tipo: document.getElementById("edit_tipo").value,
    cantidad: document.getElementById("edit_cantidad").value,
    costo_unitario: document.getElementById("edit_costo_unitario").value,
    fecha: document.getElementById("edit_fecha").value,
    motivo: document.getElementById("edit_motivo").value,
    observacion: document.getElementById("edit_observacion").value,
  };

  // Validación
  if (!payload.tipo) {
    showToast("Selecciona el tipo de movimiento", "error");
    return;
  }
  if (!payload.cantidad || Number(payload.cantidad) <= 0) {
    showToast("La cantidad debe ser mayor a 0", "error");
    return;
  }
  if (!payload.costo_unitario || Number(payload.costo_unitario) < 0) {
    showToast("El costo unitario debe ser >= 0", "error");
    return;
  }

  try {
    await actualizarMovimiento(id, payload);
    await audit("movimientos", "editar", `Movimiento ${id} actualizado`);
    showToast("Movimiento actualizado correctamente", "success");
    cerrarModalEditar();
    await cargarMovimientos();
  } catch (err) {
    showToast("Error al actualizar movimiento: " + err.message, "error");
  }
}

async function eliminarMovimiento(id) {
  try {
    await eliminarMovimiento(id);
    await audit("movimientos", "eliminar", `Movimiento eliminado: ${id}`);
    showToast("Movimiento eliminado", "success");
    await cargarMovimientos();
  } catch (err) {
    showToast("Error al eliminar movimiento: " + err.message, "error");
  }
}

// --- Modal handlers ---
function abrirModalCrear() {
  const modal = document.getElementById("modalOverlay");
  const form = document.getElementById("movimientoForm");
  if (modal) modal.style.display = "flex";
  if (form) form.reset();
  setTimeout(() => {
    const primerInput = document.getElementById("producto_id");
    if (primerInput) primerInput.focus();
  }, 100);
}

function cerrarModalCrear() {
  const modal = document.getElementById("modalOverlay");
  const form = document.getElementById("movimientoForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

function abrirModalEditar(movimiento) {
  if (!movimiento) return;
  document.getElementById("edit_id").value = movimiento.id;
  document.getElementById("edit_tipo").value = movimiento.tipo || "entrada";
  document.getElementById("edit_cantidad").value = movimiento.cantidad || "";
  document.getElementById("edit_costo_unitario").value = movimiento.costo_unitario || "";
  document.getElementById("edit_fecha").value = movimiento.fecha || new Date().toISOString().split("T")[0];
  document.getElementById("edit_motivo").value = movimiento.motivo || "";
  document.getElementById("edit_observacion").value = movimiento.observacion || "";

  const modal = document.getElementById("modalEditar");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
  setTimeout(() => {
    const input = document.getElementById("edit_tipo");
    if (input) input.focus();
  }, 100);
}

function cerrarModalEditar() {
  const modal = document.getElementById("modalEditar");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

// --- Exportar Excel ---
async function exportarExcel() {
  try {
    const { data } = await supabase
      .from("movimientos")
      .select("id, producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion, created_at, productos(codigo, descripcion, unidad)")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (!data || data.length === 0) {
      showToast("No hay movimientos para exportar", "warning");
      return;
    }

    const columnas = [
      { key: "created_at", label: "Fecha y Hora" },
      { key: "productos.codigo", label: "Código" },
      { key: "productos.descripcion", label: "Descripción" },
      { key: "tipo", label: "Tipo" },
      { key: "cantidad", label: "Cantidad" },
      { key: "costo_unitario", label: "Costo Unitario (USD)" },
      { key: "motivo", label: "Motivo" },
      { key: "observacion", label: "Observación" },
    ];

    const formato = exportarDatos(`Movimientos_${new Date().toISOString().slice(0, 10)}`, data, columnas);
    showToast(`${data.length} movimientos exportados (${formato.toUpperCase()})`, "success");
  } catch (err) {
    showToast("Error exportando movimientos: " + err.message, "error");
  }
}

// --- Utilidades ---
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Exponer funciones globales ---
window.abrirModalCrear = abrirModalCrear;
window.cerrarModalCrear = cerrarModalCrear;
window.abrirModalEditar = abrirModalEditar;
window.cerrarModalEditar = cerrarModalEditar;
window.eliminarMovimiento = eliminarMovimiento;
window.insertarMovimiento = insertarMovimiento;
window.actualizarMovimiento = actualizarMovimiento;
