// src/ai/alex/index.js
import { alexConfig } from "./config.js";
import { alexRoles } from "./roles.js";
import { addToContext, getContextHistory } from "./context.js";
import { ragSearch } from "./rag.js";
import engineModule from "./engine.js";
import * as inventory from "./inventory.js";

// Permisos por rol
const permisos = {
  almacenista: ["validar", "simular", "consultar", "buscar", "pasos", "stock", "resumen", "criticos"],
  supervisor: ["validar", "simular", "consultar", "buscar", "pasos", "stock", "inconsistencias", "resumen", "criticos", "movimientos"],
  admin: ["validar", "simular", "consultar", "buscar", "pasos", "stock", "inconsistencias", "error", "resumen", "criticos", "movimientos", "insights"]
};

function tienePermiso(rol, accion) {
  const allowed = permisos[rol] || permisos.almacenista;
  return allowed.includes(accion);
}

export default {
  async init() {
    console.log("🤖 Alex de ADDBOX inicializado.");
  },

  engine: {
    async chat(message, user) {
      const msg = message.toLowerCase().trim();
      const rol = user?.role || "default";

      // Guardar mensaje en el contexto
      if (user?.id) {
        addToContext(user.id, `Usuario: ${message}`);
      }

      let reply = null;

      // ─────────────────────────────────────────
      // A. Validación de movimiento: "validar salida 5 del 12"
      // ─────────────────────────────────────────
      const validarMatch = msg.match(/validar\s+(entrada|salida|transferencia)\s+(\d+)\s+del\s+(\d+)/);
      if (!reply && validarMatch && tienePermiso(rol, "validar")) {
        const tipo = validarMatch[1];
        const cantidad = parseInt(validarMatch[2]);
        const producto = await inventory.getProductById(validarMatch[3]);
        const resultado = inventory.validarMovimiento(tipo, producto, cantidad);
        if (resultado.ok) {
          reply = `✅ ${resultado.motivo} — ${tipo} de ${cantidad} unidades del producto ${producto?.nombre || validarMatch[3]}.`;
        } else {
          reply = `❌ ${resultado.motivo}`;
        }
      }

      // ─────────────────────────────────────────
      // B. Simulación: "simular salida 5 del 12"
      // ─────────────────────────────────────────
      const simularMatch = msg.match(/simular\s+(entrada|salida|transferencia)\s+(\d+)\s+del\s+(\d+)/);
      if (!reply && simularMatch && tienePermiso(rol, "simular")) {
        const tipo = simularMatch[1];
        const cantidad = parseInt(simularMatch[2]);
        const producto = await inventory.getProductById(simularMatch[3]);
        const sim = inventory.simularMovimiento(tipo, producto, cantidad);
        if (sim) {
          reply = `🧪 Simulación de ${tipo}:\n• Producto: ${sim.nombre}\n• Stock actual: ${sim.stockActual}\n• Stock después: ${sim.stockSimulado}`;
        } else {
          reply = "No pude simular: producto no encontrado.";
        }
      }

      // ─────────────────────────────────────────
      // C. Explicación de errores: "error 23514"
      // ─────────────────────────────────────────
      const errorCodeMatch = msg.match(/error\s+([a-z0-9]+)/i);
      if (!reply && errorCodeMatch && tienePermiso(rol, "error")) {
        const explicacion = inventory.explicarErrorMovimiento(errorCodeMatch[1]);
        reply = `🔍 Código ${errorCodeMatch[1]}: ${explicacion}`;
      }

      // ─────────────────────────────────────────
      // D. Inconsistencias: "inconsistencias 45"
      // ─────────────────────────────────────────
      const inconMatch = msg.match(/inconsistencias\s+(\d+)/);
      if (!reply && inconMatch && tienePermiso(rol, "inconsistencias")) {
        const movId = inconMatch[1];
        const movData = await fetch(`/api/rest/movimientos?id=eq.${movId}`)
          .then(r => r.json())
          .then(d => d[0] || null);
        const errores = inventory.detectarInconsistenciasMovimiento(movData);
        if (errores.length > 0) {
          reply = `⚠️ Inconsistencias en movimiento #${movId}:\n` + errores.map(e => `• ${e}`).join("\n");
        } else {
          reply = `✅ Movimiento #${movId} sin inconsistencias.`;
        }
      }

      // ─────────────────────────────────────────
      // E. Pasos de movimiento: "pasos transferencia"
      // ─────────────────────────────────────────
      const pasosMatch = msg.match(/pasos\s+(entrada|salida|transferencia)/);
      if (!reply && pasosMatch && tienePermiso(rol, "pasos")) {
        const tipo = pasosMatch[1];
        const pasos = inventory.pasosMovimiento(tipo);
        reply = `📋 Pasos para ${tipo}:\n` + pasos.map((p, i) => `${i + 1}. ${p}`).join("\n");
      }

      // ─────────────────────────────────────────
      // F. Lectura por ID: "producto 12" o "id 12"
      // ─────────────────────────────────────────
      const idMatch = msg.match(/(?:producto|id)\s+(\d+)/);
      if (!reply && idMatch && tienePermiso(rol, "consultar")) {
        const producto = await inventory.getProductById(idMatch[1]);
        if (producto) {
          reply = `📦 ${producto.nombre}\n• Stock: ${producto.stock} ${producto.unidad || "uds"}\n• Categoría: ${producto.categoria || "—"}\n• Ubicación: ${producto.ubicacion || "—"}`;
        } else {
          reply = "No encontré un producto con ese ID.";
        }
      }

      // ─────────────────────────────────────────
      // G. Búsqueda por nombre: "buscar cemento"
      // ─────────────────────────────────────────
      if (!reply && msg.startsWith("buscar ") && tienePermiso(rol, "buscar")) {
        const texto = message.slice(7).trim();
        const resultados = await inventory.buscarProducto(texto);
        if (resultados.length > 0) {
          reply = `🔍 Encontré ${resultados.length} resultado(s):\n` +
            resultados.slice(0, 5).map(p => `• ${p.nombre} — Stock: ${p.stock} ${p.unidad || ""}`).join("\n");
        } else {
          reply = `No encontré productos con "${texto}".`;
        }
      }

      // ─────────────────────────────────────────
      // H. Validación de stock: "sacar 5 del 12"
      // ─────────────────────────────────────────
      const sacarMatch = msg.match(/sacar\s+(\d+)\s+del\s+(\d+)/);
      if (!reply && sacarMatch && tienePermiso(rol, "stock")) {
        const cantidad = parseInt(sacarMatch[1]);
        const producto = await inventory.getProductById(sacarMatch[2]);
        if (inventory.validateStock(producto, cantidad)) {
          reply = `✅ Sí se puede. ${producto.nombre} tiene ${producto.stock} en stock. Puedes sacar ${cantidad}.`;
        } else if (producto) {
          reply = `❌ No alcanza. ${producto.nombre} solo tiene ${producto.stock} en stock. Necesitas ${cantidad}.`;
        } else {
          reply = "No encontré ese producto para validar stock.";
        }
      }

      // ─────────────────────────────────────────
      // I. Detección de errores: "errores" o "revisar producto X"
      // ─────────────────────────────────────────
      const errorMatch = msg.match(/(?:errores|revisar producto)\s*(\d+)?/);
      if (!reply && errorMatch) {
        const id = errorMatch[1];
        if (id) {
          const producto = await inventory.getProductById(id);
          const errores = inventory.detectarErrores(producto);
          if (errores.length > 0) {
            reply = `⚠️ Errores detectados:\n` + errores.map(e => `• ${e}`).join("\n");
          } else {
            reply = `✅ Producto ${producto.nombre} sin errores detectados.`;
          }
        } else {
          reply = "Indica el ID del producto. Ejemplo: 'revisar producto 5'";
        }
      }

      // ─────────────────────────────────────────
      // J. Pasos operativos: "cómo hago una transferencia"
      // ─────────────────────────────────────────
      const comMatch = msg.match(/c[oó]mo\s+hago\s+(?:una?\s+)?(transferencia|salida|entrada)/);
      if (!reply && comMatch) {
        const tipo = comMatch[1];
        const pasos = inventory.obtenerPasosOperacion(tipo);
        reply = `📋 Pasos para ${tipo}:\n` + pasos.map((p, i) => `${i + 1}. ${p}`).join("\n");
      }

      // ─────────────────────────────────────────
      // K. Sugerencias según rol: "qué puedo hacer"
      // ─────────────────────────────────────────
      if (!reply && msg.includes("qué puedo hacer")) {
        const sugerencias = inventory.sugerenciasPorRol(rol);
        reply = `🧭 Con tu rol (${rol}) puedes:\n` + sugerencias.map(s => `• ${s}`).join("\n");
      }

      // ─────────────────────────────────────────
      // L. Resumen inventario: "resumen inventario"
      // ─────────────────────────────────────────
      if (!reply && msg.includes("resumen inventario") && tienePermiso(rol, "resumen")) {
        const res = await inventory.resumenInventario();
        reply = `📊 Resumen del inventario:\n• Productos: ${res.totalProductos}\n• Stock total: ${res.totalStock} unidades\n• Valor total: $${res.valorTotal.toLocaleString()}`;
      }

      // ─────────────────────────────────────────
      // M. Productos críticos: "productos críticos" / "stock crítico"
      // ─────────────────────────────────────────
      if (!reply && (msg.includes("productos críticos") || msg.includes("stock crítico") || msg.includes("productos criticos") || msg.includes("stock critico")) && tienePermiso(rol, "criticos")) {
        const criticos = await inventory.productosCriticos();
        if (criticos.length > 0) {
          reply = `⚠️ ${criticos.length} producto(s) con stock crítico:\n` +
            criticos.slice(0, 10).map(p => `• ${p.nombre} — Stock: ${p.stock}`).join("\n");
        } else {
          reply = "✅ No hay productos con stock crítico.";
        }
      }

      // ─────────────────────────────────────────
      // N. Resumen movimientos: "resumen movimientos"
      // ─────────────────────────────────────────
      const movResMatch = msg.match(/resumen\s+movimientos(?:\s+(\d+)d)?/);
      if (!reply && movResMatch && tienePermiso(rol, "movimientos")) {
        const periodo = movResMatch[1] ? `${movResMatch[1]}d` : "30d";
        const res = await inventory.resumenMovimientos(periodo);
        reply = `📈 Movimientos (${periodo}):\n• Entradas: ${res.entradas}\n• Salidas: ${res.salidas}\n• Transferencias: ${res.transferencias}`;
      }

      // ─────────────────────────────────────────
      // O. Insights operativos: "insights" / "análisis"
      // ─────────────────────────────────────────
      if (!reply && (msg.includes("insights") || msg.includes("análisis") || msg.includes("analisis")) && tienePermiso(rol, "insights")) {
        const ins = await inventory.insightsOperativos();
        reply = `💡 Insights operativos:\n• Producto más usado: ${ins.masUsado || "N/A"}\n• Producto más costoso: ${ins.masCostoso || "N/A"}\n• Productos sin stock: ${ins.sinStock}`;
      }

      // ─────────────────────────────────────────
      // L. Fallback: enviar al modelo GPT con contexto + RAG
      // ─────────────────────────────────────────
      if (!reply) {
        reply = await engineModule.chat(
          message,
          user?.role || "default",
          user?.id || null
        );
      }

      // Guardar respuesta en el contexto
      if (user?.id) {
        addToContext(user.id, `Alex: ${reply}`);
      }

      return reply;
    }
  },

  // Exponer módulos internos
  config: alexConfig,
  roles: alexRoles,
  context: { add: addToContext, get: getContextHistory },
  rag: { search: ragSearch },
  inventory
};
