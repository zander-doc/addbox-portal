/* ============================================================
   DASHBOARD — ADDBOX
   Requiere: window.supabaseClient (creado por supabase-simple.js)
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(initDashboard, 50);
});

async function initDashboard() {
    const db = window.supabaseClient;

    if (!db || typeof db.from !== "function") {
        console.error("❌ window.supabaseClient no disponible.");
        setNotification("Error: no se pudo conectar con la base de datos.", "error");
        return;
    }

    console.log("✅ Supabase client listo. Cargando dashboard...");
    setNotification("Cargando datos...", "info");

    await Promise.allSettled([
        cargarIndicadores(db),
        cargarMovimientosRecientes(db),
        cargarNotificacionesDB(db),
        cargarGraficas(db),
    ]);

    setNotification("Dashboard actualizado correctamente.", "success");
}

/* ============================
   INDICADORES
============================ */
async function cargarIndicadores(db) {
    try {
        // Productos totales
        const { count: totalProductos, error: e1 } = await db
            .from("productos")
            .select("*", { count: "exact", head: true });
        setEl("totalProductos", e1 ? "—" : totalProductos);

        // Stock total
        const { data: stockData, error: e2 } = await db
            .from("productos")
            .select("stock");
        if (!e2 && stockData) {
            setEl("stockTotal", stockData.reduce((s, p) => s + (p.stock || 0), 0));
        } else {
            setEl("stockTotal", "—");
        }

        // Movimientos hoy
        const hoy = new Date().toISOString().split("T")[0];
        const { count: movHoy, error: e3 } = await db
            .from("movimientos")
            .select("*", { count: "exact" })
            .gte("creado_en", `${hoy}T00:00:00`)
            .lte("creado_en", `${hoy}T23:59:59`);
        setEl("movimientosHoy", e3 ? "—" : movHoy);

        // Usuarios — tabla existe pero RLS puede bloquear; mostramos lo que devuelva
        const { count: totalUsuarios, error: e4 } = await db
            .from("usuarios")
            .select("*", { count: "exact", head: true });
        if (e4) {
            console.warn("Tabla usuarios:", e4.message);
            setEl("totalUsuarios", "—");
        } else {
            setEl("totalUsuarios", totalUsuarios ?? 0);
        }

        // Valor total del inventario (existencia × costo_prom)
        const { data: invData, error: e5 } = await db
            .from("productos")
            .select("existencia, costo_prom");
        if (!e5 && invData) {
            const valor = invData.reduce((sum, p) => {
                const existencia = parseFloat(p.existencia) || 0;
                const costo = parseFloat(p.costo_prom) || 0;
                return sum + (existencia * costo);
            }, 0);
            setEl("valorInventario", "$" + valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        } else {
            setEl("valorInventario", "$0.00");
        }

        console.log("✅ Indicadores cargados");
    } catch (err) {
        console.error("Error en cargarIndicadores:", err);
    }
}

/* ============================
   MOVIMIENTOS RECIENTES
============================ */
async function cargarMovimientosRecientes(db) {
    const tbody =
        document.getElementById("listaMovimientosRecientes") ||
        document.getElementById("movimientosTableBody");

    if (!tbody) return;

    try {
        // Intentar con obras(nombre); si falla, sin obras
        let { data, error } = await db
            .from("movimientos")
            .select("id, cantidad, tipo, creado_en, sitio, productos(nombre), obras(nombre)")
            .order("creado_en", { ascending: false })
            .limit(10);

        // Si falla la relación con obras, reintentar sin ella
        if (error && error.message.includes("obras")) {
            console.warn("Relación obras no disponible, cargando sin obras.");
            ({ data, error } = await db
                .from("movimientos")
                .select("id, cantidad, tipo, creado_en, sitio, productos(nombre)")
                .order("creado_en", { ascending: false })
                .limit(10));
        }

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No hay movimientos recientes.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${m.productos?.nombre || "—"}</td>
                <td>${m.tipo}</td>
                <td>${m.cantidad}</td>
                <td>${m.obras?.nombre || m.sitio || "—"}</td>
                <td>${new Date(m.creado_en).toLocaleString("es-ES")}</td>
            </tr>
        `).join("");

        console.log(`✅ ${data.length} movimientos cargados`);
    } catch (err) {
        console.error("Error en cargarMovimientosRecientes:", err);
        tbody.innerHTML = `<tr><td colspan="5">Error cargando movimientos.</td></tr>`;
    }
}

/* ============================
   NOTIFICACIONES DESDE BD
============================ */
async function cargarNotificacionesDB(db) {
    const cont = document.querySelector(".notificaciones") || document.getElementById("notificaciones");
    if (!cont) return;

    try {
        const { data, error } = await db
            .from("notificaciones")
            .select("*")
            .order("creado_en", { ascending: false })
            .limit(5);

        if (error || !data || data.length === 0) {
            cont.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">Sin notificaciones recientes.</p>`;
            return;
        }

        cont.innerHTML = data.map(n => `
            <div style="padding:10px 14px;border-left:3px solid var(--primary);margin-bottom:8px;background:var(--bg-card);border-radius:6px;">
                <span style="font-size:13px;color:var(--text-muted);">${new Date(n.creado_en).toLocaleString("es-ES")}</span>
                <p style="margin:4px 0 0;color:var(--text-light);font-size:14px;">${n.mensaje || n.message || n.titulo || JSON.stringify(n)}</p>
            </div>
        `).join("");

        console.log(`✅ ${data.length} notificaciones cargadas`);
    } catch (err) {
        console.warn("Error cargando notificaciones:", err);
    }
}

