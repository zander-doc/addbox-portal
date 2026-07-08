# Requirements Document

## Introduction

This feature adds three new analytical charts to both the Productos module (`admin-dashboard/modules/productos/`) and the Inventario module (`admin-dashboard/modules/inventario/`). The charts provide visual insights into top products by stock, movement trends over 30 days, and inventory value by category. All charts use ApexCharts via CDN, follow the existing RPC → Service → Controller → UI → HTML architecture, and are role-gated for authorized users (almacenista, jefe, administrador).

## Glossary

- **Chart_Service**: Shared ES module (`services/chartService.js`) that normalizes RPC data into `{label, value}` datasets for all three charts
- **Chart_UI**: Shared ES module (`services/chartUI.js`) that renders ApexCharts instances given a dataset and container
- **Productos_Controller**: Controller module (`modules/productos/productos.controller.js`) that orchestrates the Productos page
- **Inventario_Controller**: Controller module (`modules/inventario/inventario.controller.js`) that orchestrates the Inventario page
- **RPC**: Supabase Remote Procedure Call returning structured data from PostgreSQL functions
- **ApexCharts**: Third-party charting library loaded via CDN (`https://cdn.jsdelivr.net/npm/apexcharts`)
- **Toast_Service**: Existing notification service (`services/toastService.js`) using `showToast(message, type)`
- **Authorized_Roles**: The set of roles permitted to view charts: almacenista, jefe, administrador
- **Dataset**: Normalized array of objects with shape `{label: string, value: number}`

## Requirements

### Requirement 1: Top 5 Productos Donut Chart — Data Layer

**User Story:** As an authorized user, I want to retrieve the top 5 products by stock quantity from the database, so that the donut chart can display accurate data.

#### Acceptance Criteria

1. WHEN the Chart_Service calls `getTop5Productos()`, THE Chart_Service SHALL invoke the Supabase RPC `top_5_productos()` and return a Dataset of up to 5 items ordered by quantity descending (highest stock first)
2. WHEN the RPC `top_5_productos()` returns rows with `{nombre text, cantidad numeric}`, THE Chart_Service SHALL normalize each row to `{label: nombre, value: cantidad}` where `value` is converted to a number via truncation (no decimals), with a minimum value of 0
3. IF the RPC `top_5_productos()` returns an error, THEN THE Chart_Service SHALL throw an Error with the RPC error message
4. WHEN the RPC `top_5_productos()` returns zero rows, THE Chart_Service SHALL return an empty array
5. THE Chart_Service SHALL guarantee that no object in the returned array contains null values in the `label` or `value` fields; if `nombre` is null or undefined, the `label` field SHALL be the string "Sin nombre", and if `cantidad` is null or undefined, the `value` field SHALL be 0

### Requirement 2: Top 5 Productos Donut Chart — Rendering

**User Story:** As an authorized user, I want to see a donut chart showing the top 5 products by stock, so that I can quickly identify which products have the highest inventory.

#### Acceptance Criteria

1. WHEN `renderGraficaTop5Productos(dataset)` is called with a valid Dataset (a non-empty array of `{label: string, value: number}` objects containing 1 to 5 items), THE Chart_UI SHALL render an ApexCharts donut chart inside the container `<div id="chart-top5-productos">`
2. WHEN `renderGraficaTop5Productos(dataset)` is called and a chart instance already exists inside the container, THE Chart_UI SHALL destroy the previous chart instance before rendering the new one
3. THE Chart_UI SHALL assign consistent colors from a predefined palette of at least 5 colors to each donut segment, where the same dataset item always receives the same color across re-renders
4. WHEN a dataset item label exceeds 20 characters, THE Chart_UI SHALL truncate the displayed label to 20 characters followed by the "…" character
5. THE Chart_UI SHALL render the chart with animation enabled, using an easing transition and a duration of no more than 800 milliseconds
6. WHEN `renderGraficaTop5Productos(dataset)` is called with an empty array, a null value, or an undefined value, THE Chart_UI SHALL display the text "No hay datos" inside the container instead of rendering a chart
7. IF ApexCharts is unavailable (typeof ApexCharts === "undefined"), THEN THE Chart_UI SHALL display the text "La gráfica no pudo ser cargada" inside the container instead of attempting to render a chart

### Requirement 3: Tendencia de Movimientos Line Chart — Data Layer

**User Story:** As an authorized user, I want to retrieve movement totals for the last 30 days, so that the line chart can display the trend.

#### Acceptance Criteria

1. WHEN the Chart_Service calls `getTendenciaMovimientos()`, THE Chart_Service SHALL invoke the Supabase RPC `movimientos_tendencia_30dias()` and return a Dataset containing up to 30 items sorted by fecha in ascending chronological order
2. WHEN the RPC `movimientos_tendencia_30dias()` returns rows with `{fecha date, total numeric}`, THE Chart_Service SHALL normalize each row to `{label: fecha as ISO date string "YYYY-MM-DD", value: total as number}`
3. IF the RPC `movimientos_tendencia_30dias()` returns an error, THEN THE Chart_Service SHALL throw an Error with the RPC error message
4. WHEN the RPC `movimientos_tendencia_30dias()` returns zero rows, THE Chart_Service SHALL return an empty array
5. IF a row returned by the RPC contains a null or undefined fecha or total, THEN THE Chart_Service SHALL exclude that row from the returned Dataset

