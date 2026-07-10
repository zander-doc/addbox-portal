// ===============================================
//   ENV CONFIG — ADDBOX
//   Configuración de variables de entorno
//   Soporta: Node.js (process.env) y Browser (window/localStorage)
// ===============================================

/**
 * Configuración centralizada de variables de entorno
 * 
 * ═══════════════════════════════════════════════════════════════
 * CONFIGURACIÓN EN PRODUCCIÓN (Cloudflare Pages):
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. Ve a Cloudflare Pages → Settings → Environment Variables
 * 2. Agrega las siguientes variables:
 *    - NEON_DATABASE_URL: URL de conexión a Neon PostgreSQL
 *    - CLERK_PUBLISHABLE_KEY: Key pública de Clerk (pk_test_...)
 *    - CLERK_SECRET_KEY: Key secreta de Clerk (solo server-side)
 *    - APP_URL: URL de la aplicación (opcional)
 * 
 * ═══════════════════════════════════════════════════════════════
 * CONFIGURACIÓN EN DESARROLLO:
 * ═══════════════════════════════════════════════════════════════
 * 
 * Opción 1: localStorage (recomendado para desarrollo)
 *   - Abre DevTools → Console
 *   - Ejecuta: saveConfigToStorage({ NEON_DATABASE_URL: '...', CLERK_PUBLISHABLE_KEY: '...' })
 * 
 * Opción 2: Window globals
 *   - En la consola: window.NEON_DATABASE_URL = '...'
 *   - En la consola: window.CLERK_PUBLISHABLE_KEY = '...'
 * 
 * ═══════════════════════════════════════════════════════════════
 */
export const config = {
  // Neon Database URL
  // Obtén tu URL en: https://neon.tech → Dashboard → Connection Details
  neonUrl:
    (typeof process !== 'undefined' && process.env?.NEON_DATABASE_URL) ||
    window.NEON_DATABASE_URL ||
    localStorage.getItem('NEON_DATABASE_URL') ||
    '',

  // Clerk Publishable Key (pública, segura para frontend)
  // Obtén tu key en: https://clerk.com → Dashboard → API Keys
  clerkPubKey:
    (typeof process !== 'undefined' && process.env?.CLERK_PUBLISHABLE_KEY) ||
    window.CLERK_PUBLISHABLE_KEY ||
    localStorage.getItem('CLERK_PUBLISHABLE_KEY') ||
    '',

  // Clerk Secret Key (NUNCA exponer en frontend - solo para server-side)
  // Esta key solo debe usarse en Cloudflare Workers o server-side
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
//   VALIDACIÓN DE CONFIGURACIÓN
// ===============================================

// Validar configuración al cargar el módulo
if (typeof window !== 'undefined') {
  if (!config.neonUrl) {
    console.error('❌ NEON_DATABASE_URL no configurada.');
    console.warn('💡 Configúrala en Cloudflare Pages → Settings → Environment Variables');
    console.warn('   O en desarrollo: saveConfigToStorage({ NEON_DATABASE_URL: "postgresql://..." })');
  }

  if (!config.clerkPubKey) {
    console.error('❌ CLERK_PUBLISHABLE_KEY no configurada.');
    console.warn('💡 Configúrala en Cloudflare Pages → Settings → Environment Variables');
    console.warn('   O en desarrollo: saveConfigToStorage({ CLERK_PUBLISHABLE_KEY: "pk_test_..." })');
  }

  if (config.neonUrl && config.clerkPubKey) {
    console.log('✅ Configuración cargada correctamente');
    console.log('   - Neon Database: Configurada');
    console.log('   - Clerk Auth: Configurada');
  }
}

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