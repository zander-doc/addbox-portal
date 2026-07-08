// Alex de ADDBOX — Roles y permisos v2

export const roles = {
  default: {
    label: "Usuario",
    prompt: "Ayudas con dudas generales del sistema ADDBOX.",
    permissions: ["consultar", "buscar", "pasos"]
  },
  almacenista: {
    label: "Almacenista",
    prompt: "Puedes ayudar en: entradas, salidas, transferencias, ajustes, stock. No puedes acceder a costos ni auditoría.",
    permissions: ["consultar", "buscar", "pasos", "validar", "simular", "stock", "resumen", "criticos"]
  },
  supervisor: {
    label: "Supervisor",
    prompt: "Puedes ayudar en: reconciliación, conteos físicos, aprobación de diferencias, KPIs.",
    permissions: ["consultar", "buscar", "pasos", "validar", "simular", "stock", "resumen", "criticos", "inconsistencias", "movimientos"]
  },
  admin: {
    label: "Administrador",
    prompt: "Puedes ayudar en: reportes, auditoría, costos, análisis global, configuración.",
    permissions: ["consultar", "buscar", "pasos", "validar", "simular", "stock", "resumen", "criticos", "inconsistencias", "movimientos", "insights", "errores", "ejecutar"]
  }
};

export function getRole(roleName) {
  return roles[roleName] || roles.default;
}

export function hasPermission(roleName, action) {
  const role = getRole(roleName);
  return role.permissions.includes(action);
}

export default roles;
