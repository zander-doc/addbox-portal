/**
 * obras.controller.js
 * Gestión de obras: CRUD + asignación de usuarios
 */
import { supabase } from "../../services/supabase-client.js";

let obras = [];
let usuarios = [];

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await cargarObras();
  await cargarUsuarios();
  configurarEventos();
});

// ─── Cargar obras ──────────────────────────────────────────────────────────────

async function cargarObras() {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .order("nombre");

  if (error) {
    console.error("Error cargando obras:", error);
    return;
  }

  obras = data || [];

  // Cargar asignaciones
  const { data: asignaciones } = await supabase
    .from("usuario_obras")
    .select("obra_id, usuario_id");

  // Cargar datos de usuarios asignados
  const userIds = [...new Set((asignaciones || []).map(a => a.usuario_id))];
  let usuariosMap = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from("usuarios")
      .select("id, nombre, email, rol")
      .in("id", userIds);
    (usersData || []).forEach(u => { usuariosMap[u.id] = u; });
  }

  // Enriquecer asignaciones con datos de usuario
  const asignacionesEnriquecidas = (asignaciones || []).map(a => ({
    ...a,
    usuarios: usuariosMap[a.usuario_id] || null
  }));

  renderObras(obras, asignacionesEnriquecidas);
}

// ─── Cargar usuarios ───────────────────────────────────────────────────────────

async function cargarUsuarios() {
  const { data } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol")
    .in("rol", ["almacenista", "supervisor"])
    .eq("estado", "activo")
    .order("nombre");

  usuarios = data || [];
}

// ─── Render ────────────────────────────────────────────────────────────────────

