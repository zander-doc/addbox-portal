// ============================================================
// ADDBOX — usuarios-admin.js
// Gestión de usuarios del sistema
// ============================================================

const db = window.supabaseClient;
let todosLosUsuarios = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await cargarUsuarios();
  configurarEventos();
}

// === CARGAR USUARIOS ===
async function cargarUsuarios() {
  const tbody = document.getElementById("usersTableBody");
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#9ca3af;">Cargando...</td></tr>`;

  const { data, error } = await db.from("usuarios").select("*").order("creado_en", { ascending: false });
  if (error) { console.error(error); showToast("Error cargando usuarios.", "error"); return; }

  todosLosUsuarios = data || [];
  renderKPIs(todosLosUsuarios);
  renderTabla(todosLosUsuarios);
}

// === KPIs ===
function renderKPIs(usuarios) {
  document.getElementById("kpi-total").textContent = usuarios.length;
  document.getElementById("kpi-activos").textContent = usuarios.filter(u => u.estado === "activo").length;
  document.getElementById("kpi-suspendidos").textContent = usuarios.filter(u => u.estado === "suspendido").length;
}

// === RENDERIZAR TABLA ===
function renderTabla(usuarios) {
  const tbody = document.getElementById("usersTableBody");
  if (!usuarios || usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#9ca3af;">No hay usuarios registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = usuarios.map(u => {
    const rolClass = u.rol || "usuario";
    const estadoClass = u.estado || "activo";
    return `<tr data-id="${u.id}">
      <td><strong>${esc(u.nombre)}</strong></td>
      <td>${esc(u.email)}</td>
      <td><span class="badge-rol ${rolClass}">${u.rol || "usuario"}</span></td>
      <td><span class="badge-estado ${estadoClass}">${u.estado || "activo"}</span></td>
      <td>${u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("es-VE") : "—"}</td>
      <td>${u.creado_en ? new Date(u.creado_en).toLocaleDateString("es-VE") : "—"}</td>
      <td>
        <button class="btn-accion btn-editar" data-id="${u.id}"><i class="fa fa-pen"></i></button>
        <button class="btn-accion btn-toggle" data-id="${u.id}" data-estado="${u.estado}" title="${u.estado === 'activo' ? 'Suspender' : 'Activar'}">
          <i class="fa ${u.estado === 'activo' ? 'fa-ban' : 'fa-check'}"></i>
        </button>
        <button class="btn-accion danger btn-eliminar" data-id="${u.id}" title="Eliminar"><i class="fa fa-trash"></i></button>
      </td>
    </tr>`;
  }).join("");
}

// === FILTROS ===
function aplicarFiltros() {
  const busqueda = document.getElementById("searchInput").value.toLowerCase().trim();
  const rol = document.getElementById("filtroRol").value;
  const estado = document.getElementById("filtroEstado").value;

  let filtrados = todosLosUsuarios;
  if (busqueda) {
    filtrados = filtrados.filter(u =>
      (u.nombre || "").toLowerCase().includes(busqueda) ||
      (u.email || "").toLowerCase().includes(busqueda)
    );
  }
  if (rol) filtrados = filtrados.filter(u => u.rol === rol);
  if (estado) filtrados = filtrados.filter(u => u.estado === estado);

  renderTabla(filtrados);
}

// === EVENTOS ===
function configurarEventos() {
  // Filtros
  document.getElementById("searchInput").addEventListener("input", aplicarFiltros);
  document.getElementById("filtroRol").addEventListener("change", aplicarFiltros);
  document.getElementById("filtroEstado").addEventListener("change", aplicarFiltros);

  // Botón nuevo
  document.getElementById("btnNuevo").addEventListener("click", () => abrirModal());

  // Botones cancelar/guardar modal
  document.getElementById("btnCancelar").addEventListener("click", cerrarModal);
  document.getElementById("btnGuardar").addEventListener("click", guardarUsuario);

  // Delegación de eventos en tabla
  document.getElementById("usersTableBody").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains("btn-editar")) {
      const usuario = todosLosUsuarios.find(u => u.id === id);
      if (usuario) abrirModal(usuario);
    }
    else if (btn.classList.contains("btn-toggle")) {
      const nuevoEstado = btn.dataset.estado === "activo" ? "suspendido" : "activo";
      const { error } = await db.from("usuarios").update({ estado: nuevoEstado }).eq("id", id);
      if (error) { showToast("Error cambiando estado.", "error"); return; }
      showToast(`Usuario ${nuevoEstado === "activo" ? "activado" : "suspendido"}.`, "success");
      await cargarUsuarios();
    }
    else if (btn.classList.contains("btn-eliminar")) {
      if (!confirm("¿Eliminar este usuario permanentemente?")) return;
      const { error } = await db.from("usuarios").delete().eq("id", id);
      if (error) { showToast("Error eliminando usuario.", "error"); return; }
      showToast("Usuario eliminado.", "success");
      await cargarUsuarios();
    }
  });
}

// === MODAL ===
function abrirModal(usuario = null) {
  document.getElementById("modalTitulo").textContent = usuario ? "Editar Usuario" : "Nuevo Usuario";
  document.getElementById("userId").value = usuario?.id || "";
  document.getElementById("userNombre").value = usuario?.nombre || "";
  document.getElementById("userEmail").value = usuario?.email || "";
  document.getElementById("userRol").value = usuario?.rol || "almacenista";
  document.getElementById("userEstado").value = usuario?.estado || "activo";
  document.getElementById("modalUsuario").classList.add("show");
}

function cerrarModal() {
  document.getElementById("modalUsuario").classList.remove("show");
}

async function guardarUsuario() {
  const id = document.getElementById("userId").value;
  const nombre = document.getElementById("userNombre").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const rol = document.getElementById("userRol").value;
  const estado = document.getElementById("userEstado").value;

  if (!nombre || !email) { showToast("Nombre y email son obligatorios.", "error"); return; }

  if (id) {
    // Editar
    const { error } = await db.from("usuarios").update({ nombre, email, rol, estado }).eq("id", id);
    if (error) { showToast("Error actualizando: " + error.message, "error"); return; }
    showToast("Usuario actualizado correctamente.", "success");
  } else {
    // Crear
    const { error } = await db.from("usuarios").insert({ nombre, email, rol, estado });
    if (error) { showToast("Error creando: " + error.message, "error"); return; }
    showToast("Usuario creado correctamente.", "success");
  }

  cerrarModal();
  await cargarUsuarios();
}

// === UTILIDADES ===
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const colors = { success: "#10B981", error: "#EF4444", info: "#6c5ce7" };
  const toast = document.createElement("div");
  toast.style.cssText = `padding:12px 16px;border-radius:8px;color:#fff;font-size:13px;background:${colors[type]||colors.info};animation:fadeIn 0.2s;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 200); }, 3500);
}
