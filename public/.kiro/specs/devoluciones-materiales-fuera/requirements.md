# Requirements Document

## Introduction

Módulo de Devoluciones / Materiales fuera de almacén para el sistema ADDBOX – Inventario de obras. Este módulo controla los materiales que salen del almacén mediante Documentos de Inventario, permite registrar devoluciones parciales o totales, calcula indicadores de materiales pendientes y vencidos, y muestra alertas visuales en el módulo de Devoluciones y en el Dashboard principal.

## Glossary

- **ADDBOX**: Sistema de gestión de inventario de obras
- **Documento_Inventario**: Registro en la tabla `documentos_inventario` que representa un traslado o requisición de materiales/herramientas
- **Detalle_Documento**: Registro en la tabla `documentos_inventario_detalle` que representa una línea de producto dentro de un Documento_Inventario
- **Material_Fuera**: Un Detalle_Documento cuya cantidad pendiente (cantidad - cantidad_devuelta) es mayor a cero
- **Material_Vencido**: Un Material_Fuera cuyo número de días fuera del almacén supera el umbral configurado (por defecto 7 días)
- **Dias_Fuera**: Número de días transcurridos desde la fecha de creación del Documento_Inventario (campo `creado_en`) hasta la fecha actual
- **Pendiente**: Cantidad calculada como `cantidad - cantidad_devuelta` para un Detalle_Documento
- **Devolucion**: Acción de registrar la reincorporación parcial o total de un material al almacén
- **Servicio_Devoluciones**: Capa de lógica de negocio (devoluciones.service.js) que gestiona consultas y operaciones de devolución
- **Controlador_Devoluciones**: Capa de presentación (devoluciones.controller.js) que gestiona la interfaz del módulo
- **Umbral_Vencimiento**: Número de días configurado (por defecto 7) a partir del cual un Material_Fuera se considera vencido
- **Estado_Documento**: Campo `estado` en `documentos_inventario` con valores posibles: "abierto" o "cerrado"
- **Supabase_Client**: Cliente de Supabase v1 utilizado para operaciones de base de datos y suscripciones en tiempo real

## Requirements

### Requirement 1: Esquema de base de datos para devoluciones

**User Story:** As an administrator, I want the database to support return tracking fields, so that the system can persist return quantities and document states.

#### Acceptance Criteria

1. THE Servicio_Devoluciones SHALL operate on a `cantidad_devuelta` column of type numeric with DEFAULT 0 in the table `documentos_inventario_detalle`
2. THE Servicio_Devoluciones SHALL operate on a `fecha_devolucion` column of type date (nullable) in the table `documentos_inventario_detalle`
3. THE Servicio_Devoluciones SHALL operate on an `estado` column of type text with DEFAULT 'abierto' in the table `documentos_inventario`
4. WHEN a new Detalle_Documento is created, THE Servicio_Devoluciones SHALL treat `cantidad_devuelta` as 0 and `fecha_devolucion` as null
5. THE Servicio_Devoluciones SHALL support RLS policies that allow authenticated users to UPDATE rows in `documentos_inventario_detalle` and `documentos_inventario`

### Requirement 2: Consulta de materiales fuera de almacén

**User Story:** As a warehouse manager, I want to see all materials currently outside the warehouse, so that I can track what needs to be returned.

#### Acceptance Criteria

1. WHEN the Devoluciones module loads, THE Servicio_Devoluciones SHALL retrieve all Detalle_Documento records where Pendiente is greater than zero
2. THE Servicio_Devoluciones SHALL calculate Pendiente as `cantidad - cantidad_devuelta` for each Detalle_Documento
3. THE Servicio_Devoluciones SHALL calculate Dias_Fuera as the number of whole days between the Documento_Inventario `creado_en` date and the current date
4. THE Servicio_Devoluciones SHALL return for each Material_Fuera: document number, document type, project/obra, destination, product code, product description, unit, quantity dispatched, quantity returned, Pendiente, and Dias_Fuera
5. THE Servicio_Devoluciones SHALL sort results by Dias_Fuera in descending order (oldest materials first)

### Requirement 3: Registro de devolución parcial

**User Story:** As a warehouse manager, I want to register partial returns of materials, so that I can track incremental returns without requiring all items at once.