/* ============================
   GRÁFICAS (ApexCharts)
============================ */
async function cargarGraficas(db) {
    if (typeof ApexCharts === "undefined") {
        console.warn("ApexCharts no disponible.");
        return;
    }

    try {
        const hoy = new Date();
        const hace7 = new Date();
        hace7.setDate(hoy.getDate() - 6);

        const { data, error } = await db
            .from("movimientos")
            .select("creado_en, tipo")
            .gte("creado_en", hace7.toISOString())
            .lte("creado_en", hoy.toISOString());

        if (error || !data) return;

        // Gráfica 1: movimientos por día
        const chartEl1 = document.querySelector("#chartMovimientosSemana");
        if (chartEl1) {
            const dias = {};
            for (let i = 0; i < 7; i++) {
                const d = new Date(hace7);
                d.setDate(hace7.getDate() + i);
                dias[d.toISOString().split("T")[0]] = 0;
            }
            data.forEach(m => {
                const k = m.creado_en.split("T")[0];
                if (k in dias) dias[k]++;
            });

            new ApexCharts(chartEl1, {
                chart: { type: "line", height: 280, toolbar: { show: false }, background: "transparent" },
                theme: { mode: "dark" },
                title: { text: "Movimientos últimos 7 días", style: { color: "#a29bfe", fontSize: "13px" } },
                series: [{ name: "Movimientos", data: Object.values(dias) }],
                xaxis: { categories: Object.keys(dias), labels: { style: { colors: "#9aa0b2" } } },
                colors: ["#6c5ce7"],
                stroke: { width: 3, curve: "smooth" },
                markers: { size: 4 },
                grid: { borderColor: "rgba(255,255,255,0.06)" },
            }).render();
        }

        // Gráfica 2: entradas vs salidas
        const chartEl2 = document.querySelector("#chartEntradasSalidas");
        if (chartEl2) {
            const entradas = data.filter(m => m.tipo === "entrada").length;
            const salidas  = data.filter(m => m.tipo === "salida").length;

            new ApexCharts(chartEl2, {
                chart: { type: "donut", height: 280, background: "transparent" },
                theme: { mode: "dark" },
                title: { text: "Entradas vs Salidas", style: { color: "#a29bfe", fontSize: "13px" } },
                labels: ["Entradas", "Salidas"],
                series: [entradas || 0, salidas || 0],
                colors: ["#00d2ff", "#ff7675"],
                legend: { position: "bottom", labels: { colors: "#9aa0b2" } },
                dataLabels: { style: { colors: ["#fff"] } },
            }).render();
        }

        console.log("✅ Gráficas cargadas");
    } catch (err) {
        console.error("Error en cargarGraficas:", err);
    }
}

/* ============================
   HELPERS
============================ */
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "—";
    else console.warn(`Elemento no encontrado: #${id}`);
}

function setNotification(msg, tipo = "info") {
    const el = document.querySelector(".notificaciones") || document.getElementById("notificaciones");
    if (!el) return;
    const colors = { info: "#d1ecf1", success: "#d4edda", error: "#f8d7da", warning: "#fff3cd" };
    const text   = { info: "#0c5460", success: "#155724", error: "#721c24", warning: "#856404" };
    el.innerHTML = `<p style="padding:10px 14px;border-radius:6px;background:${colors[tipo]};color:${text[tipo]};margin:0;font-size:14px;">${msg}</p>`;
}

function logout() {
    window.location.href = "../../inicio-de-sesion.html";
}

window.logout = logout;
window.cargarNotificaciones = function (tipo) {
    setNotification(`Filtro activo: ${tipo || "todas"}`, "info");
};
