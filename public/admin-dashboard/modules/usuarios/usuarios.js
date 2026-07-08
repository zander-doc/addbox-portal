// 🔄 Reemplazado por supabase-client.js
/*
const supabase = window.supabaseClient;
*/

import { supabase } from "../../services/supabase-client.js";
import { logAudit } from "../../services/auditService.js";
import { requireRole } from "../../services/role-guard.js";
import { handleError } from "../../services/error-handler.js";
import { showToast } from "../../services/toastService.js";

// Verificar rol antes de cargar el módulo
await requireRole(["jefe", "admin"]);

const usersTableBody = document.querySelector("#usersTable tbody");
const searchInput = document.getElementById("searchInput");
const btnNuevo = document.getElementById("btnNuevo");
const userModal = document.getElementById("userModal");
const userForm = document.getElementById("userForm");
const auditModal = document.getElementById("auditModal");
const auditList = document.getElementById("auditList");

let page = 1;
const pageSize = 10;

async function fetchUsers(q = "", p = 1) {
  try {
    let query = supabase.from("usuarios").select("*").order("creado_en", { ascending: false });
    if (q) {
      // Supabase v2: use or with ilike
      query = supabase.from("usuarios").select("*").or(`nombre.ilike.%${q}%,email.ilike.%${q}%`).order("creado_en", { ascending: false });
    }
    const from = (p - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await query.range(from, to);
    if (error) return console.error(error);
    renderUsers(data || []);
  } catch (err) {
    console.error(err);
  }
}

function renderUsers(users) {
  usersTableBody.innerHTML = "";
  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.nombre || ""}</td>
      <td>${u.email || ""}</td>
      <td>${u.rol || "usuario"}</td>
      <td>${u.estado || "activo"}</td>
      <td>${u.ultimo_login ? new Date(u.ultimo_login).toLocaleString() : "-"}</td>
      <td>
        <button class="edit" data-id="${u.id}">Editar</button>
        <button class="audit" data-id="${u.id}">Historial</button>
        <button class="delete" data-id="${u.id}">Eliminar</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });
}

searchInput?.addEventListener("input", () => {
  page = 1;
  fetchUsers(searchInput.value, page);
});

btnNuevo?.addEventListener("click", () => {
  openUserModal();
});

usersTableBody?.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (e.target.classList.contains("edit")) {
    const { data } = await supabase.from("usuarios").select("*").eq("id", id).single();
    openUserModal(data);
  } else if (e.target.classList.contains("delete")) {
    if (!confirm("Eliminar usuario?")) return;
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    // 🔄 Reemplazado por error-handler.js
    if (error) return handleError("usuarios", error);
    showToast("Usuario eliminado", "warning");
    await logAudit({ usuario_id: null, accion: "Eliminar usuario", modulo: "Usuarios", descripcion: `Usuario ${id} eliminado` });
    fetchUsers(searchInput.value, page);
  } else if (e.target.classList.contains("audit")) {
    openAuditModal(id);
  }
});

function openUserModal(user = null) {
  document.getElementById("userId").value = user?.id || "";
  document.getElementById("userNombre").value = user?.nombre || "";
  document.getElementById("userEmail").value = user?.email || "";
  document.getElementById("userRol").value = user?.rol || "usuario";
  document.getElementById("userEstado").value = user?.estado || "activo";
  userModal.style.display = "block";
}

document.getElementById("cancelUser")?.addEventListener("click", () => {
  userModal.style.display = "none";
});

userForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("userId").value;
  const nombre = document.getElementById("userNombre").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const rol = document.getElementById("userRol").value;
  const estado = document.getElementById("userEstado").value;

  if (id) {
    const { error } = await supabase.from("usuarios").update({ nombre, email, rol, estado }).eq("id", id);
    // 🔄 Reemplazado por error-handler.js
    if (error) return handleError("usuarios", error);
    showToast("Usuario actualizado", "success");
    await logAudit({ usuario_id: id, accion: "Editar usuario", modulo: "Usuarios", descripcion: `Usuario ${email} editado` });
  } else {
    // Fallback: crear solo en tabla (no expone service_role)
    const { error: insertError } = await supabase.from("usuarios").insert({
      nombre, email, rol, estado, creado_en: new Date()
    });
    // 🔄 Reemplazado por error-handler.js
    if (insertError) return handleError("usuarios", insertError);
    showToast("Usuario creado correctamente", "success");
    await logAudit({ usuario_id: null, accion: "Crear usuario (admin, sin auth)", modulo: "Usuarios", descripcion: `Usuario ${email} creado por admin (sin auth)` });
  }

  userModal.style.display = "none";
  fetchUsers(searchInput.value, page);
});

async function openAuditModal(userId) {
  auditList.innerHTML = "Cargando...";
  const { data, error } = await supabase.from("auditoria").select("*").eq("usuario_id", userId).order("fecha", { ascending: false }).limit(100);
  if (error) {
    auditList.innerHTML = "Error: " + error.message;
    return;
  }
  auditList.innerHTML = data.map(a => `<div><strong>${new Date(a.fecha).toLocaleString()}</strong> — ${a.accion} — ${a.modulo} — ${a.descripcion || ""}</div>`).join("");
  auditModal.style.display = "block";
}

document.getElementById("closeAudit")?.addEventListener("click", () => {
  auditModal.style.display = "none";
});

// Inicial
fetchUsers();