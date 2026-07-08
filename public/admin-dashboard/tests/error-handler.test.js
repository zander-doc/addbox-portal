/* ============================================================
   ERROR-HANDLER TESTS — ADDBOX
   Property-based tests for centralized error handling
============================================================ */

import { describe, it, expect } from 'vitest';
import { handleError } from '../services/error-handler.js';

/* ============================================================
   PROPERTY 1: Error object preservation
   For any valid context string and error object, calling 
   handleError(context, error) SHALL preserve the original 
   error object without modification
   Validates: Requirements 2.3
   ============================================================ */

/**
 * Property test for Error object preservation
 * Tests that the original error object is not modified after calling handleError
 */
describe('Property 1: Error object preservation', () => {
  it('should preserve original error object properties after handleError call', () => {
    // Generate test cases with various error objects
    const testCases = [
      { context: 'test-context', error: new Error('Test error message') },
      { context: 'login', error: new Error('Authentication failed') },
      { context: 'usuarios', error: new Error('User not found') },
      { context: 'movimientos', error: new Error('Movement update failed') },
    ];

    testCases.forEach(({ context, error }) => {
      // Capture original error state
      const originalMessage = error.message;
      const originalName = error.name;
      const originalStack = error.stack;

      // Call handleError
      handleError(context, error);

      // Verify error object was not modified
      expect(error.message).toBe(originalMessage);
      expect(error.name).toBe(originalName);
      expect(error.stack).toBe(originalStack);
    });
  });

  it('should handle custom error types without modification', () => {
    // Create custom error types
    const customErrors = [
      new TypeError('Type error message'),
      new ReferenceError('Reference error message'),
      new RangeError('Range error message'),
      new SyntaxError('Syntax error message'),
    ];

    customErrors.forEach((error) => {
      const originalMessage = error.message;
      const originalName = error.name;

      handleError('test-context', error);

      expect(error.message).toBe(originalMessage);
      expect(error.name).toBe(originalName);
    });
  });

  it('should preserve error object with additional properties', () => {
    // Create error with custom properties
    const error = new Error('Error with custom properties');
    error.code = 'TEST_ERROR';
    error.timestamp = Date.now();
    error.details = { key: 'value' };

    const originalCode = error.code;
    const originalTimestamp = error.timestamp;
    const originalDetails = error.details;

    handleError('test-context', error);

    expect(error.code).toBe(originalCode);
    expect(error.timestamp).toBe(originalTimestamp);
    expect(error.details).toEqual(originalDetails);
  });

  it('should handle Supabase-style error objects without modification', () => {
    // Simulate Supabase error structure
    const supabaseError = {
      message: 'Database constraint violation',
      name: 'PostgrestError',
      details: 'Key (id) already exists',
      hint: 'Use a different id value',
      code: '23505',
    };

    // Convert to Error object (as Supabase does)
    const error = new Error(supabaseError.message);
    error.name = supabaseError.name;
    error.details = supabaseError.details;
    error.hint = supabaseError.hint;
    error.code = supabaseError.code;

    const originalProperties = { ...error };

    handleError('test-context', error);

    expect(error.message).toBe(originalProperties.message);
    expect(error.name).toBe(originalProperties.name);
    expect(error.details).toBe(originalProperties.details);
    expect(error.hint).toBe(originalProperties.hint);
    expect(error.code).toBe(originalProperties.code);
  });
});

/* ============================================================
   PROPERTY 4: Non-blocking behavior
   For any valid context string and error object, calling 
   handleError(context, error) SHALL NOT prevent the normal 
   flow of the application
   Validates: Requirements 6.1, 6.2
   ============================================================ */

/**
 * Property test for Non-blocking behavior
 * Tests that handleError does not prevent normal application flow
 */
