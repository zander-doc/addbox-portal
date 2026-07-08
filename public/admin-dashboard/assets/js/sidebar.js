/* ============================================================
   SIDEBAR DINÁMICO POR ROL — ADDBOX PRO
   Carga el menú lateral según el rol del usuario
   Uso: <div id="sidebar-container"></div>
         <script src="/admin-dashboard/assets/js/sidebar.js"></script>
============================================================ */

// Estructura de menú por rol
const MENU_CONFIG = {
  jefe: [
    { section: "Inventario", items: [
      { label: "Dashboard", icon: "fa-gauge", href: "/admin-dashboard/modules/dashboard/dashboard.html" },
      { label: "Obras", icon: "fa-building", href: "/admin-dashboard/modules/obras/obras.html" },
      { label: "Productos", icon: "fa-box", href: "/admin-dashboard/modules/productos/productos.html" },
      { label: "Movimientos", icon: "fa-right-left", href: "/admin-dashboard/modules/movimientos/movimientos.html" },
      { label: "Documentos", icon: "fa-file-contract", href: "/admin-dashboard/modules/documentos/documentos_inventario.html" },
      { label: "Devoluciones", icon: "fa-rotate-left", href: "/admin-dashboard/modules/devoluciones/registrar_devolucion.html" },
      { label: "Inventario Valorado", icon: "fa-file-invoice-dollar", href: "/admin-dashboard/modules/inventario-valorado/inventario-valorado.html" },
      { label: "Reportes Devoluciones", icon: "fa-clipboard-list", href: "/admin-dashboard/modules/reportes/devoluciones.html" },
    ]},
    { section: "Inventario Tiempo Real", items: [
      { label: "Stock por Obra", icon: "fa-warehouse", href: "/admin-dashboard/modules/inventario/inventario.html" },
      { label: "Control de Inventario", icon: "fa-shield-halved", href: "/admin-dashboard/modules/inventario/reconciliacion.html" },
    ]},
    { section: "Importación y Configuración", items: [
      { label: "Importar Productos CSV", icon: "fa-file-csv", href: "/admin-dashboard/importar-productos.html" },
      { label: "Tasa de Cambio USD→VES", icon: "fa-exchange-alt", href: "/admin-dashboard/config-tasa-cambio.html" },
    ]},
    { section: "Administración", items: [
      { label: "Usuarios", icon: "fa-user", href: "/admin-dashboard/modules/usuarios/usuarios.html" },
      { label: "Roles", icon: "fa-id-badge", href: "/admin-dashboard/modules/admin/roles.html" },
      { label: "Configuración", icon: "fa-gear", href: "/admin-dashboard/modules/admin/configuracion.html" },
    ]},
    // ═══ MÓDULOS PREMIUM (activar cuando el cliente pague) ═══
    // { section: "Obras", items: [
    //   { label: "Partidas", icon: "fa-list-check", href: "/admin-dashboard/modules/partidas/partidas.html" },
    //   { label: "Presupuestos", icon: "fa-calculator", href: "/admin-dashboard/modules/presupuesto/presupuesto.html" },
    //   { label: "Enviar", icon: "fa-paper-plane", href: "/admin-dashboard/modules/presupuesto/enviar_presupuesto.html" },
    //   { label: "Fotos", icon: "fa-image", href: "/admin-dashboard/modules/fotos/fotos.html" },
    // ]},
    // { section: "Reportes", items: [
    //   { label: "Inventario", icon: "fa-chart-column", href: "/admin-dashboard/modules/reportes/inventario.html" },
    //   { label: "Obras", icon: "fa-chart-pie", href: "/admin-dashboard/modules/reportes/obras.html" },
    //   { label: "Ejecutivo", icon: "fa-chart-line", href: "/admin-dashboard/modules/reportes/ejecutivo.html" },
    // ]},
    // { section: "Recursos Humanos", items: [
    //   { label: "RRHH Panel", icon: "fa-users", href: "/admin-dashboard/modules/rrhh/rrhh.html" },
    //   { label: "Contratación", icon: "fa-clipboard-list", href: "/admin-dashboard/modules/rrhh/contratacion.html" },
    //   { label: "Asistencias", icon: "fa-clock", href: "/admin-dashboard/modules/rrhh/asistencias.html" },
    //   { label: "Nómina", icon: "fa-money-bill", href: "/admin-dashboard/modules/rrhh/nomina.html" },
    //   { label: "Rendimiento", icon: "fa-chart-line", href: "/admin-dashboard/modules/rrhh/rendimiento.html" },
    // ]},
  ],
  admin: [
    { section: "Inventario", items: [
      { label: "Dashboard", icon: "fa-gauge", href: "/admin-dashboard/modules/dashboard/dashboard.html" },
      { label: "Obras", icon: "fa-building", href: "/admin-dashboard/modules/obras/obras.html" },
      { label: "Productos", icon: "fa-box", href: "/admin-dashboard/modules/productos/productos.html" },
      { label: "Movimientos", icon: "fa-right-left", href: "/admin-dashboard/modules/movimientos/movimientos.html" },
    ]},
    { section: "Inventario Tiempo Real", items: [
      { label: "Stock por Obra", icon: "fa-warehouse", href: "/admin-dashboard/modules/inventario/inventario.html" },
      { label: "Control de Inventario", icon: "fa-shield-halved", href: "/admin-dashboard/modules/inventario/reconciliacion.html" },
      { label: "Reportes Inventario", icon: "fa-file-chart-column", href: "/admin-dashboard/modules/inventario/reportes-inventario.html" },
    ]},
    { section: "Importación y Configuración", items: [
      { label: "Importar Productos CSV", icon: "fa-file-csv", href: "/admin-dashboard/importar-productos.html" },
      { label: "Tasa de Cambio USD→VES", icon: "fa-exchange-alt", href: "/admin-dashboard/config-tasa-cambio.html" },
    ]},
    { section: "Obras", items: [
      { label: "Partidas", icon: "fa-list-check", href: "/admin-dashboard/modules/partidas/partidas.html" },
      { label: "Presupuestos", icon: "fa-calculator", href: "/admin-dashboard/modules/presupuesto/presupuesto.html" },
    ]},
    { section: "Reportes", items: [
      { label: "Inventario", icon: "fa-chart-column", href: "/admin-dashboard/modules/reportes/inventario.html" },
      { label: "Obras", icon: "fa-chart-pie", href: "/admin-dashboard/modules/reportes/obras.html" },
      { label: "Devoluciones", icon: "fa-rotate-left", href: "/admin-dashboard/modules/reportes/devoluciones.html" },
    ]},
    { section: "Administración", items: [
      { label: "Usuarios", icon: "fa-user", href: "/admin-dashboard/modules/usuarios/usuarios.html" },
      { label: "Invitaciones", icon: "fa-envelope", href: "/admin-dashboard/modules/admin/invitaciones/invitaciones.html" },
    ]},
  ],
  rrhh: [
    { section: "Principal", items: [
      { label: "Dashboard", icon: "fa-gauge", href: "/admin-dashboard/modules/dashboard/dashboard.html" },
    ]},
    { section: "Recursos Humanos", items: [
      { label: "RRHH Panel", icon: "fa-users", href: "/admin-dashboard/modules/rrhh/rrhh.html" },
      { label: "Contratación", icon: "fa-clipboard-list", href: "/admin-dashboard/modules/rrhh/contratacion.html" },
      { label: "Asistencias", icon: "fa-clock", href: "/admin-dashboard/modules/rrhh/asistencias.html" },
      { label: "Nómina", icon: "fa-money-bill", href: "/admin-dashboard/modules/rrhh/nomina.html" },
      { label: "Rendimiento", icon: "fa-chart-line", href: "/admin-dashboard/modules/rrhh/rendimiento.html" },
      { label: "Autopedidos", icon: "fa-cart-shopping", href: "/admin-dashboard/modules/rrhh/autopedidos.html" },
    ]},
  ],
  almacenista: [
    { section: "Inventario", items: [
      { label: "Dashboard", icon: "fa-gauge", href: "/admin-dashboard/modules/dashboard/dashboard.html" },
      { label: "Productos", icon: "fa-box", href: "/admin-dashboard/modules/productos/productos.html" },
      { label: "Movimientos", icon: "fa-right-left", href: "/admin-dashboard/modules/movimientos/movimientos.html" },
      { label: "Documentos", icon: "fa-file-contract", href: "/admin-dashboard/modules/documentos/documentos_inventario.html" },
      { label: "Devoluciones", icon: "fa-rotate-left", href: "/admin-dashboard/modules/devoluciones/registrar_devolucion.html" },
    ]},
    { section: "Inventario Tiempo Real", items: [
      { label: "Stock por Obra", icon: "fa-warehouse", href: "/admin-dashboard/modules/inventario/inventario.html" },
    ]},
  ],
  invitado: [
    { section: "Autoservicio", items: [
      { label: "Autopedidos", icon: "fa-cart-shopping", href: "/admin-dashboard/modules/rrhh/autopedidos.html" },
    ]},
  ],
};

