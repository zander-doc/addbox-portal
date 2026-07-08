import { listUsers, createUserRecord, updateUserRecord, deactivateUser, activateUser } from "../../../services/admin-users.service.js";
import { showToast } from "../../../services/toastService.js";
import { audit } from "../../../services/auditService.js";

let usuarios = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await cargarUsuarios();
  configurarEventos();
}

async function cargarUsuarios() {
  try {
    usuarios = await listUsers();
    renderTabla(usuarios);
    actualizarContadores(usuarios);
  } catch (err) {
    console.error("Error cargando usuarios:", err);
    showToast("Error al cargar usuarios", "error");
  }
}

function actualizarContadores(users) {
  const activos = users.filter(u => u.estado === "activo").length;
  const inactivos = users.filter(u => u.estado === "inactivo").length;
  document.getElementById("usuarios-activos").textContent = activos;
  document.getElementById("pendientes").textContent = inactivos;
  document.getElementById("expiradas").textContent = users.length;
  const ultimo = users[0];
  document.getElementById("ultima-actividad").textContent = ultimo ? new Date(ultimo.creado_en).toLocaleDateString() : "—";
}

function renderTabla(users) {
  const tbody = document.getElementById("tabla-invitaciones");
  if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.nombre || "—"}</td>
      <td>${u.email || "—"}</td>
      <td>${u.rol || "usuario"}</td>
      <td><span class="badge-${u.estado === 'activo' ? 'active' : 'inactive'}">${u.estado}</span></td>
      <td>${u.creado_en ? new Date(u.creado_en).toLocaleDateString() : "—"}</td>
      <td>
        ${u.estado === 'activo'
          ? `<button class="ms-btn-small" onclick="desactivarUsuario('${u.id}')">Desactivar</button>`
          : `<button class="ms-btn-small" onclick="reactivarUsuario('${u.id}')">Reactivar</button>`
        }
        <button class="ms-btn-small" style="background:#dc3545;color:#fff;margin-left:4px;" onclick="eliminarUsuario('${u.id}','${u.nombre}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function configurarEventos() {
  const btnCrear = document.querySelector(".ms-btn-primary");
  if (btnCrear) {
    btnCrear.onclick = crearUsuario;
  }
}

async function crearUsuario() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const rol = document.getElementById("rol").value.toLowerCase();

  if (!nombre || !correo) {
    showToast("Nombre y correo son obligatorios", "warning");
    return;
  }

  try {
    await createUserRecord(nombre, correo, rol);
    showToast("Usuario creado correctamente", "success");
    await audit("admin", "crear_usuario", `Usuario ${correo} creado con rol ${rol}`);
    document.getElementById("nombre").value = "";
    document.getElementById("correo").value = "";
    await cargarUsuarios();
  } catch (err) {
    console.error("Error creando usuario:", err);
    showToast("Error: " + err.message, "error");
  }
}

