// ===============================================
//   CLERK AUTH — ADDBOX
//   Inicialización de Clerk para autenticación
//   Reemplaza completamente a Supabase Auth
// ===============================================

const CLERK_PUBLISHABLE_KEY = window.CLERK_PUBLISHABLE_KEY || localStorage.getItem('CLERK_PUBLISHABLE_KEY') || '';

let clerkInitialized = false;
let authListeners = [];

/**
 * Inicializa Clerk
 * @param {string} publishableKey - Clerk Publishable Key
 * @param {Function} onReady - Callback cuando Clerk esté listo
 */
export async function initClerk(publishableKey, onReady = null) {
  if (clerkInitialized) {
    console.log('⚠️ Clerk ya está inicializado');
    if (onReady) onReady(window.Clerk);
    return;
  }

  if (!publishableKey) {
    const keys = [
      window.CLERK_PUBLISHABLE_KEY,
      localStorage.getItem('CLERK_PUBLISHABLE_KEY'),
      'pk_test_...' // Fallback placeholder
    ].filter(Boolean);
    
    publishableKey = keys[0];
    
    if (!publishableKey) {
      console.error('❌ Clerk Publishable Key no configurada');
      return;
    }
  }

  // Guardar key
  CLERK_PUBLISHABLE_KEY = publishableKey;
  localStorage.setItem('CLERK_PUBLISHABLE_KEY', publishableKey);

  try {
    // Cargar Clerk desde CDN si no está disponible
    if (typeof window.Clerk === 'undefined') {
      await loadClerkScript();
    }

    // Inicializar Clerk
    await window.Clerk.load({
      publishableKey: publishableKey
    });

    clerkInitialized = true;
    console.log('✅ Clerk inicializado correctamente');

    // Notificar listeners
    authListeners.forEach(cb => cb(window.Clerk.user ? 'SIGNED_IN' : 'SIGNED_OUT', window.Clerk.user));

    // Escuchar cambios de autenticación
    window.Clerk.addListener((payload) => {
      authListeners.forEach(cb => {
        cb(payload.user ? 'SIGNED_IN' : 'SIGNED_OUT', payload.user);
      });
    });

    if (onReady) onReady(window.Clerk);

    // Disparar evento personalizado
    document.dispatchEvent(new CustomEvent('clerk:ready', { detail: { clerk: window.Clerk } }));

  } catch (error) {
    console.error('❌ Error inicializando Clerk:', error);
    throw error;
  }
}

/**
 * Carga el script de Clerk desde CDN
 */
function loadClerkScript() {
  return new Promise((resolve, reject) => {
    if (typeof window.Clerk !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/umd/clerk.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar Clerk CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Obtiene el usuario actual de Clerk
 * @returns {object|null}
 */
export function getClerkUser() {
  if (!window.Clerk || !window.Clerk.user) return null;
  
  const user = window.Clerk.user;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || '',
    nombre: user.fullName || user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Usuario',
    imageUrl: user.imageUrl || '',
    rol: user.publicMetadata?.rol || 'usuario',
    estado: user.publicMetadata?.estado || 'activo',
    metadata: user.publicMetadata || {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Verifica si hay sesión activa
 * @returns {boolean}
 */
export function isClerkAuthenticated() {
  return !!(window.Clerk && window.Clerk.session);
}

/**
 * Obtiene el token de sesión
 * @returns {Promise<string|null>}
 */
export async function getClerkToken() {
  if (!window.Clerk || !window.Clerk.session) return null;
  try {
    const token = await window.Clerk.session.getToken();
    return token;
  } catch {
    return null;
  }
}

/**
 * Registra un listener para cambios de autenticación
 * @param {Function} callback - (event: string, user: object|null) => void
 * @returns {Function} - Función para remover el listener
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

/**
 * Cierra la sesión
 */
export async function signOut() {
  if (window.Clerk) {
    await window.Clerk.signOut();
    localStorage.removeItem('addbox_session');
    sessionStorage.clear();
  }
}

/**
 * Abre el modal de login de Clerk
 */
export function openClerkSignIn() {
  if (window.Clerk) {
    window.Clerk.openSignIn();
  }
}

/**
 * Abre el modal de registro de Clerk
 */
export function openClerkSignUp() {
  if (window.Clerk) {
    window.Clerk.openSignUp();
  }
}

// ===============================================
//   RENDERIZADO DE COMPONENTES CLERK
// ===============================================

/**
 * Monta el componente UserButton de Clerk en un elemento
 * @param {string|HTMLElement} selector - Selector CSS o elemento
 */
export function mountUserButton(selector) {
  if (!window.Clerk) return;
  
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;

  window.Clerk.mountUserButton(el);
}

/**
 * Monta el componente SignIn de Clerk en un elemento
 * @param {string|HTMLElement} selector - Selector CSS o elemento
 */
export function mountSignIn(selector) {
  if (!window.Clerk) return;
  
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;

  window.Clerk.mountSignIn(el);
}

/**
 * Monta el componente UserProfile de Clerk en un elemento
 * @param {string|HTMLElement} selector - Selector CSS o elemento
 */
export function mountUserProfile(selector) {
  if (!window.Clerk) return;
  
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;

  window.Clerk.mountUserProfile(el);
}

// Exportar como window para compatibilidad global
window.initClerk = initClerk;
window.getClerkUser = getClerkUser;
window.isClerkAuthenticated = isClerkAuthenticated;
window.signOut = signOut;
window.openClerkSignIn = openClerkSignIn;
window.openClerkSignUp = openClerkSignUp;
window.onClerkAuthChange = onAuthChange;
window.mountUserButton = mountUserButton;
window.mountSignIn = mountSignIn;
window.mountUserProfile = mountUserProfile;

console.log('✅ clerk-auth.js cargado. Usa initClerk(key) para inicializar.');