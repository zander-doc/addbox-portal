# Design Document: Centralized Error Handling System

## Overview

This document describes the technical implementation of a centralized error handling system for the admin-dashboard project. The system will replace scattered `alert()` calls throughout the JavaScript modules with a unified `ErrorHandler` module that provides consistent error display, logging, and context management.

### Current State

Currently, error messages are displayed using scattered `alert()` calls throughout the JavaScript modules, leading to:
- Inconsistent user experience
- Difficulty in maintaining error handling logic
- No centralized logging
- No context-aware error messages

### Target State

The centralized error handler will provide:
- A single `ErrorHandler` module at `/services/error-handler.js`
- Consistent error display with context information
- Console logging with ❌ prefix
- Reusable across all JavaScript modules
- Non-breaking implementation for incremental migration

## Architecture

### Component Structure

```
admin-dashboard/
├── services/
│   ├── error-handler.js          # Centralized error handler module
│   ├── supabase-client.js        # Supabase client (existing)
│   └── ...                       # Other services
├── modules/
│   ├── login/
│   ├── movimientos/
│   ├── usuarios/
│   └── ...                       # Modules to be migrated
└── assets/
    └── js/
        └── main.js               # Global utilities
```

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    admin-dashboard                          │
├─────────────────────────────────────────────────────────────┤
│  modules/                                                   │
│  ├── login/         movimientos/    usuarios/  ...         │
│  └─────────────────────────────────────────────────────────┘
│              │              │              │                 │
│              └──────────────┴──────────────┴─────────────────┘
│                             │
│                             ▼
│                    ┌─────────────────┐                      │
│                    │ error-handler   │                      │
│                    │   /services/    │                      │
│                    └─────────────────┘                      │
│                             │                                │
│                             ▼                                │
│                    ┌─────────────────┐                      │
│                    │ supabase-client │                      │
│                    │   /services/    │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### ErrorHandler Module

**Location:** `/services/error-handler.js`

**Exported Functions:**

```javascript
/**
 * Handles errors consistently across the application
 * @param {string} context - The module/component identifier where the error occurred
 * @param {Error} error - The error object to handle
 */
export function handleError(context, error)
```

**Functionality:**
1. Logs the error to console with ❌ prefix
2. Shows user notification via `alert()`
3. Preserves the original error object for debugging
4. Does not interrupt application flow

### Error Object Format

The handler accepts both standard JavaScript Error objects and Supabase error objects:

```javascript
// Standard Error
const error = new Error("Something went wrong");

// Supabase Error
const { error } = await supabase.from("table").insert(data);
```

## Data Models

### Error Context

The context is a string identifier that describes which module or component encountered the error.

**Valid Context Values:**
- `"login"` - Authentication module
- `"usuarios"` - User management module
- `"movimientos"` - Movements module
- `"invitaciones"` - Invitations module
- `"presupuesto"` - Budget module
- `"fotos"` - Photos module
- `"inventario"` - Inventory module
- `"configuracion"` - Configuration module
- `"empresa"` - Company module
- `"roles"` - Roles module
- `"devoluciones"` - Returns module
- `"dashboard"` - Dashboard module
- `"instalacion"` - Installation module

### Error Message Format

**Console Log Format:**
```
❌ [context] error.message
```

