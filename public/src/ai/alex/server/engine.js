// Alex de ADDBOX — Motor principal con Function Calling + Streaming
import OpenAI from "openai";
import { alexConfig } from "./config.js";
import { getRole } from "./roles.js";
import { saveContext, loadContext } from "./context.js";
import { ragSearch } from "./rag.js";
import { alexTools } from "./tools.js";
import inventory from "./inventory.js";
import actions from "./actions.js";
import predictive from "./predictive.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ejecutores de funciones
const executors = {
  buscar_producto: async (args) => {
    const results = await inventory.buscarProducto(args.texto);
    if (results.length === 0) return `No encontré productos con "${args.texto}".`;
    return results.slice(0, 5).map(p => `• ${p.nombre} — Stock: ${p.stock} ${p.unidad || ""}`).join("\n");
  },
  consultar_producto: async (args) => {
    const p = await inventory.getProductById(args.id);
    if (!p) return "Producto no encontrado.";
    return `📦 ${p.nombre}\n• Stock: ${p.stock} ${p.unidad || "uds"}\n• Categoría: ${p.categoria || "—"}\n• Ubicación: ${p.ubicacion || "—"}\n• Costo: $${p.costo || 0}`;
  },
  validar_movimiento: async (args) => {
    const producto = await inventory.getProductById(args.producto_id);
    const r = inventory.validarMovimiento(args.tipo, producto, args.cantidad);
    return r.ok ? `✅ ${r.motivo}` : `❌ ${r.motivo}`;
  },
  simular_movimiento: async (args) => {
    const producto = await inventory.getProductById(args.producto_id);
    const sim = inventory.simularMovimiento(args.tipo, producto, args.cantidad);
    if (!sim) return "Producto no encontrado.";
    let r = `🧪 Simulación ${args.tipo}:\n• ${sim.nombre}\n• Actual: ${sim.stockActual} → Después: ${sim.stockSimulado}`;
    if (sim.alerta) r += `\n${sim.alerta}`;
    return r;
  },
  resumen_inventario: async () => {
    const res = await inventory.resumenInventario();
    return `📊 Productos: ${res.totalProductos} | Stock: ${res.totalStock} uds | Valor: $${res.valorTotal.toLocaleString()}`;
  },
  productos_criticos: async (args) => {
    const c = await inventory.productosCriticos(args.umbral || 5);
    if (c.length === 0) return "✅ No hay productos con stock crítico.";
    return `⚠️ ${c.length} críticos:\n` + c.slice(0, 8).map(p => `• ${p.nombre} — ${p.stock}`).join("\n");
  },
  pasos_operacion: (args) => {
    const pasos = inventory.pasosMovimiento(args.tipo);
    return pasos.map((p, i) => `${i + 1}. ${p}`).join("\n");
  },
  insights_operativos: async () => {
    const ins = await inventory.insightsOperativos();
    return `💡 Más usado: ${ins.masUsado || "N/A"} | Más costoso: ${ins.masCostoso || "N/A"} | Sin stock: ${ins.sinStock}`;
  },
  sugerencias_rol: (args) => {
    return inventory.sugerenciasPorRol(args.rol).map(s => `• ${s}`).join("\n");
  },

  ejecutar_entrada: async (args, userId) => {
    const result = await actions.ejecutarEntrada({ ...args, usuario_id: userId });
    if (!result.ok) return `❌ ${result.error}`;
    return `✅ Entrada registrada: +${args.cantidad} de ${result.producto}. Stock: ${result.stockAnterior} → ${result.stockNuevo}`;
  },

  ejecutar_salida: async (args, userId) => {
    const result = await actions.ejecutarSalida({ ...args, usuario_id: userId });
    if (!result.ok) return `❌ ${result.error}`;
    return `✅ Salida registrada: -${args.cantidad} de ${result.producto}. Stock: ${result.stockAnterior} → ${result.stockNuevo}`;
  },

  ejecutar_transferencia: async (args, userId) => {
    const result = await actions.ejecutarTransferencia({ ...args, usuario_id: userId });
    if (!result.ok) return `❌ ${result.error}`;
    return `✅ Transferencia registrada: ${args.cantidad} de ${result.producto} → ${result.destino}. Stock: ${result.stockAnterior} → ${result.stockNuevo}`;
  },

  predecir_agotamiento: async (args) => {
    const pred = await predictive.predecirAgotamiento(args.producto_id);
    if (!pred) return "Producto no encontrado.";
    return pred.mensaje;
  },

  detectar_anomalias: async () => {
    const anomalias = await predictive.detectarAnomalias();
    if (anomalias.length === 0) return "✅ Sin anomalías detectadas en los últimos 7 días.";
    return `🚨 ${anomalias.length} anomalía(s):\n` + anomalias.slice(0, 5).map(a => `• ${a.mensaje}`).join("\n");
  },

  recomendaciones_reorden: async () => {
    const recs = await predictive.recomendacionesReorden();
    if (recs.length === 0) return "✅ Todos los productos tienen stock suficiente.";
    return `📦 Recomendaciones:\n` + recs.slice(0, 5).map(r => `• [${r.urgencia.toUpperCase()}] ${r.sugerencia}`).join("\n");
  },

  auditoria_predictiva: async () => {
    return await predictive.resumenPredictivo();
  }
};