// Obtener rol del usuario
function getUserRole() {
  return sessionStorage.getItem("rol") || "invitado";
}

// Construir HTML del sidebar
function buildSidebarHTML(rol) {
  const menu = MENU_CONFIG[rol] || MENU_CONFIG["invitado"];
  const currentPath = window.location.pathname;
  const nombre = sessionStorage.getItem("nombre") || "Usuario";
  const email = sessionStorage.getItem("email") || "correo@addbox.com";
  const rolDisplay = (sessionStorage.getItem("rol") || "usuario").toUpperCase();
  const foto = sessionStorage.getItem("foto") || "";

  let avatarHTML = foto
    ? `<img src="${foto}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
    : `<i class="fa fa-user" style="font-size:28px; color:#9ca3af;"></i>`;

  let html = `
    <aside class="sidebar">
      <div class="sidebar-user">
        <div class="sidebar-avatar">
          ${avatarHTML}
        </div>
        <div class="sidebar-user-name">${nombre}</div>
        <div class="sidebar-user-role">${rolDisplay}</div>
        <div class="sidebar-user-email">${email}</div>
      </div>
      <div class="sidebar-logo">
        <h1 style="font-size: 14px;">ADDBOX</h1>
      </div>
      <ul class="sidebar-menu" style="gap: 8px;">
  `;

  menu.forEach(section => {
    html += `<li class="menu-title" style="font-size: 11px;">${section.section}</li>`;
    section.items.forEach(item => {
      const isActive = currentPath.includes(item.href.split("/").pop()) ? ' style="color: #6c5ce7;"' : '';
      const badgeId = item.label === "Devoluciones" ? ' id="sidebar-badge-devoluciones"' : '';
      const badgeHTML = item.label === "Devoluciones" ? '<span class="sidebar-badge-vencidos" id="sidebar-badge-vencidos" style="display:none;background:#ef4444;color:#fff;font-size:10px;font-weight:bold;border-radius:10px;padding:1px 6px;margin-left:6px;"></span>' : '';
      html += `<li${badgeId}><a href="${item.href}"${isActive}><i class="fa ${item.icon}" style="font-size: 16px;"></i> ${item.label}${badgeHTML}</a></li>`;
    });
  });

  html += `</ul></aside>`;
  return html;
}

// Cargar sidebar en el contenedor
function loadSidebar() {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  const rol = getUserRole();
  container.innerHTML = buildSidebarHTML(rol);
  
  // Definir logout global → redirige al portal
  window.logout = function() {
    sessionStorage.clear();
    window.location.href = "/portal-autoservicio.html";
  };

  // Avatar click → subir foto
  const avatarEl = document.querySelector(".sidebar-avatar");
  if (avatarEl) {
    avatarEl.style.cursor = "pointer";
    avatarEl.title = "Clic para cambiar foto";
    avatarEl.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const userId = sessionStorage.getItem("id") || "demo";
          const db = window.supabaseClient;
          if (!db) { alert("Supabase no disponible"); return; }

          const fileExt = file.name.split(".").pop();
          const fileName = `wmljsp_1/${userId}.${fileExt}`;

          const { error: uploadError } = await db.storage
            .from("AVATAR")
            .upload(fileName, file, { upsert: true });

          if (uploadError) { alert("Error subiendo: " + uploadError.message); return; }

          const { publicURL } = db.storage.from("AVATAR").getPublicUrl(fileName);

          // Guardar en DB y session
          await db.from("usuarios").update({ avatar_url: publicURL }).eq("id", userId);
          sessionStorage.setItem("foto", publicURL);

          // Actualizar avatar visual
          avatarEl.innerHTML = `<img src="${publicURL}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } catch (err) {
          console.error("Error subiendo avatar:", err);
          alert("Error al subir la foto");
        }
      };
      input.click();
    });
  }
}

