# Requirements Document

## Introduction

Página de reportes de motivo de cierre para el sistema ADDBOX – Inventario de obras. Esta página presenta indicadores KPI y tablas detalladas sobre herramientas extraviadas, herramientas en reparación y consumibles por proyecto, basándose en los datos de `motivo_cierre` registrados en `documentos_inventario_detalle`. Incluye cálculo de costo de pérdidas usando `costo_prom` de la tabla `productos` y exportación CSV por sección.

## Glossary

- **Sistema_Reportes**: Módulo de reportes ubicado en `modules/reportes/devoluciones.html` que presenta datos de cierre de materiales
- **Servicio_Reportes_Cierre**: Capa de lógica de negocio (`modules/devoluciones/reportes-cierre.service.js`) que consulta y procesa datos de motivo de cierre desde Supabase
- **Controlador_Reportes_Cierre**: Capa de presentación (`modules/reportes/reportes-cierre.controller.js`) que gestiona la interfaz de la página de reportes
- **Detalle_Documento**: Registro en la tabla `documentos_inventario_detalle` con campos: motivo_cierre, estado_especial, cantidad, cantidad_devuelta, codigo, descripcion, documento_id
- **Documento_Inventario**: Registro en la tabla `documentos_inventario` con campos: proyecto, obra_nombre, creado_en, tipo
- **Producto**: Registro en la tabla `productos` con campos: codigo, descripcion, costo_prom
- **Herramienta_Extraviada**: Un Detalle_Documento cuyo `motivo_cierre` es "extraviado"
- **Herramienta_En_Reparacion**: Un Detalle_Documento cuyo `motivo_cierre` es "danado_reparacion" y `estado_especial` es "en_reparacion"
- **Consumible**: Un Detalle_Documento cuyo `motivo_cierre` es "consumido"
- **Costo_Perdida**: Valor calculado como `cantidad_devuelta * costo_prom` para un Detalle_Documento unido con su Producto correspondiente por campo `codigo`
- **Supabase_Client**: Cliente de Supabase v1 utilizado para operaciones de base de datos

## Requirements

### Requirement 1: Consulta de herramientas extraviadas

**User Story:** As a warehouse manager, I want to retrieve all items marked as lost, so that I can analyze losses by project and date.

#### Acceptance Criteria

1. WHEN the Sistema_Reportes loads, THE Servicio_Reportes_Cierre SHALL retrieve all Detalle_Documento records where `motivo_cierre` equals "extraviado"
2. THE Servicio_Reportes_Cierre SHALL join each Detalle_Documento with its Documento_Inventario to obtain `proyecto`, `obra_nombre`, and `creado_en`
3. THE Servicio_Reportes_Cierre SHALL join each Detalle_Documento with the Producto table by `codigo` to obtain `costo_prom`
4. THE Servicio_Reportes_Cierre SHALL calculate Costo_Perdida as `cantidad_devuelta * costo_prom` for each Herramienta_Extraviada
5. THE Servicio_Reportes_Cierre SHALL return for each Herramienta_Extraviada: codigo, descripcion, cantidad_devuelta, proyecto, obra_nombre, creado_en, costo_prom, and Costo_Perdida

### Requirement 2: Consulta de herramientas en reparación

**User Story:** As a warehouse manager, I want to see all items currently in repair, so that I can track their status and plan replacements.

#### Acceptance Criteria

1. WHEN the Sistema_Reportes loads, THE Servicio_Reportes_Cierre SHALL retrieve all Detalle_Documento records where `motivo_cierre` equals "danado_reparacion"
2. THE Servicio_Reportes_Cierre SHALL join each Detalle_Documento with its Documento_Inventario to obtain `proyecto`, `obra_nombre`, and `creado_en`
3. THE Servicio_Reportes_Cierre SHALL return for each Herramienta_En_Reparacion: codigo, descripcion, cantidad_devuelta, proyecto, obra_nombre, creado_en, and estado_especial

### Requirement 3: Consulta de consumibles por proyecto

**User Story:** As a project manager, I want to see a summary of consumed materials grouped by project, so that I can evaluate material usage per project.

#### Acceptance Criteria

1. WHEN the Sistema_Reportes loads, THE Servicio_Reportes_Cierre SHALL retrieve all Detalle_Documento records where `motivo_cierre` equals "consumido"
2. THE Servicio_Reportes_Cierre SHALL join each Detalle_Documento with its Documento_Inventario to obtain `proyecto` and `obra_nombre`
3. THE Servicio_Reportes_Cierre SHALL join each Detalle_Documento with the Producto table by `codigo` to obtain `costo_prom`
4. THE Servicio_Reportes_Cierre SHALL group results by `proyecto` and calculate the total quantity consumed and total cost per project
5. THE Servicio_Reportes_Cierre SHALL return for each project group: proyecto, total items consumed, total cost, and a detail list of individual Consumible records

### Requirement 4: KPI cards de resumen

**User Story:** As a warehouse manager, I want to see summary KPI cards at the top of the report page, so that I can quickly assess the overall impact of closures.

#### Acceptance Criteria

