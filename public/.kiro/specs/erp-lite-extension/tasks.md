# Implementation Plan: ERP-Lite Extension

## Overview

Implementación incremental de la extensión ERP-Lite para ADDBOX. Se construyen primero los módulos base (categorías, unidades), luego los módulos dependientes (proveedores, compras), seguidos por los módulos de visualización (costos, reportes, dashboard KPI), y finalmente la optimización del módulo de inventario. Cada módulo sigue la arquitectura controller/service/ui con vanilla JS + ES modules y Supabase como backend.

## Tasks

- [ ] 1. Crear tablas y esquema de base de datos en Supabase
  - [ ] 1.1 Crear tablas categorias, unidades, proveedores, compras y compras_detalle
    - Crear tabla `categorias` con campos: id (uuid PK), nombre (varchar 100, UNIQUE case-insensitive), descripcion (varchar 255, nullable), estado (CHECK activo/inactivo, default activo), creado_en, actualizado_en
    - Crear tabla `unidades` con campos: id (uuid PK), nombre (varchar 50, UNIQUE), abreviatura (varchar 10, NOT NULL), estado (CHECK activo/inactivo), creado_en, actualizado_en
    - Crear tabla `proveedores` con campos: id (uuid PK), nombre (varchar 150), rif (varchar 20), telefono, email, direccion, estado, creado_en
    - Crear tabla `compras` con campos: id (uuid PK), proveedor_id (FK), fecha, estado (CHECK borrador/confirmado/anulado), total (numeric 12,2), creado_en
    - Crear tabla `compras_detalle` con campos: id (uuid PK), compra_id (FK), producto_id (FK), cantidad (CHECK 1-999999), costo_unitario (CHECK 0.01-999999999.99), subtotal
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 5.2_

  - [ ] 1.2 Agregar columnas categoria_id y unidad_id a la tabla productos
    - Agregar columna `categoria_id` (uuid, FK → categorias, nullable) a tabla productos
    - Agregar columna `unidad_id` (uuid, FK → unidades, nullable) a tabla productos
    - _Requirements: 2.5, 2.6, 3.4, 3.5_

- [ ] 2. Implementar Módulo de Categorías
  - [ ] 2.1 Crear categorias.service.js con funciones CRUD y validación
    - Implementar: obtenerCategorias, obtenerCategoriasActivas, crearCategoria, actualizarCategoria, eliminarCategoria
    - Implementar: verificarNombreUnico (case-insensitive con trim), tieneProductosAsociados
    - Exportar funciones puras: validarCampoRequerido, sonNombresIguales
    - Todas las llamadas a Supabase centralizadas en este archivo
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [ ] 2.2 Crear categorias.controller.js con orquestación de flujos
    - Implementar inicialización del módulo, carga de datos, manejo de eventos
    - Validar inputs antes de llamar al service (nombre requerido, trim, unicidad)
    - Manejar errores con showToast según patrón try/catch del proyecto
    - Impedir eliminación si tieneProductosAsociados retorna true
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

  - [ ] 2.3 Crear categorias.ui.js con renderizado de interfaz
    - Implementar renderizado de tabla de categorías con columnas: nombre, descripción, estado, acciones
    - Implementar renderizado de formulario modal para crear/editar
    - Implementar renderizado de mensajes de error inline
    - _Requirements: 2.1_

  - [ ] 2.4 Crear categorias.html con estructura de página
    - Crear página HTML con tabla, botón crear, modal de formulario
    - Importar controller.js como módulo ES
    - Seguir estructura de layout existente (sidebar, navbar)
    - _Requirements: 2.1_

  - [ ]* 2.5 Escribir property tests para validación de categorías
    - **Property 4: Required Field Validation** — validar que campos vacíos/null/whitespace son rechazados
    - **Property 5: Name Uniqueness Detection** — validar detección case-insensitive de duplicados
    - **Property 6: Input Trim Sanitization** — validar que trim preserva contenido interno
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 2.6 Escribir unit tests para categorias.service.js
    - Test CRUD con mocks de Supabase
    - Test edge cases: nombre vacío, nombre duplicado, eliminar con productos asociados
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [ ] 3. Implementar Módulo de Unidades
  - [ ] 3.1 Crear unidades.service.js con funciones CRUD y validación
    - Implementar: obtenerUnidades, obtenerUnidadesActivas, crearUnidad, actualizarUnidad, eliminarUnidad
    - Implementar: verificarNombreUnicoUnidad, tieneProductosAsociados
    - Validar nombre y abreviatura como campos requeridos
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [ ] 3.2 Crear unidades.controller.js con orquestación de flujos
    - Implementar inicialización, carga de datos, manejo de eventos
    - Validar nombre y abreviatura requeridos antes de enviar al service
    - Impedir eliminación si la unidad tiene productos referenciados
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [ ] 3.3 Crear unidades.ui.js con renderizado de interfaz
    - Renderizar tabla de unidades con columnas: nombre, abreviatura, estado, acciones
    - Renderizar formulario modal para crear/editar
    - _Requirements: 3.1_

  - [ ] 3.4 Crear unidades.html con estructura de página
    - Crear página HTML con tabla, botón crear, modal de formulario
    - Importar controller.js como módulo ES
    - _Requirements: 3.1_

  - [ ]* 3.5 Escribir property tests para validación de unidades
    - **Property 4: Required Field Validation** — validar nombre y abreviatura requeridos
    - **Property 5: Name Uniqueness Detection** — validar unicidad de nombre
    - **Property 7: Active Catalog Items Sorted Alphabetically** — validar filtrado y orden de items activos
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.7**

