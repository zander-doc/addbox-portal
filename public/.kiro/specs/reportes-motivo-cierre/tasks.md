# Implementation Plan: Reportes Motivo de Cierre

## Overview

Implementación de la página de reportes de motivo de cierre para el sistema ADDBOX. Se crea la capa de servicio (`reportes-cierre.service.js`) que consulta y procesa datos de Supabase, el controlador (`reportes-cierre.controller.js`) que gestiona KPIs, tablas, filtros y exportación CSV, y la página HTML (`devoluciones.html`) con layout de scroll único y dark theme. Se usa Vanilla JS con ES modules siguiendo la arquitectura existente Service → Controller → HTML.

## Tasks

- [x] 1. Implementar capa de servicio
  - [x] 1.1 Crear `reportes-cierre.service.js` con función `obtenerExtraviadosConCosto()`
    - Crear archivo `modules/devoluciones/reportes-cierre.service.js`
    - Importar `supabase` desde `../../services/supabase-client.js`
    - Consultar `documentos_inventario_detalle` donde `motivo_cierre` = "extraviado"
    - Obtener `documentos_inventario` (id, proyecto, obra_nombre, creado_en) para join en cliente
    - Obtener `productos` (codigo, costo_prom) para join en cliente
    - Realizar joins en JS: unir detalles con documentos por `documento_id` y con productos por `codigo`
    - Calcular `costo_perdida = cantidad_devuelta * costo_prom` para cada registro
    - Si un producto no tiene `costo_prom`, usar 0
    - Retornar array de `HerramientaExtraviadaDTO`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.3_

  - [x] 1.2 Implementar `obtenerEnReparacion()` en `reportes-cierre.service.js`
    - Consultar `documentos_inventario_detalle` donde `motivo_cierre` = "danado_reparacion"
    - Obtener documentos padre para join en cliente (proyecto, obra_nombre, creado_en)
    - Realizar join en JS: unir detalles con documentos por `documento_id`
    - Retornar array de `HerramientaReparacionDTO` con estado_especial
    - _Requirements: 2.1, 2.2, 2.3, 10.1, 10.3_

  - [x] 1.3 Implementar `obtenerConsumiblesPorProyecto()` en `reportes-cierre.service.js`
    - Consultar `documentos_inventario_detalle` donde `motivo_cierre` = "consumido"
    - Obtener documentos padre y productos para joins en cliente
    - Agrupar resultados por `proyecto`
    - Calcular `total_items` (sum de cantidad_devuelta) y `costo_total` (sum de cantidad_devuelta * costo_prom) por grupo
    - Incluir array `detalle` con registros individuales por grupo
    - Retornar array de `ConsumibleProyectoDTO`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.3_

  - [x] 1.4 Implementar `calcularKPIsReporte()` en `reportes-cierre.service.js`
    - Recibir arrays de extraviados y enReparacion
    - Calcular `totalExtraviados` = length del array extraviados
    - Calcular `totalEnReparacion` = length del array enReparacion
    - Calcular `costoTotalPerdidas` = sum de `costo_perdida` de todos los extraviados
    - Retornar 0 para cada KPI cuando el array correspondiente está vacío
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Checkpoint - Verificar capa de servicio
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implementar controlador
  - [x] 3.1 Crear `reportes-cierre.controller.js` con función `init()` y renderizado de KPIs
    - Crear archivo `modules/reportes/reportes-cierre.controller.js`
    - Importar funciones del servicio desde `../devoluciones/reportes-cierre.service.js`
    - Implementar `init()` que se ejecuta en `DOMContentLoaded`
    - Llamar a las 3 funciones del servicio en paralelo (Promise.all)
    - Implementar `renderizarKPIs(kpis)` que actualiza los elementos DOM de las KPI cards
    - Formatear costo total como moneda con `formatearMoneda()`
    - Mostrar 0 en KPIs cuando no hay datos
    - Manejar errores de consulta mostrando mensaje en la sección afectada
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.2, 10.4_

  - [x] 3.2 Implementar renderizado de tablas en `reportes-cierre.controller.js`
    - Implementar `renderizarTablaExtraviados(datos)` con columnas: Código, Descripción, Cantidad, Proyecto/Obra, Fecha, Costo Unitario, Costo Total
    - Implementar `renderizarTablaReparacion(datos)` con columnas: Código, Descripción, Cantidad, Proyecto/Obra, Fecha de Registro, Estado
    - Implementar `renderizarTablaConsumibles(datos)` con columnas: Proyecto, Total Items, Costo Total
    - Mostrar mensaje "No hay datos" cuando una tabla no tiene registros
    - _Requirements: 5.1, 5.2, 5.6, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.3 Implementar filtros con semántica AND en `reportes-cierre.controller.js`
    - Implementar `aplicarFiltrosExtraviados(datos, filtros)` como función exportada
    - Filtro por proyecto: comparar `record.proyecto` con valor seleccionado
    - Filtro fecha desde: `record.creado_en >= fechaDesde`
    - Filtro fecha hasta: `record.creado_en <= fechaHasta`
    - Aplicar todos los filtros activos simultáneamente (intersección AND)
    - Mostrar mensaje "Sin resultados para los filtros aplicados" cuando no hay coincidencias
    - Poblar dropdown de proyectos dinámicamente desde los datos cargados
    - Agregar event listeners a los controles de filtro
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [x] 3.4 Implementar exportación CSV en `reportes-cierre.controller.js`
    - Implementar `generarCSV(filas, columnas)` como función exportada
    - Primera línea del CSV: labels de las columnas separados por comas
    - Líneas siguientes: valores de cada fila en orden de columnas
    - Implementar `descargarCSV(contenido, nombreArchivo)` que crea Blob URL y dispara descarga
    - Nombre de archivo incluye sección y fecha actual (ej: `extraviados_2024-01-15.csv`)
    - Exportar solo filas visibles (respetando filtros activos)
    - Agregar event listeners a los 3 botones de exportación
    - Mostrar toast de error si la generación falla
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 3.5 Implementar `formatearMoneda()` en `reportes-cierre.controller.js`
    - Recibir un número y retornar string con formato moneda (2 decimales)
    - Formato: "$X,XXX.XX"
    - Exportar la función para uso en renderizado de tablas y KPIs
    - _Requirements: 4.5_

