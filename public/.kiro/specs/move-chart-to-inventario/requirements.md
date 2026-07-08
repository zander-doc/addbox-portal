# Requirements Document

## Introduction

This feature relocates the "Productos por categoría" bar chart from the admin-dashboard Productos module (`admin-dashboard/modules/productos/`) to the Inventario → Productos module (`admin-dashboard/modules/inventario/`). The chart is used daily by almacenista, jefe, and administrador roles and belongs contextually in the Inventario workflow. After migration, the chart must exist exclusively in the Inventario module and must be fully removed from admin-dashboard Productos.

## Glossary

- **Inventario_Module**: The Inventario → Productos page located at `admin-dashboard/modules/inventario/inventario.html`, which displays KPIs (Total productos, Valor inventario, Stock crítico, Productos activos) and stock management features.
- **Admin_Dashboard_Productos**: The Productos page located at `admin-dashboard/modules/productos/productos.html`, which currently hosts the chart to be removed.
- **Chart_Container**: An HTML section with card styling containing the title "Productos por categoría" and a div with `id="chart-productos-por-categoria"` where ApexCharts renders the bar chart.
- **ApexCharts**: A third-party JavaScript charting library loaded via CDN (`https://cdn.jsdelivr.net/npm/apexcharts`).
- **RPC_productos_por_categoria**: A Supabase RPC function that returns products grouped by category with fields `category_name` and `total_productos`.
- **productos.service.js**: Service layer file exporting `getProductosPorCategoria()` which calls the RPC and transforms data into `{label, value}` format.
- **productos.controller.js**: Controller file containing `cargarGraficaProductosPorCategoria()` which orchestrates data fetching and rendering.
- **productos.ui.js**: UI layer file exporting `renderGraficaProductosPorCategoria(dataset)` which renders the ApexCharts bar chart.
- **Authorized_Roles**: The set of user roles (almacenista, jefe, administrador) that have access to the Inventario module.

## Requirements

### Requirement 1: Add Chart Container to Inventario Module HTML

**User Story:** As an almacenista, I want to see the "Productos por categoría" chart in the Inventario → Productos page, so that I can visualize product distribution by category in the module I use daily.

#### Acceptance Criteria

1. WHEN the Inventario_Module page loads, THE Inventario_Module SHALL display a Chart_Container section containing an h3 heading with the text "Productos por categoría" and a child div with id "chart-productos-por-categoria" that has a minimum height of 280px.
2. THE Chart_Container SHALL be positioned as a direct sibling after the KPIs grid section (class "grid-cards") and immediately before the "Productos con stock crítico" panel (id "panelCriticos") in the Inventario_Module page DOM order.
3. THE Chart_Container SHALL use the existing chart-box styling: background rgba(255,255,255,0.06), backdrop-filter blur(12px), border-radius 16px, 1px solid border using the border-glass variable, padding 24px, and box-shadow consistent with other chart-box elements in the dashboard.
4. WHEN the Inventario_Module page loads and the chart data has not yet rendered, THE Chart_Container SHALL display a loading indicator within the "chart-productos-por-categoria" div until chart content is available.

### Requirement 2: Load ApexCharts CDN in Inventario Module

**User Story:** As a developer, I want the ApexCharts library available in the Inventario module, so that the chart can render without errors.

#### Acceptance Criteria

1. THE Inventario_Module HTML SHALL include a `<script>` tag loading ApexCharts from the CDN `https://cdn.jsdelivr.net/npm/apexcharts` positioned after all stylesheet links and before the `inventario.controller.js` module script tag in the document's script loading order.
2. WHEN the Inventario_Module page loads successfully, THE Inventario_Module SHALL have the global `ApexCharts` constructor available (i.e., `typeof ApexCharts !== 'undefined'`) by the time the controller's `DOMContentLoaded` handler executes.
3. IF the ApexCharts CDN script fails to load, THEN THE Inventario_Module SHALL allow the page to continue loading without blocking other functionality, and the chart container SHALL display a user-facing message indicating the chart could not be loaded.

### Requirement 3: Reuse Existing Chart Logic Without Duplication

**User Story:** As a developer, I want to reuse the existing service, controller, and UI functions for the chart, so that there is no code duplication and maintenance remains centralized.

#### Acceptance Criteria

1. THE Inventario_Module SHALL import `getProductosPorCategoria` from `../productos/productos.service.js`.
2. THE Inventario_Module SHALL import `renderGraficaProductosPorCategoria` from `../productos/productos.ui.js`.
3. THE Inventario_Module SHALL invoke `getProductosPorCategoria()` to obtain the dataset and pass the result to `renderGraficaProductosPorCategoria(dataset)` as its chart orchestration logic, matching the call sequence used in `productos.controller.js`.
4. THE Inventario_Module SHALL NOT duplicate the implementation of `getProductosPorCategoria`, `renderGraficaProductosPorCategoria`, or the ApexCharts configuration logic; it SHALL only invoke these functions via import.
5. IF the call to `getProductosPorCategoria` fails within the Inventario_Module, THEN THE Inventario_Module SHALL display a user-facing error notification indicating the chart data could not be loaded, without rendering a broken or empty chart.
6. THE Inventario_Module HTML page SHALL contain a DOM element with `id="chart-productos-por-categoria"` so that `renderGraficaProductosPorCategoria` can target it for rendering.

