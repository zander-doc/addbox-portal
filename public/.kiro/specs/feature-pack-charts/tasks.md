# Implementation Plan: Feature Pack Charts

## Overview

Implementación de tres gráficas analíticas (Top 5 Productos donut, Tendencia de Movimientos line, Valor de Inventario por Categoría horizontal bar) en los módulos Productos e Inventario. Se crean dos módulos compartidos (`services/chartService.js` y `services/chartUI.js`) que ambos controladores importan, siguiendo la arquitectura existente RPC → Service → Controller → UI → HTML. Las gráficas usan ApexCharts vía CDN y están restringidas a roles autorizados (almacenista, jefe, administrador).

## Tasks

- [x] 1. Crear los módulos compartidos de servicio y UI
  - [x] 1.1 Crear `services/chartService.js` con las tres funciones de datos
    - Crear el archivo `admin-dashboard/services/chartService.js` como ES module
    - Importar `supabase` desde `./supabase-client.js`
    - Exportar `getTop5Productos()`: invocar RPC `top_5_productos()`, normalizar `{nombre→label, cantidad→value}`, truncar value a entero (min 0), fallback "Sin nombre" para nombre null/undefined, ordenar descendente por value, limitar a 5 items
    - Exportar `getTendenciaMovimientos()`: invocar RPC `movimientos_tendencia_30dias()`, normalizar `{fecha→label ISO "YYYY-MM-DD", total→value}`, excluir filas con fecha/total null/undefined, ordenar ascendente por label, limitar a 30 items
    - Exportar `getValorInventarioPorCategoria()`: invocar RPC `valor_inventario_por_categoria()`, normalizar `{categoria→label, valor→value}`, fallback "Sin categoría" para categoria null/undefined, redondear value a 2 decimales (min 0, negativos → 0)
    - Cada función lanza Error con mensaje de RPC si la llamada falla; retorna array vacío si no hay filas
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.3_

  - [x] 1.2 Crear `services/chartUI.js` con las tres funciones de renderizado
    - Crear el archivo `admin-dashboard/services/chartUI.js` como ES module
    - Mantener un objeto module-level `chartInstances` para rastrear instancias por container ID
    - Exportar `renderGraficaTop5Productos(dataset)`: verificar ApexCharts disponible (fallback "La gráfica no pudo ser cargada"), validar dataset (fallback "No hay datos"), destruir instancia previa, renderizar donut chart en `#chart-top5-productos` con paleta de colores determinista (hash del label), labels truncados a 20 chars + "…", animación easing ≤800ms
    - Exportar `renderGraficaTendenciaMovimientos(dataset)`: mismas validaciones, renderizar line chart en `#chart-tendencia-movimientos` con curve "smooth", tooltip con label+value, animación easing ≤800ms
    - Exportar `renderGraficaValorInventarioPorCategoria(dataset)`: mismas validaciones, renderizar horizontal bar chart en `#chart-valor-por-categoria`, ordenar descendente por value, limitar a 50 categorías, labels truncados a 20 chars + "…", valores formateados como "$X,XXX.XX" (es-MX), animación easeinout 800ms
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 9.2, 9.4_

