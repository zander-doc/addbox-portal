# Design Document

## Overview

This feature adds a complete "Agregar Producto" (Add Product) functionality to the ADDBOX admin dashboard. The dashboard connects to a Supabase database with a `productos` table that has a specific schema. The feature will allow users to add new products through a form modal, validate input, insert data into Supabase, and refresh the product table.

### Key Points

- **Do NOT modify backend or Supabase schema** - Only update dashboard HTML + JavaScript
- **Use existing Supabase table structure** - The table has columns: `id`, `codigo`, `descripcion`, `costo_prom`, `estado`, `creado_en`
- **Maintain current dashboard style** - Use existing CSS classes and styling
- **Error Handling** - Show user-friendly error messages and handle network errors gracefully
- **Performance** - Search should filter in real-time without API calls (client-side filtering)
- **User Experience** - Modal should close automatically after successful save

## Architecture

The architecture follows a simple client-side pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Topbar      │  │  Search Bar  │  │  Product Table   │  │
│  │  (Buttons)   │  │  (Filter)    │  │  (Display)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                         │                                     │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │              Modal Layer (Form)                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Form Fields (codigo, descripcion, costo_prom,  │  │  │
│  │  │  estado, unidad, existencia, ubicacion, categoria)│  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │           Validation Layer                              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Form Validation (required fields, numeric)     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │           Supabase Client Layer                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Insert/Select Operations (productos table)     │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### UI Components

1. **Topbar**
   - "Nuevo producto" button (opens modal)
   - "Salir" button (logout)

2. **Search Bar**
   - Text input above product table
   - Real-time filtering on `codigo` and `descripcion`

3. **Product Table**
   - Displays products with columns: `codigo`, `descripcion`, `costo_prom`, `estado`, `acciones`
   - Edit button for each product

4. **Product Form Modal**
   - Required fields: `codigo`, `descripcion`, `costo_prom`, `estado`
   - Optional fields: `unidad`, `existencia`, `ubicacion`, `categoria`
   - Validation error messages
   - Submit and Cancel buttons

5. **Notification System**
   - Success, error, and info messages
   - Uses existing notification system

### JavaScript Functions

| Function | Description |
|----------|-------------|
| `abrirFormulario()` | Opens the product form modal |
| `cerrarFormulario()` | Closes the modal and clears form |
| `validarFormulario()` | Validates form fields before submission |
| `guardarProducto()` | Inserts product into Supabase |
| `cargarProductos()` | Loads and displays products from Supabase |
| `filtrarProductos()` | Filters products in real-time based on search |
| `mostrarNotificacion()` | Shows notification messages |
| `logout()` | Logs out the user |

### Data Flow

```
User clicks "Nuevo producto"
         │
         ▼
  abrirFormulario()
         │
         ▼
  Modal opens (empty form)
         │
         ▼
  User fills form fields
         │
         ▼
  User clicks "Guardar"
         │
         ▼
  validarFormulario()
         │
         ├─► Validation fails ──► Show error messages
         │
         ▼
  Validation passes
         │
         ▼
  guardarProducto()
         │
         ├─► Network error ──► Show error notification
         │
         ├─► Database error ──► Show error notification
         │
         ▼
  Insert succeeds
         │
         ▼
  cargarProductos() ──► Table refreshes
         │
         ▼
  cerrarFormulario() ──► Modal closes, form cleared
```

## Data Models

### Product Object (Supabase `productos` table)

```javascript
{
  id: UUID,              // Auto-generated by Supabase
  codigo: TEXT,          // Product code (required)
  descripcion: TEXT,     // Product description (required)
  costo_prom: NUMERIC,   // Average cost (required)
  estado: TEXT,          // Status: "activo" or "inactivo" (required)
  creado_en: TIMESTAMPTZ // Auto-generated timestamp
}
```

### Optional Product Fields

```javascript
{
  unidad: TEXT,          // Unit of measure (optional)
  existencia: INTEGER,   // Stock quantity (optional)
  ubicacion: TEXT,       // Storage location (optional)
  categoria: TEXT        // Category classification (optional)
}
```

### Form Data Object

