# Base de Conocimiento — Alex IA (ADDBOX)
# Última actualización: 2026-05-26
# 
# INSTRUCCIONES: Edita este archivo cuando modifiques un módulo.
# Alex lo lee automáticamente en cada consulta como contexto adicional.
# Usa lenguaje claro y directo. Escribe como si le explicaras al usuario.

---

## MÓDULO: Reconciliación de Inventario

### ¿Qué es?
La reconciliación compara lo que dice el sistema (stock digital) con lo que realmente hay en la obra (conteo físico). Sirve para corregir diferencias causadas por errores, pérdidas o movimientos no registrados.

### ¿Quién puede usarlo?
- Supervisor, Admin y Jefe pueden aprobar/rechazar reconciliaciones.
- El almacenista puede iniciar el conteo pero no aprobar.

### Pasos para hacer una reconciliación:
1. Ir a Inventario → Reconciliación
2. Seleccionar la obra en el dropdown
3. Click en "Iniciar conteo"
4. Ingresar la cantidad real (física) de cada producto
5. Click en "Finalizar conteo" — muestra las diferencias
6. Revisar el resumen (sobrantes, faltantes, coincidencias)
7. Click en "Aprobar reconciliación" para ajustar el stock
   - O "Rechazar" para descartar y empezar de nuevo

### ¿Qué pasa al aprobar?
- El stock del sistema se iguala al conteo físico
- Se registran movimientos tipo "ajuste" con el detalle de cada diferencia
- Queda en el historial para auditoría (motivo: "Reconciliación: conteo físico")

### ¿Dónde ver los ajustes?
- En Reportes de Inventario → filtrar por tipo "Ajustes"
- También en el historial de movimientos de cada producto

### Errores comunes:
- "Sesión expirada": Debes iniciar sesión antes de aprobar
- Si no aparecen productos: La obra no tiene stock asignado, ir a Asignación Masiva primero

---

## MÓDULO: Stock por Obra

### ¿Qué es?
Muestra el inventario actual de cada obra/proyecto. Cada obra tiene su propio stock independiente.

### Pasos:
1. Ir a Inventario → Stock por Obra
2. Seleccionar la obra
3. Ver la lista de productos con cantidades actuales
4. Usar el buscador para filtrar por nombre o código

### Datos que muestra:
- Código del producto
- Descripción
- Cantidad actual
- Unidad de medida
- Estado (normal, bajo stock, crítico)

---

## MÓDULO: Entradas de Material

### ¿Qué es?
Registra material que llega a una obra (compras, recepciones de proveedor).

### Pasos:
1. Ir a Movimientos → Registrar Entrada
2. Seleccionar la obra destino
3. Agregar productos (buscar por nombre o código)
4. Indicar cantidad de cada producto
5. Opcionalmente: proveedor, número de factura/guía
6. Confirmar la entrada

### Resultado:
- Se suma la cantidad al stock de la obra
- Se registra un movimiento tipo "entrada"
- Queda en el historial con fecha, usuario y referencia

---

## MÓDULO: Salidas de Material

### ¿Qué es?
Registra material que sale de una obra (consumo, despacho a frente de trabajo).

### Pasos:
1. Ir a Movimientos → Registrar Salida
2. Seleccionar la obra origen
3. Agregar productos
4. Indicar cantidad (no puede superar el stock disponible)
5. Indicar motivo de la salida
6. Confirmar

### Resultado:
- Se resta la cantidad del stock de la obra
- Se registra un movimiento tipo "salida"
- Si el stock queda bajo el mínimo, se genera alerta

### Restricciones:
- No se permite salida si el stock resultante sería negativo
- El sistema valida antes de ejecutar

---

## MÓDULO: Transferencias entre Obras

### ¿Qué es?
Mueve material de una obra a otra. Útil cuando una obra tiene excedente y otra necesita.

### Pasos:
1. Ir a Movimientos → Transferencia
2. Seleccionar obra ORIGEN
3. Seleccionar obra DESTINO
4. Agregar productos y cantidades
5. Confirmar

### Resultado:
- Se generan 2 movimientos: "transferencia_salida" en origen y "transferencia_entrada" en destino
- El stock se resta de origen y se suma en destino
- Queda vinculado por referencia_cruzada

---

## MÓDULO: Devoluciones