- [ ] 4. Integrar categorías y unidades en Módulo Productos
  - [ ] 4.1 Modificar formularios de productos para incluir selects de categoría y unidad
    - Agregar campo select de categoría poblado con categorías activas ordenadas alfabéticamente
    - Agregar campo select de unidad poblado con unidades activas ordenadas alfabéticamente
    - Guardar categoria_id y unidad_id al crear/editar producto
    - No modificar comportamiento CRUD ni modales existentes
    - _Requirements: 2.5, 2.6, 3.4, 3.5, 1.6_

  - [ ]* 4.2 Escribir property test para población de selects
    - **Property 7: Active Catalog Items Sorted Alphabetically** — validar que solo items activos aparecen, ordenados por nombre
    - **Validates: Requirements 2.5, 3.4**

- [ ] 5. Checkpoint - Verificar módulos base
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implementar Módulo de Proveedores
  - [ ] 6.1 Crear proveedores.service.js con funciones CRUD
    - Implementar: obtenerProveedores, obtenerProveedorPorId, crearProveedor, actualizarProveedor, eliminarProveedor
    - Implementar: obtenerHistorialCompras (limit 50, ordenado por fecha desc), tieneComprasAsociadas
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [ ] 6.2 Crear proveedores.controller.js con orquestación de flujos
    - Validar nombre y rif como campos requeridos
    - Implementar vista de detalle con historial de compras
    - Impedir eliminación si tiene compras asociadas
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 6.3 Crear proveedores.ui.js con renderizado de interfaz
    - Renderizar tabla de proveedores, formulario modal, vista de detalle con historial
    - _Requirements: 4.1, 4.4_

  - [ ] 6.4 Crear proveedores.html con estructura de página
    - Crear página HTML con tabla, botón crear, modal, sección de detalle
    - _Requirements: 4.1_

  - [ ]* 6.5 Escribir property tests para proveedores
    - **Property 8: Referential Integrity Prevents Deletion** — validar que proveedores con compras no se eliminan
    - **Property 9: Purchase History Sorted and Limited** — validar orden descendente y límite de 50
    - **Validates: Requirements 4.4, 4.5**