### Requirement 4: Integrate Chart Loading on Page Initialization

**User Story:** As an almacenista, I want the chart to load automatically when I open the Inventario page, so that I see the data without additional clicks.

#### Acceptance Criteria

1. WHEN the DOMContentLoaded event fires on the Inventario_Module page, THE Inventario_Module controller SHALL invoke the chart loading function that calls RPC_productos_por_categoria and passes the resulting dataset to the chart rendering function.
2. IF the RPC_productos_por_categoria call fails, THEN THE Inventario_Module SHALL display an error notification via toast indicating that chart data could not be loaded, and all other page sections (stock table, KPIs, movement history, obra selector) SHALL remain rendered and interactive.
3. IF the dataset returned by RPC_productos_por_categoria is empty, null, or undefined, THEN THE Inventario_Module SHALL display the text "No hay datos disponibles para la gráfica" inside the Chart_Container element and SHALL NOT attempt to render the chart.
4. IF the ApexCharts library is not available when the chart rendering function executes, THEN THE Inventario_Module SHALL display a fallback message inside the Chart_Container indicating the chart could not be loaded, without throwing an unhandled exception.

### Requirement 5: Remove Chart from Admin Dashboard Productos

**User Story:** As a product owner, I want the chart removed from the admin-dashboard Productos page, so that it exists only in the Inventario module and avoids user confusion.

#### Acceptance Criteria

1. THE Admin_Dashboard_Productos HTML SHALL NOT contain the Chart_Container section (the `<section class="chart-section">` element and its child `<div id="chart-productos-por-categoria">`).
2. IF no other element on Admin_Dashboard_Productos references ApexCharts, THEN THE Admin_Dashboard_Productos HTML SHALL NOT include the ApexCharts CDN script tag.
3. THE Admin_Dashboard_Productos controller SHALL NOT import `getProductosPorCategoria` from the service module, SHALL NOT import `renderGraficaProductosPorCategoria` from the UI module, and SHALL NOT define or invoke the `cargarGraficaProductosPorCategoria` function.
4. WHEN a user navigates to Admin_Dashboard_Productos, THE Admin_Dashboard_Productos page SHALL NOT render any chart element or canvas related to "Productos por categoría".
5. WHEN a user navigates to the Inventario module, THE Inventario module SHALL continue to render the "Productos por categoría" chart without errors.

### Requirement 6: Role-Based Access Verification

**User Story:** As a jefe or administrador, I want to confirm that I can still see the chart in the Inventario module, so that the relocation does not break my workflow.

#### Acceptance Criteria

1. WHILE a user with role almacenista is authenticated, WHEN the Inventario_Module page loads, THE Inventario_Module SHALL render the "Productos por categoría" chart section as visible and populate it with bar data retrieved from RPC_productos_por_categoria.
2. WHILE a user with role jefe is authenticated, WHEN the Inventario_Module page loads, THE Inventario_Module SHALL render the "Productos por categoría" chart section as visible and populate it with bar data retrieved from RPC_productos_por_categoria.
3. WHILE a user with role administrador is authenticated, WHEN the Inventario_Module page loads, THE Inventario_Module SHALL render the "Productos por categoría" chart section as visible and populate it with bar data retrieved from RPC_productos_por_categoria.
4. IF a user with a role not in the Authorized_Roles set (almacenista, jefe, administrador) accesses the Inventario_Module, THEN THE Inventario_Module SHALL NOT render the "Productos por categoría" chart and SHALL NOT invoke RPC_productos_por_categoria.

### Requirement 7: Chart Data Integrity

**User Story:** As an almacenista, I want the chart to show accurate category data, so that I can trust the visualization for inventory decisions.

#### Acceptance Criteria

1. THE Inventario_Module chart SHALL retrieve data exclusively from the RPC_productos_por_categoria Supabase function.
2. WHEN the chart renders, THE Inventario_Module SHALL display one bar per category where each bar label matches the `category_name` value and each bar height matches the `total_productos` value returned by the RPC_productos_por_categoria function, with no categories omitted or added.
3. THE Inventario_Module chart SHALL render without JavaScript console errors in the browser developer tools.
4. WHEN the page loads, THE Inventario_Module chart SHALL complete rendering within 3 seconds on a connection with latency below 100ms and download speed of at least 1 Mbps.
5. IF the RPC_productos_por_categoria function returns updated data on a subsequent page load, THEN THE Inventario_Module chart SHALL reflect the updated category names and product counts without requiring a cache clear or hard refresh.
