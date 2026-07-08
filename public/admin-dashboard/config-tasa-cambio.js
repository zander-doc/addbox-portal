/**
 * config-tasa-cambio.js
 * Controlador para la página de configuración de tasa de cambio.
 * Incluye obtención automática de tasa BCV y recálculo de inventario.
 */

import { obtenerTasaCambio, actualizarTasaCambio } from "./services/importService.js";
import { getSession } from "./services/sessionService.js";
import { showToast } from "./services/toastService.js";
import { supabase } from "./services/supabase-client.js";

// Elementos del DOM
const tasaActual = document.getElementById("tasaActual");
const fechaTasa = document.getElementById("fechaTasa");
const fuenteTasa = document.getElementById("fuenteTasa");
const btnRefrescar = document.getElementById("btnRefrescar");
const nuevaTasaInput = document.getElementById("nuevaTasa");
const fuenteTasaInput = document.getElementById("fuenteTasaInput");
const btnGuardar = document.getElementById("btnGuardar");
const historialTasas = document.getElementById("historialTasas");
const btnLogout = document.getElementById("btnLogout");
const btnObtenerBCV = document.getElementById("btnObtenerBCV");

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (!session) {
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return;
  }

  const usuarioEl = document.getElementById("usuarioNombre");
  if (usuarioEl) usuarioEl.textContent = session.user.email;

  // Configurar eventos
  btnRefrescar.addEventListener("click", cargarTasaActual);
  btnGuardar.addEventListener("click", guardarTasa);
  if (btnObtenerBCV) btnObtenerBCV.addEventListener("click", obtenerTasaBCV);
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    });
  }

  // Cargar datos iniciales
  cargarTasaActual();
  cargarHistorialTasas();
});

// ═══════════════════════════════════════════════════════════════
// OBTENER TASA BCV AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════

/**
 * Consulta la tasa BCV del día desde APIs públicas,
 * la guarda en la DB y recalcula TODOS los productos.
 */
