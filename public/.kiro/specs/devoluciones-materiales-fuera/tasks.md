# Implementation Plan: Devoluciones / Materiales Fuera de Almacén

## Overview

Implementación del módulo de Devoluciones para el sistema ADDBOX que controla materiales fuera de almacén. Se crean las columnas necesarias en la base de datos, la capa de servicio (`devoluciones.service.js`) con lógica de negocio, el controlador (`devoluciones.controller.js`) con renderizado de KPIs/tabla/modal/filtros, la página HTML (`registrar_devolucion.html`), y las integraciones con Dashboard y Sidebar. Se usa Vanilla JS con Supabase v1 siguiendo la arquitectura existente de capas Service → Controller → HTML.

## Tasks

- [x] 1. Configurar esquema de base de datos
  - [x] 1.1 Crear script SQL para columnas de devoluciones
    - Crear/actualizar archivo `modules/devoluciones/devoluciones-setup.sql`
    - Agregar `ALTER TABLE documentos_inventario ADD COLUMN IF NOT EXISTS estado text DEFAULT 'abierto'`
    - Agregar `ALTER TABLE documentos_inventario_detalle ADD COLUMN IF NOT EXISTS cantidad_devuelta numeric DEFAULT 0`
    - Agregar `ALTER TABLE documentos_inventario_detalle ADD COLUMN IF NOT EXISTS fecha_devolucion date`
    - Agregar políticas RLS que permitan UPDATE a usuarios autenticados en ambas tablas
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implementar capa de servicio
  - [x] 2.1 Implementar `obtenerMaterialesFuera()` en `devoluciones.service.js`
    - Importar `supabase` desde el cliente existente
    - Consultar `documentos_inventario_detalle` con join a `documentos_inventario` y `productos`
    - Calcular `pendiente = cantidad - cantidad_devuelta` para cada registro
    - Calcular `dias_fuera` como días enteros entre `creado_en` y fecha actual
    - Filtrar solo registros donde `pendiente > 0`
    - Retornar array de `MaterialFuera` con todos los campos requeridos (numero, tipo, proyecto, destino, codigo, descripcion, unidad, cantidad, devuelta, pendiente, dias_fuera, fecha_salida, estado_doc)
    - Ordenar por `dias_fuera` descendente
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Implementar `registrarDevolucion()` en `devoluciones.service.js`
    - Validar que `Q > 0` y `Q <= pendiente` antes de operar
    - Si validación falla, lanzar Error con mensaje descriptivo
    - UPDATE `cantidad_devuelta = cantidad_devuelta + Q` en `documentos_inventario_detalle`
    - UPDATE `fecha_devolucion = fecha actual` en el mismo registro
    - UPDATE `existencia = existencia + Q` en `productos` donde `codigo` coincida
    - Si producto no existe por código, completar sin modificar stock
    - Si error en UPDATE de detalle, lanzar error sin continuar
    - Si error en UPDATE de producto, log del error pero no interrumpir
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 2.3 Implementar `verificarCierreDocumento()` en `devoluciones.service.js`
    - Consultar todos los detalles del documento por `documento_id`
    - Si todos tienen `pendiente == 0`, UPDATE `estado = 'cerrado'` en `documentos_inventario`
    - Si al menos uno tiene `pendiente > 0`, mantener `estado = 'abierto'`
    - Invocar esta función al final de `registrarDevolucion()` exitoso
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.4 Implementar `obtenerResumenDevoluciones()` en `devoluciones.service.js`
    - Recibir parámetro `diasLimite` (default: 7)
    - Calcular `totalFuera`: count de registros con `pendiente > 0`
    - Calcular `vencidos`: count de registros con `pendiente > 0` AND `dias_fuera > diasLimite`
    - Calcular `diasPromedio`: media aritmética de `dias_fuera` de todos los materiales fuera
    - Calcular `devolucionesHoy`: count de registros con `fecha_devolucion = hoy`
    - Retornar objeto `ResumenDevoluciones`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1_

  - [x] 2.5 Implementar `obtenerDetallesDocumento()` en `devoluciones.service.js`
    - Recibir `documentoId` como parámetro
    - Consultar detalles del documento con información del producto
    - Calcular `pendiente` para cada detalle
    - Retornar array con datos necesarios para el modal
    - _Requirements: 8.1, 8.2_