### Requirement 4: Tendencia de Movimientos Line Chart — Rendering

**User Story:** As an authorized user, I want to see a line chart showing movement trends over the last 30 days, so that I can identify patterns in inventory activity.

#### Acceptance Criteria

1. WHEN `renderGraficaTendenciaMovimientos(dataset)` is called with a valid Dataset, THE Chart_UI SHALL render an ApexCharts line chart inside the container `<div id="chart-tendencia-movimientos">` with the x-axis displaying Dataset labels (dates) and the y-axis displaying Dataset values (movement totals)
2. THE Chart_UI SHALL render the line with a smooth curve (curve: "smooth")
3. THE Chart_UI SHALL display a tooltip showing both the label (date) and the exact numeric value when the user hovers over each data point
4. THE Chart_UI SHALL enable animation with easing on chart render, completing within 800 milliseconds
5. WHEN `renderGraficaTendenciaMovimientos(dataset)` is called with an empty or null Dataset, THE Chart_UI SHALL display the message "No hay datos" inside the container
6. IF ApexCharts is unavailable (typeof ApexCharts === "undefined"), THEN THE Chart_UI SHALL display a fallback message "La gráfica no pudo ser cargada" inside the container
7. WHEN `renderGraficaTendenciaMovimientos(dataset)` is called and a chart instance already exists in the container, THE Chart_UI SHALL destroy the existing instance before rendering the new chart

### Requirement 5: Valor de Inventario por Categoría Bar Chart — Data Layer

**User Story:** As an authorized user, I want to retrieve inventory value grouped by category, so that the bar chart can display the distribution.

#### Acceptance Criteria

1. WHEN the Chart_Service calls `getValorInventarioPorCategoria()`, THE Chart_Service SHALL invoke the Supabase RPC `valor_inventario_por_categoria()` and return a Dataset containing one object per category row returned by the RPC
2. WHEN the RPC `valor_inventario_por_categoria()` returns rows with `{categoria text, valor numeric}`, THE Chart_Service SHALL normalize each row to `{label: categoria, value: valor}` where `label` is a string and `value` is a number rounded to 2 decimal places; if `categoria` is null or undefined, `label` SHALL be the string "Sin categoría", and if `valor` is null or undefined, `value` SHALL be 0
3. IF the RPC `valor_inventario_por_categoria()` returns an error, THEN THE Chart_Service SHALL throw an Error with the RPC error message without modification
4. WHEN the RPC `valor_inventario_por_categoria()` returns zero rows, THE Chart_Service SHALL return an empty array without throwing an error
5. WHEN the RPC `valor_inventario_por_categoria()` returns rows where `valor` is negative, THE Chart_Service SHALL normalize the `value` field to 0 for those rows

### Requirement 6: Valor de Inventario por Categoría Bar Chart — Rendering

**User Story:** As an authorized user, I want to see a horizontal bar chart showing inventory value by category, so that I can understand the financial distribution of my inventory.

#### Acceptance Criteria

1. WHEN `renderGraficaValorInventarioPorCategoria(dataset)` is called with a valid Dataset containing at least one item, THE Chart_UI SHALL clear the container `<div id="chart-valor-por-categoria">`, sort the dataset by value in descending order, and render an ApexCharts horizontal bar chart displaying up to 50 categories (discarding the lowest-value categories beyond that limit)
2. THE Chart_UI SHALL truncate category labels longer than 20 characters by appending "…" on the Y-axis
3. THE Chart_UI SHALL format bar values as monetary amounts with "$" prefix and locale-formatted numbers using es-MX locale with exactly 2 decimal places (e.g., "$1,234.56")
4. THE Chart_UI SHALL enable animation with easing "easeinout" and a duration of 800 milliseconds on chart render
5. WHEN `renderGraficaValorInventarioPorCategoria(dataset)` is called with a Dataset that is null, undefined, not an array, or an empty array, THE Chart_UI SHALL display the message "No hay datos" inside the container
6. IF ApexCharts is unavailable (typeof ApexCharts === "undefined"), THEN THE Chart_UI SHALL display a fallback message "La gráfica no pudo ser cargada" inside the container

### Requirement 7: Chart Integration in Productos Module

**User Story:** As an authorized user viewing the Productos page, I want to see all three charts below the KPIs section, so that I have visual analytics alongside product management.

#### Acceptance Criteria

