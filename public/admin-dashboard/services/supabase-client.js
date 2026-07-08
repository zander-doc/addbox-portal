// ===============================================
//   SUPABASE CLIENT — ADDBOX (REDIRECT TO NEON)
//   Este archivo ahora es un puente de compatibilidad
//   Redirige todas las llamadas a neon-client.js
// ===============================================

import { db, query, configureNeon, testConnection } from './neon-client.js';
import { initClerk, getCurrentUser, isAuthenticated, onAuthChange, signIn, signUp } from './auth-clerk.js';

// Re-exportar todo desde neon-client
export { db, query, configureNeon, testConnection };
export { initClerk, getCurrentUser, isAuthenticated, onAuthChange, signIn, signUp };

// Mantener compatibilidad global
window.supabaseClient = db;
window.supabase = db;
window.db = db;

// Inicializar automáticamente si hay configuración guardada
const savedNeonUrl = localStorage.getItem('NEON_DATABASE_URL');
const savedClerkKey = localStorage.getItem('CLERK_PUBLISHABLE_KEY');

if (savedNeonUrl) {
  configureNeon(savedNeonUrl);
}

if (savedClerkKey) {
  initClerk(savedClerkKey);
}

console.log('✅ supabase-client.js → redirigiendo a neon-client.js + clerk-auth.js');
console.log('   ℹ️  Las llamadas a supabase.from() ahora usan db.from() con Neon PostgreSQL');
console.log('   ℹ️  La autenticación ahora usa Clerk en lugar de Supabase Auth');