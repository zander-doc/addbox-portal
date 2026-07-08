// ===============================================
//   AUTH SERVICE — CLERK (ADDBOX)
//   Servicio de autenticación con Clerk
//   Reemplaza completamente a Supabase Auth
// ===============================================

// Usar variable de entorno o clave por defecto para desarrollo
const CLERK_PUBLISHABLE_KEY =
  window.CLERK_PUBLISHABLE_KEY ||
  localStorage.getItem("CLERK_PUBLISHABLE_KEY") ||
  "pk_test_bWVldC1kdWNrbGluZy0zNC5jbGVyay5hY2NvdW50cy5kZXYk";

let clerkInstance = null;
let authListeners = [];
let isInitialized = false;

/**
 * Inicializa Clerk
 * @returns {Promise<boolean>}
 */
export async function initClerk() {
  if (isInitialized) {
    console.log("⚠️ Clerk ya está inicializado");
    return true;
  }

  try {
    // Cargar Clerk JS desde CDN si no está disponible
    if (typeof window.Clerk === "undefined") {
      await loadClerkFromCDN();
    }

    // Inicializar la instancia
    clerkInstance = new window.Clerk(CLERK_PUBLISHABLE_KEY);
    await clerkInstance.load();

    isInitialized = true;
    console.log("✅ Clerk Auth inicializado correctamente");

    // Escuchar cambios de autenticación
    clerkInstance.addListener((payload) => {
      const event = payload.user ? "SIGNED_IN" : "SIGNED_OUT";
      authListeners.forEach((cb) => cb(event, payload.user));

      // Disparar evento personalizado en el DOM
      document.dispatchEvent(
        new CustomEvent("clerk:auth-change", {
          detail: { event, user: payload.user },
        })
      );
    });

    return true;
  } catch (error) {
    console.error("❌ Error inicializando Clerk:", error);
    throw error;
  }
}

/**
 * Carga Clerk JS desde CDN como módulo
 */
function loadClerkFromCDN() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/umd/clerk.min.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("No se pudo cargar Clerk desde CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Registra un nuevo usuario
 * @param {string} email
 * @param {string} password
 * @param {object} metadata - Datos adicionales (nombre, rol, etc.)
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function signUp(email, password, metadata = {}) {
  try {
    if (!clerkInstance) {
      await initClerk();
    }

    const signUpAttempt = await clerkInstance.client.signUp.create({
      emailAddress: email,
      password: password,
      publicMetadata: {
        nombre: metadata.nombre || email.split("@")[0],
        rol: metadata.rol || "usuario",
        estado: "activo",
        ...metadata,
      },
    });

    if (signUpAttempt.status === "complete") {
      const userId = signUpAttempt.createdUserId;

      // Obtener token de sesión
      let token = null;
      try {
        if (clerkInstance.session) {
          token = await clerkInstance.session.getToken();
        }
      } catch { /* ignore */ }

      // Sincronizar usuario en Neon PostgreSQL
      try {
        const { query } = await import("./neon-client.js");
        await query(
          `INSERT INTO usuarios (id, nombre, email, rol, estado, creado_en)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (id) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             email = EXCLUDED.email,
             actualizado_en = NOW()`,
          [
            userId,
            metadata.nombre || email.split("@")[0],
            email,
            metadata.rol || "usuario",
            "activo",
          ]
        );
        console.log("✅ Usuario sincronizado a Neon:", email);
      } catch (dbError) {
        console.warn(
          "⚠️ Usuario creado en Clerk pero error al sincronizar a Neon:",
          dbError.message
        );
      }

      return {
        success: true,
        token,
        user: {
          id: userId,
          email: email,
          nombre: metadata.nombre || email.split("@")[0],
          rol: metadata.rol || "usuario",
        },
      };
    } else {
      return {
        success: false,
        error: "Registro incompleto. Verifica los datos ingresados.",
      };
    }
  } catch (error) {
    console.error("Error en signUp:", error);
    return {
      success: false,
      error: error.errors?.[0]?.message || error.message || "Error al registrar",
    };
  }
}

/**
 * Inicia sesión con email y contraseña
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function signIn(email, password) {
  try {
    if (!clerkInstance) {
      await initClerk();
    }

    const signInAttempt = await clerkInstance.client.signIn.create({
      identifier: email,
      password: password,
    });

    if (signInAttempt.status === "complete") {
      const user = clerkInstance.user;
      const userId = user?.id || signInAttempt.createdUserId;

      // Obtener token de sesión
      let token = null;
      try {
        if (clerkInstance.session) {
          token = await clerkInstance.session.getToken();
        }
      } catch { /* ignore */ }

      // Sincronizar usuario en Neon si no existe
      try {
        const { query } = await import("./neon-client.js");
        await query(
          `INSERT INTO usuarios (id, nombre, email, rol, estado, ultimo_login, creado_en)
           VALUES ($1, $2, $3, $4, 'activo', NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             ultimo_login = NOW(),
             nombre = EXCLUDED.nombre,
             actualizado_en = NOW()`,
          [
            userId,
            user?.fullName ||
              user?.username ||
              email.split("@")[0] ||
              "Usuario",
            email,
            user?.publicMetadata?.rol || "usuario",
          ]
        );
      } catch (dbError) {
        console.warn(
          "⚠️ Error sincronizando login a Neon:",
          dbError.message
        );
      }

      return {
        success: true,
        token,
        user: {
          id: userId,
          email: email,
          nombre:
            user?.fullName ||
            user?.username ||
            email.split("@")[0] ||
            "Usuario",
          rol: user?.publicMetadata?.rol || "usuario",
          imageUrl: user?.imageUrl || null,
        },
      };
    } else {
      return {
        success: false,
        error: "Inicio de sesión incompleto. Verifica tus credenciales.",
      };
    }
  } catch (error) {
    console.error("Error en signIn:", error);

    // Extraer mensaje de error amigable
    let errorMessage = "Error al iniciar sesión";
    if (error.errors && error.errors.length > 0) {
      errorMessage = error.errors[0].message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Cierra la sesión actual
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    if (clerkInstance) {
      await clerkInstance.signOut();
    }
    localStorage.removeItem("addbox_session");
    sessionStorage.clear();
    console.log("✅ Sesión cerrada correctamente");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    throw error;
  }
}

