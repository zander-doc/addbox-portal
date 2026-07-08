# Implementation Plan: Move Chart to Inventario

## Overview

Migrate the "Productos por categoría" bar chart from the Productos module to the Inventario module using a reuse-by-import strategy. The Inventario controller will import existing service and UI functions from `productos.service.js` and `productos.ui.js`, add role-gated chart rendering with error handling, and then remove all chart-related code from the Productos module.

## Tasks

- [x] 1. Add chart container and ApexCharts CDN to inventario.html
  - [x] 1.1 Add the chart container HTML section to inventario.html
    - Insert a `<section class="chart-section">` with a `.chart-box` div containing an h3 "Productos por categoría" and a `<div id="chart-productos-por-categoria" style="min-height:280px;">` with a loading indicator paragraph
    - Position the section as a direct sibling after the `<section class="grid-cards">` and immediately before `<section class="panel-criticos" id="panelCriticos">`
    - Use existing chart-box styling: background rgba(255,255,255,0.06), backdrop-filter blur(12px), border-radius 16px, 1px solid border using border-glass variable, padding 24px
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.6_

  - [x] 1.2 Add ApexCharts CDN script tag to inventario.html
    - Add `<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>` after the existing `<script>` tags (supabase, supabase-simple, sidebar) and before the `<script type="module" src="./inventario.controller.js"></script>` tag
    - Ensure the script is non-module so ApexCharts is available as a global before the controller executes
    - _Requirements: 2.1, 2.2_

- [x] 2. Implement chart loading orchestration in inventario.controller.js
  - [x] 2.1 Add chart-related imports and role-gated orchestration function
    - Add `import { getProductosPorCategoria } from "../productos/productos.service.js";`
    - Add `import { renderGraficaProductosPorCategoria } from "../productos/productos.ui.js";`
    - Define `AUTHORIZED_ROLES` constant as `["almacenista", "jefe", "administrador"]`
    - Create `async function cargarGraficaProductosPorCategoria()` that:
      1. Guards against missing ApexCharts (`typeof ApexCharts === "undefined"`) — shows fallback message in container
      2. Calls `getProductosPorCategoria()` wrapped in try/catch — shows toast on failure
      3. Calls `renderGraficaProductosPorCategoria(dataset)` wrapped in try/catch — shows toast on render failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

  - [x] 2.2 Integrate chart loading into the init() function with role gating
    - After `aplicarVisibilidadPorRol(rolUsuario)` and before `cargarObras()`, add a role check: if `AUTHORIZED_ROLES.includes(rolUsuario)`, invoke `cargarGraficaProductosPorCategoria()`
    - If role is NOT in AUTHORIZED_ROLES, hide the chart section element from the DOM (set `display:none` or add `hidden` class)
    - Ensure chart loading is wrapped in its own try/catch so failures do not block other init logic (stock, obras, realtime)
    - Handle empty/null/undefined dataset by displaying "No hay datos disponibles para la gráfica" inside the chart container
    - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.3 Write property test: Unauthorized roles do not trigger chart rendering
    - **Property 1: Unauthorized roles do not trigger chart rendering**
    - Use fast-check to generate arbitrary role strings not in {"almacenista", "jefe", "administrador"}
    - Assert that for any such role, the chart loading function is NOT invoked and the chart container does NOT contain rendered chart content
    - Minimum 100 iterations
    - Tag: `Feature: move-chart-to-inventario, Property 1: Unauthorized roles do not trigger chart rendering`
    - **Validates: Requirements 6.4**

  - [ ]* 2.4 Write property test: Chart data faithfully represents RPC response
    - **Property 2: Chart data faithfully represents RPC response**
    - Use fast-check to generate arbitrary arrays of `{label: string, value: number}` pairs
    - Assert that the ApexCharts configuration contains exactly one bar per dataset entry with matching labels (truncated to 20 chars) and values (clamped >= 0, truncated to integer), with no categories omitted or added
    - Minimum 100 iterations
    - Tag: `Feature: move-chart-to-inventario, Property 2: Chart data faithfully represents RPC response`
    - **Validates: Requirements 7.2**

- [x] 3. Checkpoint - Verify chart renders in Inventario
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Remove chart from Productos module
  - [x] 4.1 Remove chart section and ApexCharts CDN from productos.html
    - Remove the `<section class="chart-section">` element containing `<div id="chart-productos-por-categoria">`
    - Remove the ApexCharts CDN `<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>` tag (only if no other element on the page references ApexCharts)
    - _Requirements: 5.1, 5.2_

  - [x] 4.2 Remove chart-related imports and function from productos.controller.js
    - Remove `getProductosPorCategoria` from the import statement of `./productos.service.js`
    - Remove `renderGraficaProductosPorCategoria` from the import statement of `./productos.ui.js`
    - Remove the `cargarGraficaProductosPorCategoria()` function definition
    - Remove the `cargarGraficaProductosPorCategoria()` invocation from the `init()` function
    - _Requirements: 5.3, 5.4_

  - [ ]* 4.3 Write unit tests verifying chart removal from Productos
    - Assert that `productos.html` does not contain `id="chart-productos-por-categoria"`
    - Assert that `productos.html` does not contain the ApexCharts CDN script tag
    - Assert that `productos.controller.js` does not import `getProductosPorCategoria` or `renderGraficaProductosPorCategoria`
    - Assert that `productos.controller.js` does not define or invoke `cargarGraficaProductosPorCategoria`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Integration wiring and final verification
  - [x] 5.1 Verify end-to-end chart rendering in Inventario module
    - Confirm that `inventario.html` contains `id="chart-productos-por-categoria"` with min-height 280px
    - Confirm chart container is positioned after `.grid-cards` and before `#panelCriticos` in DOM order
    - Confirm ApexCharts CDN script is present before the controller module script
    - Confirm imports in `inventario.controller.js` reference `../productos/productos.service.js` and `../productos/productos.ui.js`
    - Confirm no duplication of `getProductosPorCategoria` or `renderGraficaProductosPorCategoria` logic exists in the inventario module
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.4, 5.5, 7.1_

  - [ ]* 5.2 Write integration tests for error handling scenarios
    - Test: page loads without error when ApexCharts CDN fails (mock script load failure)
    - Test: toast shown when `getProductosPorCategoria` throws; other sections remain interactive
    - Test: "No hay datos disponibles para la gráfica" shown for empty/null/undefined dataset
    - Test: fallback message when `typeof ApexCharts === "undefined"` at render time
    - _Requirements: 2.3, 3.5, 4.2, 4.3, 4.4_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The reuse-by-import strategy means `productos.service.js` and `productos.ui.js` are NOT modified — only imported from a new location
- Error handling is isolated: chart failures must never block KPIs, stock table, movements, or obra selector functionality

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