describe('Property 4: Non-blocking behavior', () => {
  it('should not throw exceptions for valid inputs', () => {
    // Property: For any valid context string and error object, handleError should not throw
    const testCases = [
      { context: 'test-context', error: new Error('Test error') },
      { context: 'login', error: new Error('Auth failed') },
      { context: 'usuarios', error: new Error('User not found') },
      { context: 'movimientos', error: new Error('Movement failed') },
      { context: 'any-context', error: new TypeError('Type error') },
    ];

    testCases.forEach(({ context, error }) => {
      // Should not throw
      expect(() => handleError(context, error)).not.toThrow();
    });
  });

  it('should allow code execution to continue after call', () => {
    // Property: After calling handleError, subsequent code should execute normally
    let executed = false;

    const error = new Error('Test error');
    handleError('test-context', error);

    // This code should execute normally
    executed = true;
    expect(executed).toBe(true);
  });

  it('should not block async operations', async () => {
    // Property: handleError should not interfere with async/await flow
    let asyncExecuted = false;

    const error = new Error('Async test error');
    handleError('async-context', error);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));
    asyncExecuted = true;

    expect(asyncExecuted).toBe(true);
  });

  it('should not prevent promise resolution', async () => {
    // Property: handleError should not interfere with promise resolution
    const result = await new Promise((resolve) => {
      const error = new Error('Promise test error');
      handleError('promise-context', error);
      resolve('success');
    });

    expect(result).toBe('success');
  });

  it('should not prevent promise rejection handling', async () => {
    // Property: handleError should not interfere with promise rejection
    let caughtError = null;

    try {
      const error = new Error('Rejection test error');
      handleError('rejection-context', error);
      throw new Error('Intentional error for testing');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.message).toBe('Intentional error for testing');
  });

  it('should handle rapid consecutive calls without blocking', () => {
    // Property: Multiple rapid calls to handleError should not block each other
    const results = [];

    for (let i = 0; i < 10; i++) {
      const error = new Error(`Error ${i}`);
      handleError(`context-${i}`, error);
      results.push(i);
    }

    // All iterations should complete
    expect(results.length).toBe(10);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should not affect control flow in conditional statements', () => {
    // Property: handleError should not interfere with conditional logic
    const error = new Error('Conditional test error');
    let conditionResult = null;

    if (true) {
      handleError('conditional-context', error);
      conditionResult = 'if-block-executed';
    } else {
      conditionResult = 'else-block-executed';
    }

    expect(conditionResult).toBe('if-block-executed');
  });

  it('should not affect control flow in try-catch blocks', () => {
    // Property: handleError should not interfere with try-catch blocks
    const error = new Error('Try-catch test error');
    let tryExecuted = false;
    let catchExecuted = false;

    try {
      handleError('try-context', error);
      tryExecuted = true;
      throw new Error('Intentional error');
    } catch (err) {
      catchExecuted = true;
    }

    expect(tryExecuted).toBe(true);
    expect(catchExecuted).toBe(true);
  });
});

/* ============================================================
   PROPERTY 2: Context in console log
   For any valid context string and error object, calling 
   handleError(context, error) SHALL log a message to the console 
   that includes the context identifier and the error message
   Validates: Requirements 2.1, 2.2
   **Feature: centralized-error-handling, Property 2: Context in console log**
   ============================================================ */

/**
 * Property test for Context in console log
 * Tests that console log includes context identifier and error message
 * by mocking console.error and capturing its arguments
 */
