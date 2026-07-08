# Implementation Plan: Centralized Error Handling System

## Overview

This implementation plan breaks down the centralized error handling system into discrete coding tasks. The system will replace scattered `alert()` calls throughout the JavaScript modules with a unified `ErrorHandler` module located at `/services/error-handler.js`. All tasks build incrementally, starting with module creation, then migration of existing code, and finally testing.

## Tasks

- [x] 1. Create error-handler.js module
  - [x] 1.1 Create `/services/error-handler.js` with basic structure
    - Create the file at `d:\alexander\arte\addbox_a5grafic\Addbox\frontend\public\admin-dashboard\services\error-handler.js`
    - Add JSDoc header comment with module description
    - Export the `handleError` function
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 1.2 Implement basic `handleError(context, error)` function
    - Add function signature with JSDoc documentation
    - Implement console logging with ❌ prefix
    - Implement user notification via `alert()`
    - Preserve original error object
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 5.1, 5.2, 5.3_

- [x]* 2. Write property tests for error-handler.js
  - [x]* 2.1 Write property test for Property 1: Error object preservation
    - **Property 1: Error object preservation**
    - **Validates: Requirements 2.3**
    - Test that the original error object is not modified after calling `handleError`
  
  - [ ]* 2.2 Write property test for Property 2: Context in console log
    - **Property 2: Context in console log**
    - **Validates: Requirements 2.1, 2.2**
    - Test that console log includes context identifier and error message
  
  - [ ]* 2.3 Write property test for Property 3: Context in alert message
    - **Property 3: Context in alert message**
    - **Validates: Requirements 3.2, 5.1, 5.2, 5.3**
    - Test that alert message includes context identifier
  
  - [ ]* 2.4 Write property test for Property 4: Non-blocking behavior
    - **Property 4: Non-blocking behavior**
    - **Validates: Requirements 6.1, 6.2**
    - Test that `handleError` does not prevent normal application flow
  
  - [ ]* 2.5 Write property test for Property 5: Async compatibility
    - **Property 5: Async compatibility**
    - **Validates: Requirements 6.3**
    - Test that `handleError` does not interfere with promise resolution/rejection

- [x] 3. Implement error handling for invalid inputs
  - [x] 3.1 Handle invalid context type (non-string)
    - Log: `❌ [error-handler] Invalid context type: expected string`
    - Use default context: `"unknown"`
    - _Requirements: Error Handling - Invalid Context Type_
  
  - [x] 3.2 Handle invalid error type (non-Error object)
    - Log: `❌ [error-handler] Invalid error type: expected Error`
    - Create new Error with provided value as message
    - _Requirements: Error Handling - Invalid Error Type_
  
  - [x] 3.3 Handle null/undefined context
    - Log: `❌ [error-handler] Null context provided`
    - Use default context: `"unknown"`
    - _Requirements: Error Handling - Null Context_
  
  - [x] 3.4 Handle null/undefined error
    - Log: `❌ [error-handler] Null error provided`
    - Create new Error with message: `"Unknown error"`
    - _Requirements: Error Handling - Null Error_

- [ ]* 4. Write unit tests for error scenarios
  - [ ]* 4.1 Write unit tests for invalid context type
    - Test with number, object, array, boolean inputs
    - Verify default context is used
    - _Requirements: Error Handling - Invalid Context Type_
  
  - [ ]* 4.2 Write unit tests for invalid error type
    - Test with string, number, object, null inputs
    - Verify new Error is created with message
    - _Requirements: Error Handling - Invalid Error Type_
  
  - [ ]* 4.3 Write unit tests for null/undefined context
    - Test with `null` and `undefined` context
    - Verify default context is used
    - _Requirements: Error Handling - Null Context_
  
  - [ ]* 4.4 Write unit tests for null/undefined error
    - Test with `null` and `undefined` error
    - Verify new Error with "Unknown error" is created
    - _Requirements: Error Handling - Null Error_