```javascript
{
  codigo: string,
  descripcion: string,
  costo_prom: string,    // Text input, converted to number before insert
  estado: string,        // "activo" or "inactivo"
  unidad: string,
  existencia: string,    // Text input, converted to number before insert
  ubicacion: string,
  categoria: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Modal opens on button click

*For any* UI state where the "Nuevo producto" button is visible, clicking the button SHALL open the product form modal and clear any previous form data.

**Validates: Requirements 1.1, 1.2**

### Property 2: Modal clears on close

*For any* modal state with form data, closing the modal SHALL clear all form fields and reset the modal to its initial empty state.

**Validates: Requirements 2.4**

### Property 3: Form validation rejects empty required fields

*For any* form submission attempt with empty or whitespace-only `codigo` or `descripcion` fields, the validator SHALL show the appropriate error message and prevent form submission.

**Validates: Requirements 3.1, 3.2**

### Property 4: Form validation rejects invalid numeric input

*For any* form submission attempt with non-numeric `costo_prom` field, the validator SHALL show "El costo debe ser un número válido" and prevent form submission.

**Validates: Requirements 3.3**

### Property 5: Form validation prevents submission on any failure

*For any* form submission attempt with invalid data, the form SHALL NOT be submitted to Supabase if validation fails.

**Validates: Requirements 3.4, 3.5**

### Property 6: Successful insert creates product in database

*For any* valid product data, submitting the form SHALL insert a new record into the `productos` table with all required fields.

**Validates: Requirements 4.1, 4.2**

### Property 7: Insert error handling returns error message

*For any* insert operation that fails due to network or database error, the system SHALL return a descriptive error message without a product record.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 8: Table refreshes after successful insert

*For any* successful product insertion, the product table SHALL reload and display the new product with all its fields.

**Validates: Requirements 5.1, 5.2**

### Property 9: Modal closes after successful insert

*For any* successful product insertion, the modal SHALL close automatically and the form SHALL be cleared.

**Validates: Requirements 5.3, 5.4**

### Property 10: Search filters by code or description

*For any* search query, the table SHALL display only products where `codigo` OR `descripcion` contains the search text (case-insensitive).

**Validates: Requirements 6.3**

### Property 11: Empty search shows all products

*For any* product table state, clearing the search bar SHALL display all products in the table.

**Validates: Requirements 6.5**

### Property 12: No results shows appropriate message

*For any* search query that matches no products, the table SHALL display "No se encontraron productos" message.

**Validates: Requirements 6.4**

### Property 13: Network error shows specific notification

*For any* network error during product insertion, the system SHALL show "Error de red: no se pudo conectar con el servidor" notification.

**Validates: Requirements 7.1**

### Property 14: Database error shows descriptive message

*For any* database error during product insertion, the system SHALL show a notification with the specific error message.

**Validates: Requirements 7.2**

### Property 15: Validation errors show field-specific messages

*For any* form validation failure, the system SHALL show error messages next to the invalid fields.

**Validates: Requirements 7.3**

## Error Handling

### Form Validation Errors

- **Empty `codigo`**: Show "El código es obligatorio" next to the field
- **Empty `descripcion`**: Show "La descripción es obligatoria" next to the field
- **Invalid `costo_prom`**: Show "El costo debe ser un número válido" next to the field
- **Form submission prevention**: Use `event.preventDefault()` and highlight invalid fields

### Network Errors

- **Connection failure**: Show "Error de red: no se pudo conectar con el servidor"
- **Timeout**: Show "Error de conexión: el servidor no respondió a tiempo"
- **No internet**: Show "Sin conexión a internet. Verifica tu conexión."

### Database Errors

- **Constraint violation**: Show the specific error message from Supabase
- **RLS policy violation**: Show "Error de permisos: no tienes autorización para esta acción"
- **General database error**: Show "Error de base de datos: [specific error message]"

### Modal Behavior on Errors

- **Validation errors**: Modal stays open, user can correct and retry
- **Network errors**: Modal stays open, user can retry after fixing connection
- **Database errors**: Modal stays open, user can retry or contact support

## Testing Strategy

### Dual Testing Approach

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both are complementary and necessary for comprehensive coverage

### Property-Based Testing

This feature is suitable for property-based testing because:

1. **Pure functions**: Form validation is a pure function that takes input and returns validation result
2. **Universal properties**: Properties like "validation rejects empty required fields" hold for all inputs
3. **Input variation**: Randomly generated form data reveals edge cases
4. **Cost-effective**: All operations are in-memory or use mocks, making 100+ iterations feasible

### Property Test Configuration

- **Library**: Use `fast-check` (JavaScript property-based testing library)
- **Iterations**: Minimum 100 iterations per property test
- **Tag format**: `Feature: agregar-producto, Property {number}: {property_text}`

### Unit Testing Balance

Unit tests should focus on:

- **Specific examples**: Test specific valid/invalid form data
- **Integration points**: Test Supabase client integration
- **Edge cases**: Test empty strings, whitespace, special characters
- **Error scenarios**: Test network failures, database errors

Property tests should focus on:

- **Universal properties**: Test that validation works for all inputs
- **Comprehensive coverage**: Use random data generators
- **Round-trip properties**: Test form submission and table refresh

### Test Categories

| Requirement | Test Type | Reason |
|-------------|-----------|--------|
| Modal opens on button click | Property | Universal UI behavior |
| Form validation | Property | Pure function with input variation |
| Supabase insert | Property | Can use mocks for random data |
| Table refresh | Property | Can use mocks for random products |
| Search filtering | Property | Pure function with input variation |
| Error notifications | Property | Can use mocks for error scenarios |

### Test Examples

```javascript
// Property test example for form validation
fc.property(fc.string(), (codigo) => {
  const result = validarFormulario({ codigo, descripcion: "Test", costo_prom: "100", estado: "activo" });
  expect(result.valid).toBe(true);
});

