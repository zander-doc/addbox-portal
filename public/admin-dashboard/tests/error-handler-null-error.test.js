/* ============================================================
   ERROR-HANDLER NULL/UNDEFINED ERROR TESTS — ADDBOX
   Unit tests for null/undefined error handling
============================================================ */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleError } from '../services/error-handler.js';

/* ============================================================
   UNIT TESTS: Null/Undefined Error Handling
   Task 3.4: Handle null/undefined error
   Requirements: Error Handling - Null Error
   ============================================================ */

describe('Task 3.4: Handle null/undefined error', () => {
  let originalConsoleError;
  let originalAlert;
  let consoleErrorCalls;
  let alertCalls;

  beforeEach(() => {
    // Store original functions
    originalConsoleError = console.error;
    originalAlert = global.alert;
    
    // Mock functions
    consoleErrorCalls = [];
    alertCalls = [];
    
    console.error = (...args) => consoleErrorCalls.push(args);
    alert = (...args) => alertCalls.push(args);
  });

  afterEach(() => {
    // Restore original functions
    console.error = originalConsoleError;
    alert = originalAlert;
  });

  it('should handle null error by creating default Error with "Unknown error" message', () => {
    // Given: null error
    const context = 'test-context';
    const error = null;

    // When: handleError is called
    handleError(context, error);

    // Then: console log shows null error message
    expect(consoleErrorCalls.length).toBe(1);
    expect(consoleErrorCalls[0][0]).toContain('❌ [error-handler] Null error provided');

    // Then: alert shows "Unknown error" message
    expect(alertCalls.length).toBe(1);
    expect(alertCalls[0]).toBe('Error in test-context: Unknown error');
  });

  it('should handle undefined error by creating default Error with "Unknown error" message', () => {
    // Given: undefined error
    const context = 'test-context';
    const error = undefined;

    // When: handleError is called
    handleError(context, error);

    // Then: console log shows null error message
    expect(consoleErrorCalls.length).toBe(1);
    expect(consoleErrorCalls[0][0]).toContain('❌ [error-handler] Null error provided');

    // Then: alert shows "Unknown error" message
    expect(alertCalls.length).toBe(1);
    expect(alertCalls[0]).toBe('Error in test-context: Unknown error');
  });

  it('should use "unknown" context when both context and error are null', () => {
    // Given: null context and null error
    const context = null;
    const error = null;

    // When: handleError is called
    handleError(context, error);

    // Then: alert uses "unknown" context
    expect(alertCalls.length).toBe(1);
    expect(alertCalls[0]).toBe('Error in unknown: Unknown error');
  });

  it('should handle null error with valid context string', () => {
    // Given: null error with various valid contexts
    const testCases = [
      { context: 'login', expectedAlert: 'Error in login: Unknown error' },
      { context: 'usuarios', expectedAlert: 'Error in usuarios: Unknown error' },
      { context: 'movimientos', expectedAlert: 'Error in movimientos: Unknown error' },
      { context: 'inventario', expectedAlert: 'Error in inventario: Unknown error' },
    ];

    testCases.forEach(({ context, expectedAlert }) => {
      // Reset mocks
      consoleErrorCalls = [];
      alertCalls = [];

      // When: handleError is called with null error
      handleError(context, null);

      // Then: alert shows correct context with "Unknown error"
      expect(alertCalls.length).toBe(1);
      expect(alertCalls[0]).toBe(expectedAlert);
    });
  });

  it('should log with "unknown" context when error is null and context is invalid', () => {
    // Given: null error with invalid context
    const testCases = [
      { context: 123, expectedLog: '❌ [error-handler] Invalid context type: expected string' },
      { context: {}, expectedLog: '❌ [error-handler] Invalid context type: expected string' },
      { context: [], expectedLog: '❌ [error-handler] Invalid context type: expected string' },
    ];

    testCases.forEach(({ context, expectedLog }) => {
      // Reset mocks
      consoleErrorCalls = [];
      alertCalls = [];

      // When: handleError is called with null error and invalid context
      handleError(context, null);

      // Then: console log shows invalid context message
      expect(consoleErrorCalls.length).toBe(1);
      expect(consoleErrorCalls[0][0]).toBe(expectedLog);

      // Then: alert uses "unknown" context
      expect(alertCalls.length).toBe(1);
      expect(alertCalls[0]).toBe('Error in unknown: Unknown error');
    });
  });

  it('should not throw when error is null', () => {
    // Given: null error
    const context = 'test-context';
    const error = null;

    // When/Then: handleError should not throw
    expect(() => handleError(context, error)).not.toThrow();
  });

  it('should not throw when error is undefined', () => {
    // Given: undefined error
    const context = 'test-context';
    const error = undefined;

    // When/Then: handleError should not throw
    expect(() => handleError(context, error)).not.toThrow();
  });

  it('should allow code execution to continue after null error handling', () => {
    // Given: null error
    let executed = false;

    // When: handleError is called with null error
    handleError('test-context', null);
    executed = true;

    // Then: code should continue executing
    expect(executed).toBe(true);
  });

  it('should handle rapid consecutive calls with null errors', () => {
    // Given: multiple null errors
    const results = [];

    // When: handleError is called 10 times with null errors
    for (let i = 0; i < 10; i++) {
      handleError(`context-${i}`, null);
      results.push(i);
    }

    // Then: all iterations should complete
    expect(results.length).toBe(10);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should handle null error in async operations', async () => {
    // Given: null error in async context
    let asyncExecuted = false;

    // When: handleError is called with null error in async context
    handleError('async-context', null);
    await new Promise((resolve) => setTimeout(resolve, 10));
    asyncExecuted = true;

    // Then: async operation should complete
    expect(asyncExecuted).toBe(true);
  });

  it('should handle null error in try-catch blocks', () => {
    // Given: null error in try-catch
    let tryExecuted = false;
    let catchExecuted = false;

    // When: handleError is called with null error in try block
    try {
      handleError('try-context', null);
      tryExecuted = true;
      throw new Error('Intentional error');
    } catch (err) {
      catchExecuted = true;
    }

    // Then: try-catch should work normally
    expect(tryExecuted).toBe(true);
    expect(catchExecuted).toBe(true);
  });
});
