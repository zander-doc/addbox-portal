// ===============================================
//   ROLE GUARD — ADDBOX (Migrado a Clerk + Neon)
// ===============================================

import { db } from "./neon-client.js";
import { requireSession } from "./sessionService.js";
import { getCurrentUser as getClerkUser } from "./auth-clerk.js";

export async function roleGuard(rolesPermitidos = []) {
  // MODO DESARROLLADOR
  if (localStorage.getItem("devMode") === "on") {
    console.warn("⚠ Modo desarrollador activo: roles deshabilitados");
    return true;
  }

  const session = requireSession();
  if (!session) return false;

  const userId = session.user.id;

  try {
    const { data, error } = await db
      .from("usuarios")
      .select("rol, estado")
      .eq("id", userId)
      .single();

    if (error || !data) {
      // Fallback: usar metadata de Clerk
      const clerkUser = getClerkUser();
      if (clerkUser && rolesPermitidos.includes(clerkUser.rol)) {
        return true;
      }
      console.error("Error obteniendo rol:", error);
      return false;
    }

    if (data.estado !== "activo") {
      console.warn("Usuario desactivado");
      window.location.href = "/admin-dashboard/inicio-de-sesion.html";
      return false;
    }

    if (!rolesPermitidos.includes(data.rol)) {
      console.warn("Acceso denegado por rol");
      window.location.href = "/admin-dashboard/acceso-denegado.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error en roleGuard:", error);
    return false;
  }
}

// Alias para compatibilidad
export { roleGuard as requireRole };

// ─────────────────────────────────────────────────────────────────────────────
// Guards de inventario — Control de acceso por rol para operaciones de inventario
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el perfil del usuario actual (rol + estado).
 */
export async function obtenerPerfilUsuario() {
  if (localStorage.getItem("devMode") === "on") {
    return { rol: "admin", estado: "activo", id: "dev-user" };
  }

  const session = requireSession();
  if (!session) return null;

  const userId = session.user.id;

  try {
    const { data, error } = await db
      .from("usuarios")
      .select("id, rol, estado")
      .eq("id", userId)
      .single();

    if (error) {
      // Fallback a Clerk metadata
      const clerkUser = getClerkUser();
      if (clerkUser) {
        return { id: clerkUser.id, rol: clerkUser.rol, estado: clerkUser.estado };
      }
      console.error("Error obteniendo perfil:", error);
      return null;
    }

    if (data.estado !== "activo") return null;
    return data;
  } catch (error) {
    console.error("Error en obtenerPerfilUsuario:", error);
    return null;
  }
}

/**
 * Obtiene las obras asignadas a un almacenista.
 */
