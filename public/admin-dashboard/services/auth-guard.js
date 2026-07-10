// ===============================================
//   AUTH GUARD — ADDBOX
//   Protección de rutas usando Clerk
//   Reemplaza la autenticación de Supabase
// ===============================================

/**
 * Verifica si el usuario está autenticado con Clerk
 * @returns {Promise<boolean>}
 */
export async function requireSession() {
  // Si Clerk no está disponible, esperar un momento
  if (!window.Clerk) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Verificar sesión de Clerk
  if (window.Clerk && window.Clerk.user) {
    return true;
  }

  // Si no hay sesión, redirigir a login
  window.location.href = '/admin-dashboard/inicio-de-sesion.html';
  return false;
}

/**
 * Obtiene el rol del usuario desde Clerk
 * @returns {string|null} - Rol del usuario o null
 */
export function getUserRole() {
  if (!window.Clerk || !window.Clerk.user) {
    return null;
  }

  // Intentar obtener rol desde publicMetadata
  const rol = window.Clerk.user.publicMetadata?.rol;
  
  // Si no existe en publicMetadata, intentar desde sessionStorage (fallback)
  if (!rol) {
    return sessionStorage.getItem('rol') || 'usuario';
  }

  return rol;
}

/**
 * Obtiene el nombre del usuario desde Clerk
 * @returns {string|null}
 */
export function getUserName() {
  if (!window.Clerk || !window.Clerk.user) {
    return null;
  }

  return (
    window.Clerk.user.fullName ||
    window.Clerk.user.username ||
    window.Clerk.user.primaryEmailAddress?.emailAddress ||
    'Usuario'
  );
}

/**
 * Obtiene el ID del usuario desde Clerk
 * @returns {string|null}
 */
export function getUserId() {
  if (!window.Clerk || !window.Clerk.user) {
    return null;
  }

  return window.Clerk.user.id;
}

/**
 * Verifica si el usuario tiene uno de los roles especificados
 * @param {string|string[]} rolesPermitidos - Rol o lista de roles permitidos
 * @returns {Promise<boolean>}
 */
export async function requireRole(rolesPermitidos) {
  const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
  const userRole = getUserRole();

  if (!userRole) {
    window.location.href = '/admin-dashboard/inicio-de-sesion.html';
    return false;
  }

  // Admin siempre tiene acceso
  if (userRole === 'admin') {
    return true;
  }

  // Verificar si el rol del usuario está en la lista de permitidos
  if (roles.includes(userRole)) {
    return true;
  }

  // Si no tiene permiso, redirigir a acceso denegado
  window.location.href = '/admin-dashboard/acceso-denegado.html';
  return false;
}

/**
 * Verifica si el usuario está autenticado (sin redirigir)
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!(window.Clerk && window.Clerk.user);
}

/**
 * Cierra la sesión del usuario
 */
export async function logout() {
  if (window.Clerk) {
    await window.Clerk.signOut();
  }
  
  // Limpiar sessionStorage
  sessionStorage.clear();
  
  // Redirigir al portal
  window.location.href = '/admin-dashboard/inicio-de-sesion.html';
}

/**
 * Inicializa el listener de cambios de autenticación
 * @param {function} callback - Función a ejecutar cuando cambie el estado
 * @returns {object} - Objeto de suscripción
 */
export function onAuthStateChange(callback) {
  if (!window.Clerk) {
    return { unsubscribe: () => {} };
  }

  return window.Clerk.addListener((payload) => {
    const isSignedIn = !!payload.session?.user;
    callback(isSignedIn, payload.session?.user || null);
  });
}

// ===============================================
//   INICIALIZACIÓN AUTOMÁTICA
// ===============================================

// Hacer funciones disponibles globalmente
window.ADDBOX = window.ADDBOX || {};
window.ADDBOX.auth = {
  requireSession,
  getUserRole,
  getUserName,
  getUserId,
  requireRole,
  isAuthenticated,
  logout,
  onAuthStateChange
};

console.log('✅ auth-guard.js cargado. Usa requireSession() y requireRole() para proteger rutas.');