// Unit test example for specific case
test("validation rejects empty codigo", () => {
  const result = validarFormulario({ 
    codigo: "", 
    descripcion: "Test", 
    costo_prom: "100", 
    estado: "activo" 
  });
  expect(result.valid).toBe(false);
  expect(result.errors.codigo).toBe("El código es obligatorio");
});
```

### Mocking Strategy

- **Supabase client**: Use `supabase.createClient()` with mock adapter
- **Network errors**: Use `fetch-mock` to simulate network failures
- **Database errors**: Return error responses from mock client
- **Timestamps**: Use fixed timestamps for deterministic tests
## UI Components

### Product Form Modal Structure

```html
<!-- Modal Overlay -->
<div id="modalOverlay" class="modal-overlay" style="display: none;">
  <div class="modal-container">
    <div class="modal-header">
      <h2>Agregar Producto</h2>
      <button class="modal-close" onclick="cerrarFormulario()">&times;</button>
    </div>
    
    <div class="modal-body">
      <form id="productoForm" onsubmit="handleFormSubmit(event)">
        
        <!-- Required Fields -->
        <div class="form-group">
          <label for="codigo">Código <span class="required">*</span></label>
          <input type="text" id="codigo" name="codigo" placeholder="Ej: PROD-001" />
          <span class="error-message" id="error-codigo"></span>
        </div>
        
        <div class="form-group">
          <label for="descripcion">Descripción <span class="required">*</span></label>
          <textarea id="descripcion" name="descripcion" placeholder="Descripción del producto" rows="3"></textarea>
          <span class="error-message" id="error-descripcion"></span>
        </div>
        
        <div class="form-group">
          <label for="costo_prom">Costo Promedio <span class="required">*</span></label>
          <input type="text" id="costo_prom" name="costo_prom" placeholder="Ej: 100.50" />
          <span class="error-message" id="error-costo_prom"></span>
        </div>
        
        <div class="form-group">
          <label for="estado">Estado <span class="required">*</span></label>
          <select id="estado" name="estado">
            <option value="">Seleccionar estado</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <span class="error-message" id="error-estado"></span>
        </div>
        
        <!-- Optional Fields -->
        <div class="form-group">
          <label for="unidad">Unidad</label>
          <input type="text" id="unidad" name="unidad" placeholder="Ej: Pieza, Kg, Litro" />
        </div>
        
        <div class="form-group">
          <label for="existencia">Existencia</label>
          <input type="text" id="existencia" name="existencia" placeholder="Ej: 50" />
        </div>
        
        <div class="form-group">
          <label for="ubicacion">Ubicación</label>
          <input type="text" id="ubicacion" name="ubicacion" placeholder="Ej: Bodega A, Estante 1" />
        </div>
        
        <div class="form-group">
          <label for="categoria">Categoría</label>
          <input type="text" id="categoria" name="categoria" placeholder="Ej: Electrónica, Muebles" />
        </div>
        
        <!-- Action Buttons -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="cerrarFormulario()">Cancelar</button>
          <button type="submit" class="btn-primary">Guardar</button>
        </div>
        
      </form>
    </div>
  </div>
</div>
```

### Search Bar Structure

```html
<!-- Search Bar -->
<div class="search-container">
  <i class="fa fa-search search-icon"></i>
  <input 
    type="text" 
    id="searchBar" 
    placeholder="Buscar por código o descripción..." 
    oninput="filtrarProductos()"
  />
</div>
```

### Product Table Structure

```html
<!-- Product Table -->
<table class="dashboard-table">
  <thead>
    <tr>
      <th>Código</th>
      <th>Descripción</th>
      <th>Costo Promedio</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody id="tablaProductos">
    <!-- Rows populated by JavaScript -->
  </tbody>
</table>
```

### UI Mockup (Text-based)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Productos                    [Salir]                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  LISTADO DE PRODUCTOS                                         │  │
│  │                                                               │  │
│  │  [➕ Nuevo producto]                                          │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ 🔍 Buscar por código o descripción...                   │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ Código │ Descripción │ Costo │ Estado │ Acciones      │ │  │
│  │  ├─────────────────────────────────────────────────────────┤ │  │
│  │  │ PROD-001 │ Producto 1 │ $100  │ Activo │ [✏️]         │ │  │
│  │  │ PROD-002 │ Producto 2 │ $200  │ Inactivo │ [✏️]       │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  MODAL OVERLAY (when modal is open)                               │
│  ┌────────────────────────────────────────────��──────────────────┐  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │  Agregar Producto                    [×]                │ │  │
│  │  ├─────────────────────────────────────────────────────────┤ │  │
│  │  │                                                         │ │  │
│  │  │  Código *                                [PROD-001]    │ │  │
│  │  │                                                         │ │  │
│  │  │  Descripción *                           [Producto 1]   │ │  │
│  │  │                                                         │ │  │
│  │  │  Costo Promedio *                        [$100.50]      │ │  │
│  │  │                                                         │ │  │
│  │  │  Estado *                                [Activo ▼]     │ │  │
│  │  │                                                         │ │  │
│  │  │  Unidad                                  [Pieza]        │ │  │
│  │  │                                                         │ │  │
│  │  │  Existencia                              [50]           │ │  │
│  │  │                                                         │ │  │
│  │  │  Ubicación                               [Bodega A]     │ │  │
│  │  │                                                         │ │  │
│  │  │  Categoría                               [Electrónica]  │ │  │
│  │  │                                                         │ │  │
│  │  │  [Cancelar]                    [Guardar]                │ │  │
│  │  │                                                         │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Form Field Styling

```css
/* Form Group */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-light);
  font-weight: 600;
}

