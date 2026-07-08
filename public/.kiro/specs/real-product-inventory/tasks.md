# Implementation Plan: Real Product Inventory

## Overview

Implementación del sistema de inventario en tiempo real para ADDBOX. Se sigue un enfoque incremental: primero la base de datos y funciones RPC, luego los servicios compartidos, después los módulos de UI (inventario, movimientos, reconciliación, lotes, reportes), y finalmente la integración realtime y alertas. Cada paso construye sobre el anterior, asegurando que no quede código huérfano.

## Tasks

- [x] 1. Base de datos y funciones RPC
  - [x] 1.1 Crear script SQL con tablas nuevas y extensiones
    - Crear archivo `admin-dashboard/sql/001-schema-inventario.sql`
    - Incluir: tabla `stock_obra` con constraint UNIQUE(producto_id, obra_id) e índices
    - Incluir: tabla `conteos_fisicos` con estados y timestamps
    - Incluir: tabla `conteo_lineas` con columna generada `diferencia`
    - Incluir: tabla `lotes_operacion` con constraint de total_lineas
    - Incluir: tabla `usuario_obras` con UNIQUE(usuario_id, obra_id)
    - Incluir: ALTER TABLE `productos` para agregar `umbral_critico`, `umbral_alerta` y constraint
    - Incluir: ALTER TABLE `movimientos` para agregar columnas nuevas y constraints
    - _Requirements: 1.5, 2.5, 2.6, 3.1, 5.6, 6.4, 10.1_

  - [x] 1.2 Crear función RPC `registrar_movimiento`
    - Crear archivo `admin-dashboard/sql/002-rpc-registrar-movimiento.sql`
    - Implementar validación de cantidad según tipo (1-999999 para entrada/salida, !=0 para ajuste)
    - Implementar verificación de stock con `FOR UPDATE` para concurrencia
    - Implementar lógica de transferencia con referencia cruzada
    - Implementar actualización de `stock_obra` según tipo de movimiento
    - Implementar validación de motivo mínimo 10 caracteres para ajustes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 2.1, 2.3, 2.6_

  - [x] 1.3 Crear función RPC `procesar_lote`
    - Crear archivo `admin-dashboard/sql/003-rpc-procesar-lote.sql`
    - Implementar validación de límite 1-500 líneas
    - Implementar procesamiento atómico iterando sobre cada línea
    - Implementar rollback automático si alguna línea falla
    - Registrar lote en `lotes_operacion` con estado
    - _Requirements: 6.2, 6.4_

  - [x] 1.4 Crear políticas RLS
    - Crear archivo `admin-dashboard/sql/004-rls-policies.sql`
    - Habilitar RLS en `stock_obra`, `movimientos`, `conteos_fisicos`, `conteo_lineas`
    - Política de lectura para admin/jefe/supervisor (todas las obras)
    - Política de lectura para almacenista (solo obras asignadas via `usuario_obras`)
    - Política de auditoría: solo SELECT para admin/jefe, bloquear UPDATE/DELETE
    - Política de conteos: solo supervisores y admin pueden crear/leer
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 7.3_