#### Acceptance Criteria

1. WHEN a user submits a return of quantity Q for a Detalle_Documento, THE Servicio_Devoluciones SHALL validate that Q is greater than zero and less than or equal to Pendiente
2. IF the return quantity Q exceeds Pendiente, THEN THE Servicio_Devoluciones SHALL reject the operation with a descriptive error message
3. WHEN a valid return is submitted, THE Servicio_Devoluciones SHALL update `cantidad_devuelta` to `cantidad_devuelta + Q` in the corresponding Detalle_Documento
4. WHEN a valid return is submitted, THE Servicio_Devoluciones SHALL set `fecha_devolucion` to the current date in the corresponding Detalle_Documento
5. WHEN a valid return is submitted, THE Servicio_Devoluciones SHALL increase `existencia` by Q in the `productos` table for the product matching the Detalle_Documento code
6. IF the product code from the Detalle_Documento does not match any product in the `productos` table, THEN THE Servicio_Devoluciones SHALL complete the return without modifying stock

### Requirement 4: Cierre automático de documento

**User Story:** As a warehouse manager, I want documents to close automatically when all materials are returned, so that I can easily identify completed returns.

#### Acceptance Criteria

1. WHEN a return is registered, THE Servicio_Devoluciones SHALL check all Detalle_Documento records belonging to the same Documento_Inventario
2. WHEN all Detalle_Documento records in a Documento_Inventario have Pendiente equal to zero, THE Servicio_Devoluciones SHALL update the Estado_Documento to "cerrado"
3. WHILE a Documento_Inventario has at least one Detalle_Documento with Pendiente greater than zero, THE Servicio_Devoluciones SHALL maintain the Estado_Documento as "abierto"

### Requirement 5: KPI cards del módulo Devoluciones

**User Story:** As a warehouse manager, I want to see summary KPI cards, so that I can quickly assess the overall status of materials outside the warehouse.

#### Acceptance Criteria

1. THE Controlador_Devoluciones SHALL display a "Materiales fuera" card showing the count of Detalle_Documento records where Pendiente is greater than zero
2. THE Controlador_Devoluciones SHALL display a "Vencidos" card showing the count of Material_Vencido records (Pendiente greater than zero AND Dias_Fuera greater than Umbral_Vencimiento)
3. THE Controlador_Devoluciones SHALL display a "Días promedio fuera" card showing the arithmetic mean of Dias_Fuera across all Material_Fuera records
4. THE Controlador_Devoluciones SHALL display a "Devoluciones hoy" card showing the count of Detalle_Documento records where `fecha_devolucion` equals the current date
5. WHEN no Material_Fuera records exist, THE Controlador_Devoluciones SHALL display zero in all KPI cards

### Requirement 6: Tabla principal de materiales fuera

**User Story:** As a warehouse manager, I want a detailed table of all materials outside the warehouse, so that I can review and act on individual items.

#### Acceptance Criteria

1. THE Controlador_Devoluciones SHALL render a table with columns: Documento, Obra/Destino, Producto, Salió, Devuelto, Pendiente, Días fuera, Estado, Acciones
2. THE Controlador_Devoluciones SHALL display a green indicator (🟢) for rows where Pendiente equals zero
3. THE Controlador_Devoluciones SHALL display a yellow indicator (🟡) for rows where Pendiente is greater than zero and Dias_Fuera is less than or equal to Umbral_Vencimiento
4. THE Controlador_Devoluciones SHALL display a red indicator (🔴) for rows where Pendiente is greater than zero and Dias_Fuera is greater than Umbral_Vencimiento
5. THE Controlador_Devoluciones SHALL provide a "Devolver" action button on each row with Pendiente greater than zero
6. THE Controlador_Devoluciones SHALL provide a "Devolver todo" action button on each row with Pendiente greater than zero

### Requirement 7: Filtros de la tabla de materiales

**User Story:** As a warehouse manager, I want to filter the materials table, so that I can find specific items quickly.

#### Acceptance Criteria

