# Requirements Document

## Introduction

Extensión del módulo de Devoluciones / Materiales Fuera de Almacén para ADDBOX. Actualmente el módulo solo permite "devolver" un material al almacén (incrementando stock). Esta feature agrega la posibilidad de registrar un **motivo de cierre** que refleje lo que realmente ocurrió con el material: fue devuelto, consumido en obra, extraviado, dado de baja por daño, o enviado a reparación. Solo el motivo "devuelto" incrementa el stock; los demás cierran el pendiente sin modificar existencias.

## Glossary

- **Motivo_Cierre**: Razón por la cual se cierra un pendiente de material fuera. Valores: "devuelto", "consumido", "extraviado", "danado_baja", "danado_reparacion"
- **Estado_Especial**: Campo que indica una condición especial del material. Actualmente solo "en_reparacion" o NULL
- **Consumible**: Material que se gasta en obra y no regresa (cemento, tornillos, pintura)
- **Herramienta**: Material reutilizable que normalmente debe regresar al almacén
- **Baja**: Eliminación definitiva de un material del inventario por daño irreparable o extravío
- **Reparación**: Estado temporal donde una herramienta dañada está siendo reparada antes de reincorporarse

## Requirements

### Requirement 1: Esquema de base de datos para motivo de cierre

**User Story:** As an administrator, I want the database to support closure reason tracking, so that the system can persist why a material's pending was closed.

#### Acceptance Criteria

1. THE tabla `documentos_inventario_detalle` SHALL contain a column `motivo_cierre` of type text, nullable, with no default value
2. THE tabla `documentos_inventario_detalle` SHALL contain a column `estado_especial` of type text, nullable, with no default value
3. THE column `motivo_cierre` SHALL accept only the values: "devuelto", "consumido", "extraviado", "danado_baja", "danado_reparacion"
4. THE column `estado_especial` SHALL accept only the values: "en_reparacion" or NULL
5. WHEN a Detalle_Documento has `motivo_cierre` set, THE system SHALL treat that line as closed regardless of the motivo value

### Requirement 2: Lógica de negocio según motivo

**User Story:** As a warehouse manager, I want the system to handle stock differently based on the closure reason, so that inventory reflects reality.

#### Acceptance Criteria

1. WHEN `motivo_cierre` is "devuelto", THE Servicio_Devoluciones SHALL increment `existencia` by Q in the `productos` table for the matching product code
2. WHEN `motivo_cierre` is "consumido", THE Servicio_Devoluciones SHALL NOT modify `existencia` in the `productos` table
3. WHEN `motivo_cierre` is "extraviado", THE Servicio_Devoluciones SHALL NOT modify `existencia` in the `productos` table
4. WHEN `motivo_cierre` is "danado_baja", THE Servicio_Devoluciones SHALL NOT modify `existencia` in the `productos` table
5. WHEN `motivo_cierre` is "danado_reparacion", THE Servicio_Devoluciones SHALL NOT modify `existencia` in the `productos` table
6. WHEN `motivo_cierre` is "danado_reparacion", THE Servicio_Devoluciones SHALL set `estado_especial` to "en_reparacion" in the corresponding Detalle_Documento
7. FOR all motivos, THE Servicio_Devoluciones SHALL update `cantidad_devuelta` to `cantidad_devuelta + Q` (closing the pending)
8. FOR all motivos, THE Servicio_Devoluciones SHALL set `fecha_devolucion` to the current date
9. FOR all motivos, THE Servicio_Devoluciones SHALL persist the `motivo_cierre` value in the Detalle_Documento
10. THE Servicio_Devoluciones SHALL validate that `motivo` is one of the 5 allowed values before processing

### Requirement 3: UI del modal con selector de motivo

**User Story:** As a warehouse manager, I want to select a closure reason when processing a return, so that I can accurately record what happened to each material.

#### Acceptance Criteria

1. THE modal de devolución SHALL display a "Motivo" select dropdown for each product row
2. THE select SHALL offer the options: "Devuelto", "Consumido", "Extraviado", "Dañado - Baja", "Dañado - Reparación"
3. THE select SHALL default to "Devuelto" when the modal opens
4. WHEN the user confirms the return, THE Controlador_Devoluciones SHALL send the selected motivo for each product to the Servicio_Devoluciones
5. IF no motivo is selected (empty), THEN THE Controlador_Devoluciones SHALL prevent submission and show a validation error
6. THE "Devolver todo" action button SHALL use "devuelto" as the default motivo without showing the modal

### Requirement 4: Indicador visual de estado especial

**User Story:** As a warehouse manager, I want to see which materials are in repair status, so that I can track them separately.

#### Acceptance Criteria

1. WHEN a Detalle_Documento has `estado_especial` equal to "en_reparacion", THE Controlador_Devoluciones SHALL display a wrench icon (🔧) next to the status indicator in the table
2. WHEN the toggle "Mostrar documentos cerrados" is active, THE table SHALL show closed items with their `motivo_cierre` displayed in the Estado column
3. THE Estado column SHALL display the motivo as a colored badge: "Devuelto" (green), "Consumido" (blue), "Extraviado" (orange), "Baja" (red), "Reparación" (yellow with 🔧)

### Requirement 5: Persistencia para reportes futuros

**User Story:** As an administrator, I want closure reasons stored in the database, so that future reports can analyze material losses, consumption patterns, and repair needs.

#### Acceptance Criteria

1. THE Servicio_Devoluciones SHALL always persist `motivo_cierre` when closing a pending
2. THE Servicio_Devoluciones SHALL persist `estado_especial` only when motivo is "danado_reparacion"
3. THE data model SHALL support querying all closures by motivo for future reporting
4. THE existing `obtenerMaterialesFuera()` function SHALL continue to return only items with `pendiente > 0` (unaffected by this feature)