- [x] 2. Checkpoint - Verificar esquema de base de datos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Servicios compartidos
  - [x] 3.1 Implementar `csvService.js`
    - Crear archivo `admin-dashboard/services/csvService.js`
    - Implementar `parsearCSV(texto, columnasEsperadas)` — parsear texto CSV a array de objetos
    - Implementar `generarCSV(datos, columnas, metadata)` — generar string CSV con BOM para Excel
    - Implementar `descargarCSV(contenido, nombreArchivo)` — trigger descarga en navegador
    - Validar columnas requeridas, reportar errores por fila
    - _Requirements: 6.5, 6.6, 7.4, 9.4_

  - [ ]* 3.2 Write property test for CSV round-trip
    - **Property 13: CSV parsing round-trip**
    - **Validates: Requirements 6.5, 6.6**
    - Crear `admin-dashboard/__tests__/properties/csv-roundtrip.property.test.js`
    - Usar fast-check para generar líneas aleatorias con caracteres especiales
    - Verificar que generarCSV → parsearCSV produce datos equivalentes

  - [x] 3.3 Implementar `stockAlertService.js`
    - Crear archivo `admin-dashboard/services/stockAlertService.js`
    - Implementar `clasificarAlerta(cantidad, umbralCritico, umbralAlerta)` — retorna 'critico'|'alerta'|'normal'
    - Implementar `obtenerUmbrales(productoId)` — consulta umbrales personalizados o default
    - Implementar `configurarUmbrales(productoId, umbralCritico, umbralAlerta)` — valida y guarda
    - Implementar `obtenerProductosCriticos(obraId?)` — lista productos bajo umbral crítico
    - Implementar `validarUmbrales(umbralCritico, umbralAlerta)` — validación de reglas
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 3.4 Write property tests for alert classification and threshold validation
    - **Property 15: Alert status classification**
    - **Property 16: Threshold validation**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.7**
    - Crear `admin-dashboard/__tests__/properties/alert-classification.property.test.js`
    - Crear `admin-dashboard/__tests__/properties/threshold-validation.property.test.js`
    - Usar fast-check para generar cantidades y umbrales aleatorios

  - [x] 3.5 Implementar `realtimeService.js`
    - Crear archivo `admin-dashboard/services/realtimeService.js`
    - Implementar clase `RealtimeService` con constructor que recibe supabaseClient
    - Implementar `subscribe(obraId, onInsert)` — suscripción a INSERT en movimientos filtrado por obra
    - Implementar `unsubscribe()` — cancelar suscripción activa
    - Implementar `getStatus()` — retorna estado de conexión
    - Implementar `retry()` — reintento manual de conexión
    - Implementar reconexión automática con intervalos exponenciales (1s, 2s, 4s, 8s, 16s)
    - Máximo 5 reintentos antes de pasar a estado 'disconnected'
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [x] 4. Módulo principal de inventario
  - [x] 4.1 Implementar `inventario.service.js`
    - Crear archivo `admin-dashboard/modules/inventario/inventario.service.js`
    - Implementar `obtenerStockPorObra(obraId)` — consulta stock_obra con join a productos
    - Implementar `obtenerStockConsolidado()` — agrupación por producto con totales
    - Implementar `obtenerStockProductoObra(productoId, obraId)` — cantidad individual
    - Implementar `registrarEntrada(datos)` — llama RPC `registrar_movimiento` tipo entrada
    - Implementar `registrarSalida(datos)` — llama RPC `registrar_movimiento` tipo salida
    - Implementar `registrarTransferencia(datos)` — llama RPC tipo transferencia_salida
    - Implementar `registrarAjuste(datos)` — llama RPC tipo ajuste con motivo
    - Implementar `obtenerMovimientosPorObra(obraId, {limit, offset})` — historial paginado
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 2.1, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.2 Write property tests for stock calculation and quantity validation
    - **Property 5: Stock calculation invariant**
    - **Property 3: Invalid quantity rejection**
    - **Property 4: Stock sufficiency validation**
    - **Validates: Requirements 1.6, 1.7, 1.8, 2.1, 2.5**
    - Crear `admin-dashboard/__tests__/properties/stock-calculation.property.test.js`
    - Crear `admin-dashboard/__tests__/properties/quantity-validation.property.test.js`
    - Usar fast-check para generar secuencias de movimientos y verificar invariantes

  - [x] 4.3 Crear vista HTML `inventario.html`
    - Crear archivo `admin-dashboard/modules/inventario/inventario.html`
    - Incluir selector de obra con opción "Todas" para admin/jefe
    - Incluir tabla de stock con columnas: código, descripción, unidad, cantidad, estado alerta, valor
    - Incluir KPIs: total productos, valor inventario, stock crítico, productos activos
    - Incluir indicador visual de conexión realtime (conectado/reconectando/desconectado)
    - Incluir panel resumen de productos críticos
    - Incluir botón para registrar movimiento (abre modal)
    - Incluir paginación para historial de movimientos
    - _Requirements: 3.2, 3.4, 4.5, 8.1, 8.6_

  - [x] 4.4 Implementar `inventario.ui.js`
    - Crear archivo `admin-dashboard/modules/inventario/inventario.ui.js`
    - Implementar renderizado de tabla de stock con indicadores de color (rojo/naranja/verde)
    - Implementar renderizado de KPIs
    - Implementar renderizado de panel de productos críticos ordenados por menor stock
    - Implementar actualización parcial de UI sin recarga completa
    - Implementar indicador visual de estado de conexión realtime
    - Implementar ocultamiento de elementos según rol (no renderizar en DOM)
    - _Requirements: 4.4, 8.1, 8.2, 8.3, 8.6, 8.7, 10.5_

  - [x] 4.5 Implementar `inventario.controller.js`
    - Crear archivo `admin-dashboard/modules/inventario/inventario.controller.js`
    - Orquestar carga inicial: obtener obras del usuario, cargar stock de obra seleccionada
    - Gestionar cambio de obra: cancelar suscripción anterior, suscribir a nueva obra
    - Integrar RealtimeService: suscribir a movimientos, actualizar UI en cada INSERT
    - Gestionar filtrado por rol: almacenista solo ve obras asignadas
    - Manejar reconexión: mostrar indicador, botón de reintento manual
    - _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.6, 10.1_