1. THE Controlador_Devoluciones SHALL provide a text search filter that matches against document number, product description, product code, and project name
2. THE Controlador_Devoluciones SHALL provide a filter by document type (Traslado, Requisición de materiales, Requisición de herramienta)
3. THE Controlador_Devoluciones SHALL provide a filter by status (Pendiente, Vencido, Cerrado)
4. THE Controlador_Devoluciones SHALL provide a filter by date range applied to the document creation date
5. THE Controlador_Devoluciones SHALL provide a filter by days-out range (minimum and maximum Dias_Fuera)
6. WHEN filters are applied, THE Controlador_Devoluciones SHALL display only rows matching all active filter criteria simultaneously

### Requirement 8: Modal de devolución

**User Story:** As a warehouse manager, I want a return modal that shows document details and allows me to specify return quantities, so that I can process returns accurately.

#### Acceptance Criteria

1. WHEN the user clicks the "Devolver" button on a table row, THE Controlador_Devoluciones SHALL display a modal with the document information (number, type, project, date)
2. THE Controlador_Devoluciones SHALL display in the modal a table of products from the selected document showing: Producto, Salió, Devuelto, Pendiente, and a "Devolver ahora" input field
3. THE Controlador_Devoluciones SHALL restrict the "Devolver ahora" input to accept only numeric values between 1 and the Pendiente value for each product
4. IF the user enters a value greater than Pendiente in the "Devolver ahora" field, THEN THE Controlador_Devoluciones SHALL display a validation error and prevent submission
5. WHEN the user confirms the return in the modal, THE Controlador_Devoluciones SHALL invoke the Servicio_Devoluciones to register the return for each product with a non-zero "Devolver ahora" value
6. WHEN the return is successfully registered, THE Controlador_Devoluciones SHALL close the modal, refresh the table, and display a success toast notification

### Requirement 9: Integración con Dashboard

**User Story:** As a project manager, I want to see material return alerts on the main dashboard, so that I can monitor overdue items without navigating to the Devoluciones module.

#### Acceptance Criteria

1. THE Controlador_Devoluciones SHALL expose a function to retrieve the count of Material_Fuera and Material_Vencido for use by the Dashboard module
2. THE Dashboard SHALL display a "Materiales fuera" card showing the total count of Material_Fuera records
3. THE Dashboard SHALL display a "Materiales vencidos" card showing the count of Material_Vencido records
4. WHEN Material_Vencido count is greater than zero, THE Dashboard SHALL display the count with a red visual indicator
5. THE Sidebar SHALL display a badge next to the "Devoluciones" menu item showing the count of Material_Vencido with a red indicator

### Requirement 10: Suscripción en tiempo real

**User Story:** As a warehouse manager, I want the Devoluciones module to update automatically when changes occur, so that I always see current data without manual refresh.

#### Acceptance Criteria

1. WHEN the Devoluciones module is active, THE Controlador_Devoluciones SHALL subscribe to UPDATE events on the `documentos_inventario_detalle` table via Supabase_Client realtime
2. WHEN an UPDATE event is received on `documentos_inventario_detalle`, THE Controlador_Devoluciones SHALL refresh the KPI cards and the materials table
3. WHEN the user navigates away from the Devoluciones module, THE Controlador_Devoluciones SHALL unsubscribe from the realtime channel to prevent memory leaks
4. IF the realtime connection is lost, THEN THE Controlador_Devoluciones SHALL attempt to resubscribe automatically when the connection is restored

### Requirement 11: Validación de integridad de datos

**User Story:** As an administrator, I want the system to maintain data integrity during return operations, so that stock levels and return records remain consistent.

#### Acceptance Criteria

1. THE Servicio_Devoluciones SHALL ensure that `cantidad_devuelta` never exceeds `cantidad` for any Detalle_Documento
2. THE Servicio_Devoluciones SHALL ensure that `existencia` in the `productos` table is incremented by exactly the returned quantity
3. IF a database error occurs during the return operation, THEN THE Servicio_Devoluciones SHALL report the error to the user without partially updating records
4. THE Servicio_Devoluciones SHALL not modify the `cantidad` field, `costo_prom` field, or any other existing field in the `productos` table beyond `existencia`
5. THE Servicio_Devoluciones SHALL not modify the creation logic or existing fields of Documento_Inventario records beyond the `estado` field