### ¿Qué es?
Registra material que regresa (herramientas prestadas, material sobrante).

### Pasos:
1. Ir a Movimientos → Devolución
2. Seleccionar el material
3. Indicar estado: bueno o dañado
4. Si dañado: se envía a reparación (no suma stock hasta repararse)
5. Si bueno: se suma al stock inmediatamente
6. Confirmar

### Estados de devolución:
- Pendiente: registrada pero no procesada
- Devuelto: material en buen estado, ya sumó al stock
- En reparación: material dañado, pendiente de arreglo

---

## MÓDULO: Operaciones por Lote

### ¿Qué es?
Permite registrar múltiples movimientos de una sola vez. Ideal para recepciones grandes o inventarios iniciales.

### Opciones:
- Carga manual: agregar líneas una por una
- Importar CSV: subir archivo con formato predefinido

### Formato CSV:
```
producto_id,cantidad,tipo,obra_id,motivo
uuid-producto,10,entrada,uuid-obra,Recepción inicial
```

### Validaciones:
- Cada línea se valida individualmente
- Si una falla, las demás se procesan igual
- Se muestra resumen: exitosas vs fallidas

---

## MÓDULO: Reportes de Inventario

### ¿Qué es?
Genera informes filtrados del inventario y movimientos.

### Filtros disponibles:
- Por obra
- Por tipo de movimiento (Entradas, Salidas, Ajustes, Transferencias, Devoluciones)
- Por rango de fechas
- Por producto

### Reportes:
- Movimientos por periodo
- Stock consolidado (todas las obras)
- Productos críticos (bajo stock mínimo)
- Valor del inventario

### Tips:
- Para ver ajustes de reconciliación: filtrar tipo = "Ajustes"
- Botón "Limpiar" resetea todos los filtros
- Se puede exportar a CSV

---

## MÓDULO: Dashboard

### ¿Qué es?
Pantalla principal con resumen general del sistema.

### Muestra:
- Total de productos registrados
- Movimientos recientes (últimos 7 días)
- Productos críticos (alertas de stock bajo)
- Valor total del inventario
- Gráficas de actividad

### Acceso:
- Todos los roles ven el dashboard
- Cada rol ve información según sus permisos

---

## MÓDULO: Gestión de Usuarios e Invitaciones

### ¿Qué es?
Permite al admin invitar nuevos usuarios y asignarles roles.

### Pasos para invitar:
1. Ir a Admin → Invitaciones
2. Ingresar email del nuevo usuario
3. Seleccionar rol (almacenista, supervisor, admin)
4. Enviar invitación

### Estados de invitación:
- Pendiente: enviada, esperando que el usuario se registre
- Aceptada: usuario se registró exitosamente
- Expirada: pasó el tiempo límite sin registro

---

## ROLES DEL SISTEMA

### Almacenista
- Puede: registrar entradas, salidas, consultar stock de obras asignadas, buscar productos
- No puede: aprobar reconciliaciones, ver costos, exportar reportes, configurar umbrales

### Supervisor
- Puede: todo lo del almacenista + aprobar/rechazar reconciliaciones, iniciar conteos físicos, ver KPIs, ver stock consolidado
- No puede: configurar umbrales, exportar reportes, ver costos detallados

### Admin
- Puede: todo + configurar umbrales, exportar reportes, ver costos, auditoría, gestionar usuarios

### Jefe
- Puede: absolutamente todo (mismo nivel que admin)

---

## PREGUNTAS FRECUENTES

### "¿Cómo corrijo el stock si está mal?"
Usa Reconciliación: haz un conteo físico y aprueba los ajustes.

### "¿Puedo deshacer un movimiento?"
No directamente. Registra un movimiento inverso (si fue salida, registra entrada por la misma cantidad).

### "¿Por qué no puedo registrar una salida?"
Probablemente no hay stock suficiente en esa obra. Verifica el stock actual primero.

### "¿Cómo muevo material entre obras?"
Usa Transferencia: selecciona origen, destino, productos y cantidades.

### "¿Dónde veo el historial de un producto?"
En Reportes → filtra por el producto específico. Verás todos sus movimientos.

### "¿Qué significa 'producto crítico'?"
Que su stock actual está por debajo del stock mínimo configurado. Necesita reabastecimiento.
