/* ============================================================
   ERROR-HANDLER.TEST.JS — ADDBOX
   Unit tests for centralized error handling module
============================================================ */

import { handleError } from "./error-handler.js";

// Mock console.error and alert for testing
const originalConsoleError = console.error;
const originalAlert = window.alert;

beforeEach(() => {
  console.error = jest.fn();
  window.alert = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  window.alert = originalAlert;
});

describe("handleError - Null/Undefined Context", () => {
  test("should handle null context with default 'unknown' and log with ❌ prefix", () => {
    const error = new Error("Test error");
    
    handleError(null, error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Null context provided");
    expect(console.error).toHaveBeenCalledWith("❌ [unknown] Test error");
    expect(window.alert).toHaveBeenCalledWith("Error in unknown: Test error");
  });

  test("should handle undefined context with default 'unknown' and log with ❌ prefix", () => {
    const error = new Error("Test error");
    
    handleError(undefined, error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Null context provided");
    expect(console.error).toHaveBeenCalledWith("❌ [unknown] Test error");
    expect(window.alert).toHaveBeenCalledWith("Error in unknown: Test error");
  });

  test("should preserve original error object when context is null", () => {
    const originalError = new Error("Original error");
    const errorBefore = { message: originalError.message, stack: originalError.stack };
    
    handleError(null, originalError);
    
    // Verify error object was not modified
    expect(originalError.message).toBe("Original error");
  });
});

describe("handleError - Null/Undefined Error", () => {
  test("should handle null error with default 'Unknown error' message", () => {
    const context = "test-context";
    
    handleError(context, null);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Null error provided");
    expect(console.error).toHaveBeenCalledWith("❌ [test-context] Unknown error");
    expect(window.alert).toHaveBeenCalledWith("Error in test-context: Unknown error");
  });

  test("should handle undefined error with default 'Unknown error' message", () => {
    const context = "test-context";
    
    handleError(context, undefined);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Null error provided");
    expect(console.error).toHaveBeenCalledWith("❌ [test-context] Unknown error");
    expect(window.alert).toHaveBeenCalledWith("Error in test-context: Unknown error");
  });
});

describe("handleError - Invalid Context Type", () => {
  test("should handle number context with default 'unknown'", () => {
    const error = new Error("Test error");
    
    handleError(123, error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Invalid context type: expected string");
    expect(console.error).toHaveBeenCalledWith("❌ [unknown] Test error");
  });

  test("should handle object context with default 'unknown'", () => {
    const error = new Error("Test error");
    
    handleError({ context: "test" }, error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Invalid context type: expected string");
    expect(console.error).toHaveBeenCalledWith("❌ [unknown] Test error");
  });

  test("should handle array context with default 'unknown'", () => {
    const error = new Error("Test error");
    
    handleError(["test"], error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Invalid context type: expected string");
    expect(console.error).toHaveBeenCalledWith("❌ [unknown] Test error");
  });

  test("should handle boolean context with default 'unknown'", () => {
    const error = new Error("Test error");
    
    handleError(true, error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Invalid context type: expected string");
    expect(console.error).toHaveBeenCalledWith("❌ [unknown] Test error");
  });
});

describe("handleError - Invalid Error Type", () => {
  test("should handle string error by creating new Error with string as message", () => {
    const context = "test-context";
    
    handleError(context, "String error message");
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Invalid error type: expected Error");
    expect(console.error).toHaveBeenCalledWith("❌ [test-context] String error message");
    expect(window.alert).toHaveBeenCalledWith("Error in test-context: String error message");
  });

  test("should handle number error by creating new Error with number as message", () => {
    const context = "test-context";
    
    handleError(context, 404);
    
    expect(console.error).toHaveBeenCalledWith("❌ [error-handler] Invalid error type: expected Error");
    expect(console.error).toHaveBeenCalledWith("❌ [test-context] 404");
  });
});

describe("handleError - Normal Operation", () => {
  test("should log and alert with correct context and error message", () => {
    const context = "login";
    const error = new Error("Authentication failed");
    
    handleError(context, error);
    
    expect(console.error).toHaveBeenCalledWith("❌ [login] Authentication failed");
    expect(window.alert).toHaveBeenCalledWith("Error in login: Authentication failed");
  });

  test("should preserve original error object", () => {
    const context = "test";
    const originalError = new Error("Original message");
    const errorBefore = { message: originalError.message, stack: originalError.stack };
    
    handleError(context, originalError);
    
    // Verify error object was not modified
    expect(originalError.message).toBe("Original message");
  });
});
