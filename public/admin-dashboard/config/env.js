// ===============================================
//   ENV CONFIG — ADDBOX
//   Configuración de variables de entorno
//   Soporta: Node.js (process.env) y Browser (window/localStorage)
// ===============================================

/**
 * Configuración centralizada de variables de entorno
 * En producción (Cloudflare Pages), usar Environment Variables
 * En desarrollo, usar localStorage o window globals
 */
export const config = {
  // Neon Database URL
  neonUrl:
    (typeof process !== 'undefined' && process.env?.NEON_DATABASE_URL) ||
    window.NEON_DATABASE_URL ||
    localStorage.getItem('NEON_DATABASE_URL') ||
    'postgresql://neondb_owner:npg_e6ydNLUP4xni@ep-floral-credit-ath8csmy-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',

  // Clerk Publishable Key (pública, segura para frontend)
  clerkPubKey:
    (typeof process !== 'undefined' && process.env?.CLERK_PUBLISHABLE_KEY) ||
    window.CLERK_PUBLISHABLE_KEY ||
    localStorage.getItem('CLERK_PUBLISHABLE_KEY') ||
    'pk_test_bWVldC1kdWNrbGluZy0zNC5jbGVyay5hY2NvdW50cy5kZXYk',

  // Clerk Secret Key (NUNCA exponer en frontend - solo para server-side)
  clerkSecretKey:
    (typeof process !== 'undefined' && process.env?.CLERK_SECRET_KEY) ||
    window.CLERK_SECRET_KEY ||
    localStorage.getItem('CLERK_SECRET_KEY') ||
    '',

  // App URL
  appUrl:
    (typeof process !== 'undefined' && process.env?.APP_URL) ||
    window.APP_URL ||
    window.location.origin,

  // Environment
  env:
    (typeof process !== 'undefined' && process.env?.NODE_ENV) ||
    window.NODE_ENV ||
    'development',

  // Modo desarrollo
  isDev: () => config.env === 'development',
  isProd: () => config.env === 'production',
};

export default config;

// ===============================================
//   HELPER: Cargar configuración desde localStorage
// ===============================================

/**
 * Guarda configuración en localStorage para desarrollo
 * @param {object} values - { NEON_DATABASE_URL, CLERK_PUBLISHABLE_KEY, ... }
 */
export function saveConfigToStorage(values) {
  if (values.NEON_DATABASE_URL) {
    localStorage.setItem('NEON_DATABASE_URL', values.NEON_DATABASE_URL);
  }
  if (values.CLERK_PUBLISHABLE_KEY) {
    localStorage.setItem('CLERK_PUBLISHABLE_KEY', values.CLERK_PUBLISHABLE_KEY);
  }
  if (values.CLERK_SECRET_KEY) {
    localStorage.setItem('CLERK_SECRET_KEY', values.CLERK_SECRET_KEY);
  }
  if (values.APP_URL) {
    localStorage.setItem('APP_URL', values.APP_URL);
  }
}

/**
 * Limpia la configuración de localStorage
 */
export function clearConfigStorage() {
  localStorage.removeItem('NEON_DATABASE_URL');
  localStorage.removeItem('CLERK_PUBLISHABLE_KEY');
  localStorage.removeItem('CLERK_SECRET_KEY');
  localStorage.removeItem('APP_URL');
}

/**
 * Obtiene la configuración actual
 * @returns {object}
 */
export function getCurrentConfig() {
  return {
    neonUrl: config.neonUrl,
    clerkPubKey: config.clerkPubKey,
    appUrl: config.appUrl,
    env: config.env,
  };
}

// ===============================================
//   INICIALIZACIÓN AUTOMÁTICA
// ===============================================

// Hacer config disponible globalmente
window.ADDBOX = window.ADDBOX || {};
window.ADDBOX.config = config;

console.log('✅ env.js cargado. Config:', getCurrentConfig());