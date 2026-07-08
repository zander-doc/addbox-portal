// Alex de ADDBOX — Function Calling Tools (formato OpenAI)

export const alexTools = [
  {
    type: "function",
    function: {
      name: "buscar_producto",
      description: "Buscar productos en el inventario por nombre",
      parameters: {
        type: "object",
        properties: { texto: { type: "string", description: "Nombre o parte del nombre" } },
        required: ["texto"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultar_producto",
      description: "Obtener información detallada de un producto por ID",
      parameters: {
        type: "object",
        properties: { id: { type: "number", description: "ID del producto" } },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "validar_movimiento",
      description: "Validar si un movimiento de inventario es posible",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["entrada", "salida", "transferencia"] },
          producto_id: { type: "number", description: "ID del producto" },
          cantidad: { type: "number", description: "Cantidad a mover" }
        },
        required: ["tipo", "producto_id", "cantidad"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "simular_movimiento",
      description: "Simular un movimiento para ver stock resultante sin ejecutarlo",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["entrada", "salida", "transferencia"] },
          producto_id: { type: "number", description: "ID del producto" },
          cantidad: { type: "number", description: "Cantidad a mover" }
        },
        required: ["tipo", "producto_id", "cantidad"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "resumen_inventario",
      description: "Obtener resumen general: total productos, stock total, valor total",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "productos_criticos",
      description: "Listar productos con stock bajo o crítico",
      parameters: {
        type: "object",
        properties: { umbral: { type: "number", description: "Umbral de stock (default: 5)" } }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "pasos_operacion",
      description: "Obtener pasos para realizar una operación de inventario",
      parameters: {
        type: "object",
        properties: { tipo: { type: "string", enum: ["entrada", "salida", "transferencia", "devolucion", "ajuste"] } },
        required: ["tipo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "insights_operativos",
      description: "Obtener insights: producto más usado, más costoso, sin stock",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "sugerencias_rol",
      description: "Obtener acciones disponibles según el rol del usuario",
      parameters: {
        type: "object",
        properties: { rol: { type: "string" } },
        required: ["rol"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ejecutar_entrada",
      description: "Ejecutar una entrada de inventario (registrar productos recibidos). SOLO usar cuando el usuario confirme explícitamente.",
      parameters: {
        type: "object",
        properties: {
          producto_id: { type: "number", description: "ID del producto" },
          cantidad: { type: "number", description: "Cantidad a ingresar" },
          proveedor: { type: "string", description: "Nombre del proveedor (opcional)" },
          factura: { type: "string", description: "Número de factura (opcional)" }
        },
        required: ["producto_id", "cantidad"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ejecutar_salida",
      description: "Ejecutar una salida de inventario (despachar productos). SOLO usar cuando el usuario confirme explícitamente.",
      parameters: {
        type: "object",
        properties: {
          producto_id: { type: "number", description: "ID del producto" },
          cantidad: { type: "number", description: "Cantidad a sacar" },
          motivo: { type: "string", description: "Motivo de la salida (opcional)" }
        },
        required: ["producto_id", "cantidad"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "ejecutar_transferencia",
      description: "Ejecutar una transferencia entre almacenes. SOLO usar cuando el usuario confirme explícitamente.",
      parameters: {
        type: "object",
        properties: {
          producto_id: { type: "number", description: "ID del producto" },
          cantidad: { type: "number", description: "Cantidad a transferir" },
          destino: { type: "string", description: "Almacén o obra destino" }
        },
        required: ["producto_id", "cantidad", "destino"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "predecir_agotamiento",
      description: "Predecir cuándo se agotará un producto basado en consumo histórico",
      parameters: {
        type: "object",
        properties: { producto_id: { type: "number", description: "ID del producto" } },
        required: ["producto_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "detectar_anomalias",
      description: "Detectar patrones sospechosos en movimientos recientes (salidas grandes, horarios inusuales)",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "recomendaciones_reorden",
      description: "Obtener recomendaciones de reabastecimiento con urgencia",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "auditoria_predictiva",
      description: "Generar resumen completo de auditoría predictiva: anomalías + recomendaciones de reorden",
      parameters: { type: "object", properties: {} }
    }
  }
];

export default alexTools;