/**
 * Obtiene el usuario actual
 * @returns {object|null}
 */
export function getCurrentUser() {
  if (!clerkInstance || !clerkInstance.user) return null;

  const user = clerkInstance.user;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || "",
    nombre:
      user.fullName ||
      user.username ||
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Usuario",
    imageUrl: user.imageUrl || "",
    rol: user.publicMetadata?.rol || "usuario",
    estado: user.publicMetadata?.estado || "activo",
    metadata: user.publicMetadata || {},
    createdAt: user.createdAt,
  };
}

/**
 * Verifica si hay una sesión activa
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!(clerkInstance && clerkInstance.session);
}

/**
 * Obtiene el token JWT de la sesión actual
 * @returns {Promise<string|null>}
 */
export async function getToken() {
  if (!clerkInstance || !clerkInstance.session) return null;
  try {
    return await clerkInstance.session.getToken();
  } catch {
    return null;
  }
}

/**
 * Escucha cambios en el estado de autenticación
 * @param {Function} callback - (event: 'SIGNED_IN'|'SIGNED_OUT', user: object|null) => void
 * @returns {Function} - Función para remover el listener
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Abre el modal de inicio de sesión de Clerk
 */
export function openSignIn() {
  if (clerkInstance) {
    clerkInstance.openSignIn();
  }
}

/**
 * Abre el modal de registro de Clerk
 */
export function openSignUp() {
  if (clerkInstance) {
    clerkInstance.openSignUp();
  }
}

/**
 * Monta el componente UserButton de Clerk en un elemento del DOM
 * @param {string|HTMLElement} selector
 */
export function mountUserButton(selector) {
  if (!clerkInstance) return;
  const el =
    typeof selector === "string"
      ? document.querySelector(selector)
      : selector;
  if (el) {
    clerkInstance.mountUserButton(el);
  }
}

/**
 * Monta el componente SignIn de Clerk en un elemento del DOM
 * @param {string|HTMLElement} selector
 */
export function mountSignIn(selector) {
  if (!clerkInstance) return;
  const el =
    typeof selector === "string"
      ? document.querySelector(selector)
      : selector;
  if (el) {
    clerkInstance.mountSignIn(el);
  }
}

/**
 * Monta el componente UserProfile de Clerk en un elemento del DOM
 * @param {string|HTMLElement} selector
 */
export function mountUserProfile(selector) {
  if (!clerkInstance) return;
  const el =
    typeof selector === "string"
      ? document.querySelector(selector)
      : selector;
  if (el) {
    clerkInstance.mountUserProfile(el);
  }
}

// ===============================================
//   EXPORTAR INSTANCIA POR DEFECTO
// ===============================================
export default clerkInstance;

// ===============================================
//   INICIALIZACIÓN AUTOMÁTICA (opcional)
// ===============================================
// Si hay una clave guardada, inicializar automáticamente
const savedKey =
  window.CLERK_PUBLISHABLE_KEY ||
  localStorage.getItem("CLERK_PUBLISHABLE_KEY") ||
  "pk_test_bWVldC1kdWNrbGluZy0zNC5jbGVyay5hY2NvdW50cy5kZXYk";

if (savedKey && typeof window !== "undefined") {
  // Inicialización diferida para no bloquear el renderizado
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initClerk());
  } else {
    setTimeout(initClerk, 100);
  }
}

// Hacer funciones disponibles globalmente
window.ADDBOX = window.ADDBOX || {};
window.ADDBOX.auth = {
  initClerk,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isAuthenticated,
  getToken,
  onAuthChange,
  openSignIn,
  openSignUp,
  mountUserButton,
  mountSignIn,
  mountUserProfile,
};

console.log("✅ auth-clerk.js cargado. Usa ADDBOX.auth.signIn(email, password)");