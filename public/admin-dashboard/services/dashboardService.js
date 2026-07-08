/* ============================================================
   DASHBOARD SERVICE — ADDBOX
   Consultas reales a Supabase
============================================================ */

import { supabase } from "./supabase.js";

/* ============================
   TOTAL DE PRODUCTOS
============================ */
export async function obtenerTotalProductos() {
    const { count, error } = await supabase
        .from("productos")
        .select("*", { count: "exact", head: true });

    if (error) {
        console.error("ERROR productos:", error);
        throw error;
    }

    return count;
}

/* ============================
   STOCK TOTAL
============================ */
export async function obtenerStockTotal() {
    const { data, error } = await supabase
        .from("productos")
        .select("stock");

    if (error) {
        console.error("ERROR stock:", error);
        throw error;
    }

    return data.reduce((acc, item) => acc + (item.stock || 0), 0);
}

/* ============================
   MOVIMIENTOS HOY
============================ */
export async function obtenerMovimientosHoy() {
    const hoy = new Date().toISOString().split("T")[0];

    const { count, error } = await supabase
        .from("movimientos")
        .select("*", { count: "exact" })
        .gte("fecha", `${hoy}T00:00:00`)
        .lte("fecha", `${hoy}T23:59:59`);

    if (error) {
        console.error("ERROR movimientos hoy:", error);
        throw error;
    }

    return count;
}

/* ============================
   TOTAL USUARIOS
============================ */
export async function obtenerTotalUsuarios() {
    const { count, error } = await supabase
        .from("usuarios")
        .select("*", { count: "exact", head: true });

    if (error) {
        console.error("ERROR usuarios:", error);
        throw error;
    }

    return count;
}

/* ============================
   MOVIMIENTOS RECIENTES
============================ */
export async function obtenerMovimientosRecientes() {
    const { data, error } = await supabase
        .from("movimientos")
        .select("*")
        .order("fecha", { ascending: false })
        .limit(10);

    if (error) {
        console.error("ERROR movimientos recientes:", error);
        throw error;
    }

    return data;
}
