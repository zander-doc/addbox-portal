# Implementation Plan: Agregar Producto

## Overview

This feature adds a complete "Agregar Producto" (Add Product) functionality to the ADDBOX admin dashboard. The implementation will update the existing product table display, add search functionality, create a product form modal, implement form validation, and integrate with Supabase for data persistence.

## Tasks

- [ ] 1. Update Product Table Display
  - Fix the table to show correct columns: Código, Descripción, Unidad, Costo promedio, Existencia, Estado
  - Update the table rendering to use actual Supabase columns: `codigo`, `descripcion`, `costo_prom`, `estado`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 2. Add Search Functionality
  - [ ] 2.1 Add search bar above the product table
    - Create search container HTML structure
    - Add search input field with placeholder text
    - _Requirements: 6.1_
  
  - [ ] 2.2 Implement real-time filtering by `codigo` and `descripcion`
    - Add `oninput` event handler to search input
    - Implement case-insensitive filtering logic
    - _Requirements: 6.2, 6.3_
  
  - [ ]* 2.3 Write property test for search filtering
    - **Property 10: Search filters by code or description**
    - **Validates: Requirements 6.3**
  
  - [ ]* 2.4 Write unit tests for search filtering
    - Test empty search (shows all products)
    - Test search with no results (shows "No se encontraron productos")
    - Test case-insensitive matching
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 3. Create Product Form Modal
  - [ ] 3.1 Create modal HTML structure
    - Add modal overlay div with backdrop
    - Add modal container with header, body, and footer
    - Add close button (×) in header
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 3.2 Add form fields for all required columns
    - Add `codigo` text input (required)
    - Add `descripcion` textarea (required)
    - Add `costo_prom` text input (required)
    - Add `estado` select dropdown (required)
    - _Requirements: 2.1_
  
  - [ ] 3.3 Add form fields for optional columns
    - Add `unidad` text input
    - Add `existencia` text input
    - Add `ubicacion` text input
    - Add `categoria` text input
    - _Requirements: 2.2_
  
  - [ ] 3.4 Add form action buttons
    - Add "Cancelar" button (closes modal)
    - Add "Guardar" button (submits form)
    - _Requirements: 1.1_

- [ ] 4. Implement Form Validation
  - [ ] 4.1 Validate `codigo` is not empty
    - Check for empty or whitespace-only input
    - Show "El código es obligatorio" error message
    - _Requirements: 3.1_
  
  - [ ] 4.2 Validate `descripcion` is not empty
    - Check for empty or whitespace-only input
    - Show "La descripción es obligatoria" error message
    - _Requirements: 3.2_
  
  - [ ] 4.3 Validate `costo_prom` is a valid number
    - Check if input is a valid numeric value
    - Show "El costo debe ser un número válido" error message
    - _Requirements: 3.3_
  
  - [ ] 4.4 Validate `estado` is selected
    - Check if a valid option is selected
    - Show appropriate error message
    - _Requirements: 2.1_
  
  - [ ]* 4.5 Write property test for form validation
    - **Property 3: Form validation rejects empty required fields**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 4.6 Write property test for numeric validation
    - **Property 4: Form validation rejects invalid numeric input**
    - **Validates: Requirements 3.3**
  
  - [ ]* 4.7 Write property test for submission prevention
    - **Property 5: Form validation prevents submission on any failure**
    - **Validates: Requirements 3.4, 3.5**
  
  - [ ]* 4.8 Write unit tests for validation edge cases
    - Test empty strings, whitespace-only inputs
    - Test invalid numeric formats
    - Test special characters
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Implement Supabase Insert
  - [ ] 5.1 Create function to insert product into `productos` table
    - Build product data object from form fields
    - Convert `costo_prom` to number
    - Convert `existencia` to number (if provided)
    - Handle optional fields (null if empty)
    - _Requirements: 4.1, 4.2_
  
  - [ ] 5.2 Handle success case
    - Return new product record with `id`
    - Show success notification
    - _Requirements: 4.2_
  
  - [ ] 5.3 Handle network error
    - Catch network failures
    - Return error message "Error de red: no se pudo conectar con el servidor"
    - _Requirements: 4.3_
  
  - [ ] 5.4 Handle database error
    - Catch database constraint violations
    - Return descriptive error message
    - _Requirements: 4.4_
  
  - [ ]* 5.5 Write property test for successful insert
    - **Property 6: Successful insert creates product in database**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ]* 5.6 Write property test for error handling
    - **Property 7: Insert error handling returns error message**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [ ] 6. Implement Table Refresh
  - [ ] 6.1 Reload product data after successful insert
    - Call `cargarProductos()` after successful insert
    - Fetch fresh data from Supabase
    - _Requirements: 5.1_
  
  - [ ] 6.2 Close modal automatically after successful save
    - Call `cerrarFormulario()` after table refresh
    - _Requirements: 5.3_
  
  - [ ] 6.3 Clear form fields after successful save
    - Reset form to initial state
    - Clear all input values
    - Clear error messages
    - _Requirements: 5.4_
  
  - [ ]* 6.4 Write property test for table refresh
    - **Property 8: Table refreshes after successful insert**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 6.5 Write property test for modal close after insert
    - **Property 9: Modal closes after successful insert**
    - **Validates: Requirements 5.3, 5.4**

