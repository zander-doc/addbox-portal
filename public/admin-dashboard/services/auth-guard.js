// ===============================================
//   AUTH GUARD — ADDBOX
//   Verificación de autenticación y roles
//   Basado en Clerk Auth
// ===============================================

import { getCurrentUser } from './auth-clerk.js';

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/admin-dashboard/inicio-de-sesion.html';
    return false;
  }

  return true;
}

export async function requireRole(allowedRoles) {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = '/admin-dashboard/inicio-de-sesion.html';
    return false;
  }

  if (!allowedRoles.includes(user.role)) {
    window.location.href = '/admin-dashboard/acceso-denegado.html';
    return false;
  }

  return true;
}