/** Construir mensajes base */
function buildMessages(message, history, role, ragContext) {
  return [
    { role: "system", content: alexConfig.systemPrompt },
    { role: "system", content: `Rol del usuario: ${role.label}. ${role.prompt}` },
    ...(ragContext ? [{ role: "system", content: `Información del sistema:\n${ragContext}` }] : []),
    ...history.slice(-10),
    { role: "user", content: message }
  ];
}

/** Ejecutar tool calls */
async function executeToolCalls(toolCalls, userId) {
  const results = [];
  for (const call of toolCalls) {
    const fn = call.function.name;
    const args = JSON.parse(call.function.arguments || "{}");
    let result;
    try {
      result = executors[fn] ? await executors[fn](args, userId) : "Función no disponible.";
    } catch (err) {
      result = `Error: ${err.message}`;
    }
    results.push({ role: "tool", tool_call_id: call.id, content: String(result) });
  }
  return results;
}

/** Chat completo (sin streaming) */
export async function runChat(userId, message, userRole = "default") {
  const role = getRole(userRole);
  await saveContext(userId, "user", message);
  const history = await loadContext(userId);
  const ragContext = ragSearch(message);
  const messages = buildMessages(message, history, role, ragContext);

  // Primera llamada
  const response = await openai.chat.completions.create({
    model: alexConfig.model,
    temperature: alexConfig.temperature,
    max_tokens: alexConfig.maxTokens,
    messages,
    tools: alexTools,
    tool_choice: "auto"
  });

  const choice = response.choices[0];

  // Si hay tool calls
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const toolResults = await executeToolCalls(choice.message.tool_calls, userId);
    const finalResponse = await openai.chat.completions.create({
      model: alexConfig.model,
      temperature: alexConfig.temperature,
      max_tokens: alexConfig.maxTokens,
      messages: [...messages, choice.message, ...toolResults]
    });
    const reply = finalResponse.choices[0].message.content;
    await saveContext(userId, "assistant", reply);
    return reply;
  }

  // Respuesta directa
  const reply = choice.message.content;
  await saveContext(userId, "assistant", reply);
  return reply;
}

/** Chat con streaming (SSE) */
export async function runStream(userId, message, userRole = "default", onChunk) {
  const role = getRole(userRole);
  await saveContext(userId, "user", message);
  const history = await loadContext(userId);
  const ragContext = ragSearch(message);
  const messages = buildMessages(message, history, role, ragContext);

  const stream = await openai.chat.completions.create({
    model: alexConfig.model,
    temperature: alexConfig.temperature,
    max_tokens: alexConfig.maxTokens,
    messages,
    tools: alexTools,
    tool_choice: "auto",
    stream: true
  });

  let fullReply = "";
  let toolCalls = [];

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: "", function: { name: "", arguments: "" } };
        if (tc.id) toolCalls[tc.index].id = tc.id;
        if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
        if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
      }
    } else if (delta?.content) {
      fullReply += delta.content;
      onChunk(delta.content);
    }
  }

  // Si hubo tool calls, ejecutar y hacer segunda llamada con streaming
  if (toolCalls.length > 0) {
    const toolResults = await executeToolCalls(toolCalls, userId);
    const assistantMsg = { role: "assistant", tool_calls: toolCalls };
    const finalStream = await openai.chat.completions.create({
      model: alexConfig.model,
      temperature: alexConfig.temperature,
      max_tokens: alexConfig.maxTokens,
      messages: [...messages, assistantMsg, ...toolResults],
      stream: true
    });

    fullReply = "";
    for await (const chunk of finalStream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullReply += content;
        onChunk(content);
      }
    }
  }

  await saveContext(userId, "assistant", fullReply);
  return fullReply;
}

export default { runChat, runStream };