.form-group .required {
  color: var(--danger);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-light);
  font-size: 14px;
  transition: 0.25s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}

.form-group input.error,
.form-group select.error,
.form-group textarea.error {
  border-color: var(--danger);
  background: rgba(255, 118, 117, 0.05);
}

/* Error Message */
.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--danger);
  min-height: 16px;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.form-actions .btn-secondary {
  flex: 1;
  padding: 12px 20px;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  background: transparent;
  color: var(--text-light);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.25s ease;
}

.form-actions .btn-secondary:hover {
  background: var(--bg-card-hover);
  border-color: var(--text-muted);
}

.form-actions .btn-primary {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.25s ease;
}

.form-actions .btn-primary:hover {
  box-shadow: 0 0 15px rgba(108, 92, 231, 0.4);
}

.form-actions .btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Search Bar Styling

```css
/* Search Container */
.search-container {
  position: relative;
  max-width: 400px;
  width: 100%;
  margin-bottom: 20px;
}

.search-container .search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
}

.search-container input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-light);
  font-size: 14px;
  transition: 0.25s ease;
}

.search-container input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}

.search-container input::placeholder {
  color: var(--text-muted);
}
```

### Modal Overlay Styling

```css
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Modal Container */
.modal-container {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-glass);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-light);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: 0.25s ease;
}

.modal-close:hover {
  background: var(--bg-card-hover);
  color: var(--text-light);
}

/* Modal Body */
.modal-body {
  padding: 24px;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-glass);
}
```

### Table Styling (Existing - from dashboard.css)

```css
/* Table - from dashboard.css */
.dashboard-table {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  border-collapse: collapse;
  background: var(--glass);
  border-radius: 14px;
  overflow: hidden;
}

.dashboard-table th {
  background: var(--primary);
  color: white;
  padding: 12px;
  font-weight: 700;
  font-size: 14px;
}

.dashboard-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-glass);
  color: var(--text-light);
  font-size: 14px;
}

.dashboard-table tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Edit Button */
.dashboard-table button {
  background: var(--primary);
  border: none;
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 4px;
  transition: 0.25s ease;
}

.dashboard-table button:hover {
  background: var(--primary-glow);
}
```

### Notification Styling (Existing)

```css
/* Notification - from dashboard-simple.js */
.notification {
  padding: 10px 14px;
  border-radius: 6px;
  margin: 0;
  font-size: 14px;
}

.notification.info {
  background: #d1ecf1;
  color: #0c5460;
}

.notification.success {
  background: #d4edda;
  color: #155724;
}

.notification.error {
  background: #f8d7da;
  color: #721c24;
}

.notification.warning {
  background: #fff3cd;
  color: #856404;
}
```
## JavaScript Functions

### Core Functions

