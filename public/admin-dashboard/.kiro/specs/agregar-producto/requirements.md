# Requirements Document

## Introduction

This feature adds a complete "Agregar Producto" (Add Product) functionality to the ADDBOX admin dashboard. The dashboard connects to a Supabase database with a `productos` table that has a specific schema. The feature will allow users to add new products through a form modal, validate input, insert data into Supabase, and refresh the product table.

## Glossary

- **ADDBOX**: The company name for the admin dashboard system
- **Dashboard**: The admin dashboard web application located at `modules/inventario/productos.html`
- **Supabase**: The backend database service used by ADDBOX
- **Productos Table**: The Supabase table storing product information with columns: `id` (UUID), `codigo` (TEXT), `descripcion` (TEXT), `costo_prom` (NUMERIC), `estado` (TEXT), `creado_en` (TIMESTAMPTZ)
- **Product Code (Código)**: Unique identifier for a product (TEXT)
- **Product Description (Descripción)**: Detailed description of the product (TEXT)
- **Average Cost (Costo Promedio)**: The average cost of the product (NUMERIC)
- **Status (Estado)**: Current status of the product (e.g., "activo", "inactivo") (TEXT)
- **Unit of Measure (Unidad)**: Optional unit for the product (TEXT)
- **Stock Quantity (Existencia)**: Optional number of units in stock (INTEGER)
- **Location (Ubicación)**: Optional storage location for the product (TEXT)
- **Category (Categoría)**: Optional category classification for the product (TEXT)

## Requirements

### Requirement 1: Functional "Agregar Producto" Button

**User Story:** As a user, I want the "Agregar Producto" button to open a product form modal, so that I can add new products.

#### Acceptance Criteria

1. WHEN the "Agregar Producto" button is clicked, THE Dashboard SHALL open a product form modal
2. IF the button is clicked while a modal is already open, THE Dashboard SHALL ignore the click or close the existing modal first

### Requirement 2: Product Form Modal

**User Story:** As a user, I want a form modal for adding products, so that I can enter all necessary product information in one place.

#### Acceptance Criteria

1. THE Modal SHALL include fields for all required Supabase columns:
   - `codigo` (TEXT) - Product code
   - `descripcion` (TEXT) - Product description
   - `costo_prom` (NUMERIC) - Average cost
   - `estado` (TEXT) - Status (e.g., "activo", "inactivo")
2. THE Modal SHALL include optional fields:
   - `unidad` (TEXT) - Unit of measure
   - `existencia` (INTEGER) - Stock quantity
   - `ubicacion` (TEXT) - Location
   - `categoria` (TEXT) - Category
3. WHEN the modal opens, THE Form SHALL be empty and ready for input
4. WHEN the modal closes, THE Form SHALL be cleared of all user input

### Requirement 3: Form Validation

**User Story:** As a user, I want the form to validate my input before submission, so that I don't accidentally save invalid data.

#### Acceptance Criteria

1. IF the `codigo` field is empty when submitting, THE Validator SHALL show an error message "El código es obligatorio"
2. IF the `descripcion` field is empty when submitting, THE Validator SHALL show an error message "La descripción es obligatoria"
3. IF the `costo_prom` field contains invalid text (not a valid number), THE Validator SHALL show an error message "El costo debe ser un número válido"
4. WHERE validation fails, THE Form SHALL prevent submission and highlight the invalid field
5. [FALLBACK] IF the form submission prevention mechanism malfunctions, THE Validator SHALL perform additional validation checks to ensure submission never proceeds when validation has failed

### Requirement 4: Insert Product into Supabase

**User Story:** As a user, I want the product to be inserted into Supabase when I submit the form, so that the new product is saved to the database.

#### Acceptance Criteria

1. WHEN the form is submitted with valid data, THE Supabase Client SHALL insert the product into the `productos` table
2. IF the insertion succeeds, THE System SHALL return the newly created product record with its `id`
3. IF the insertion fails due to network error, THE System SHALL return only a descriptive error message (no product record)
4. IF the insertion fails due to database constraint violation, THE System SHALL return a descriptive error message
5. [FALLBACK] IF insertion fails, THE System SHALL prevent any product record from being returned

### Requirement 5: Refresh Table After Save

**User Story:** As a user, I want the product table to refresh after adding a product, so that I can see the new product immediately.

#### Acceptance Criteria

1. WHEN a product is successfully inserted, THE Dashboard SHALL reload the product table data
2. WHEN the table reloads, THE New Product SHALL appear in the table with all its fields
3. AFTER the table refreshes, THE Modal SHALL close automatically
4. AFTER the modal closes, THE Form Fields SHALL be cleared

### Requirement 6: Search Functionality

**User Story:** As a user, I want to search products by code and description, so that I can quickly find specific products in the table.

#### Acceptance Criteria

1. WHERE a search bar is present above the product table, THE Search Bar SHALL allow text input
2. WHEN text is entered into the search bar, THE Table SHALL filter products in real-time
3. WHERE filtering is applied, THE Results SHALL match products where `codigo` OR `descripcion` contains the search text (case-insensitive)
4. WHERE no products match the search, THE Table SHALL display "No se encontraron productos" message
5. WHERE the search bar is empty, THE Table SHALL show all products
6. [HIDE MESSAGE] WHEN the user starts typing a new search that might have results, THE System SHALL hide the "No se encontraron productos" message immediately

### Requirement 7: Error Handling

**User Story:** As a user, I want to see user-friendly error messages, so that I understand what went wrong and can fix it.

#### Acceptance Criteria

1. IF a network error occurs during product insertion, THE System SHALL show a notification "Error de red: no se pudo conectar con el servidor"
2. IF a database error occurs during product insertion, THE System SHALL show a notification with the specific error message
3. IF form validation fails, THE System SHALL show error messages next to the invalid fields
4. [MODAL BEHAVIOR] WHERE an error occurs, THE Modal SHALL remain open only for validation errors that users can correct; for network and database errors that users cannot fix, the modal behavior shall be appropriate for the error type

### Requirement 8: Maintain Current Dashboard Style

**User Story:** As a developer, I want the new modal and search functionality to match the existing dashboard style, so that the UI remains consistent.

#### Acceptance Criteria

1. THE Modal SHALL use the same CSS classes and styling as other dashboard components
2. THE Search Bar SHALL use the same input styling as other dashboard search fields
3. THE Table SHALL maintain its existing structure and styling
4. WHERE notifications are shown, THE System SHALL use the existing notification system

## Non-Functional Requirements

1. **Do NOT modify backend or Supabase schema** - Only update dashboard HTML + JavaScript
2. **Use existing Supabase table structure** - The table has columns: `id`, `codigo`, `descripcion`, `costo_prom`, `estado`, `creado_en`
3. **Maintain current dashboard style** - Use existing CSS classes and styling
4. **Error Handling** - Show user-friendly error messages and handle network errors gracefully
5. **Performance** - Search should filter in real-time without API calls (client-side filtering)
6. **User Experience** - Modal should close automatically after successful save