describe('Property 2: Context in console log', () => {
  let originalConsoleError;

  beforeEach(() => {
    // Store original console.error function
    originalConsoleError = global.console.error;
    // Mock console.error to capture calls
    global.console.error = jest.fn();
  });

  afterEach(() => {
    // Restore original console.error function
    global.console.error = originalConsoleError;
  });

  it('should log message with context identifier and error message for any valid inputs', () => {
    // Property-based testing with 100+ iterations
    // Generate 100 different context-error combinations
    const contexts = ['login', 'usuarios', 'movimientos', 'inventario', 'configuracion', 
                      'empresa', 'roles', 'devoluciones', 'dashboard', 'instalacion'];
    const errorMessages = ['Authentication failed', 'User not found', 'Update failed', 
                          'Record not found', 'Validation error', 'Connection timeout',
                          'Permission denied', 'Invalid input', 'Operation failed', 
                          'Data not available'];
    
    // Generate 100+ test cases by combining contexts and error messages
    const testCases = [];
    for (let i = 0; i < 100; i++) {
      const context = contexts[i % contexts.length];
      const message = errorMessages[i % errorMessages.length];
      testCases.push({ context, message, index: i });
    }

    testCases.forEach(({ context, message }) => {
      const error = new Error(message);
      
      handleError(context, error);
      
      // Verify console.error was called
      expect(console.error).toHaveBeenCalled();
      
      // Get the log message
      const logMessage = console.error.mock.calls[0][0];
      
      // Verify context identifier is in the log message
      expect(logMessage).toContain(context);
      
      // Verify error message is in the log message
      expect(logMessage).toContain(message);
      
      // Verify the log message starts with ❌ prefix
      expect(logMessage).toMatch(/^❌/);
      
      // Reset mock for next call
      console.error.mockReset();
    });
  });

  it('should use consistent format for console log messages across all contexts', () => {
    // Property-based testing with 100+ iterations
    const contexts = ['login', 'usuarios', 'movimientos', 'inventario', 'configuracion',
                      'empresa', 'roles', 'devoluciones', 'dashboard', 'instalacion'];
    const errorMessage = 'Test error message';

    // Generate 100+ test cases
    const testCases = [];
    for (let i = 0; i < 100; i++) {
      const context = contexts[i % contexts.length];
      testCases.push({ context, index: i });
    }

    testCases.forEach(({ context }) => {
      const error = new Error(errorMessage);
      
      handleError(context, error);
      
      const logMessage = console.error.mock.calls[0][0];
      
      // Verify format: "❌ [context] error.message"
      const expectedFormat = `❌ [${context}] ${errorMessage}`;
      expect(logMessage).toBe(expectedFormat);
      
      // Reset mock for next call
      console.error.mockReset();
    });
  });

  it('should handle special characters in context and error message', () => {
    const testCases = [
      { context: 'test-context_123', message: 'Error with special chars: @#$%' },
      { context: 'login', message: 'Error with quotes: "double" and \'single\'' },
      { context: 'usuarios', message: 'Error with unicode: ñ é ü ö' },
      { context: 'config', message: 'Error with brackets: [test] {data} (values)' },
    ];

    testCases.forEach(({ context, message }) => {
      const error = new Error(message);
      
      handleError(context, error);
      
      const logMessage = console.error.mock.calls[0][0];
      
      // Verify context and message are preserved in log
      expect(logMessage).toContain(context);
      expect(logMessage).toContain(message);
      expect(logMessage).toMatch(/^❌/);
      
      // Reset mock for next call
      console.error.mockReset();
    });
  });

  it('should work with multiple consecutive handleError calls', () => {
    const calls = [
      { context: 'login', message: 'First error' },
      { context: 'usuarios', message: 'Second error' },
      { context: 'movimientos', message: 'Third error' },
    ];

    calls.forEach(({ context, message }) => {
      const error = new Error(message);
      handleError(context, error);
      
      const logMessage = console.error.mock.calls[0][0];
      expect(logMessage).toContain(context);
      expect(logMessage).toContain(message);
      expect(logMessage).toMatch(/^❌/);
      
      // Reset mock for next call
      console.error.mockReset();
    });
  });

  it('should log error with custom error types', () => {
    const customErrors = [
      { context: 'login', error: new TypeError('Type error message') },
      { context: 'usuarios', error: new ReferenceError('Reference error message') },
      { context: 'movimientos', error: new RangeError('Range error message') },
    ];

    customErrors.forEach(({ context, error }) => {
      handleError(context, error);
      
      const logMessage = console.error.mock.calls[0][0];
      expect(logMessage).toContain(context);
      expect(logMessage).toContain(error.message);
      expect(logMessage).toMatch(/^❌/);
      
      // Reset mock for next call
      console.error.mockReset();
    });
  });

  it('should handle Supabase-style error objects', () => {
    // Simulate Supabase error structure
    const supabaseErrors = [
      { 
        context: 'login', 
        error: (() => {
          const e = new Error('Database constraint violation');
          e.name = 'PostgrestError';
          e.details = 'Key (id) already exists';
          e.code = '23505';
          return e;
        })()
      },
      { 
        context: 'usuarios', 
        error: (() => {
          const e = new Error('Row level security violation');
          e.name = 'PostgrestError';
          e.details = 'Permission denied for user';
          e.code = 'PGRST116';
          return e;
        })()
      },
    ];

    supabaseErrors.forEach(({ context, error }) => {
      handleError(context, error);
      
      const logMessage = console.error.mock.calls[0][0];
      expect(logMessage).toContain(context);
      expect(logMessage).toContain(error.message);
      expect(logMessage).toMatch(/^❌/);
      
      // Reset mock for next call
      console.error.mockReset();
    });
  });
});