**Alert Message Format:**
```
Error in [context]: error.message
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Error object preservation

*For any* valid context string and error object, calling `handleError(context, error)` SHALL preserve the original error object without modification

**Validates: Requirements 2.3**

### Property 2: Context in console log

*For any* valid context string and error object, calling `handleError(context, error)` SHALL log a message to the console that includes the context identifier and the error message

**Validates: Requirements 2.1, 2.2**

### Property 3: Context in alert message

*For any* valid context string and error object, calling `handleError(context, error)` SHALL display an alert message that includes the context identifier

**Validates: Requirements 3.2, 5.1, 5.2, 5.3**

### Property 4: Non-blocking behavior

*For any* valid context string and error object, calling `handleError(context, error)` SHALL NOT prevent the normal flow of the application

**Validates: Requirements 6.1, 6.2**

### Property 5: Async compatibility

*For any* async operation that calls `handleError(context, error)`, the error handler SHALL NOT interfere with promise resolution or rejection

**Validates: Requirements 6.3**

## Error Handling

### Error Scenarios

1. **Invalid Context Type**
   - If context is not a string, log: `❌ [error-handler] Invalid context type: expected string`
   - Continue with default context: `"unknown"`

2. **Invalid Error Type**
   - If error is not an Error object, log: `❌ [error-handler] Invalid error type: expected Error`
   - Create a new Error with the provided value as message

3. **Null/Undefined Context**
   - If context is null or undefined, log: `❌ [error-handler] Null context provided`
   - Use default context: `"unknown"`

4. **Null/Undefined Error**
   - If error is null or undefined, log: `❌ [error-handler] Null error provided`
   - Create a new Error with message: `"Unknown error"`

### Error Recovery

- The error handler does not throw exceptions
- The error handler does not modify the error object
- The error handler allows the application to continue after displaying the error

## Testing Strategy

### Dual Testing Approach

**Unit Tests:**
- Specific examples for error scenarios (invalid context, invalid error, null values)
- Integration points between components
- Edge cases and error conditions

**Property Tests:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization

### Property-Based Testing Configuration

- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: centralized-error-handling, Property {number}: {property_text}**

### Test Coverage

| Requirement | Test Type | Description |
|-------------|-----------|-------------|
| 1.1 | Unit | Verify `handleError` function is exported |
| 1.2 | Unit | Verify module location at `/services/error-handler.js` |
| 1.4 | Unit | Verify module is importable from different modules |
| 2.1 | Unit | Verify console log with ❌ prefix |
| 2.2 | Property | Verify context and error details in log message |
| 2.3 | Property | Verify original error object is preserved |
| 3.1 | Unit | Verify alert is shown |
| 3.2 | Property | Verify context in alert message |
| 3.3 | Unit | Verify form error display behavior |
| 5.1-5.3 | Property | Verify consistent context format |
| 6.1-6.3 | Property | Verify non-blocking and async compatibility |

### Migration Testing

- Verify each module can import `handleError`
- Verify old `alert()` calls are replaced
- Verify comments are added: `// 🔄 Reemplazado por error-handler.js`
- Verify Supabase error objects are handled correctly

## Implementation Details

### Code Style

The implementation will follow the existing code style in the admin-dashboard project:

- ES6 module syntax (`import`/`export`)
- JSDoc comments for functions
- Consistent naming conventions
- Relative imports for module portability

### File Structure

```javascript
/* ============================================================
   ERROR-HANDLER.JS — ADDBOX
   Centralized error handling module
============================================================ */

/**
 * Handles errors consistently across the application
 * @param {string} context - The module/component identifier where the error occurred
 * @param {Error} error - The error object to handle
 */
export function handleError(context, error) {
  // Implementation
}
```

### Relative Imports

All modules will use relative imports to maintain portability:

```javascript
import { handleError } from "../services/error-handler.js";
```

### Supabase Error Compatibility

The handler will work with both standard JavaScript Error objects and Supabase error objects:

```javascript
// Standard Error
const error = new Error("Something went wrong");
handleError("login", error);

// Supabase Error
const { error } = await supabase.from("table").insert(data);
handleError("usuarios", error);
```

## Migration Strategy

### Phase 1: Module Creation

1. Create `/services/error-handler.js`
2. Implement `handleError(context, error)` function
3. Test with sample errors

### Phase 2: Module Migration

1. Identify all files with `alert("Error ...")` calls
2. Replace with `handleError("module-name", error)`
3. Add comment: `// 🔄 Reemplazado por error-handler.js`
4. Test each module after migration

### Phase 3: Verification

1. Verify all modules use the centralized handler
2. Verify console logging works correctly
3. Verify alert messages include context
4. Verify no breaking changes to existing functionality

### Files to Migrate

Based on the grep search results, the following files contain `alert()` calls that should be migrated:

- `crear-jefe.js`
- `setup/dev-master-key.js`
- `modules/usuarios/usuarios.js`
- `modules/presupuesto/enviar_presupuesto.controller.js`
- `modules/movimientos/movimientos.controller.js`
- `modules/login/login.controller.js`
- `instalacion.js`
- `modules/admin/invitaciones/invitaciones.js`

## Future Considerations

The error handler may be extended to include:

- Error reporting to a logging service
- Custom error dialog UI instead of native `alert()`
- Error categorization (critical, warning, info)
- Error retry mechanisms for transient failures
- Error analytics and reporting dashboard