/* ============================================================
   MAIN.JS — ADDBOX
   Funciones globales, dark mode y helpers
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initGlobalEvents();
});

/* ============================
   DARK MODE
============================ */
function initTheme() {
    const root = document.documentElement;
    const btn = document.getElementById("btn-toggle-theme");

    // Cargar preferencia guardada
    const saved = localStorage.getItem("theme");
    if (saved) {
        root.setAttribute("data-theme", saved);
    }

    if (btn) {
        btn.addEventListener("click", () => {
            const current = root.getAttribute("data-theme") || "light";
            const next = current === "light" ? "dark" : "light";
            root.setAttribute("data-theme", next);
            localStorage.setItem("theme", next);
        });
    }
}

/* ============================
   EVENTOS GLOBALES
============================ */
function initGlobalEvents() {
    console.log("Eventos globales inicializados");
}

/* ============================
   HELPERS GLOBALES
============================ */
export function $(selector) {
    return document.querySelector(selector);
}

export function $all(selector) {
    return document.querySelectorAll(selector);
}