- [x] 4. Checkpoint - Verificar controlador
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Crear página HTML
  - [x] 5.1 Crear `devoluciones.html` con estructura completa
    - Crear archivo `modules/reportes/devoluciones.html`
    - Incluir layout principal con sidebar-container y main content
    - Sección KPI cards: 3 cards (Total Extraviados, Total en Reparación, Costo Total de Pérdidas)
    - Sección tabla extraviados con filtros (dropdown proyecto, fecha desde, fecha hasta) y botón CSV
    - Sección tabla en reparación con botón CSV
    - Sección tabla consumibles por proyecto con botón CSV
    - Aplicar clases CSS del dark theme existente del dashboard
    - Importar controlador como ES module
    - Cargar sidebar y navbar con fetch de componentes
    - Layout de scroll único sin tabs ni paginación entre secciones
    - _Requirements: 9.1, 9.2, 9.3, 10.5_

- [x] 6. Integración y cableado final
  - [x] 6.1 Conectar todos los componentes y verificar flujo completo
    - Verificar que `init()` del controlador carga datos y renderiza correctamente
    - Verificar que filtros actualizan la tabla de extraviados
    - Verificar que los 3 botones CSV generan y descargan archivos
    - Verificar que errores de Supabase se manejan sin romper la página
    - Verificar que la página se integra con sidebar existente
    - _Requirements: 1.1, 4.1, 5.5, 8.4, 9.1, 10.2_

- [x] 7. Checkpoint final - Verificar funcionalidad completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Property-based tests
  - [x]* 8.1 Escribir property test para filtrado por motivo_cierre
    - **Property 1: Filter by motivo_cierre returns only matching records**
    - Usar fast-check para generar arrays de detalles con motivos aleatorios ("extraviado", "danado_reparacion", "consumido")
    - Verificar: filtrar por un motivo retorna solo registros con ese motivo
    - Verificar: count de resultados == count de registros con ese motivo en el array original
    - **Validates: Requirements 1.1, 2.1, 3.1**

  - [x]* 8.2 Escribir property test para cálculo de costo_perdida
    - **Property 2: Costo_Perdida calculation correctness**
    - Usar fast-check para generar pares `{cantidad_devuelta: arb number >= 0, costo_prom: arb number >= 0}`
    - Verificar: `costo_perdida == cantidad_devuelta * costo_prom`
    - **Validates: Requirements 1.4, 3.3**

  - [x]* 8.3 Escribir property test para agregación de KPIs
    - **Property 3: KPI aggregation correctness**
    - Usar fast-check para generar arrays de HerramientaExtraviadaDTO y HerramientaReparacionDTO
    - Verificar: `totalExtraviados == extraviados.length`
    - Verificar: `totalEnReparacion == enReparacion.length`
    - Verificar: `costoTotalPerdidas == sum(costo_perdida)` de extraviados
    - Verificar: arrays vacíos producen KPIs en 0
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x]* 8.4 Escribir property test para agrupación por proyecto
    - **Property 4: Grouping by proyecto preserves totals**
    - Usar fast-check para generar arrays de consumibles con proyectos aleatorios
    - Verificar: sum de `total_items` de todos los grupos == sum de `cantidad_devuelta` del input
    - Verificar: sum de `costo_total` de todos los grupos == sum de costos individuales del input
    - Verificar: cada registro aparece en exactamente un grupo
    - **Validates: Requirements 3.4, 7.2, 7.3, 7.4**

  - [x]* 8.5 Escribir property test para semántica AND de filtros
    - **Property 5: Filter intersection semantics (AND)**
    - Usar fast-check para generar arrays de HerramientaExtraviadaDTO y combinaciones de filtros
    - Verificar: un registro aparece en el resultado si y solo si cumple TODOS los filtros activos
    - **Validates: Requirements 5.3, 5.4, 5.5**

  - [x]* 8.6 Escribir property test para generación CSV
    - **Property 6: CSV generation correctness**
    - Usar fast-check para generar arrays de objetos y definiciones de columnas
    - Verificar: CSV tiene exactamente `rows.length + 1` líneas
    - Verificar: primera línea contiene todos los labels de columnas
    - Verificar: cada línea de datos contiene valores en orden de columnas
    - **Validates: Requirements 8.4, 8.5**

  - [x]* 8.7 Escribir property test para formateo de moneda
    - **Property 7: Currency formatting**
    - Usar fast-check para generar números no-negativos
    - Verificar: resultado tiene exactamente 2 decimales
    - **Validates: Requirements 4.5**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- El módulo usa Vanilla JS con ES modules, consistente con el resto del proyecto
- Los joins y cálculos se realizan en el frontend (consistente con `devoluciones.service.js`)
- El servicio no toca el DOM; el controlador no hace queries a Supabase
- Se reutilizan las clases CSS existentes del dark theme sin CSS adicional

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4"] },
    { "id": 2, "tasks": ["3.1", "3.5"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] }
  ]
}
```