- [x] 3. Checkpoint - Verificar capa de servicio
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar controlador y página HTML
  - [x] 4.1 Crear estructura HTML en `registrar_devolucion.html`
    - Crear/actualizar archivo `modules/devoluciones/registrar_devolucion.html`
    - Incluir header con título "Devoluciones / Materiales Fuera"
    - Sección de 4 KPI cards: Materiales fuera, Vencidos, Días promedio fuera, Devoluciones hoy
    - Barra de filtros: input búsqueda, select tipo documento, select estado, inputs fecha desde/hasta, inputs días mín/máx
    - Tabla principal con columnas: Documento, Obra/Destino, Producto, Salió, Devuelto, Pendiente, Días fuera, Estado, Acciones
    - Modal de devolución (oculto por defecto) con tabla de productos del documento y campos "Devolver ahora"
    - Importar scripts del servicio y controlador como ES modules
    - _Requirements: 5.1, 6.1, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

  - [x] 4.2 Implementar renderizado de KPIs en `devoluciones.controller.js`
    - Implementar `calcularKPIs(materiales)` que calcula los 4 indicadores
    - Implementar `renderizarKPIs(kpis)` que actualiza el DOM de las cards
    - Mostrar cero en todas las cards cuando no hay materiales fuera
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 Implementar renderizado de tabla en `devoluciones.controller.js`
    - Implementar `renderizarTabla(materiales)` que genera filas HTML
    - Implementar `determinarIndicador(material)` que retorna 🟢/🟡/🔴 según estado
    - Agregar botón "Devolver" y "Devolver todo" en filas con `pendiente > 0`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 4.4 Implementar sistema de filtros en `devoluciones.controller.js`
    - Implementar `configurarFiltros()` con event listeners en todos los controles
    - Implementar `aplicarFiltros()` con semántica de intersección (AND)
    - Filtro texto: buscar en número documento, descripción producto, código, proyecto
    - Filtro tipo: Traslado, Requisición de materiales, Requisición de herramienta
    - Filtro estado: Pendiente, Vencido, Cerrado
    - Filtro rango fechas: aplicado a fecha de creación del documento
    - Filtro rango días fuera: mínimo y máximo de dias_fuera
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.5 Implementar modal de devolución en `devoluciones.controller.js`
    - Implementar `abrirModalDevolucion(docId)` que carga detalles del documento
    - Mostrar información del documento (número, tipo, proyecto, fecha)
    - Mostrar tabla de productos con campos "Devolver ahora" (input numérico)
    - Restringir input a valores entre 1 y pendiente de cada producto
    - Validar que no se exceda pendiente antes de enviar
    - Implementar `confirmarDevolucion()` que invoca servicio para cada producto con valor > 0
    - Al éxito: cerrar modal, refrescar tabla, mostrar toast de éxito
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 4.6 Implementar "Devolver todo" en `devoluciones.controller.js`
    - Al click en "Devolver todo" de una fila, invocar `registrarDevolucion` con Q = pendiente
    - Refrescar tabla y KPIs tras éxito
    - Mostrar toast de confirmación
    - _Requirements: 6.6, 3.1, 3.3_

- [x] 5. Checkpoint - Verificar módulo principal
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implementar suscripción realtime y integraciones
  - [x] 6.1 Implementar suscripción realtime en `devoluciones.controller.js`
    - Implementar `iniciarRealtime()` con `.on("UPDATE", callback).subscribe()` de Supabase v1
    - Suscribirse a eventos UPDATE en `documentos_inventario_detalle`
    - Al recibir evento: refrescar KPIs y tabla
    - Implementar `destruirRealtime()` para desuscribirse al salir del módulo
    - Manejar pérdida de conexión con re-suscripción automática
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 6.2 Implementar integración con Dashboard en `dashboard.js`
    - Importar `obtenerResumenDevoluciones` del servicio
    - Renderizar card "Materiales fuera" con total
    - Renderizar card "Materiales vencidos" con indicador rojo si > 0
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.3 Implementar integración con Sidebar en `sidebar.js`
    - Mostrar badge rojo junto al ítem "Devoluciones" cuando hay materiales vencidos
    - Actualizar badge al cargar y cuando cambian los datos
    - _Requirements: 9.5_

