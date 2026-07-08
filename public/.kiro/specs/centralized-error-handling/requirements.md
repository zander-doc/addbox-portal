# Requirements Document

## Introduction

This feature implements a centralized error handling system for the admin-dashboard project. Currently, error messages are displayed using scattered `alert()` calls throughout the JavaScript modules, leading to inconsistent user experience and difficulty in maintaining error handling logic. The centralized error handler will provide a unified approach to error display, logging, and context management across all modules.

## Glossary

- **ErrorHandler**: The centralized error handling module (`/services/error-handler.js`) that provides consistent error display and logging
- **Context**: A string identifier that describes which module or component encountered the error (e.g., "login", "movimientos", "usuarios")
- **Error Object**: A JavaScript Error object or Supabase error containing error details
- **User Notification**: The visual feedback shown to users when an error occurs (currently using `alert()`, to be replaced with a more sophisticated approach)

## Requirements

### Requirement 1: Centralized Error Handler Module

**User Story:** As a developer, I want a single error handler module, so that all error handling logic is centralized and consistent.

#### Acceptance Criteria

1. WHEN the error handler module is imported, THE ErrorHandler SHALL provide a `handleError(context, error)` function
2. THE ErrorHandler SHALL be located at `/services/error-handler.js`
3. WHERE a module needs error handling, THE ErrorHandler SHALL be importable using `import { handleError } from "../services/error-handler.js"`
4. THE ErrorHandler SHALL be reusable across all JavaScript modules in the admin-dashboard project

### Requirement 2: Error Logging

**User Story:** As a developer, I want errors to be logged consistently, so that debugging is easier and error patterns can be identified.

#### Acceptance Criteria

1. WHEN `handleError(context, error)` is called, THE ErrorHandler SHALL log the error to the console with an ❌ prefix
2. THE log message SHALL include the context identifier and error details
3. THE ErrorHandler SHALL preserve the original error object for debugging purposes

### Requirement 3: User Notification

**User Story:** As a user, I want to see clear error messages, so that I understand when something goes wrong.

#### Acceptance Criteria

1. WHEN `handleError(context, error)` is called, THE ErrorHandler SHALL show an alert to the user
2. THE alert message SHALL include the context information to help identify which module encountered the error
3. WHERE an error occurs during a form submission, THE ErrorHandler SHALL display the error near the relevant form element

### Requirement 4: Module Migration

**User Story:** As a developer, I want to replace existing alert() calls with the centralized handler, so that error handling is consistent across the project.

#### Acceptance Criteria

1. WHEN a JavaScript file in `/admin-dashboard/` or `/services/` contains an `alert("Error ...")` call, THE ErrorHandler SHALL be imported and the alert call SHALL be replaced with `handleError("module-name", error)`
2. THE old error handling logic SHALL be commented with `// 🔄 Reemplazado por error-handler.js`
3. FOR ALL modules that use Supabase operations, THE ErrorHandler SHALL be used for error display instead of direct `alert()` calls

### Requirement 5: Context-Aware Error Messages

**User Story:** As a developer, I want error messages to include context, so that users and developers can identify which module encountered the error.

#### Acceptance Criteria

1. WHEN `handleError("login", error)` is called, THE alert message SHALL include "login" as the context identifier
2. WHEN `handleError("usuarios", error)` is called, THE alert message SHALL include "usuarios" as the context identifier
3. THE context SHALL be displayed in a consistent format across all error notifications

### Requirement 6: Non-Breaking Implementation

**User Story:** As a developer, I want the error handler to not break existing functionality, so that the migration can be done incrementally.

#### Acceptance Criteria

1. WHERE `handleError()` is called, THE error handling SHALL NOT prevent the normal flow of the application
2. THE ErrorHandler SHALL allow the application to continue operation after displaying the error
3. FOR async operations, THE ErrorHandler SHALL not interfere with promise resolution or rejection

## Non-Functional Requirements

### Maintainability

- The error handler code SHALL be well-documented with JSDoc comments
- The error handler SHALL follow the existing code style in the project
- Error handling logic SHALL be easy to extend for future enhancements

### Consistency

- All error messages SHALL follow the same format
- The error handler SHALL be used consistently across all modules
- Console logging format SHALL be consistent with project conventions

### Performance

- The error handler SHALL have minimal performance impact
- Error display SHALL be immediate (no significant delays)
- The handler SHALL not introduce additional async operations for basic error display

### Compatibility

- The error handler SHALL work with existing Supabase error objects
- The error handler SHALL work with standard JavaScript Error objects
- The error handler SHALL be compatible with all modules using ES6 modules

## Constraints and Dependencies

### Dependencies

- The error handler depends on the existing module structure using ES6 imports/exports
- The error handler will be used by modules that import Supabase client
- The error handler should not depend on any specific UI framework beyond vanilla JavaScript

### Constraints

- The error handler must be placed in `/services/` directory to follow existing project structure
- The error handler must use relative imports to maintain portability across different deployment environments
- The error handler must not modify the global scope beyond what is necessary

### Future Considerations

- The error handler may be extended to include:
  - Error reporting to a logging service
  - Custom error dialog UI instead of native `alert()`
  - Error categorization (critical, warning, info)
  - Error retry mechanisms for transient failures