- [x] 5. Checkpoint - Verificar módulo de inventario base
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Formulario de movimientos
  - [x] 6.1 Crear vista HTML `movimientos-form.html`
    - Crear archivo `admin-dashboard/modules/inventario/movimientos-form.html`
    - Modal con selector de tipo (entrada, salida, transferencia, ajuste)
    - Campos dinámicos según tipo: obra destino para transferencia, motivo para ajuste
    - Validación visual en tiempo real de campos
    - Preservar datos del formulario si hay error de validación
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.4_

  - [x] 6.2 Implementar `movimientos-form.controller.js`
    - Crear archivo `admin-dashboard/modules/inventario/movimientos-form.controller.js`
    - Validar inputs en frontend antes de enviar (cantidad, motivo, selecciones)
    - Llamar al service correspondiente según tipo de movimiento
    - Manejar errores: mostrar toast, preservar formulario, resaltar campos inválidos
    - Mostrar stock disponible actual al seleccionar producto y obra
    - _Requirements: 1.6, 1.7, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 6.3 Write property test for movement creation
    - **Property 1: Movement creation preserves required fields**
    - **Property 2: Transfer creates exactly two linked movements**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - Crear `admin-dashboard/__tests__/properties/movement-creation.property.test.js`
    - Usar fast-check para generar movimientos válidos y verificar campos requeridos

- [x] 7. Módulo de reconciliación
  - [x] 7.1 Implementar `reconciliacion.service.js`
    - Crear archivo `admin-dashboard/modules/inventario/reconciliacion.service.js`
    - Implementar `iniciarConteoFisico(obraId)` — crear conteo y cargar productos con stock_sistema
    - Implementar `registrarCantidadFisica(conteoId, productoId, cantidadFisica)` — validar y guardar
    - Implementar `finalizarConteo(conteoId)` — calcular diferencias, cambiar estado a completado
    - Implementar `aprobarReconciliacion(conteoId)` — generar ajustes automáticos via RPC
    - Implementar `rechazarReconciliacion(conteoId)` — descartar ajustes, mantener stock
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 7.2 Write property tests for reconciliation
    - **Property 8: Reconciliation difference calculation**
    - **Property 9: Reconciliation approval equalizes stock**
    - **Property 10: Reconciliation rejection preserves stock**
    - **Property 19: Physical count input validation**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.8**
    - Crear `admin-dashboard/__tests__/properties/reconciliation.property.test.js`
    - Usar fast-check para generar stocks y conteos aleatorios

  - [x] 7.3 Crear vista HTML `reconciliacion.html`
    - Crear archivo `admin-dashboard/modules/inventario/reconciliacion.html`
    - Lista de productos con campo de entrada para cantidad física
    - Validación de input: solo enteros >= 0 y <= 999,999
    - Vista de diferencias con columnas: producto, stock sistema, stock físico, diferencia
    - Botones aprobar/rechazar reconciliación
    - Alerta visual cuando hay conteo en progreso
    - _Requirements: 5.1, 5.3, 5.7, 5.8_

  - [x] 7.4 Implementar `reconciliacion.controller.js`
    - Crear archivo `admin-dashboard/modules/inventario/reconciliacion.controller.js`
    - Orquestar flujo: iniciar conteo → registrar cantidades → finalizar → aprobar/rechazar
    - Validar permisos: solo supervisor y admin pueden acceder
    - Manejar estado del conteo y transiciones
    - Mostrar alerta de conteo activo a otros usuarios
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 10.2_

