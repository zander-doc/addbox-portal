import { db } from "./neon-client.js";

export async function checkInstallation() {
  try {
    const { data, error } = await db.from("instalacion").select("*").single();

    if (error) {
      console.warn("Error leyendo instalación:", error);
      return true; // Permitir acceso por defecto
    }

    if (data && data.first_run === true) {
      // Primera ejecución - redirigir a configuración
      window.location.href = "/admin-dashboard/instalacion.html";
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Error en checkInstallation:", error);
    return true; // Permitir acceso por defecto
  }
}