window.desactivarUsuario = async function(id) {
  try {
    await deactivateUser(id);
    showToast("Usuario desactivado", "warning");
    await audit("admin", "desactivar_usuario", `Usuario ${id} desactivado`);
    await cargarUsuarios();
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
};

window.reactivarUsuario = async function(id) {
  try {
    await activateUser(id);
    showToast("Usuario reactivado", "success");
    await audit("admin", "reactivar_usuario", `Usuario ${id} reactivado`);
    await cargarUsuarios();
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
};

// ============================================================
// FUNCIONES DE INVITACIÓN (globales para onclick del HTML)
// ============================================================

let ultimaInvitacion = null;

function showInlineMessage(text, type = "info") {
  const el = document.getElementById("invitacion-message");
  if (!el) return;
  const colors = { success: "#d4edda", error: "#f8d7da", warning: "#fff3cd", info: "#d1ecf1" };
  const textColors = { success: "#155724", error: "#721c24", warning: "#856404", info: "#0c5460" };
  el.style.display = "block";
  el.style.background = colors[type] || colors.info;
  el.style.color = textColors[type] || textColors.info;
  el.textContent = text;
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

/**
 * Genera una invitación: crea el usuario en la tabla y genera un código
 */
window.crearInvitacion = async function() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const rol = document.getElementById("rol").value;
  const departamento = document.getElementById("departamento").value;

  if (!nombre || !correo) {
    showInlineMessage("Nombre y correo son obligatorios", "warning");
    return;
  }

  try {
    // Crear registro en tabla usuarios (estado pendiente)
    const nuevo = await createUserRecord(nombre, correo, rol);
    
    // Generar código de invitación
    const codigo = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    // Guardar invitación en tabla invitaciones
    const db = window.supabaseClient;
    if (db) {
      await db.from("invitaciones").insert({
        codigo,
        nombre,
        email: correo,
        rol,
        departamento,
        estado: "pendiente"
      });
    }
    
    ultimaInvitacion = { nombre, correo, rol, departamento, codigo, id: nuevo.id };

    showInlineMessage(`✅ Invitación generada: ${codigo}`, "success");
    await audit("admin", "generar_invitacion", `Invitación ${codigo} para ${correo} (${rol})`);
    
    document.getElementById("nombre").value = "";
    document.getElementById("correo").value = "";
    await cargarUsuarios();
  } catch (err) {
    showInlineMessage("Error: " + err.message, "error");
  }
};

/**
 * Envía la invitación por correo (abre cliente de email)
 */
window.enviarCorreo = async function() {
  // Si no hay invitación generada, generarla primero
  if (!ultimaInvitacion) {
    await window.crearInvitacion();
    if (!ultimaInvitacion) return; // Si falló la creación, no continuar
  }

  const { correo, nombre, rol, codigo } = ultimaInvitacion;

  const subject = encodeURIComponent("Invitación a ADDBOX PRO");
  const body = encodeURIComponent(
    `Hola ${nombre},\n\n` +
    `Has sido invitado a ADDBOX PRO con el rol: ${rol}.\n\n` +
    `Tu código de invitación es: ${codigo}\n\n` +
    `Para crear tu cuenta, visita:\n${window.location.origin}/admin-dashboard/registro-invitacion.html\n\n` +
    `Usa tu correo (${correo}) y el código para registrarte.\n\n` +
    `— Equipo ADDBOX LLC`
  );

  window.open(`mailto:${correo}?subject=${subject}&body=${body}`, "_blank");
  showInlineMessage("📧 Abriendo cliente de correo...", "info");
  audit("admin", "enviar_invitacion_email", `Invitación enviada por email a ${correo}`);
};

/**
 * Envía la invitación por WhatsApp (abre WhatsApp Web)
 */
window.enviarWhatsApp = async function() {
  // Si no hay invitación generada, generarla primero
  if (!ultimaInvitacion) {
    await window.crearInvitacion();
    if (!ultimaInvitacion) return;
  }

  const { correo, nombre, rol, codigo } = ultimaInvitacion;

  const mensaje = encodeURIComponent(
    `Hola ${nombre}, has sido invitado a *ADDBOX PRO* con el rol: *${rol}*.\n\n` +
    `Tu código: *${codigo}*\n\n` +
    `Regístrate aquí: ${window.location.origin}/admin-dashboard/registro-invitacion.html\n\n` +
    `Usa tu correo y el código para crear tu cuenta.`
  );

  window.open(`https://wa.me/?text=${mensaje}`, "_blank");
  showInlineMessage("📱 Abriendo WhatsApp...", "info");
  audit("admin", "enviar_invitacion_whatsapp", `Invitación enviada por WhatsApp a ${nombre}`);
};

/**
 * Elimina un usuario permanentemente de la tabla
 */
window.eliminarUsuario = async function(id, nombre) {
  if (!confirm(`¿Eliminar permanentemente a "${nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    const db = window.supabaseClient;
    const { error } = await db.from("usuarios").delete().eq("id", id);
    if (error) throw error;

    showInlineMessage(`🗑️ Usuario "${nombre}" eliminado permanentemente`, "error");
    await audit("admin", "eliminar_usuario", `Usuario ${nombre} (${id}) eliminado`);
    await cargarUsuarios();
  } catch (err) {
    showInlineMessage("Error eliminando: " + err.message, "error");
  }
};