- [ ] 7. Add Error Handling
  - [ ] 7.1 Network error notifications
    - Show "Error de red: no se pudo conectar con el servidor"
    - Display in notification area
    - _Requirements: 7.1_
  
  - [ ] 7.2 Database error notifications
    - Show specific error message from Supabase
    - Display in notification area
    - _Requirements: 7.2_
  
  - [ ] 7.3 Validation error display
    - Show error messages next to invalid fields
    - Highlight invalid input fields
    - _Requirements: 7.3_
  
  - [ ]* 7.4 Write property test for network error notifications
    - **Property 13: Network error shows specific notification**
    - **Validates: Requirements 7.1**
  
  - [ ]* 7.5 Write property test for database error notifications
    - **Property 14: Database error shows descriptive message**
    - **Validates: Requirements 7.2**
  
  - [ ]* 7.6 Write property test for validation error display
    - **Property 15: Validation errors show field-specific messages**
    - **Validates: Requirements 7.3**

- [ ] 8. Style and Polish
  - [ ] 8.1 Add modal CSS styles
    - Modal overlay with backdrop
    - Modal container with rounded corners
    - Modal header with title and close button
    - Modal body with form spacing
    - Modal footer with action buttons
    - _Requirements: 8.1_
  
  - [ ] 8.2 Add search bar styling
    - Search container with icon
    - Input field with focus states
    - Placeholder styling
    - _Requirements: 8.2_
  
  - [ ] 8.3 Ensure consistency with existing dashboard style
    - Use existing CSS variables
    - Match button styles
    - Match table styling
    - _Requirements: 8.3, 8.4_
  
  - [ ]* 8.4 Write unit tests for UI components
    - Test modal visibility toggling
    - Test form field styling
    - Test search bar appearance
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration and Final Testing
  - [ ] 10.1 Wire components together
    - Connect modal open button to `abrirFormulario()`
    - Connect form submit to `handleFormSubmit()`
    - Connect search input to `filtrarProductos()`
    - Connect modal close button to `cerrarFormulario()`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_
  
  - [ ] 10.2 Test complete user flow
    - Open modal, fill form, submit, verify table refresh
    - Search products, verify filtering works
    - Test error scenarios
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.2, 7.3_
  
  - [ ]* 10.3 Write integration tests
    - Test end-to-end product creation flow
    - Test search and filter workflow
    - Test error recovery scenarios
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.2, 7.3_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows the existing dashboard style and uses Supabase JavaScript SDK v1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["9.1"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["10.3", "11.1"] }
  ]
}
```