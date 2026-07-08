/* ============================================================
LOGIN SERVICE — ADDBOX
Migrado de Supabase Auth → Clerk Auth + Neon PostgreSQL
============================================================ */

import { signIn, signUp, signOut } from '../../services/auth-clerk.js';

export async function login(email, password) {
  try {
    const response = await signIn(email, password);
    if (response.error) throw response.error;

    // Guardar sesión en localStorage
    localStorage.setItem('user', JSON.stringify(response.user));
    localStorage.setItem('token', response.token);

    return { success: true, user: response.user };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: error.message };
  }
}

export async function register(email, password, fullName) {
  try {
    const response = await signUp(email, password, { full_name: fullName });
    if (response.error) throw response.error;

    return { success: true, user: response.user };
  } catch (error) {
    console.error('Error en registro:', error);
    return { success: false, error: error.message };
  }
}

export async function logout() {
  try {
    await signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return { success: true };
  } catch (error) {
    console.error('Error en logout:', error);
    return { success: false, error: error.message };
  }
}