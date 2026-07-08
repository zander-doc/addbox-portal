// ===============================================
//   SESSION SERVICE — ADDBOX
//   Manejo de sesión basado en localStorage
//   Compatible con Clerk Auth
// ===============================================

/**
 * Obtiene la sesión actual desde localStorage
 * @returns {object|null} { user, token, isAuthenticated } o null
 */
export function getSession() {
  // MODO DESARROLLADOR
  if (localStorage.getItem("devMode") === "on") {
    console.warn("⚠ Modo desarrollador activo: autenticación deshabilitada");
    return {
      user: { id: "dev-user", email: "dev@addbox.com", rol: "admin" },
      token: "dev-token",
      isAuthenticated: true,
    };
  }

  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  if (!user || !token) return null;

  try {
    return {
      user: JSON.parse(user),
      token: token,
      isAuthenticated: true,
    };
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Requiere sesión activa. Si no hay, redirige al login.
 * @returns {object|null} Sesión o null si redirige
 */
export function requireSession() {
  // MODO DESARROLLADOR
  if (localStorage.getItem("devMode") === "on") {
    console.warn("⚠ Modo desarrollador activo: autenticación deshabilitada");
    return {
      user: { id: "dev-user", email: "dev@addbox.com", rol: "admin" },
      token: "dev-token",
      isAuthenticated: true,
    };
  }

  const session = getSession();
  if (!session) {
    // Si Clerk está disponible, abrir modal de login
    if (window.ADDBOX?.auth) {
      window.ADDBOX.auth.openSignIn();
      return null;
    }
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return null;
  }
  return session;
}

/**
 * Obtiene el usuario actual de la sesión
 * @returns {object|null}
 */
export function getCurrentUser() {
  const session = getSession();
  return session?.user ?? null;
}

/**
 * Guarda datos de sesión en localStorage
 * @param {object} userData - Datos del usuario
 * @param {string} token - Token de autenticación
 */
export function setSession(userData, token) {
  localStorage.setItem("user", JSON.stringify(userData));
  localStorage.setItem("token", token);
}

/**
 * Limpia la sesión local
 */
export function clearSession() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  sessionStorage.clear();
}