- [x] 8. Módulo de operaciones por lote
  - [x] 8.1 Implementar `lote.service.js`
    - Crear archivo `admin-dashboard/modules/inventario/lote.service.js`
    - Implementar `validarLote(lineas)` — validar cada línea individualmente
    - Implementar `procesarLote(lineas)` — llamar RPC `procesar_lote`
    - Implementar `parsearCSV(contenidoCSV)` — usar csvService para parsear y mapear columnas
    - Validar límite de 500 líneas
    - Reportar errores por línea con motivo específico
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 8.2 Write property tests for batch operations
    - **Property 11: Batch all-or-nothing processing**
    - **Property 12: Batch line error reporting**
    - **Validates: Requirements 6.2, 6.3, 6.4**
    - Crear `admin-dashboard/__tests__/properties/batch-validation.property.test.js`
    - Usar fast-check para generar lotes con mix de líneas válidas e inválidas

  - [x] 8.3 Crear vista HTML `lote.html`
    - Crear archivo `admin-dashboard/modules/inventario/lote.html`
    - Tabla editable para agregar líneas manualmente (producto, cantidad, tipo, obra)
    - Botón de importar CSV con input file
    - Indicadores visuales de líneas válidas/inválidas con motivo de error
    - Botón confirmar lote (deshabilitado si hay errores)
    - _Requirements: 6.1, 6.3, 6.5_

  - [x] 8.4 Implementar `lote.controller.js`
    - Crear archivo `admin-dashboard/modules/inventario/lote.controller.js`
    - Gestionar agregar/eliminar líneas manualmente
    - Gestionar importación CSV: leer archivo, parsear, mostrar errores o cargar líneas
    - Validar lote completo antes de confirmar
    - Marcar líneas inválidas sin perder las válidas
    - Procesar lote y mostrar resultado (éxito o error)
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

- [x] 9. Checkpoint - Verificar módulos de movimientos, reconciliación y lotes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Módulo de reportes y auditoría
  - [x] 10.1 Implementar `reportes-inventario.service.js`
    - Crear archivo `admin-dashboard/modules/inventario/reportes-inventario.service.js`
    - Implementar `reporteExistencias()` — stock por obra y total, ordenado alfabéticamente
    - Implementar `reporteMovimientos(filtros)` — filtrable por fechas, tipo, producto, obra; default 30 días
    - Implementar `reporteValorizacion()` — stock × costo_prom por producto-obra con gran total
    - Implementar `reporteRotacion(fechaInicio, fechaFin)` — conteo movimientos por producto, orden desc
    - Implementar `exportarReporte(datos, tipo)` — generar CSV con encabezado y fecha
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 10.2 Write property tests for valuation and rotation reports
    - **Property 17: Inventory valuation calculation**
    - **Property 18: Rotation report ordering**
    - **Validates: Requirements 9.3, 9.5**
    - Crear `admin-dashboard/__tests__/properties/valuation-rotation.property.test.js`
    - Usar fast-check para generar productos con stocks y costos aleatorios

  - [x] 10.3 Implementar consulta de pista de auditoría
    - Extender `admin-dashboard/services/auditService.js` (existente)
    - Implementar consulta paginada (50 registros por página) con filtros: tipo, producto, obra, usuario, rango fechas
    - Implementar exportación CSV de auditoría (máximo 10,000 registros)
    - Registrar operaciones de reconciliación en auditoría
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_

  - [ ]* 10.4 Write property test for audit trail completeness
    - **Property 14: Audit trail completeness**
    - **Validates: Requirements 7.1, 7.5**
    - Crear `admin-dashboard/__tests__/properties/audit-trail.property.test.js`
    - Verificar que cada movimiento genera un registro de auditoría correspondiente

  - [x] 10.5 Crear vista HTML `reportes-inventario.html`
    - Crear archivo `admin-dashboard/modules/inventario/reportes-inventario.html`
    - Selector de tipo de reporte (existencias, movimientos, valorización, rotación)
    - Filtros dinámicos según tipo de reporte
    - Tabla de resultados con paginación
    - Botón exportar CSV
    - Mensaje cuando no hay datos para los filtros seleccionados
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 10.6 Implementar `reportes-inventario.controller.js`
    - Crear archivo `admin-dashboard/modules/inventario/reportes-inventario.controller.js`
    - Orquestar generación de reportes según tipo seleccionado
    - Gestionar filtros y aplicar defaults (30 días para movimientos)
    - Gestionar exportación CSV con csvService
    - Restringir acceso: solo admin/jefe pueden exportar
    - _Requirements: 9.2, 9.4, 10.3_