- [x] 5. Migrate crear-jefe.js
  - [x] 5.1 Import handleError in crear-jefe.js
    - Add import: `import { handleError } from "../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 5.2 Replace alert("Completa todos los campos.") with handleError
    - Replace: `alert("Completa todos los campos.");`
    - With: `handleError("crear-jefe", new Error("Completa todos los campos."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.3 Replace alert("Error al verificar instalación.") with handleError
    - Replace: `alert("Error al verificar instalación.");`
    - With: `handleError("crear-jefe", instError);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 5.4 Replace alert("Master key incorrecta.") with handleError
    - Replace: `alert("Master key incorrecta.");`
    - With: `handleError("crear-jefe", new Error("Master key incorrecta."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.5 Replace alert("Error al crear usuario jefe.") with handleError
    - Replace: `alert("Error al crear usuario jefe.");`
    - With: `handleError("crear-jefe", userError);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 5.6 Replace alert("Cuenta del jefe creada correctamente...") with handleError
    - Replace: `alert("Cuenta del jefe creada correctamente. Ahora puedes iniciar sesión.");`
    - With: `handleError("crear-jefe", new Error("Cuenta del jefe creada correctamente. Ahora puedes iniciar sesión."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_

- [x] 6. Migrate setup/dev-master-key.js
  - [x] 6.1 Import handleError in dev-master-key.js
    - Add import: `import { handleError } from "../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 6.2 Replace alert("Error guardando la master key en Supabase.") with handleError
    - Replace: `alert("Error guardando la master key en Supabase.");`
    - With: `handleError("dev-master-key", error);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 6.3 Replace alert("Master key generada y registrada en Supabase...") with handleError
    - Replace: `alert("Master key generada y registrada en Supabase. Guárdala bien.");`
    - With: `handleError("dev-master-key", new Error("Master key generada y registrada en Supabase. Guárdala bien."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_

- [x] 7. Migrate modules/usuarios/usuarios.js
  - [x] 7.1 Import handleError in usuarios.js
    - Add import: `import { handleError } from "../../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 7.2 Replace alert("Error: " + error.message) in delete operation
    - Replace: `if (error) return alert("Error: " + error.message);`
    - With: `if (error) return handleError("usuarios", error);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 7.3 Replace alert("Error: " + error.message) in update operation
    - Replace: `if (error) return alert("Error: " + error.message);`
    - With: `if (error) return handleError("usuarios", error);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 7.4 Replace alert("Error: " + insertError.message) in insert operation
    - Replace: `if (insertError) return alert("Error: " + insertError.message);`
    - With: `if (insertError) return handleError("usuarios", insertError);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_

- [x] 8. Migrate modules/presupuesto/enviar_presupuesto.controller.js
  - [x] 8.1 Import handleError in enviar_presupuesto.controller.js
    - Add import: `import { handleError } from "../../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 8.2 Replace alert("Presupuesto enviado exitosamente") with handleError
    - Replace: `alert("Presupuesto enviado exitosamente");`
    - With: `handleError("enviar_presupuesto", new Error("Presupuesto enviado exitosamente"));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_

- [x] 9. Migrate modules/login/login.controller.js
  - [x] 9.1 Import handleError in login.controller.js
    - Add import: `import { handleError } from "../../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 9.2 Replace alert("Por favor ingresa tu correo para recuperar la contraseña.")
    - Replace: `alert("Por favor ingresa tu correo para recuperar la contraseña.");`
    - With: `handleError("login", new Error("Por favor ingresa tu correo para recuperar la contraseña."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 9.3 Replace alert("Hubo un problema enviando el correo de recuperación.")
    - Replace: `alert("Hubo un problema enviando el correo de recuperación.");`
    - With: `handleError("login", error);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 9.4 Replace alert("Se ha enviado un enlace de recuperación a tu correo.")
    - Replace: `alert("Se ha enviado un enlace de recuperación a tu correo.");`
    - With: `handleError("login", new Error("Se ha enviado un enlace de recuperación a tu correo."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_

- [x] 10. Migrate modules/movimientos/movimientos.controller.js
  - [x] 10.1 Import handleError in movimientos.controller.js
    - Add import: `import { handleError } from "../../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 10.2 Replace alert("Formulario de nuevo movimiento — próximamente.") with handleError
    - Replace: `alert("Formulario de nuevo movimiento — próximamente.");`
    - With: `handleError("movimientos", new Error("Formulario de nuevo movimiento — próximamente."));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_

- [x] 11. Migrate instalacion.js
  - [x] 11.1 Import handleError in instalacion.js
    - Add import: `import { handleError } from "../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 11.2 Replace alert("Error al generar la clave maestra...")
    - Replace: `alert('Error al generar la clave maestra. Por favor, inténtelo de nuevo.');`
    - With: `handleError("instalacion", error);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_
  
  - [x] 11.3 Replace alert("No se puede descargar una clave no generada")
    - Replace: `alert('No se puede descargar una clave no generada');`
    - With: `handleError("instalacion", new Error('No se puede descargar una clave no generada'));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 11.4 Replace alert("Error: La clave maestra no está completamente configurada")
    - Replace: `alert('Error: La clave maestra no está completamente configurada');`
    - With: `handleError("instalacion", new Error('Error: La clave maestra no está completamente configurada'));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 11.5 Replace alert("Error al guardar la configuración...")
    - Replace: `alert('Error al guardar la configuración. Por favor, verifique que el servidor esté disponible.');`
    - With: `handleError("instalacion", error);`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.3_

- [x] 12. Migrate modules/admin/invitaciones/invitaciones.js
  - [x] 12.1 Import handleError in invitaciones.js
    - Add import: `import { handleError } from "../../services/error-handler.js";`
    - _Requirements: 4.1, 4.3_
  
  - [x] 12.2 Replace alert("Invitación generada (lógica pendiente de Supabase)")
    - Replace: `alert("Invitación generada (lógica pendiente de Supabase)");`
    - With: `handleError("invitaciones", new Error("Invitación generada (lógica pendiente de Supabase)"));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 12.3 Replace alert("Correo enviado (lógica pendiente)")
    - Replace: `alert("Correo enviado (lógica pendiente)");`
    - With: `handleError("invitaciones", new Error("Correo enviado (lógica pendiente)"));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_
  
  - [x] 12.4 Replace alert("WhatsApp enviado (lógica pendiente)")
    - Replace: `alert("WhatsApp enviado (lógica pendiente)");`
    - With: `handleError("invitaciones", new Error("WhatsApp enviado (lógica pendiente)"));`
    - Add comment: `// 🔄 Reemplazado por error-handler.js`
    - _Requirements: 4.1, 4.2_

- [x] 13. Verify and test
  - [x] 13.1 Verify error-handler.js exports handleError function
    - Test that `handleError` is properly exported
    - Test that module can be imported from different modules
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x] 13.2 Verify console logging with ❌ prefix
    - Test that all error messages are logged with ❌ prefix
    - Test that context and error details are included
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 13.3 Verify alert messages include context
    - Test that all alert messages include context identifier
    - Test that context format is consistent across all modules
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3_
  
  - [x] 13.4 Verify no breaking changes to existing functionality
    - Test that application continues to work after migration
    - Test that async operations are not affected
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All modules use relative imports to maintain portability
- The error handler preserves original error objects for debugging
- Console logging uses ❌ prefix for easy identification
- Alert messages include context to help identify which module encountered the error

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["9.1", "9.2", "9.3", "9.4"] },
    { "id": 9, "tasks": ["10.1", "10.2"] },
    { "id": 10, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] },
    { "id": 11, "tasks": ["12.1", "12.2", "12.3", "12.4"] },
    { "id": 12, "tasks": ["13.1", "13.2", "13.3", "13.4"] },
    { "id": 13, "tasks": ["14"] }
  ]
}
```