- [ ] 7. Implementar Módulo de Compras
  - [ ] 7.1 Crear compras.service.js con funciones de negocio
    - Implementar: obtenerCompras, obtenerCompraPorId, crearCompra, agregarLineaDetalle, eliminarLineaDetalle
    - Implementar: confirmarCompra (actualizar stock + costo_prom + registrar movimientos + auditoría)
    - Implementar: anularCompra (revertir stock si estaba confirmada, registrar movimientos de salida)
    - Exportar funciones puras: calcularSubtotal, calcularTotalCompra, calcularCostoPromedioPonderado, validarLineaDetalle, puedeEditar
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [ ] 7.2 Crear compras.controller.js con orquestación de flujos
    - Implementar flujo de creación de compra con selección de proveedor activo
    - Implementar agregar/eliminar líneas de detalle con validación de rangos
    - Implementar confirmación: validar que tiene líneas, ejecutar confirmarCompra
    - Implementar anulación: distinguir entre borrador y confirmada
    - Deshabilitar edición cuando estado !== "borrador"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [ ] 7.3 Crear compras.ui.js con renderizado de interfaz
    - Renderizar lista de compras con estado visual (badge de color)
    - Renderizar formulario de compra con tabla de líneas de detalle editable
    - Renderizar totales calculados en tiempo real
    - Deshabilitar controles según estado de la compra
    - _Requirements: 5.1, 5.2, 5.3, 5.8_

  - [ ] 7.4 Crear compras.html con estructura de página
    - Crear página HTML con lista de compras y vista de detalle/edición
    - _Requirements: 5.1_

  - [ ]* 7.5 Escribir property tests para lógica de compras
    - **Property 10: Purchase Line Range Validation** — validar rangos de cantidad y costo_unitario
    - **Property 11: Purchase Subtotal and Total Calculation** — validar cálculos de subtotal y total
    - **Property 13: Weighted Average Cost Calculation** — validar fórmula de costo promedio ponderado
    - **Property 14: Edit Disabled for Non-Draft Purchases** — validar función puedeEditar
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.8, 5.11**

  - [ ]* 7.6 Escribir property tests para flujos de stock en compras
    - **Property 12: Stock Update on Purchase Confirmation** — validar incremento de stock por línea
    - **Property 15: Draft Annulment Preserves Stock** — validar que anular borrador no afecta stock
    - **Property 16: Confirmed Annulment Reverses Stock** — validar reversión de stock al anular confirmada
    - **Validates: Requirements 5.4, 5.9, 5.10**

- [ ] 8. Checkpoint - Verificar módulos de compras y proveedores
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implementar Módulo de Costos y Valorización
  - [ ] 9.1 Crear costos.service.js con funciones de valorización
    - Implementar: obtenerValorizacion (invocando productos.service.js, NO llamadas directas a Supabase)
    - Exportar funciones puras: calcularValorizacionUnitaria, calcularTotalGeneral
    - Manejar costo_prom null/0 como valorización 0
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [ ] 9.2 Crear costos.controller.js con orquestación
    - Cargar datos de valorización al inicializar
    - Manejar selector de método de costeo (solo Costo Promedio funcional)
    - Manejar error/sin datos mostrando mensaje y total = 0
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ] 9.3 Crear costos.ui.js con renderizado de tabla de valorización
    - Renderizar tabla con columnas: código, descripción, stock, costo promedio (2 decimales), valorización
    - Renderizar total general debajo de la tabla
    - Renderizar selector de método con opciones y badge "no disponible" para PEPS/UEPS
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ] 9.4 Crear costos.html con estructura de página
    - Crear página HTML con selector de método, tabla de valorización y total
    - _Requirements: 6.1_

  - [ ]* 9.5 Escribir property tests para valorización
    - **Property 17: Valorización Calculation** — validar cálculo con valores arbitrarios incluyendo null y 0
    - **Validates: Requirements 6.1, 6.2, 6.6**

- [ ] 10. Implementar Módulo de Reportes Avanzados
  - [ ] 10.1 Crear reportes.service.js con funciones de consulta y filtrado
    - Implementar: obtenerReporteRotacion, obtenerProductosMasUsados, obtenerProductosMayorValor, obtenerReporteAging
    - Exportar funciones puras: filtrarPorRangoFechas (default 30 días), calcularAging
    - Implementar lógica de filtros combinados (fecha + categoría + proveedor como AND)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

  - [ ] 10.2 Crear reportes.controller.js con orquestación
    - Implementar carga de cada tipo de reporte según selección del usuario
    - Implementar aplicación de filtros con actualización de resultados
    - Manejar top N configurable (default 10, rango 5-50)
    - Manejar caso sin resultados
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

  - [ ] 10.3 Crear reportes.ui.js con renderizado de tablas y gráficos ApexCharts
    - Renderizar tabla de datos por cada tipo de reporte
    - Renderizar gráfico ApexCharts (barras/líneas) por cada tipo de reporte
    - Renderizar controles de filtro (fecha, categoría, proveedor)
    - Renderizar mensaje "sin resultados" y gráficos vacíos cuando no hay datos
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_

  - [ ] 10.4 Crear reportes-avanzados.html con estructura de página
    - Crear página HTML con selector de reporte, filtros, área de tabla y gráfico
    - _Requirements: 7.1_

  - [ ]* 10.5 Escribir property tests para reportes
    - **Property 18: Report Date Range Filtering** — validar filtrado por rango de fechas con default 30 días
    - **Property 19: Top N Sorting and Limiting** — validar orden descendente y límite N en [5,50]
    - **Property 20: Aging Calculation and Sorting** — validar cálculo de días y orden descendente
    - **Property 21: Multi-Filter Intersection** — validar intersección lógica AND de filtros
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6**