```javascript
// ============================================================
// MODAL FUNCTIONS
// ============================================================

/**
 * Opens the product form modal
 * Clears any previous form data
 */
function abrirFormulario() {
  const modal = document.getElementById("modalOverlay");
  if (modal) {
    modal.style.display = "flex";
    // Clear form fields
    document.getElementById("productoForm").reset();
    // Clear error messages
    document.querySelectorAll(".error-message").forEach(el => el.textContent = "");
    document.querySelectorAll(".form-group input, .form-group select, .form-group textarea")
      .forEach(el => el.classList.remove("error"));
    // Focus on first field
    setTimeout(() => {
      document.getElementById("codigo").focus();
    }, 100);
  }
}

/**
 * Closes the product form modal
 * Clears all form fields
 */
function cerrarFormulario() {
  const modal = document.getElementById("modalOverlay");
  if (modal) {
    modal.style.display = "none";
  }
}

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validates the product form
 * @returns {Object} { valid: boolean, errors: Object, data: Object }
 */
function validarFormulario() {
  const errors = {};
  const data = {};
  let valid = true;

  // Get form values
  const codigo = document.getElementById("codigo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const costo_prom = document.getElementById("costo_prom").value.trim();
  const estado = document.getElementById("estado").value;
  const unidad = document.getElementById("unidad").value.trim();
  const existencia = document.getElementById("existencia").value.trim();
  const ubicacion = document.getElementById("ubicacion").value.trim();
  const categoria = document.getElementById("categoria").value.trim();

  // Validate required fields
  if (!codigo) {
    errors.codigo = "El código es obligatorio";
    valid = false;
  } else {
    data.codigo = codigo;
  }

  if (!descripcion) {
    errors.descripcion = "La descripción es obligatoria";
    valid = false;
  } else {
    data.descripcion = descripcion;
  }

  if (!costo_prom) {
    errors.costo_prom = "El costo es obligatorio";
    valid = false;
  } else if (isNaN(Number(costo_prom)) || Number(costo_prom) < 0) {
    errors.costo_prom = "El costo debe ser un número válido";
    valid = false;
  } else {
    data.costo_prom = Number(costo_prom);
  }

  if (!estado) {
    errors.estado = "El estado es obligatorio";
    valid = false;
  } else {
    data.estado = estado;
  }

  // Validate optional numeric fields
  if (existencia) {
    const existenciaNum = Number(existencia);
    if (isNaN(existenciaNum) || existenciaNum < 0 || !Number.isInteger(existenciaNum)) {
      errors.existencia = "La existencia debe ser un número entero válido";
      valid = false;
    } else {
      data.existencia = existenciaNum;
    }
  }

  // Build data object with all fields
  data.unidad = unidad || null;
  data.ubicacion = ubicacion || null;
  data.categoria = categoria || null;

  // Show error messages
  Object.keys(errors).forEach(field => {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) {
      errorEl.textContent = errors[field];
    }
    const inputEl = document.getElementById(field);
    if (inputEl) {
      inputEl.classList.add("error");
    }
  });

  return { valid, errors, data };
}

/**
 * Clears validation errors from form fields
 */
function limpiarErrores() {
  document.querySelectorAll(".error-message").forEach(el => el.textContent = "");
  document.querySelectorAll(".form-group input, .form-group select, .form-group textarea")
    .forEach(el => el.classList.remove("error"));
}

// ============================================================
// SUPABASE FUNCTIONS
// ============================================================

/**
 * Inserts a product into the Supabase productos table
 * @param {Object} productoData - Product data object
 * @returns {Object} { success: boolean, data: Object|null, error: string|null }
 */
async function guardarProducto(productoData) {
  const db = window.supabaseClient;
  if (!db) {
    return { success: false, data: null, error: "Error de red: no se pudo conectar con el servidor" };
  }

  try {
    const { data, error } = await db
      .from("productos")
      .insert([{
        codigo: productoData.codigo,
        descripcion: productoData.descripcion,
        costo_prom: productoData.costo_prom,
        estado: productoData.estado,
        unidad: productoData.unidad,
        existencia: productoData.existencia,
        ubicacion: productoData.ubicacion,
        categoria: productoData.categoria
      }])
      .select();

    if (error) {
      console.error("Error inserting product:", error);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: data[0], error: null };
  } catch (err) {
    console.error("Unexpected error inserting product:", err);
    return { success: false, data: null, error: "Error de red: no se pudo conectar con el servidor" };
  }
}

/**
 * Loads products from the Supabase productos table
 * @returns {Array} Array of product objects
 */
async function cargarProductos() {
  const db = window.supabaseClient;
  if (!db) {
    mostrarNotificacion("Error: no se pudo conectar con la base de datos.", "error");
    return [];
  }

  const tbody = document.getElementById("tablaProductos");
  if (!tbody) {
    console.error("Table body not found");
    return [];
  }

  try {
    const { data, error } = await db
      .from("productos")
      .select("*")
      .order("creado_en", { ascending: false });

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5">Error: ${error.message}</td></tr>`;
      mostrarNotificacion(`Error cargando productos: ${error.message}`, "error");
      return [];
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No hay productos registrados.</td></tr>`;
      return [];
    }

    // Store all products for filtering
    window.todosProductos = data;

    // Render table
    tbody.innerHTML = data.map(p => `
      <tr>
        <td>${p.codigo || "—"}</td>
        <td>${p.descripcion || "—"}</td>
        <td>${p.costo_prom !== null ? `$${Number(p.costo_prom).toFixed(2)}` : "—"}</td>
        <td>
          <span style="color: ${p.estado === 'activo' ? '#00d2ff' : '#ff7675'}">
            ${p.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button onclick="editarProducto(${p.id})" style="background:var(--primary);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:4px;">
            <i class="fa fa-pen"></i>
          </button>
        </td>
      </tr>
    `).join("");

    return data;
  } catch (err) {
    console.error("Error loading products:", err);
    tbody.innerHTML = `<tr><td colspan="5">Error cargando productos.</td></tr>`;
    mostrarNotificacion("Error cargando productos.", "error");
    return [];
  }
}

/**
 * Filters products based on search query
 * Searches in codigo and descripcion fields (case-insensitive)
 */
function filtrarProductos() {
  const query = document.getElementById("searchBar").value.trim().toLowerCase();
  const tbody = document.getElementById("tablaProductos");
  
  if (!window.todosProductos || !tbody) {
    return;
  }

  // If query is empty, show all products
  if (!query) {
    tbody.innerHTML = window.todosProductos.map(p => `
      <tr>
        <td>${p.codigo || "—"}</td>
        <td>${p.descripcion || "—"}</td>
        <td>${p.costo_prom !== null ? `$${Number(p.costo_prom).toFixed(2)}` : "—"}</td>
        <td>
          <span style="color: ${p.estado === 'activo' ? '#00d2ff' : '#ff7675'}">
            ${p.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button onclick="editarProducto(${p.id})" style="background:var(--primary);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:4px;">
            <i class="fa fa-pen"></i>
          </button>
        </td>
      </tr>
    `).join("");
    return;
  }

  // Filter products
  const filtered = window.todosProductos.filter(p => 
    (p.codigo && p.codigo.toLowerCase().includes(query)) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(query))
  );

  // Show results or "no results" message
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No se encontraron productos</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td>${p.codigo || "—"}</td>
        <td>${p.descripcion || "—"}</td>
        <td>${p.costo_prom !== null ? `$${Number(p.costo_prom).toFixed(2)}` : "—"}</td>
        <td>
          <span style="color: ${p.estado === 'activo' ? '#00d2ff' : '#ff7675'}">
            ${p.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button onclick="editarProducto(${p.id})" style="background:var(--primary);border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:4px;">
            <i class="fa fa-pen"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

/**
 * Shows a notification message
 * @param {string} message - Notification message
 * @param {string} tipo - Notification type: 'success', 'error', 'info', 'warning'
 */
function mostrarNotificacion(message, tipo = "info") {
  const el = document.querySelector(".notificaciones") || document.getElementById("notificaciones");
  if (!el) return;
  
  const colors = { 
    info: "#d1ecf1", 
    success: "#d4edda", 
    error: "#f8d7da", 
    warning: "#fff3cd" 
  };
  const text = { 
    info: "#0c5460", 
    success: "#155724", 
    error: "#721c24", 
    warning: "#856404" 
  };
  
  el.innerHTML = `<p style="padding:10px 14px;border-radius:6px;background:${colors[tipo]};color:${text[tipo]};margin:0;font-size:14px;">${message}</p>`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    el.innerHTML = "";
  }, 5000);
}

// ============================================================
// FORM SUBMISSION HANDLER
// ============================================================

/**
 * Handles form submission
 * @param {Event} event - Form submit event
 */
function handleFormSubmit(event) {
  event.preventDefault();
  
  // Clear previous errors
  limpiarErrores();
  
  // Validate form
  const { valid, errors, data } = validarFormulario();
  
  if (!valid) {
    mostrarNotificacion("Por favor corrige los errores en el formulario.", "error");
    return;
  }
  
  // Save product
  guardarProducto(data)
    .then(result => {
      if (result.success) {
        // Success
        mostrarNotificacion("Producto guardado correctamente.", "success");
        cargarProductos(); // Refresh table
        cerrarFormulario(); // Close modal
      } else {
        // Error
        if (result.error.includes("network") || result.error.includes("conectar")) {
          mostrarNotificacion("Error de red: no se pudo conectar con el servidor", "error");
        } else {
          mostrarNotificacion(`Error: ${result.error}`, "error");
        }
      }
    })
    .catch(err => {
      console.error("Unexpected error:", err);
      mostrarNotificacion("Error de red: no se pudo conectar con el servidor", "error");
    });
}

// ============================================================
// EDIT PRODUCT FUNCTION
// ============================================================

/**
 * Opens the edit product modal (placeholder for future implementation)
 * @param {number} id - Product ID
 */
function editarProducto(id) {
  alert(`Editar producto ID: ${id} — próximamente.`);
}

// ============================================================
// LOGOUT FUNCTION
// ============================================================

/**
 * Logs out the user
 */
function logout() {
  window.location.href = "../../inicio-de-sesion.html";
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initializes the page
 */
document.addEventListener("DOMContentLoaded", () => {
  // Load products on page load
  setTimeout(cargarProductos, 50);
  
  // Expose functions to window for HTML event handlers
  window.abrirFormulario = abrirFormulario;
  window.cerrarFormulario = cerrarFormulario;
  window.guardarProducto = guardarProducto;
  window.cargarProductos = cargarProductos;
  window.filtrarProductos = filtrarProductos;
  window.mostrarNotificacion = mostrarNotificacion;
  window.handleFormSubmit = handleFormSubmit;
  window.editarProducto = editarProducto;
  window.logout = logout;
});
```
## Supabase Operations

### Database Schema

The `productos` table has the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `codigo` | TEXT | Product code (required) |
| `descripcion` | TEXT | Product description (required) |
| `costo_prom` | NUMERIC | Average cost (required) |
| `estado` | TEXT | Status: "activo" or "inactivo" (required) |
| `creado_en` | TIMESTAMPTZ | Creation timestamp, auto-generated |
| `unidad` | TEXT | Unit of measure (optional) |
| `existencia` | INTEGER | Stock quantity (optional) |
| `ubicacion` | TEXT | Storage location (optional) |
| `categoria` | TEXT | Category classification (optional) |

### Insert Operation

```javascript
// Insert a new product
const { data, error } = await db
  .from("productos")
  .insert([{
    codigo: "PROD-001",
    descripcion: "Producto de ejemplo",
    costo_prom: 100.50,
    estado: "activo",
    unidad: "Pieza",
    existencia: 50,
    ubicacion: "Bodega A",
    categoria: "Electrónica"
  }])
  .select();

if (error) {
  console.error("Error inserting product:", error);
  return { success: false, data: null, error: error.message };
}

return { success: true, data: data[0], error: null };
```

### Select Operation

```javascript
// Select all products
const { data, error } = await db
  .from("productos")
  .select("*")
  .order("creado_en", { ascending: false });

if (error) {
  console.error("Error loading products:", error);
  return [];
}

return data || [];
```

### Error Handling

```javascript
// Network error
if (error.message.includes("network") || error.message.includes("fetch")) {
  return { success: false, data: null, error: "Error de red: no se pudo conectar con el servidor" };
}

// Database constraint violation
if (error.code === "23505") {
  return { success: false, data: null, error: "El código ya existe. Por favor usa un código único." };
}

// RLS policy violation
if (error.code === "PGRST301") {
  return { success: false, data: null, error: "Error de permisos: no tienes autorización para esta acción." };
}

// General error
return { success: false, data: null, error: error.message };
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Action                                  │
│              Click "Guardar" button                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Form Validation                                    │
│  - Check required fields                                        │
│  - Validate numeric fields                                      │
│  - Show error messages if invalid                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ Validation Failed             │ Validation Passed
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────────────────┐
    │ Show error       │          │ Supabase Insert Operation    │
    │ messages         │          │                              │
    └──────────────────┘          │ 1. Build product data        │
                                  │ 2. Call db.from().insert()   │
                                  │ 3. Handle response           │
                                  └──────────────────────────────┘
                                                  │
                                    ┌─────────────┴─────────────┐
                                    │ Insert Success            │ Insert Failed
                                    ▼                           ▼
                          ┌──────────────────┐      ┌──────────────────────────┐
                          │ Show success     │      │ Show error notification  │
                          │ notification     │      │                          │
                          │ Refresh table    │      │ ┌────────────────────────┐ │
                          │ Close modal      │      │ │ Network error?         │ │
                          └──────────────────┘      │ │ Yes: "Error de red"    │ │
                                                    │ │ No: Show error message │ │
                                                    │ └────────────────────────┘ │
                                                    └──────────────────────────┘
```

### Supabase Client Setup

```javascript
// From supabase-simple.js
const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

// Create client
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

### RLS Considerations

The dashboard uses the Supabase JavaScript SDK v1. The RLS (Row Level Security) policies on the `productos` table should allow:

1. **SELECT**: Authenticated users can read all products
2. **INSERT**: Authenticated users can insert new products
3. **UPDATE**: Authenticated users can update their own products
4. **DELETE**: Authenticated users can delete their own products

If RLS is enabled, ensure the Supabase key used has appropriate permissions.
## Search Implementation

### Client-Side Filtering

The search functionality filters products in real-time without making API calls. This is efficient and provides immediate feedback to users.

### Search Logic

```javascript
function filtrarProductos() {
  const query = document.getElementById("searchBar").value.trim().toLowerCase();
  const tbody = document.getElementById("tablaProductos");
  
  if (!window.todosProductos || !tbody) {
    return;
  }

  // If query is empty, show all products
  if (!query) {
    tbody.innerHTML = window.todosProductos.map(p => createProductRow(p)).join("");
    return;
  }

  // Filter products
  const filtered = window.todosProductos.filter(p => 
    (p.codigo && p.codigo.toLowerCase().includes(query)) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(query))
  );

  // Show results or "no results" message
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No se encontraron productos</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map(p => createProductRow(p)).join("");
  }
}
```

### Search Features

1. **Case-Insensitive**: Search works regardless of case (e.g., "prod" matches "PRODUCTO")
2. **Partial Matching**: Search matches any part of the text (e.g., "prod" matches "PRODUCTO-001")
3. **OR Logic**: Search matches either `codigo` OR `descripcion`
4. **Real-Time**: Results update as user types
5. **Empty State**: Shows "No se encontraron productos" when no matches found

### Search Bar HTML

```html
<div class="search-container">
  <i class="fa fa-search search-icon"></i>
  <input 
    type="text" 
    id="searchBar" 
    placeholder="Buscar por código o descripción..." 
    oninput="filtrarProductos()"
  />