1. WHEN the Productos page loads (DOMContentLoaded), THE Productos_Controller SHALL invoke the Chart_Service to fetch data for all three charts (`getTop5Productos()`, `getTendenciaMovimientos()`, `getValorInventarioPorCategoria()`) independently, so that a failure in one fetch does not prevent the others from completing
2. WHEN all chart data fetches resolve (successfully or with error), THE Productos_Controller SHALL render each successfully fetched chart below the KPIs section and above the quick-actions section in DOM order
3. WHILE the user role is not in Authorized_Roles (almacenista, jefe, administrador), THE Productos_Controller SHALL set the charts section container to `display: none` so that no chart containers or headings are visible
4. IF any individual chart data fetch fails, THEN THE Productos_Controller SHALL call `showToast` with the error message and type "error" for that specific chart
5. IF any individual chart data fetch fails, THEN THE Productos_Controller SHALL allow the remaining charts and all other page functionality (KPIs, table, search, modals) to continue loading without interruption
6. THE Productos page (`productos.html`) SHALL include the ApexCharts CDN script tag (`https://cdn.jsdelivr.net/npm/apexcharts`) in DOM order after the Supabase scripts and before the controller module script tag

### Requirement 8: Chart Integration in Inventario Module

**User Story:** As an authorized user viewing the Inventario page, I want to see all three charts below the KPIs section, so that I have visual analytics alongside inventory management.

#### Acceptance Criteria

1. WHEN the Inventario page loads (DOMContentLoaded), THE Inventario_Controller SHALL invoke the Chart_Service to fetch data for all three charts (Top 5 Productos, Tendencia de Movimientos, Valor de Inventario por Categoría) independently, so that a failure in one fetch does not prevent the others from completing
2. THE Inventario_Controller SHALL render all three charts below the KPIs section in the containers `#chart-top5-productos`, `#chart-tendencia-movimientos`, and `#chart-valor-por-categoria`
3. IF the user role is not in Authorized_Roles, THEN THE Inventario_Controller SHALL set the charts section container to `display: none` so that it is not visible and does not occupy layout space
4. IF any chart data fetch fails, THEN THE Inventario_Controller SHALL call `showToast` with the error message and type "error"
5. IF any chart data fetch fails, THEN THE Inventario_Controller SHALL allow the remaining charts, KPIs, stock table, movements table, and obra selector to continue loading without interruption
6. THE Inventario page (`inventario.html`) SHALL include the ApexCharts CDN script tag before the controller module script tag

### Requirement 9: Shared Code — No Duplication

**User Story:** As a developer, I want chart service and UI functions defined once in shared modules, so that both controllers import from the same source without code duplication.

#### Acceptance Criteria

1. THE Chart_Service SHALL be defined as a single ES module importable by both Productos_Controller and Inventario_Controller
2. THE Chart_UI SHALL be defined as a single ES module importable by both Productos_Controller and Inventario_Controller
3. THE Chart_Service SHALL export exactly three public functions: `getTop5Productos()`, `getTendenciaMovimientos()`, `getValorInventarioPorCategoria()`
4. THE Chart_UI SHALL export exactly three public functions: `renderGraficaTop5Productos(dataset)`, `renderGraficaTendenciaMovimientos(dataset)`, `renderGraficaValorInventarioPorCategoria(dataset)`
5. WHEN both Productos_Controller and Inventario_Controller import a chart function, THE import statements SHALL reference the same module file path with no re-declaration or inline copy of the function body in either controller
6. WHEN a chart function is invoked from either controller, THE system SHALL execute the same function instance defined in the shared module, verifiable by confirming that no controller file contains a local definition of any function name exported by Chart_Service or Chart_UI
7. IF the shared module file fails to be resolved during import, THEN THE importing controller SHALL halt its chart-related initialization without affecting non-chart functionality (stock tables, KPIs, navigation)

### Requirement 10: HTML Container Structure

**User Story:** As a developer, I want standardized chart containers in both HTML pages, so that the UI rendering functions can target consistent DOM elements.

#### Acceptance Criteria

1. THE Productos page SHALL contain a `<div id="chart-top5-productos">` element as a direct child within the `dashboard-center` container, positioned in DOM order after the KPIs `<section class="grid-cards">` and before the product table section
2. THE Productos page SHALL contain a `<div id="chart-tendencia-movimientos">` element as a direct child within the `dashboard-center` container, positioned in DOM order immediately after the `chart-top5-productos` element
3. THE Productos page SHALL contain a `<div id="chart-valor-por-categoria">` element as a direct child within the `dashboard-center` container, positioned in DOM order immediately after the `chart-tendencia-movimientos` element
4. THE Inventario page SHALL contain a `<div id="chart-top5-productos">` element as a direct child within the `dashboard-center` container, positioned in DOM order after the KPIs `<section class="grid-cards">` and before the stock table section
5. THE Inventario page SHALL contain a `<div id="chart-tendencia-movimientos">` element as a direct child within the `dashboard-center` container, positioned in DOM order immediately after the `chart-top5-productos` element
6. THE Inventario page SHALL contain a `<div id="chart-valor-por-categoria">` element as a direct child within the `dashboard-center` container, positioned in DOM order immediately after the `chart-tendencia-movimientos` element
7. THE chart container elements SHALL each have a minimum height of 280px to ensure sufficient rendering space for chart libraries
8. THE chart container `id` attributes SHALL be unique within their respective page, with no other element sharing the same `id` value