- [x] 7. Checkpoint - Verificar integraciones
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Property-based tests del servicio
  - [x]* 8.1 Escribir property test para cálculo de pendiente
    - **Property 1: Pendiente calculation correctness**
    - Usar fast-check para generar pares `{cantidad: arb number >= 0, cantidad_devuelta: arb number >= 0}` donde `cantidad_devuelta <= cantidad`
    - Verificar: `pendiente == cantidad - cantidad_devuelta` para todos los casos
    - **Validates: Requirements 2.2**

  - [x]* 8.2 Escribir property test para cálculo de dias_fuera
    - **Property 2: Dias_Fuera calculation correctness**
    - Usar fast-check para generar fechas `creado_en` entre hace 365 días y hoy
    - Verificar: `dias_fuera` es exactamente el número de días enteros entre `creado_en` y hoy
    - **Validates: Requirements 2.3**

  - [x]* 8.3 Escribir property test para validación de devolución
    - **Property 4: Return validation invariant**
    - Usar fast-check para generar `{pendiente: arb number > 0, Q: arb number}`
    - Verificar: operación exitosa si y solo si `Q > 0` AND `Q <= pendiente`
    - Verificar: tras éxito, `cantidad_devuelta` nunca excede `cantidad`
    - **Validates: Requirements 3.1, 11.1**

  - [x]* 8.4 Escribir property test para incremento de cantidad_devuelta
    - **Property 5: Return operation increments cantidad_devuelta by exactly Q**
    - Usar fast-check para generar `{cantidad_devuelta_prev: arb number >= 0, Q: arb number > 0}` con mock de Supabase
    - Verificar: resultado `cantidad_devuelta == cantidad_devuelta_prev + Q`
    - **Validates: Requirements 3.3**

  - [x]* 8.5 Escribir property test para cierre de documento
    - **Property 7: Document state reflects completion**
    - Usar fast-check para generar arrays de detalles con `{cantidad, cantidad_devuelta}` aleatorios
    - Verificar: estado es "cerrado" si y solo si todos los detalles tienen `pendiente == 0`
    - **Validates: Requirements 4.2, 4.3**

  - [x]* 8.6 Escribir property test para cálculos de KPIs
    - **Property 8: KPI calculations correctness**
    - Usar fast-check para generar arrays de MaterialFuera con valores aleatorios
    - Verificar: vencidos == count donde `pendiente > 0` AND `dias_fuera > umbral`
    - Verificar: diasPromedio == media aritmética de `dias_fuera`
    - Verificar: devolucionesHoy == count donde `fecha_devolucion == hoy`
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 9. Property-based tests del controlador
  - [x]* 9.1 Escribir property test para indicador de estado
    - **Property 9: Status indicator determination**
    - Usar fast-check para generar `{pendiente: arb number >= 0, dias_fuera: arb number >= 0, umbral: arb number > 0}`
    - Verificar: si `pendiente == 0` → 🟢; si `pendiente > 0` AND `dias_fuera <= umbral` → 🟡; si `pendiente > 0` AND `dias_fuera > umbral` → 🔴
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [x]* 9.2 Escribir property test para composición de filtros
    - **Property 10: Filter composition — intersection semantics**
    - Usar fast-check para generar arrays de MaterialFuera y combinaciones de filtros activos
    - Verificar: resultado es exactamente la intersección de filas que cumplen cada filtro individual
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

  - [x]* 9.3 Escribir property test para incremento de existencia
    - **Property 6: Return operation increments existencia by exactly Q**
    - Usar fast-check para generar `{existencia_prev: arb number >= 0, Q: arb number > 0}` con mock de Supabase
    - Verificar: resultado `existencia == existencia_prev + Q`
    - Verificar: ningún otro campo del producto es modificado
    - **Validates: Requirements 3.5, 11.2, 11.4**

- [x] 10. Checkpoint final - Verificar todas las pruebas y funcionalidad
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- El módulo usa Vanilla JS sin frameworks, consistente con el resto del proyecto
- Los cálculos de `pendiente` y `dias_fuera` se realizan en el frontend (no vistas SQL)
- Las operaciones de devolución son secuenciales (detalle → producto → cierre) por limitación de Supabase v1
- Realtime usa la API `.on("EVENT", callback).subscribe()` de Supabase v1
- El umbral de vencimiento por defecto es 7 días

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.4", "2.5"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "4.6"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "9.1", "9.2", "9.3"] }
  ]
}
```