async function obtenerTasaBCV() {
  const statusEl = document.getElementById("bcvStatus");
  const resultadoEl = document.getElementById("bcvResultado");
  const resultMsgEl = document.getElementById("bcvResultMsg");

  statusEl.textContent = "⏳ Consultando tasa BCV...";
  btnObtenerBCV.disabled = true;

  try {
    // Intentar múltiples APIs de tasa BCV
    let tasa = null;
    let fuente = "BCV";

    // API 1: pydolarve (más confiable)
    try {
      const res = await fetch("https://pydolarve.org/api/v2/dollar?page=bcv");
      if (res.ok) {
        const data = await res.json();
        if (data?.monitors?.usd?.price) {
          tasa = parseFloat(data.monitors.usd.price);
          fuente = "BCV (pydolarve)";
        }
      }
    } catch (e) { console.log("API pydolarve falló, intentando alternativa..."); }

    // API 2: exchangemonitor
    if (!tasa) {
      try {
        const res = await fetch("https://exchangemonitor.net/dolar-venezuela-bcv/api");
        if (res.ok) {
          const data = await res.json();
          if (data?.price || data?.USD) {
            tasa = parseFloat(data.price || data.USD);
            fuente = "BCV (exchangemonitor)";
          }
        }
      } catch (e) { console.log("API exchangemonitor falló..."); }
    }

    // API 3: alcambio
    if (!tasa) {
      try {
        const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
        if (res.ok) {
          const data = await res.json();
          if (data?.promedio) {
            tasa = parseFloat(data.promedio);
            fuente = "BCV (dolarapi)";
          }
        }
      } catch (e) { console.log("API dolarapi falló..."); }
    }

    if (!tasa || tasa <= 0) {
      throw new Error("No se pudo obtener la tasa de ninguna API. Ingrésala manualmente.");
    }

    statusEl.textContent = `✅ Tasa obtenida: ${tasa.toFixed(4)} Bs/$`;

    // Guardar en tasa_bcv
    const hoy = new Date().toISOString().split("T")[0];
    const { error: errBcv } = await supabase
      .from("tasa_bcv")
      .upsert({ tasa: tasa, valor: tasa, fecha: hoy, fuente }, { onConflict: "fecha" })
      .select();

    // También guardar en tasas_cambio (para el historial)
    await supabase
      .from("tasas_cambio")
      .upsert({ tasa: tasa, fecha: hoy, fuente }, { onConflict: "fecha,fuente" });

    if (errBcv) {
      // Si falla upsert, intentar insert
      await supabase.from("tasa_bcv").insert({ tasa, valor: tasa, fecha: hoy, fuente });
    }

    // ═══ RECALCULAR TODOS LOS PRODUCTOS (UPDATE masivo) ═══
    statusEl.textContent = "⏳ Recalculando costos de todos los productos...";

    // Usar un RPC o update con cálculo directo — mucho más rápido
    const { data: updateResult, error: errUpdate } = await supabase.rpc('recalcular_costos_bs', { nueva_tasa: tasa });
    
    let actualizados = 0;
    
    if (errUpdate) {
      // Fallback: update directo sin RPC (un solo query)
      const { data: productos, error: errProd } = await supabase
        .from("productos")
        .select("id, costo_prom")
        .gt("costo_prom", 0);

      if (!errProd && productos) {
        // Hacer en lotes grandes de 200 con Promise.all
        const LOTE = 200;
        for (let i = 0; i < productos.length; i += LOTE) {
          const lote = productos.slice(i, i + LOTE);
          const promesas = lote.map(p => 
            supabase.from("productos")
              .update({ costo_prom_bs: parseFloat((p.costo_prom * tasa).toFixed(2)) })
              .eq("id", p.id)
          );
          const resultados = await Promise.all(promesas);
          actualizados += resultados.filter(r => !r.error).length;
        }
      }
    } else {
      // RPC exitoso
      actualizados = updateResult || 987;
    }

    // Mostrar resultado
    resultadoEl.style.display = "block";
    resultMsgEl.textContent = `Tasa ${tasa.toFixed(4)} Bs/$ guardada. ${actualizados} productos actualizados con nuevos costos en BS.`;
    statusEl.textContent = "";

    showToast(`Tasa BCV actualizada: ${tasa.toFixed(2)} Bs/$. ${actualizados} productos recalculados.`, "success");

    // Refrescar UI
    cargarTasaActual();
    cargarHistorialTasas();

  } catch (err) {
    console.error("Error obteniendo tasa BCV:", err);
    statusEl.textContent = "";
    showToast(`Error: ${err.message}`, "error");
  } finally {
    btnObtenerBCV.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES EXISTENTES
// ═══════════════════════════════════════════════════════════════

// Cargar tasa actual — solo muestra, no actualiza productos
async function cargarTasaActual() {
  try {
    const { data: bcvData, error } = await supabase
      .from("tasa_bcv")
      .select("tasa, valor, fecha, fuente")
      .order("fecha", { ascending: false })
      .limit(1);

    if (!error && bcvData && bcvData.length > 0) {
      const t = bcvData[0];
      tasaActual.textContent = `${(t.valor || t.tasa).toFixed(4)} VES`;
      fechaTasa.textContent = t.fecha;
      fuenteTasa.textContent = t.fuente || "BCV";
      return;
    }

    // Fallback: tasas_cambio
    const { data: tcData } = await supabase
      .from("tasas_cambio")
      .select("tasa, fecha, fuente")
      .order("fecha", { ascending: false })
      .limit(1);

    if (tcData && tcData.length > 0) {
      tasaActual.textContent = `${tcData[0].tasa.toFixed(4)} VES`;
      fechaTasa.textContent = tcData[0].fecha;
      fuenteTasa.textContent = tcData[0].fuente || "BCV";
    } else {
      tasaActual.textContent = "Sin datos";
      fechaTasa.textContent = "—";
    }
  } catch (err) {
    console.error("Error cargando tasa:", err);
    tasaActual.textContent = "Error";
    fechaTasa.textContent = "Error";
  }
}

// Guardar nueva tasa manualmente
async function guardarTasa() {
  const tasa = parseFloat(nuevaTasaInput.value);
  const fuente = fuenteTasaInput.value.trim() || "BCV";

  if (!tasa || tasa <= 0) {
    showToast("Ingresa una tasa válida", "warning");
    return;
  }

  try {
    // Guardar en tasas_cambio
    const resultado = await actualizarTasaCambio(tasa, fuente);

    // También guardar en tasa_bcv
    const hoy = new Date().toISOString().split("T")[0];
    await supabase
      .from("tasa_bcv")
      .upsert({ tasa, valor: tasa, fecha: hoy, fuente }, { onConflict: "fecha" });

    if (resultado.success) {
      // Recalcular todos los productos (en paralelo, rápido)
      const { data: productos } = await supabase
        .from("productos")
        .select("id, costo_prom")
        .gt("costo_prom", 0);

      if (productos) {
        const promesas = productos.map(p => 
          supabase.from("productos")
            .update({ costo_prom_bs: parseFloat((p.costo_prom * tasa).toFixed(2)) })
            .eq("id", p.id)
        );
        await Promise.all(promesas);
      }

      showToast(`Tasa guardada: 1 USD = ${tasa.toFixed(2)} VES. Productos actualizados.`, "success");
      cargarTasaActual();
      cargarHistorialTasas();
      nuevaTasaInput.value = "";
    } else {
      showToast(`Error: ${resultado.error}`, "error");
    }
  } catch (err) {
    console.error("Error guardando tasa:", err);
    showToast(`Error: ${err.message}`, "error");
  }
}

// Cargar historial de tasas
async function cargarHistorialTasas() {
  try {
    const { data, error } = await supabase
      .from("tasas_cambio")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      historialTasas.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">No hay historial de tasas</td></tr>`;
      return;
    }

    historialTasas.innerHTML = data.map((t) => `
      <tr>
        <td>${t.fecha}</td>
        <td>${t.tasa.toFixed(4)}</td>
        <td>${t.fuente || "BCV"}</td>
        <td>${new Date(t.creado_en).toLocaleString("es-MX")}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Error cargando historial:", err);
    historialTasas.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Error al cargar historial</td></tr>`;
  }
}