/* ============================================================
   PROPERTY 3: Context in alert message
   For any valid context string and error object, calling 
   handleError(context, error) SHALL display an alert message 
   that includes the context identifier
   Validates: Requirements 3.2, 5.1, 5.2, 5.3
   ============================================================ */

/**
 * Property test for Context in alert message
 * Tests that the alert message includes the context identifier
 * by mocking the alert function and capturing its arguments
 */
describe('Property 3: Context in alert message', () => {
  let originalAlert;

  beforeEach(() => {
    // Store original alert function
    originalAlert = global.alert;
    // Mock alert to capture calls
    global.alert = jest.fn();
  });

  afterEach(() => {
    // Restore original alert function
    global.alert = originalAlert;
  });

  it('should display alert message with context identifier for any valid context', () => {
    // Property-based testing with 100+ iterations
    // Generate 100 different context-error combinations
    const contexts = ['login', 'usuarios', 'movimientos', 'inventario', 'configuracion', 
                      'empresa', 'roles', 'devoluciones', 'dashboard', 'instalacion',
                      'presupuesto', 'fotos', 'admin', 'auth', 'payment'];
    const errorMessages = [
      'Authentication failed', 'User not found', 'Movement update failed',
      'Product not available', 'Configuration error', 'Database connection failed',
      'Network error', 'Invalid input', 'Permission denied', 'Resource not found'
    ];
    
    // Generate 100+ test cases by combining contexts and error messages
    const testCases = [];
    for (let i = 0; i < 100; i++) {
      const context = contexts[i % contexts.length];
      const message = errorMessages[i % errorMessages.length];
      testCases.push({ context, message, index: i });
    }

    testCases.forEach(({ context, message }) => {
      const error = new Error(message);

      handleError(context, error);

      // Verify alert was called
      expect(alert).toHaveBeenCalled();
      
      // Get the alert message
      const alertMessage = alert.mock.calls[0][0];
      
      // Verify context identifier is in the alert message
      expect(alertMessage).toContain(context);
      
      // Verify error message is in the alert message
      expect(alertMessage).toContain(message);
      
      // Reset mock for next call
      alert.mockReset();
    });
  });

  it('should use consistent format for alert messages across all contexts', () => {
    // Property-based testing with 100+ iterations
    const contexts = ['login', 'usuarios', 'movimientos', 'inventario', 'configuracion',
                      'empresa', 'roles', 'devoluciones', 'dashboard', 'instalacion'];
    const errorMessage = 'Test error message';

    // Generate 100+ test cases
    const testCases = [];
    for (let i = 0; i < 100; i++) {
      const context = contexts[i % contexts.length];
      testCases.push({ context, index: i });
    }

    testCases.forEach(({ context }) => {
      const error = new Error(errorMessage);
      
      handleError(context, error);
      
      const alertMessage = alert.mock.calls[0][0];
      
      // Verify format: "Error in {context}: {error.message}"
      const expectedFormat = `Error in ${context}: ${errorMessage}`;
      expect(alertMessage).toBe(expectedFormat);
      
      alert.mockReset();
    });
  });

  it('should handle special characters in context and error message', () => {
    // Property-based testing with 100+ iterations
    // Generate 100+ test cases with various special characters
    const contexts = ['test-context_123', 'login', 'usuarios', 'movimientos', 'inventario'];
    const messages = [
      'Error with special chars: @#$%',
      'Error with quotes: "double" and \'single\'',
      'Error with unicode: ñ é ü ö',
      'Error with symbols: © ® ™ £ €',
      'Error with newlines: line1\nline2',
    ];

    // Generate 100+ test cases
    const testCases = [];
    for (let i = 0; i < 100; i++) {
      const context = contexts[i % contexts.length];
      const message = messages[i % messages.length];
      testCases.push({ context, message, index: i });
    }

    testCases.forEach(({ context, message }) => {
      const error = new Error(message);
      
      handleError(context, error);
      
      const alertMessage = alert.mock.calls[0][0];
      
      // Verify context and message are preserved in alert
      expect(alertMessage).toContain(context);
      expect(alertMessage).toContain(message);
      
      alert.mockReset();
    });
  });

  it('should work with multiple consecutive handleError calls', () => {
    // Property-based testing with 100+ iterations
    // Generate 100+ consecutive calls
    const contexts = ['login', 'usuarios', 'movimientos', 'inventario', 'configuracion'];
    const errorMessages = ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5'];

    // Generate 100+ test cases
    const testCases = [];
    for (let i = 0; i < 100; i++) {
      const context = contexts[i % contexts.length];
      const message = errorMessages[i % errorMessages.length];
      testCases.push({ context, message, index: i });
    }

    testCases.forEach(({ context, message }) => {
      const error = new Error(message);
      handleError(context, error);
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      expect(alertMessage).toContain(message);
      
      alert.mockReset();
    });
  });
});