1. THE Controlador_Reportes_Cierre SHALL display a "Total Extraviados" card showing the count of all Herramienta_Extraviada records
2. THE Controlador_Reportes_Cierre SHALL display a "Total en Reparación" card showing the count of all Herramienta_En_Reparacion records
3. THE Controlador_Reportes_Cierre SHALL display a "Costo Total de Pérdidas" card showing the sum of Costo_Perdida across all Herramienta_Extraviada records
4. WHEN no records exist for a given category, THE Controlador_Reportes_Cierre SHALL display zero in the corresponding KPI card
5. THE Controlador_Reportes_Cierre SHALL format the "Costo Total de Pérdidas" value as currency with two decimal places

### Requirement 5: Tabla de herramientas extraviadas

**User Story:** As a warehouse manager, I want a detailed table of lost tools, so that I can review each loss event with its associated cost.

#### Acceptance Criteria

1. THE Controlador_Reportes_Cierre SHALL render a table with columns: Código, Descripción, Cantidad, Proyecto/Obra, Fecha, Costo Unitario, Costo Total
2. THE Controlador_Reportes_Cierre SHALL display `costo_prom` in the "Costo Unitario" column and Costo_Perdida in the "Costo Total" column
3. THE Controlador_Reportes_Cierre SHALL provide a project/obra filter dropdown that filters the table by the selected `proyecto` value
4. THE Controlador_Reportes_Cierre SHALL provide a date range filter (fecha desde, fecha hasta) applied to the `creado_en` field
5. WHEN filters are applied, THE Controlador_Reportes_Cierre SHALL display only rows matching all active filter criteria simultaneously
6. WHEN no Herramienta_Extraviada records match the active filters, THE Controlador_Reportes_Cierre SHALL display a message indicating no results

### Requirement 6: Tabla de herramientas en reparación

**User Story:** As a warehouse manager, I want a detailed table of tools in repair, so that I can monitor repair status and duration.

#### Acceptance Criteria

1. THE Controlador_Reportes_Cierre SHALL render a table with columns: Código, Descripción, Cantidad, Proyecto/Obra, Fecha de Registro, Estado
2. THE Controlador_Reportes_Cierre SHALL display the `estado_especial` value in the "Estado" column
3. WHEN no Herramienta_En_Reparacion records exist, THE Controlador_Reportes_Cierre SHALL display a message indicating no tools are currently in repair

### Requirement 7: Tabla resumen de consumibles por proyecto

**User Story:** As a project manager, I want a summary table of consumed materials grouped by project, so that I can compare material consumption across projects.

#### Acceptance Criteria

1. THE Controlador_Reportes_Cierre SHALL render a table with columns: Proyecto, Total Items, Costo Total
2. THE Controlador_Reportes_Cierre SHALL group Consumible records by `proyecto` and display one row per project
3. THE Controlador_Reportes_Cierre SHALL calculate "Total Items" as the sum of `cantidad_devuelta` for all Consumible records in each project
4. THE Controlador_Reportes_Cierre SHALL calculate "Costo Total" as the sum of Costo_Perdida for all Consumible records in each project
5. WHEN no Consumible records exist, THE Controlador_Reportes_Cierre SHALL display a message indicating no consumed materials

### Requirement 8: Exportación CSV por sección

**User Story:** As a warehouse manager, I want to export each table section to CSV, so that I can share reports with stakeholders or perform further analysis in spreadsheets.

#### Acceptance Criteria

1. THE Controlador_Reportes_Cierre SHALL provide a CSV export button for the herramientas extraviadas table section
2. THE Controlador_Reportes_Cierre SHALL provide a CSV export button for the herramientas en reparación table section
3. THE Controlador_Reportes_Cierre SHALL provide a CSV export button for the consumibles por proyecto table section
4. WHEN the user clicks a CSV export button, THE Controlador_Reportes_Cierre SHALL generate a CSV file containing all currently visible rows of the corresponding table (respecting active filters)
5. THE Controlador_Reportes_Cierre SHALL include column headers as the first row of the generated CSV file
6. THE Controlador_Reportes_Cierre SHALL trigger a browser download of the generated CSV file with a descriptive filename including the section name and current date

### Requirement 9: Layout de página única con scroll

**User Story:** As a user, I want all report sections visible on a single scrollable page, so that I can review all data without switching between tabs.

#### Acceptance Criteria

1. THE Controlador_Reportes_Cierre SHALL render the page with KPI cards at the top, followed by the three table sections in vertical order: extraviados, en reparación, consumibles
2. THE Controlador_Reportes_Cierre SHALL display all sections on a single page accessible via scroll without tabs or pagination between sections
3. THE Controlador_Reportes_Cierre SHALL apply the dark theme consistent with the existing ADDBOX admin dashboard styling

### Requirement 10: Integración con arquitectura existente

**User Story:** As a developer, I want the report module to follow the existing Service+Controller pattern, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Servicio_Reportes_Cierre SHALL be implemented in `modules/devoluciones/reportes-cierre.service.js` and export async functions for data retrieval
2. THE Controlador_Reportes_Cierre SHALL be implemented in `modules/reportes/reportes-cierre.controller.js` and import functions from the Servicio_Reportes_Cierre
3. THE Servicio_Reportes_Cierre SHALL import the Supabase_Client from `../../services/supabase-client.js`
4. THE Controlador_Reportes_Cierre SHALL use vanilla JavaScript for DOM manipulation without external UI frameworks
5. THE Sistema_Reportes HTML page SHALL be located at `modules/reportes/devoluciones.html`
