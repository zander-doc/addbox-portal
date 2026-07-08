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
  // Validate context
  if (context === null || context === undefined) {
    console.error(`❌ [error-handler] Null context provided`);
    context = 'unknown';
  } else if (typeof context !== 'string') {
    console.error(`❌ [error-handler] Invalid context type: expected string`);
    context = 'unknown';
  }

  // Validate error
  if (error === null || error === undefined) {
    console.error(`❌ [error-handler] Null error provided`);
    error = new Error('Unknown error');
  } else if (!(error instanceof Error)) {
    console.error(`❌ [error-handler] Invalid error type: expected Error`);
    error = new Error(String(error));
  }

  // Log error to console with ❌ prefix
  console.error(`❌ [${context}] ${error.message}`);

  // Show user notification via alert
  alert(`Error in ${context}: ${error.message}`);

  // Preserve original error object (no modification needed)
}