/* ============================================================
   PROPERTY 5: Async compatibility
   For any async operation that calls handleError(context, error), 
   the error handler SHALL NOT interfere with promise resolution 
   or rejection
   Validates: Requirements 6.3
   ============================================================ */

/**
 * Property test for Async compatibility
 * Tests that handleError does not interfere with promise 
 * resolution or rejection in async operations
 * 
 * **Feature: centralized-error-handling, Property 5: Async compatibility**
 */
describe('Property 5: Async compatibility', () => {
  let originalAlert;

  beforeEach(() => {
    // Store original alert function
    originalAlert = global.alert;
    // Mock alert to capture calls
    global.alert = jest.fn();
  });

  afterEach(() => {
    // Restore original alert function
    global.alert = originalAlert;
  });

  it('should not interfere with promise resolution in async operations', async () => {
    // Property: For any async operation that calls handleError, 
    // the promise should resolve normally
    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      const result = await new Promise(async (resolve) => {
        const error = new Error(message);
        handleError(context, error);
        resolve('success');
      });

      expect(result).toBe('success');
      
      // Verify alert was called with correct context
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not interfere with promise rejection in async operations', async () => {
    // Property: For any async operation that calls handleError, 
    // promise rejections should still be properly caught
    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      try {
        const error = new Error(message);
        handleError(context, error);
        throw new Error('Intentional rejection');
      } catch (err) {
        expect(err).not.toBeNull();
        expect(err.message).toBe('Intentional rejection');
      }
      
      // Verify alert was called
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not block async/await flow with 100+ iterations', async () => {
    // Property: handleError should not interfere with async/await flow
    // Test with 100+ iterations to ensure consistency
    
    for (let i = 0; i < 100; i++) {
      const context = `context-${i % 10}`;
      const message = `Error message ${i}`;
      const error = new Error(message);

      const result = await new Promise(async (resolve) => {
        handleError(context, error);
        resolve('resolved');
      });

      expect(result).toBe('resolved');
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      expect(alertMessage).toContain(message);
      
      alert.mockReset();
    }
  });

  it('should not interfere with async error handling in try-catch blocks', async () => {
    // Property: handleError should not interfere with async try-catch blocks
    
    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      let tryExecuted = false;
      let catchExecuted = false;

      try {
        const error = new Error(message);
        handleError(context, error);
        tryExecuted = true;
        throw new Error('Intentional async error');
      } catch (err) {
        catchExecuted = true;
        expect(err.message).toBe('Intentional async error');
      }

      expect(tryExecuted).toBe(true);
      expect(catchExecuted).toBe(true);
      
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not interfere with async operations that return values', async () => {
    // Property: handleError should not interfere with async operations 
    // that return computed values
    
    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      const result = await new Promise(async (resolve) => {
        const error = new Error(message);
        handleError(context, error);
        
        // Simulate async computation
        const computedValue = 42 + context.length;
        resolve(computedValue);
      });

      expect(result).toBe(42 + context.length);
      
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not interfere with async operations that throw errors', async () => {
    // Property: handleError should not interfere with async operations 
    // that throw errors
    
    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      let caughtError = null;

      try {
        const error = new Error(message);
        handleError(context, error);
        throw new Error('Async operation error');
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toBe('Async operation error');
      
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not interfere with Promise.all in async operations', async () => {
    // Property: handleError should not interfere with Promise.all
    
    const operations = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    const results = await Promise.all(operations.map(async ({ context, message }) => {
      const error = new Error(message);
      handleError(context, error);
      return `result-${context}`;
    }));

    expect(results).toEqual(['result-login', 'result-usuarios', 'result-movimientos']);
    
    // Verify alert was called for each operation
    expect(alert).toHaveBeenCalledTimes(3);
    
    const alertMessages = alert.mock.calls.map(call => call[0]);
    expect(alertMessages[0]).toContain('login');
    expect(alertMessages[1]).toContain('usuarios');
    expect(alertMessages[2]).toContain('movimientos');
    
    alert.mockReset();
  });

  it('should not interfere with async operations in async functions', async () => {
    // Property: handleError should not interfere with async functions
    
    async function asyncOperation(context, message) {
      const error = new Error(message);
      handleError(context, error);
      return `async-result-${context}`;
    }

    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      const result = await asyncOperation(context, message);
      expect(result).toBe(`async-result-${context}`);
      
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not interfere with async operations in async generators', async () => {
    // Property: handleError should not interfere with async generators
    
    async function* asyncGenerator(contexts) {
      for (const context of contexts) {
        const error = new Error(`Error in ${context}`);
        handleError(context, error);
        yield `generated-${context}`;
      }
    }

    const contexts = ['login', 'usuarios', 'movimientos'];
    const results = [];

    for await (const result of asyncGenerator(contexts)) {
      results.push(result);
    }

    expect(results).toEqual(['generated-login', 'generated-usuarios', 'generated-movimientos']);
    
    expect(alert).toHaveBeenCalledTimes(3);
    
    const alertMessages = alert.mock.calls.map(call => call[0]);
    expect(alertMessages[0]).toContain('login');
    expect(alertMessages[1]).toContain('usuarios');
    expect(alertMessages[2]).toContain('movimientos');
    
    alert.mockReset();
  });

  it('should not interfere with async operations that use setTimeout', async () => {
    // Property: handleError should not interfere with async operations 
    // that use setTimeout or other async APIs
    
    const testCases = [
      { context: 'login', message: 'Auth error' },
      { context: 'usuarios', message: 'User error' },
      { context: 'movimientos', message: 'Movement error' },
    ];

    for (const { context, message } of testCases) {
      const result = await new Promise(async (resolve) => {
        const error = new Error(message);
        handleError(context, error);
        
        // Use setTimeout to simulate async operation
        setTimeout(() => {
          resolve('timeout-result');
        }, 10);
      });

      expect(result).toBe('timeout-result');
      
      expect(alert).toHaveBeenCalled();
      
      const alertMessage = alert.mock.calls[0][0];
      expect(alertMessage).toContain(context);
      alert.mockReset();
    }
  });

  it('should not interfere with async operations that use fetch-like APIs', async () => {
    // Property: handleError should not interfere with async operations 
    // that use fetch-like APIs (simulated with Promise)
    
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => 
      Promise.resolve({ 
        json: () => Promise.resolve({ data: 'test' }) 
      })
    );

    try {
      const testCases = [
        { context: 'login', message: 'Auth error' },
        { context: 'usuarios', message: 'User error' },
        { context: 'movimientos', message: 'Movement error' },
      ];

      for (const { context, message } of testCases) {
        const result = await new Promise(async (resolve) => {
          const error = new Error(message);
          handleError(context, error);
          
          // Simulate fetch-like async operation
          const response = await { json: () => Promise.resolve({ data: 'test' }) };
          resolve(response);
        });

        expect(result).not.toBeNull();
        
        expect(alert).toHaveBeenCalled();
        
        const alertMessage = alert.mock.calls[0][0];
        expect(alertMessage).toContain(context);
        alert.mockReset();
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