- [x] 11. Control de acceso y permisos en frontend
  - [x] 11.1 Implementar guards de rol para inventario
    - Extender `admin-dashboard/services/role-guard.js` (existente)
    - Agregar verificación de permisos para cada operación de inventario
    - Almacenista: solo entradas, salidas, consulta de obras asignadas
    - Supervisor: consulta todas las obras, conteos físicos, reconciliaciones
    - Admin/Jefe: todas las operaciones
    - Ocultar elementos de UI según rol (no renderizar en DOM)
    - Mostrar mensaje cuando almacenista no tiene obras asignadas
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 11.2 Write property test for obra filtering by role
    - **Property 7: Obra filtering for almacenista role**
    - **Validates: Requirements 3.7, 10.1**
    - Crear `admin-dashboard/__tests__/properties/role-filtering.property.test.js`
    - Usar fast-check para generar usuarios con obras asignadas y verificar filtrado

- [x] 12. Integración final y navegación
  - [x] 12.1 Integrar módulo de inventario en sidebar y navegación
    - Actualizar `admin-dashboard/components/sidebar/sidebar.html` con enlace al módulo de inventario
    - Configurar rutas/navegación para las vistas: inventario, reconciliación, lotes, reportes
    - Asegurar que el módulo se carga correctamente desde el dashboard principal
    - Conectar todos los controllers con los services y UI correspondientes
    - _Requirements: 3.2, 10.5_

  - [x] 12.2 Integrar alertas de stock en dashboard principal
    - Actualizar `admin-dashboard/modules/dashboard/dashboard.js` para mostrar badge de stock crítico
    - Mostrar panel resumen de productos críticos en dashboard
    - Conectar con stockAlertService para datos en tiempo real
    - _Requirements: 8.1, 8.6_

  - [ ]* 12.3 Write integration tests
    - Test RLS: almacenista no puede leer stock de obra no asignada
    - Test RPC: `registrar_movimiento` rechaza stock negativo bajo concurrencia
    - Test RPC: `procesar_lote` es atómico (rollback si falla una línea)
    - Test Realtime: INSERT en movimientos llega al cliente
    - _Requirements: 2.6, 6.4, 4.1, 10.4_

- [x] 13. Final checkpoint - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses vanilla HTML/JS with Supabase v1 client — no build tools or frameworks
- All SQL scripts should be run against Supabase via the SQL editor or migrations
- RLS policies enforce server-side security; frontend guards are for UX only
- fast-check library will be used for property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1", "3.3", "3.5"] },
    { "id": 3, "tasks": ["3.2", "3.4"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3"] },
    { "id": 8, "tasks": ["7.1", "8.1"] },
    { "id": 9, "tasks": ["7.2", "7.3", "8.2", "8.3"] },
    { "id": 10, "tasks": ["7.4", "8.4"] },
    { "id": 11, "tasks": ["10.1", "10.3"] },
    { "id": 12, "tasks": ["10.2", "10.4", "10.5"] },
    { "id": 13, "tasks": ["10.6", "11.1"] },
    { "id": 14, "tasks": ["11.2", "12.1", "12.2"] },
    { "id": 15, "tasks": ["12.3"] }
  ]
}
```