function renderObras(obras, asignaciones) {
  const grid = document.getElementById("obrasGrid");

  if (obras.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-building"></i>
        <p>No hay obras registradas. Crea la primera.</p>
      </div>`;
    return;
  }

  grid.innerHTML = obras.map(obra => {
    const usuariosObra = asignaciones
      .filter(a => a.obra_id === obra.id && a.usuarios)
      .map(a => a.usuarios);

    return `
      <div class="obra-card" data-id="${obra.id}" onclick="verObra('${obra.id}')">
        <div class="obra-card-header">
          <h3>${escapeHtml(obra.nombre)}</h3>
          <span class="obra-badge ${obra.estado || 'activa'}">${obra.estado || 'activa'}</span>
        </div>
        <div class="obra-card-info">
          ${obra.direccion ? `<div><i class="fa fa-map-pin"></i> ${escapeHtml(obra.direccion)}</div>` : ""}
          ${obra.descripcion ? `<div><i class="fa fa-info-circle"></i> ${escapeHtml(obra.descripcion)}</div>` : ""}
          <div><i class="fa fa-users"></i> ${usuariosObra.length} usuario(s) asignado(s)</div>
        </div>
        <div class="obra-card-users">
          ${usuariosObra.map(u => `
            <span class="obra-user-chip">
              ${escapeHtml(u.nombre || u.email)} (${u.rol})
            </span>
          `).join("")}
        </div>
        <div class="obra-card-actions" onclick="event.stopPropagation();">
          <button class="btn-edit" onclick="editarObra('${obra.id}')"><i class="fa fa-pen"></i> Editar</button>
          <button class="btn-assign" onclick="asignarUsuarios('${obra.id}')"><i class="fa fa-user-plus"></i> Asignar</button>
          <button class="btn-toggle" onclick="toggleEstado('${obra.id}', '${obra.estado}')">
            <i class="fa fa-${obra.estado === 'activa' ? 'pause' : 'play'}"></i> ${obra.estado === 'activa' ? 'Desactivar' : 'Activar'}
          </button>
          <button class="btn-delete" onclick="eliminarObra('${obra.id}', '${escapeHtml(obra.nombre)}')"><i class="fa fa-trash"></i></button>
        </div>
      </div>`;
  }).join("");
}

// ─── Eventos ───────────────────────────────────────────────────────────────────

function configurarEventos() {
  // Abrir modal crear
  document.getElementById("btnCrearObra").addEventListener("click", () => {
    document.getElementById("modalObraTitle").textContent = "Nueva Obra";
    document.getElementById("formObra").reset();
    document.getElementById("obraId").value = "";
    document.getElementById("modalObra").classList.add("show");
  });

  // Cerrar modales
  document.getElementById("btnCerrarModalObra").addEventListener("click", () => {
    document.getElementById("modalObra").classList.remove("show");
  });
  document.getElementById("btnCerrarModalAsignar").addEventListener("click", () => {
    document.getElementById("modalAsignar").classList.remove("show");
  });

  // Cerrar al click fuera
  document.getElementById("modalObra").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("show");
  });
  document.getElementById("modalAsignar").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("show");
  });

  // Submit crear/editar
  document.getElementById("formObra").addEventListener("submit", guardarObra);

  // Asignar usuario
  document.getElementById("btnConfirmarAsignar").addEventListener("click", confirmarAsignacion);
}

// ─── Guardar obra (crear o editar) ─────────────────────────────────────────────

async function guardarObra(e) {
  e.preventDefault();

  const id = document.getElementById("obraId").value;
  const nombre = document.getElementById("obraNombre").value.trim();
  const direccion = document.getElementById("obraDireccion").value.trim();
  const descripcion = document.getElementById("obraDescripcion").value.trim();
  const estado = document.getElementById("obraEstado").value;

  if (!nombre) return;

  const payload = { nombre, direccion: direccion || null, descripcion: descripcion || null, estado };

  let error;
  if (id) {
    // Editar
    ({ error } = await supabase.from("obras").update(payload).eq("id", id));
  } else {
    // Crear
    ({ error } = await supabase.from("obras").insert(payload));
  }

  if (error) {
    alert("Error: " + error.message);
    return;
  }

  document.getElementById("modalObra").classList.remove("show");
  await cargarObras();
}

// ─── Eliminar obra ──────────────────────────────────────────────────────────────

window.eliminarObra = async function(id, nombre) {
  if (!confirm(`¿Eliminar la obra "${nombre}"?\n\nEsto eliminará también las asignaciones de usuarios. Esta acción no se puede deshacer.`)) return;

  // Eliminar asignaciones primero
  await supabase.from("usuario_obras").delete().eq("obra_id", id);

  // Eliminar obra
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) {
    alert("Error eliminando: " + error.message);
    return;
  }

  await cargarObras();
};

// ─── Ver obra (navegar a Stock por Obra) ───────────────────────────────────────

window.verObra = function(id) {
  // Navegar a Stock por Obra con la obra pre-seleccionada
  window.location.href = `/admin-dashboard/modules/inventario/inventario.html?obra=${id}`;
};

// ─── Editar obra ───────────────────────────────────────────────────────────────

window.editarObra = function(id) {
  const obra = obras.find(o => o.id === id);
  if (!obra) return;

  document.getElementById("modalObraTitle").textContent = "Editar Obra";
  document.getElementById("obraId").value = obra.id;
  document.getElementById("obraNombre").value = obra.nombre || "";
  document.getElementById("obraDireccion").value = obra.direccion || "";
  document.getElementById("obraDescripcion").value = obra.descripcion || "";
  document.getElementById("obraEstado").value = obra.estado || "activa";
  document.getElementById("modalObra").classList.add("show");
};

// ─── Toggle estado ─────────────────────────────────────────────────────────────

window.toggleEstado = async function(id, estadoActual) {
  const nuevoEstado = estadoActual === "activa" ? "inactiva" : "activa";
  const { error } = await supabase.from("obras").update({ estado: nuevoEstado }).eq("id", id);
  if (error) {
    alert("Error: " + error.message);
    return;
  }
  await cargarObras();
};

// ─── Asignar usuarios ──────────────────────────────────────────────────────────

window.asignarUsuarios = async function(obraId) {
  const obra = obras.find(o => o.id === obraId);
  if (!obra) return;

  document.getElementById("asignarObraNombre").textContent = obra.nombre;
  document.getElementById("asignarObraId").value = obraId;

  // Cargar asignaciones de esta obra
  const { data: asignaciones } = await supabase
    .from("usuario_obras")
    .select("usuario_id")
    .eq("obra_id", obraId);

  const asignadosIds = (asignaciones || []).map(a => a.usuario_id);

  // Cargar datos de los usuarios asignados
  let usuariosAsignados = [];
  if (asignadosIds.length > 0) {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nombre, email, rol")
      .in("id", asignadosIds);
    usuariosAsignados = data || [];
  }

  // Poblar select con usuarios NO asignados
  const select = document.getElementById("selectUsuarioAsignar");
  select.innerHTML = `<option value="">Seleccionar usuario...</option>`;
  usuarios
    .filter(u => !asignadosIds.includes(u.id))
    .forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = `${u.nombre || u.email} (${u.rol})`;
      select.appendChild(opt);
    });

  // Mostrar lista de asignados
  const lista = document.getElementById("listaAsignados");
  if (usuariosAsignados.length > 0) {
    lista.innerHTML = usuariosAsignados.map(u => `
      <div class="obra-user-chip" style="margin-bottom:4px;">
        ${escapeHtml(u.nombre || u.email)} (${u.rol || "?"})
        <span class="remove-user" onclick="desasignarUsuario('${obraId}', '${u.id}')">&times;</span>
      </div>
    `).join("");
  } else {
    lista.innerHTML = `<span style="font-size:12px;color:#636e72;">Sin usuarios asignados</span>`;
  }

  document.getElementById("modalAsignar").classList.add("show");
};

// ─── Confirmar asignación ──────────────────────────────────────────────────────

async function confirmarAsignacion() {
  const obraId = document.getElementById("asignarObraId").value;
  const usuarioId = document.getElementById("selectUsuarioAsignar").value;

  if (!obraId || !usuarioId) return;

  const { error } = await supabase.from("usuario_obras").insert({
    obra_id: obraId,
    usuario_id: usuarioId
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      alert("Este usuario ya está asignado a esta obra.");
    } else {
      alert("Error asignando: " + error.message);
    }
    return;
  }

  // Recargar modal
  await window.asignarUsuarios(obraId);
  await cargarObras();
}

// ─── Desasignar usuario ────────────────────────────────────────────────────────

window.desasignarUsuario = async function(obraId, usuarioId) {
  if (!confirm("¿Quitar este usuario de la obra?")) return;

  const { error } = await supabase
    .from("usuario_obras")
    .delete()
    .eq("obra_id", obraId)
    .eq("usuario_id", usuarioId);

  if (error) {
    alert("Error: " + error.message);
    return;
  }

  await asignarUsuarios(obraId);
  await cargarObras();
};

// ─── Utilidades ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
