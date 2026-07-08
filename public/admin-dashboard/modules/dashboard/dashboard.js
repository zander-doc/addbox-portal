/* ============================================================
   DASHBOARD MODULE — ADDBOX
   Conectado a Neon PostgreSQL + Clerk Auth
   Versión sin módulos ES6 para compatibilidad
============================================================ */

// Importar servicios de Neon y autenticación
import { query } from "../../services/neon-client.js";
import { requireAuth } from "../../services/auth-guard.js";
import { obtenerProductosCriticos } from "../../services/stockAlertService.js";

// Esperar a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

/* ============================
   CONTROL DE ACCESO POR ROL
============================ */
async function checkAccess() {
    // Verificar autenticación con auth-guard
    if (!await requireAuth()) {
        return false;
    }
    
    // Ocultar botones admin si no es admin
    const session = getSession();
    if (session && session.rol !== "admin") {
        document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
    
    return true;
}

const rol = sessionStorage.getItem("rol");

// Ocultar módulos para roles sin permisos
if (rol !== "administrador" && rol !== "dueno") {
    const adminMenu = document.getElementById("menu-admin");
    if (adminMenu) adminMenu.style.display = "none";
}

if (rol === "almacenista") {
    const presupuestos = document.getElementById("menu-presupuestos");
    const obras = document.getElementById("menu-obras");
    const reportes = document.getElementById("menu-reportes");
    if (presupuestos) presupuestos.style.display = "none";
    if (obras) obras.style.display = "none";
    if (reportes) reportes.style.display = "none";
}

if (rol === "supervisor") {
    const movimientos = document.getElementById("menu-movimientos");
    if (movimientos) movimientos.style.display = "none";
}

/* ============================
   INICIALIZACIÓN
============================ */
async function initDashboard() {
    console.log("Dashboard inicializado con Neon PostgreSQL");

    // Verificar autenticación
    if (!await checkAccess()) {
        return;
    }

    try {
        await cargarIndicadores();
        await cargarMovimientosRecientes();
        await cargarAlertasStock();
        await cargarIndicadoresDevoluciones();
        await cargarGraficaMovimientosSemana();
        await cargarGraficaEntradasSalidas();

        // Nota: Realtime no disponible en Neon HTTP API
        // Se actualiza manualmente o con polling si es necesario
    } catch (error) {
        console.error("Error inicializando dashboard:", error);
        mostrarNotificacion("Error cargando dashboard", "error");
    }
}

/* ============================
   INDICADORES
============================ */
async function cargarIndicadores() {
    try {
        // 1. Total de productos
        const totalProductos = await obtenerTotalProductos();
        actualizarIndicador("totalProductos", totalProductos);
        
        // 2. Stock total
        const stockTotal = await obtenerStockTotal();
        actualizarIndicador("stockTotal", stockTotal);
        
        // 3. Movimientos hoy
        const movimientosHoy = await obtenerMovimientosHoy();
        actualizarIndicador("movimientosHoy", movimientosHoy);
        
        // 4. Total usuarios
        const totalUsuarios = await obtenerTotalUsuarios();
        actualizarIndicador("totalUsuarios", totalUsuarios);

        // 5. Valor del inventario
        const valorInventario = await obtenerValorInventario();
        actualizarIndicador("valorInventario", valorInventario);
        
    } catch (error) {
        console.error("Error cargando indicadores:", error);
        mostrarNotificacion("Error cargando indicadores", "error");
    }
}

function actualizarIndicador(id, valor) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Indicador no encontrado: ${id}`);
        return;
    }
    el.textContent = valor ?? "—";
}

/* ============================
   FUNCIONES DE SERVICIO
============================ */
async function obtenerTotalProductos() {
    try {
        const result = await query('SELECT COUNT(*) as count FROM productos WHERE activo = true');
        return parseInt(result[0]?.count) || 0;
    } catch (error) {
        console.error("Error obteniendo total de productos:", error);
        return "Error";
    }
}

async function obtenerStockTotal() {
    try {
        const result = await query('SELECT SUM(stock) as total FROM productos WHERE activo = true');
        return parseInt(result[0]?.total) || 0;
    } catch (error) {
        console.error("Error obteniendo stock total:", error);
        return "Error";
    }
}

async function obtenerMovimientosHoy() {
    try {
        const result = await query(`
            SELECT COUNT(*) as count 
            FROM movimientos 
            WHERE creado_en >= CURRENT_DATE 
            AND creado_en < CURRENT_DATE + INTERVAL '1 day'
        `);
        return parseInt(result[0]?.count) || 0;
    } catch (error) {
        console.error("Error obteniendo movimientos hoy:", error);
        return "Error";
    }
}

async function obtenerTotalUsuarios() {
    try {
        const result = await query('SELECT COUNT(*) as count FROM usuarios WHERE estado = \'activo\'');
        return parseInt(result[0]?.count) || 0;
    } catch (error) {
        console.error("Error obteniendo total de usuarios:", error);
        return "Error";
    }
}

async function obtenerValorInventario() {
    try {
        const result = await query('SELECT SUM(stock * costo_prom) as total FROM productos WHERE activo = true');
        const total = parseFloat(result[0]?.total) || 0;
        
        // Formatear como moneda
        if (total >= 1000000) {
            return `$${(total / 1000000).toFixed(2)}M`;
        } else if (total >= 1000) {
            return `$${(total / 1000).toFixed(1)}K`;
        } else {
            return `$${total.toFixed(2)}`;
        }
    } catch (error) {
        console.error("Error obteniendo valor inventario:", error);
        return "Error";
    }
}

/* ============================
   INDICADORES DE DEVOLUCIONES
============================ */
async function cargarIndicadoresDevoluciones() {
    try {
        // Importar dinámicamente el servicio de devoluciones
        const { obtenerResumenDevoluciones } = await import("../devoluciones/devoluciones.service.js");
        const resumen = await obtenerResumenDevoluciones(7);

        // Card "Materiales fuera"
        const elFuera = document.getElementById("materialesFuera");
        if (elFuera) elFuera.textContent = resumen.totalFuera || 0;

        // Card "Materiales vencidos" con indicador rojo si > 0
        const elVencidos = document.getElementById("materialesVencidos");
        if (elVencidos) {
            elVencidos.textContent = resumen.vencidos || 0;
            const cardVencidos = elVencidos.closest(".card-resumen") || elVencidos.parentElement;
            if (cardVencidos && resumen.vencidos > 0) {
                cardVencidos.classList.add("peligro");
            } else if (cardVencidos) {
                cardVencidos.classList.remove("peligro");
            }
        }
    } catch (error) {
        console.warn("[Dashboard] No se pudieron cargar indicadores de devoluciones:", error);
    }
}

/* ============================
   REALTIME — ACTUALIZACIÓN EN VIVO
   NOTA: Neon HTTP API no soporta realtime
   Se actualiza manualmente o con polling si es necesario
============================ */
let realtimeInterval = null;

function iniciarRealtimeDashboard() {
    // Neon no soporta realtime via HTTP API
    // Opcional: Implementar polling cada 30 segundos
    // realtimeInterval = setInterval(refrescarDashboard, 30000);
    
    console.log("Dashboard: realtime no disponible en Neon HTTP API");
}

// Debounce para evitar múltiples refrescos simultáneos
let refrescoPendiente = null;
function refrescarDashboard() {
    if (refrescoPendiente) clearTimeout(refrescoPendiente);
    refrescoPendiente = setTimeout(async () => {
        await cargarIndicadores();
        await cargarAlertasStock();
        refrescoPendiente = null;
    }, 500);
}

// Limpiar interval al salir de la página
window.addEventListener("beforeunload", () => {
    if (realtimeInterval) {
        clearInterval(realtimeInterval);
        realtimeInterval = null;
    }
});

/* ============================
   ALERTAS DE STOCK CRÍTICO
============================ */
async function cargarAlertasStock() {
    try {
        const productosCriticos = await obtenerProductosCriticos();

        // Actualizar badge de stock crítico en el indicador
        const badgeEl = document.getElementById("stockCriticoBadge");
        if (badgeEl) {
            if (productosCriticos.length > 0) {
                badgeEl.textContent = productosCriticos.length;
                badgeEl.style.display = "inline-flex";
            } else {
                badgeEl.style.display = "none";
            }
        }

        // Renderizar panel de productos críticos
        const panelEl = document.getElementById("panelStockCritico");
        if (!panelEl) {
            console.warn("Elemento #panelStockCritico no encontrado");
            return;
        }

        if (productosCriticos.length === 0) {
            panelEl.innerHTML = `
                <p class="small" style="color: var(--color-success, #00b894);">
                    <i class="fa fa-check-circle"></i> No hay productos en estado crítico
                </p>`;
            return;
        }

        const listaHTML = productosCriticos
            .slice(0, 10) // Mostrar máximo 10 en el dashboard
            .map(p => `
                <tr>
                    <td>${p.descripcion}</td>
                    <td>${p.obra}</td>
                    <td style="color: #d63031; font-weight: bold;">${p.cantidad}</td>
                    <td>${p.umbral_critico}</td>
                </tr>
            `)
            .join("");

        panelEl.innerHTML = `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Obra</th>
                        <th>Stock Actual</th>
                        <th>Umbral Crítico</th>
                    </tr>
                </thead>
                <tbody>${listaHTML}</tbody>
            </table>
            ${productosCriticos.length > 10 ? `<p class="small">Mostrando 10 de ${productosCriticos.length} productos críticos</p>` : ""}
        `;
    } catch (error) {
        console.error("Error cargando alertas de stock:", error);
    }
}

/* ============================
   MOVIMIENTOS RECIENTES
============================ */
async function cargarMovimientosRecientes() {
    try {
        const data = await query(`
            SELECT m.id, m.cantidad, m.tipo, m.creado_en,
                   p.nombre as producto_nombre, p.name as producto_name,
                   o.nombre as obra_nombre, o.name as obra_name
            FROM movimientos m
            LEFT JOIN productos p ON p.id = m.producto_id
            LEFT JOIN obras o ON o.id = m.obra_id
            ORDER BY m.creado_en DESC
            LIMIT 10
        `);

        const tbody = document.getElementById("movimientosTableBody");

        if (!tbody) {
            console.warn("Elemento movimientosTableBody no encontrado");
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No hay movimientos recientes</td></tr>`;
            return;
        }

        tbody.innerHTML = data
            .map(m => `
                <tr>
                    <td>${m.producto_nombre || m.producto_name || "—"}</td>
                    <td>${m.tipo}</td>
                    <td>${m.cantidad}</td>
                    <td>${m.obra_nombre || m.obra_name || "—"}</td>
                    <td>${new Date(m.creado_en).toLocaleString()}</td>
                </tr>
            `)
            .join("");
    } catch (error) {
        console.error("Error en cargarMovimientosRecientes:", error);
        const tbody = document.getElementById("movimientosTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5">Error cargando movimientos recientes</td></tr>`;
        }
    }
}

/* ============================
   NOTIFICACIONES
============================ */
function mostrarNotificacion(msg, tipo = "info") {
    const cont = document.getElementById("notificaciones");
    if (!cont) return;

    cont.innerHTML = `<p class="${tipo}">${msg}</p>`;
}

/* ============================
   LOGOUT
============================ */
function logout() {
    window.location.href = "login.html";
}

/* ============================================================
   GRAFICAS PREMIUM — ADDBOX
============================================================ */

// 1. Movimientos por día (últimos 7 días)
async function cargarGraficaMovimientosSemana() {
    try {
        // Verificar si ApexCharts está disponible
        if (typeof ApexCharts === 'undefined') {
            console.warn("ApexCharts no está disponible. Cargando desde CDN...");
            await cargarApexCharts();
        }

        const hoy = new Date();
        const hace7 = new Date();
        hace7.setDate(hoy.getDate() - 6);

        const desde = hace7.toISOString();
        const hasta = hoy.toISOString();

        const data = await query(`
            SELECT DATE(creado_en) as fecha, COUNT(*) as total
            FROM movimientos
            WHERE creado_en >= $1 AND creado_en <= $2
            GROUP BY DATE(creado_en)
            ORDER BY fecha ASC
        `, [desde, hasta]);

        // Agrupar por día
        const dias = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(hace7);
            d.setDate(hace7.getDate() + i);
            const key = d.toISOString().split("T")[0];
            dias[key] = 0;
        }

        data.forEach(m => {
            const key = m.fecha;
            if (dias[key] !== undefined) dias[key] = parseInt(m.total) || 0;
        });

        const labels = Object.keys(dias);
        const valores = Object.values(dias);

        const chartElement = document.querySelector("#chartMovimientosSemana");
        if (!chartElement) {
            console.warn("Elemento #chartMovimientosSemana no encontrado");
            return;
        }

        const options = {
            chart: { type: "line", height: 300, toolbar: { show: false } },
            series: [{ name: "Movimientos", data: valores }],
            xaxis: { categories: labels },
            colors: ["#6c5ce7"],
            stroke: { width: 3, curve: "smooth" },
            markers: { size: 4, colors: ["#a29bfe"] },
            grid: { borderColor: "rgba(255,255,255,0.1)" }
        };

        new ApexCharts(chartElement, options).render();
    } catch (error) {
        console.error("Error en cargarGraficaMovimientosSemana:", error);
    }
}

// 2. Entradas vs Salidas
async function cargarGraficaEntradasSalidas() {
    try {
        // Verificar si ApexCharts está disponible
        if (typeof ApexCharts === 'undefined') {
            console.warn("ApexCharts no está disponible");
            return;
        }

        const data = await query(`
            SELECT tipo, COUNT(*) as total
            FROM movimientos
            WHERE tipo IN ('entrada', 'salida')
            GROUP BY tipo
        `);

        const entradas = data.find(m => m.tipo === "entrada")?.total || 0;
        const salidas = data.find(m => m.tipo === "salida")?.total || 0;

        const chartElement = document.querySelector("#chartEntradasSalidas");
        if (!chartElement) {
            console.warn("Elemento #chartEntradasSalidas no encontrado");
            return;
        }

        const options = {
            chart: { type: "donut", height: 300 },
            labels: ["Entradas", "Salidas"],
            series: [parseInt(entradas), parseInt(salidas)],
            colors: ["#00d2ff", "#ff7675"],
            legend: { position: "bottom" }
        };

        new ApexCharts(chartElement, options).render();
    } catch (error) {
        console.error("Error en cargarGraficaEntradasSalidas:", error);
    }
}

// Función para cargar ApexCharts desde CDN si no está disponible
function cargarApexCharts() {
    return new Promise((resolve, reject) => {
        if (typeof ApexCharts !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Hacer funciones disponibles globalmente
window.logout = logout;
window.cargarMovimientosRecientes = cargarMovimientosRecientes;