export async function obtenerObrasAsignadas(userId) {
  try {
    const { data, error } = await db
      .from("usuario_obras")
      .select("obra_id")
      .eq("usuario_id", userId);

    if (error) {
      console.error("Error obteniendo obras asignadas:", error);
      return [];
    }

    return data.map((row) => row.obra_id);
  } catch (error) {
    console.error("Error en obtenerObrasAsignadas:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Definición de permisos por rol para operaciones de inventario
// ─────────────────────────────────────────────────────────────────────────────

const PERMISOS_INVENTARIO = {
  almacenista: {
    registrarEntrada: true,
    registrarSalida: true,
    registrarTransferencia: false,
    registrarAjuste: false,
    consultarStock: true,
    consultarStockConsolidado: false,
    iniciarConteoFisico: false,
    aprobarReconciliacion: false,
    rechazarReconciliacion: false,
    configurarUmbrales: false,
    exportarReportes: false,
    gestionarObras: false,
    procesarLote: true,
    verReportes: true,
  },
  supervisor: {
    registrarEntrada: false,
    registrarSalida: false,
    registrarTransferencia: false,
    registrarAjuste: false,
    consultarStock: true,
    consultarStockConsolidado: true,
    iniciarConteoFisico: true,
    aprobarReconciliacion: true,
    rechazarReconciliacion: true,
    configurarUmbrales: false,
    exportarReportes: false,
    gestionarObras: false,
    procesarLote: false,
    verReportes: true,
  },
  admin: {
    registrarEntrada: true,
    registrarSalida: true,
    registrarTransferencia: true,
    registrarAjuste: true,
    consultarStock: true,
    consultarStockConsolidado: true,
    iniciarConteoFisico: true,
    aprobarReconciliacion: true,
    rechazarReconciliacion: true,
    configurarUmbrales: true,
    exportarReportes: true,
    gestionarObras: true,
    procesarLote: true,
    verReportes: true,
  },
  jefe: {
    registrarEntrada: true,
    registrarSalida: true,
    registrarTransferencia: true,
    registrarAjuste: true,
    consultarStock: true,
    consultarStockConsolidado: true,
    iniciarConteoFisico: true,
    aprobarReconciliacion: true,
    rechazarReconciliacion: true,
    configurarUmbrales: true,
    exportarReportes: true,
    gestionarObras: true,
    procesarLote: true,
    verReportes: true,
  },
};

export function tienePermisoInventario(rol, operacion) {
  const permisos = PERMISOS_INVENTARIO[rol];
  if (!permisos) return false;
  return permisos[operacion] === true;
}

export function obtenerPermisosInventario(rol) {
  return PERMISOS_INVENTARIO[rol] || null;
}

export function tieneAccesoObra(rol, obraId, obrasAsignadas) {
  if (rol === "admin" || rol === "jefe" || rol === "supervisor") {
    return true;
  }
  if (rol === "almacenista") {
    return obrasAsignadas.includes(obraId);
  }
  return false;
}

export async function guardInventario(operacion, obraId = null) {
  const perfil = await obtenerPerfilUsuario();

  if (!perfil) {
    return {
      permitido: false,
      rol: null,
      obrasAsignadas: [],
      mensaje: "Sesión no válida o usuario inactivo",
    };
  }

  const { rol, id: userId } = perfil;

  if (!tienePermisoInventario(rol, operacion)) {
    return {
      permitido: false,
      rol,
      obrasAsignadas: [],
      mensaje: "No tiene permisos para realizar esta operación",
    };
  }

  let obrasAsignadas = [];
  if (rol === "almacenista") {
    obrasAsignadas = await obtenerObrasAsignadas(userId);

    if (obrasAsignadas.length === 0) {
      return {
        permitido: false,
        rol,
        obrasAsignadas: [],
        mensaje: "No tiene obras asignadas. Contacte a un administrador.",
      };
    }

    if (obraId && !obrasAsignadas.includes(obraId)) {
      return {
        permitido: false,
        rol,
        obrasAsignadas,
        mensaje: "No tiene acceso a esta obra",
      };
    }
  }

  return {
    permitido: true,
    rol,
    obrasAsignadas,
    mensaje: null,
  };
}

export function ocultarElementosPorRol(rol, contenedor = document) {
  const elementos = contenedor.querySelectorAll("[data-permiso]");
  elementos.forEach((el) => {
    const operacionRequerida = el.getAttribute("data-permiso");
    if (!tienePermisoInventario(rol, operacionRequerida)) {
      el.remove();
    }
  });
}

export function mostrarMensajeSinObras(contenedor) {
  contenedor.innerHTML = `
    <div class="sin-obras-mensaje" style="text-align: center; padding: 3rem; color: #6b7280;">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem;">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      <h3 style="margin-bottom: 0.5rem; color: #374151;">Sin obras asignadas</h3>
      <p>No tiene obras asignadas actualmente. Contacte a un administrador.</p>
    </div>
  `;
}

export function filtrarObrasPorRol(obras, rol, obrasAsignadas) {
  if (rol === "admin" || rol === "jefe" || rol === "supervisor") {
    return obras;
  }
  if (rol === "almacenista") {
    return obras.filter((obra) => obrasAsignadas.includes(obra.id));
  }
  return [];
}