</div>
```

### Search Styling

```css
.search-container {
  position: relative;
  max-width: 400px;
  width: 100%;
  margin-bottom: 20px;
}

.search-container .search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
}

.search-container input {
  width: 100%;
  padding: 10px 14px 10px 38px;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-light);
  font-size: 14px;
  transition: 0.25s ease;
}

.search-container input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}
```

### Search Behavior

| User Action | Expected Behavior |
|-------------|-------------------|
| Type in search bar | Table filters in real-time |
| Clear search bar | Table shows all products |
| Type query with no matches | Shows "No se encontraron productos" |
| Type new query after no matches | Hides "no results" message immediately |
| Search for "PROD" | Matches "PRODUCTO-001", "prod-002", etc. |
| Search for "casa" | Matches "Casa de muebles", "Muebles para el hogar", etc. |

### Search Examples

```javascript
// Example 1: Search by code
// User types: "PROD-001"
// Matches: Product with codigo = "PROD-001"

// Example 2: Search by description
// User types: "casa"
// Matches: Products with descripcion containing "casa" (case-insensitive)

// Example 3: Search with no results
// User types: "xyz123"
// Shows: "No se encontraron productos"

// Example 4: Clear search
// User clears search bar
// Shows: All products
```

### Performance Considerations

- **Client-Side Only**: No API calls for search, reducing server load
- **Instant Feedback**: No debounce needed for typical dataset sizes (<10,000 products)
- **Memory Efficient**: Stores all products in `window.todosProductos` for filtering
- **DOM Updates**: Only updates table rows, not entire page

### Future Enhancements

1. **Debounce**: Add debounce for very large datasets (>10,000 products)
2. **Highlight Matches**: Highlight matching text in results
3. **Search History**: Show recent search queries
4. **Advanced Filters**: Add filters for estado, categoria, etc.
## Data Flow

### Complete User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Flow Diagram                            │
└─────────────────────────────────────────────────────────────────┘

1. User clicks "Nuevo producto" button
   │
   ▼
2. abrirFormulario() is called
   │
   ├─► Show modal overlay
   ├─► Clear form fields
   ├─► Clear error messages
   └─► Focus on first field (codigo)
   │
   ▼
3. User fills form fields
   │
   ├─► Enter product code
   ├─► Enter product description
   ├─► Enter average cost
   ├─► Select status
   ├─► (Optional) Enter unit
   ├─► (Optional) Enter stock
   ├─► (Optional) Enter location
   └─► (Optional) Enter category
   │
   ▼
4. User clicks "Guardar" button
   │
   ▼
5. handleFormSubmit(event) is called
   │
   ├─► event.preventDefault() - Stop form submission
   ├─► limpiarErrores() - Clear previous errors
   └─► validarFormulario() - Validate form data
   │
   ▼
6. Validation Result
   │
   ├─► Validation Failed
   │   │
   │   ├─► Show error messages next to invalid fields
   │   ├─► Highlight invalid fields
   │   └─► Show error notification
   │   │
   │   ▼
   │   User can correct and retry
   │
   └─► Validation Passed
       │
       ▼
7. guardarProducto(data) is called
   │
   ├─► Build product object
   │   ├─► codigo: string
   │   ├─► descripcion: string
   │   ├─► costo_prom: number
   │   ├─► estado: string
   │   ├─► unidad: string | null
   │   ├─► existencia: number | null
   │   ├─► ubicacion: string | null
   │   └─► categoria: string | null
   │
   ├─► Call Supabase insert
   │   │
   │   ├─► Network Error
   │   │   │
   │   │   ├─► Show "Error de red" notification
   │   │   └─► Modal stays open
   │   │
   │   ├─► Database Error
   │   │   │
   │   │   ├─► Show specific error message
   │   │   └─► Modal stays open
   │   │
   │   └─► Success
   │       │
   │       ├─► Return new product with id
   │       └─► Continue to step 8
   │
   ▼
8. Insert Result
   │
   ├─► Success
   │   │
   │   ├─► mostrarNotificacion("Producto guardado correctamente.", "success")
   │   ├─► cargarProductos() - Refresh table
   │   │   │
   │   │   ├─► Fetch all products from Supabase
   │   │   ├─► Update table rows
   │   │   └─► Store products in window.todosProductos
   │   │
   │   ├─► cerrarFormulario() - Close modal
   │   │   │
   │   │   ├─► Hide modal overlay
   │   │   └─► Clear form fields
   │   │
   │   └─► User sees new product in table
   │
   └─► Error
       │
       ├─► Show error notification
       └─► Modal stays open for retry
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Diagram                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   User UI    │
│   Layer      │
└──────┬───────┘
       │
       │ 1. abrirFormulario()
       │
       ▼
┌──────────────┐
│   Modal      │
│   Overlay    │
└──────┬───────┘
       │
       │ 2. User fills form
       │
       ▼
┌──────────────┐
│   Form       │
│   Data       │
└──────┬───────┘
       │
       │ 3. handleFormSubmit()
       │
       ▼
┌──────────────┐
│ Validation   │
│ Layer        │
└──────┬───────┘
       │
       │ 4. validarFormulario()
       │
       ▼
┌──────────────┐
│   Form       │
│   Data       │
│   (Valid)    │
└──────┬───────┘
       │
       │ 5. guardarProducto()
       │
       ▼
┌──────────────┐
│ Supabase     │
│ Client       │
└──────┬───────┘
       │
       │ 6. Insert to productos table
       │
       ▼
┌──────────────┐
│   Database   │
│   (Supabase) │
└──────┬───────┘
       │
       │ 7. Return new product
       │
       ▼
┌──────────────┐
│   Success    │
└──────┬───────┘
       │
       │ 8. cargarProductos()
       │
       ▼
┌──────────────┐
│   Table      │
│   (Refresh)  │
└──────┬───────┘
       │
       │ 9. cerrarFormulario()
       │
       ▼
┌──────────────┐
│   Modal      │
│   (Closed)   │
└──────────────┘
```

### State Management

```javascript
// Global state
window.todosProductos = []; // All products from database
window.modalOpen = false;   // Modal state

// Form state
const formState = {
  codigo: "",
  descripcion: "",
  costo_prom: "",
  estado: "",
  unidad: "",
  existencia: "",
  ubicacion: "",
  categoria: ""
};

// Validation state
const validationState = {
  errors: {},
  valid: true
};
```

### Event Flow

```
User Action → Event Handler → Business Logic → UI Update

1. Click "Nuevo producto"
   → abrirFormulario()
   → Show modal, clear form

2. Type in search bar
   → filtrarProductos()
   → Filter products, update table

3. Click "Guardar"
   → handleFormSubmit()
   → validarFormulario()
   → guardarProducto()
   → cargarProductos()
   → cerrarFormulario()
```

### Error Recovery Flow

```
Error Occurs
   │
   ▼
Show Error Notification
   │
   ├─► Validation Error
   │   │
   │   ├─► User can correct form
   │   └─► User can retry
   │
   ├─► Network Error
   │   │
   │   ├─► User can check connection
   │   └─► User can retry
   │
   └─► Database Error
       │
       ├─► User can check data
       └─► User can retry or contact support
```