- [x] 2. Checkpoint - Verificar módulos compartidos
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Integrar gráficas en el módulo Productos
  - [x] 3.1 Agregar contenedores HTML y script CDN en `productos.html`
    - Agregar `<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>` después de los scripts de Supabase y antes del script del controlador
    - Agregar sección `<section id="charts-section" class="charts-section">` con `<div class="charts-grid">` conteniendo tres `<div class="chart-box">` con títulos h3 y contenedores: `#chart-top5-productos`, `#chart-tendencia-movimientos`, `#chart-valor-por-categoria`
    - Posicionar la sección después de KPIs (`<section class="grid-cards">`) y antes de la sección de tabla/acciones
    - Cada contenedor con `style="min-height:280px;"`
    - _Requirements: 7.6, 10.1, 10.2, 10.3, 10.7, 10.8_

  - [x] 3.2 Implementar `cargarGraficas()` en `productos.controller.js`
    - Importar las 3 funciones de `chartService.js` y las 3 de `chartUI.js`
    - Importar `showToast` de `toastService.js`
    - Implementar función `cargarGraficas()` con verificación de rol (almacenista, jefe, administrador); si no autorizado, ocultar `#charts-section` con `display: none` y retornar
    - Usar `Promise.allSettled` para invocar las 3 funciones de fetch independientemente; en cada caso, si éxito → llamar render correspondiente, si error → `showToast(mensaje, "error")`
    - Registrar invocación de `cargarGraficas()` en el flujo de inicialización existente (DOMContentLoaded)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Integrar gráficas en el módulo Inventario
  - [x] 4.1 Agregar contenedores HTML y script CDN en `inventario.html`
    - Agregar `<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>` antes del script del controlador
    - Agregar sección `<section id="charts-section" class="charts-section">` con la misma estructura de `charts-grid` y tres `chart-box` con contenedores `#chart-top5-productos`, `#chart-tendencia-movimientos`, `#chart-valor-por-categoria`
    - Posicionar después de KPIs y antes de la tabla de stock
    - Cada contenedor con `style="min-height:280px;"`
    - _Requirements: 8.6, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 4.2 Implementar `cargarGraficas()` en `inventario.controller.js`
    - Importar las 3 funciones de `chartService.js` y las 3 de `chartUI.js`
    - Importar `showToast` de `toastService.js`
    - Implementar función `cargarGraficas()` con verificación de rol; si no autorizado, ocultar `#charts-section` con `display: none` y retornar
    - Usar `Promise.allSettled` para invocar las 3 funciones de fetch independientemente; en cada caso, si éxito → render, si error → `showToast(mensaje, "error")`
    - Registrar invocación en el flujo de inicialización existente (DOMContentLoaded)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5. Checkpoint - Verificar integración en ambos módulos
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Property tests para chartService.js
  - [ ]* 6.1 Escribir property test para normalización Top 5
    - **Property 1: Top 5 data normalization**
    - Usar fast-check para generar arrays aleatorios de `{nombre: arb string/null, cantidad: arb number/null}` (0–20 items)
    - Verificar: (a) resultado ≤ 5 items, (b) todo value es entero ≥ 0, (c) todo label es string no vacío (fallback "Sin nombre"), (d) ordenado descendente por value
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 6.2 Escribir property test para normalización Tendencia
    - **Property 2: Tendencia data normalization**
    - Usar fast-check para generar arrays aleatorios de `{fecha: arb date/null, total: arb number/null}` (0–50 items)
    - Verificar: (a) filas con fecha/total null excluidas, (b) resultado ≤ 30 items, (c) todo label es ISO date "YYYY-MM-DD", (d) todo value es number, (e) ordenado ascendente por label
    - **Validates: Requirements 3.1, 3.2, 3.5**

  - [ ]* 6.3 Escribir property test para normalización Valor por Categoría
    - **Property 3: Category value normalization**
    - Usar fast-check para generar arrays aleatorios de `{categoria: arb string/null, valor: arb number/null}` (0–100 items)
    - Verificar: (a) todo label es string no vacío (fallback "Sin categoría"), (b) todo value es number ≥ 0 con exactamente 2 decimales, (c) valores negativos → 0
    - **Validates: Requirements 5.1, 5.2, 5.5**

- [ ] 7. Property tests para chartUI.js
  - [ ]* 7.1 Escribir property test para truncamiento de labels
    - **Property 4: Label truncation**
    - Usar fast-check para generar strings de longitud 0–100
    - Verificar: si length > 20, resultado es primeros 20 chars + "…"; si length ≤ 20, resultado sin cambios
    - **Validates: Requirements 2.4, 6.2**

  - [ ]* 7.2 Escribir property test para colores deterministas
    - **Property 5: Consistent color assignment**
    - Usar fast-check para generar strings aleatorios como labels, invocar hash dos veces por input
    - Verificar: mismo label siempre produce mismo color de la paleta, independiente del orden o tamaño del dataset
    - **Validates: Requirements 2.3**

  - [ ]* 7.3 Escribir property test para ordenamiento y límite de categorías en bar chart
    - **Property 6: Bar chart sorting and category limit**
    - Usar fast-check para generar datasets de 1–100 items con values aleatorios
    - Verificar: datos pasados a ApexCharts están ordenados descendente por value y limitados a ≤ 50 categorías
    - **Validates: Requirements 6.1**

  - [ ]* 7.4 Escribir property test para formato monetario
    - **Property 7: Monetary formatting**
    - Usar fast-check para generar floats no negativos
    - Verificar: resultado del formatter coincide con patrón `$` + número formateado es-MX con exactamente 2 decimales
    - **Validates: Requirements 6.3**

  - [ ]* 7.5 Escribir property test para role gating
    - **Property 8: Role gating hides charts for unauthorized roles**
    - Usar fast-check para generar strings aleatorios como roles (mezclando autorizados y no autorizados)
    - Verificar: roles NO en {almacenista, jefe, administrador} → charts-section tiene display:none
    - **Validates: Requirements 7.3, 8.3**

- [x] 8. Checkpoint final - Verificar todas las pruebas y funcionalidad
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Los módulos compartidos `chartService.js` y `chartUI.js` eliminan duplicación de código entre Productos e Inventario (Req 9)
- ApexCharts se carga vía CDN como `<script>` global antes de los controladores
- Cada gráfica se fetch/render independientemente con `Promise.allSettled` para aislamiento de errores
- El role gating se implementa a nivel de controlador, no de servicio

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "4.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "7.1", "7.2", "7.3", "7.4", "7.5"] }
  ]
}
```