- [ ] 11. Implementar Dashboard Visual Premium del Módulo Productos
  - [ ] 11.1 Crear productos.dashboard.js con lógica de KPIs y gráficas
    - Implementar cálculo de KPIs: total productos, activos, stock crítico (existencia < umbral_critico || 5), valor total (sum costo_prom × existencia)
    - Implementar preparación de datos para gráficas: distribución por categoría (dona), distribución por estado (dona), top 5 mayor valor (barra horizontal)
    - Implementar extracción de categorías únicas para chips de filtro
    - Implementar suscripción a eventos realtime para actualización automática (< 2s)
    - _Requirements: 1.1, 1.2, 1.5, 1.7_

  - [ ] 11.2 Integrar dashboard en productos.controller.js
    - Importar productos.dashboard.js e inicializar al cargar el módulo
    - Implementar lógica de filtro por chip de categoría (toggle on/off)
    - Mantener funcionalidad existente de búsqueda y acciones rápidas intacta
    - Actualizar KPIs y gráficas cuando datos cambian por CRUD o realtime
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [ ] 11.3 Modificar productos.html para incluir sección de dashboard
    - Agregar sección de tarjetas KPI encima de la tabla
    - Agregar contenedores para gráficas ApexCharts
    - Agregar barra de chips de categoría para filtrado
    - No modificar estructura de tabla ni modales existentes
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [ ]* 11.4 Escribir property tests para KPIs y gráficas
    - **Property 1: KPI Calculation Correctness** — validar cálculos de total, activos, críticos y valor total
    - **Property 2: Chart Data Distribution Integrity** — validar integridad de distribuciones para gráficas
    - **Property 3: Category Filter Correctness** — validar filtrado por categoría y extracción de categorías únicas
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.7**

- [ ] 12. Checkpoint - Verificar módulos de visualización
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Optimizar Módulo de Inventario
  - [ ] 13.1 Refactorizar inventario.service.js centralizando llamadas a Supabase
    - Mover todas las llamadas a Supabase dispersas en controller.js a service.js
    - Eliminar imports directos de supabase-client en controller.js y ui.js
    - Consolidar funciones duplicadas de acceso a datos en service.js
    - Mantener todos los flujos funcionales existentes sin cambios de comportamiento
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 13.2 Refactorizar inventario.controller.js para usar solo service.js
    - Reemplazar llamadas directas a Supabase por invocaciones a funciones del service
    - Mantener orquestación de flujos: carga de stock por obra, registro de movimientos, vista consolidada, paginación, realtime
    - Verificar que el comportamiento del usuario es idéntico pre y post refactorización
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 13.3 Escribir smoke tests para verificar flujos del inventario refactorizado
    - Test de carga de stock por obra
    - Test de registro de movimientos
    - Test de vista consolidada y paginación
    - _Requirements: 8.3_

- [ ] 14. Integrar navegación y sidebar
  - [ ] 14.1 Actualizar sidebar con enlaces a nuevos módulos
    - Agregar enlaces a: Categorías, Unidades, Proveedores, Compras, Costos, Reportes Avanzados
    - Mantener estructura y estilos existentes del sidebar
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [ ] 15. Checkpoint final - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest + fast-check for testing (ES modules compatible)
- All modules follow the controller/service/ui architecture pattern
- Supabase calls are centralized exclusively in service.js files
- ApexCharts is used for all chart visualizations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3"] },
    { "id": 4, "tasks": ["2.4", "2.5", "2.6", "3.4", "3.5"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3"] },
    { "id": 8, "tasks": ["6.4", "6.5", "7.1"] },
    { "id": 9, "tasks": ["7.2", "7.3"] },
    { "id": 10, "tasks": ["7.4", "7.5", "7.6"] },
    { "id": 11, "tasks": ["9.1", "10.1"] },
    { "id": 12, "tasks": ["9.2", "9.3", "10.2", "10.3"] },
    { "id": 13, "tasks": ["9.4", "9.5", "10.4", "10.5"] },
    { "id": 14, "tasks": ["11.1"] },
    { "id": 15, "tasks": ["11.2", "11.3"] },
    { "id": 16, "tasks": ["11.4", "13.1"] },
    { "id": 17, "tasks": ["13.2"] },
    { "id": 18, "tasks": ["13.3", "14.1"] }
  ]
}
```