// Auto-ejecutar al cargar
document.addEventListener("DOMContentLoaded", () => {
  // Ocultar contenido hasta validar
  document.body.classList.add("hidden-until-auth");
  
  loadSidebar();
  actualizarBadgeDevoluciones();
  
  // Mostrar contenido (si llegó aquí, la página es accesible)
  document.body.classList.remove("hidden-until-auth");
});

/**
 * Actualiza el badge rojo del sidebar junto al ítem "Devoluciones"
 * mostrando el conteo de materiales vencidos.
 */
async function actualizarBadgeDevoluciones() {
  const badge = document.getElementById("sidebar-badge-vencidos");
  if (!badge) return;

  try {
    const { obtenerResumenDevoluciones } = await import("../../modules/devoluciones/devoluciones.service.js");
    const resumen = await obtenerResumenDevoluciones(7);
    
    if (resumen.vencidos > 0) {
      badge.textContent = resumen.vencidos;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  } catch (err) {
    // Si falla (módulo no disponible, etc.), ocultar badge silenciosamente
    badge.style.display = "none";
  }
}

// Exponer para que otros módulos puedan refrescar el badge
window.actualizarBadgeDevoluciones = actualizarBadgeDevoluciones;

// ═══════════════════════════════════════════════════════════════════════════════
// ALEX IA — Inyección global en todos los módulos
// ═══════════════════════════════════════════════════════════════════════════════

(function inyectarAlexIA() {
  // No inyectar si ya existe (ej: dashboard que lo tiene manual)
  if (document.getElementById("alexPanel") || document.getElementById("alexButton")) return;

  // Inyectar CSS
  if (!document.querySelector('link[href*="chat-widget.css"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/src/ai/alex/chat-widget.css";
    document.head.appendChild(css);
  }

  // Inyectar HTML del panel
  const alexHTML = `
    <div id="alexPanel" class="alex-panel">
      <div class="alex-header">
        <div class="alex-header-avatar">
          <img src="/admin-dashboard/assets/img/ALEX-IA.png" alt="Alex IA" />
          <span class="alex-status-dot"></span>
        </div>
        <div class="alex-header-info">
          <div class="alex-name">Alex IA</div>
          <div class="alex-subtitle">Copiloto de Inventario</div>
        </div>
        <button id="alexClose">&times;</button>
      </div>
      <div class="alex-shortcuts">
        <button class="alex-shortcut" data-msg="resumen inventario">📊 Resumen</button>
        <button class="alex-shortcut" data-msg="productos críticos">⚠️ Críticos</button>
        <button class="alex-shortcut" data-msg="qué puedo hacer">🧭 Ayuda</button>
        <button class="alex-shortcut" data-msg="pasos transferencia">📋 Transferencia</button>
      </div>
      <div id="alexMessages" class="alex-messages"></div>
      <div class="alex-input-area">
        <input id="alexInput" type="text" placeholder="Pregunta a Alex IA..." autocomplete="off" />
        <button id="alexSend">Enviar</button>
      </div>
    </div>
    <button id="alexButton" class="alex-button" aria-label="Abrir Alex IA"></button>
  `;
  document.body.insertAdjacentHTML("beforeend", alexHTML);

  // Detectar usuario
  try {
    const raw = localStorage.getItem("supabase.auth.token");
    if (raw) {
      const session = JSON.parse(raw);
      const user = session?.currentSession?.user;
      if (user) {
        window.userId = user.id;
        window.userRole = user.user_metadata?.role || "admin";
        window.userName = user.user_metadata?.nombre || user.email;
      }
    }
  } catch(e) {}
  if (!window.userId) window.userId = "admin-dashboard-user";
  if (!window.userRole) window.userRole = sessionStorage.getItem("rol") || "admin";

  // Inyectar JS del widget
  if (!document.querySelector('script[src*="chat-widget.js"]')) {
    const script = document.createElement("script");
    script.src = "/src/ai/alex/chat-widget.js";
    document.body.appendChild(script);
  }
})();
