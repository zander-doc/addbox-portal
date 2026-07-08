/**
 * Property-Based Test: Return validation invariant
 * Feature: devoluciones-materiales-fuera, Property 4
 *
 * For any return operation with quantity Q on a Detalle_Documento,
 * the operation SHALL succeed if and only if Q > 0 AND Q <= pendiente,
 * and after any successful return cantidad_devuelta SHALL never exceed cantidad.
 *
 * Validates: Requirements 3.1, 11.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure validation logic extracted from registrarDevolucion.
 * Returns { valid: boolean, error?: string, nuevaDevuelta?: number }
 */
function validarDevolucion(cantidad, cantidadDevuelta, Q) {
  if (!Q || Q <= 0) {
    return { valid: false, error: "La cantidad a devolver debe ser mayor a cero" };
  }

  const pendiente = cantidad - cantidadDevuelta;

  if (Q > pendiente) {
    return { valid: false, error: `No puedes devolver más de lo pendiente. Máximo permitido: ${pendiente}` };
  }

  const nuevaDevuelta = cantidadDevuelta + Q;
  return { valid: true, nuevaDevuelta };
}

describe('Feature: devoluciones-materiales-fuera, Property 4: Return validation invariant', () => {
  it('operation succeeds if and only if Q > 0 AND Q <= pendiente', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),  // cantidad (always > 0)
        fc.nat(1000),                        // cantidadDevuelta
        fc.integer({ min: -10, max: 1100 }), // Q (can be invalid)
        (cantidad, cantidadDevuelta, Q) => {
          fc.pre(cantidadDevuelta <= cantidad); // valid state

          const pendiente = cantidad - cantidadDevuelta;
          const resultado = validarDevolucion(cantidad, cantidadDevuelta, Q);

          if (Q > 0 && Q <= pendiente) {
            expect(resultado.valid).toBe(true);
          } else {
            expect(resultado.valid).toBe(false);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('after successful return, cantidad_devuelta never exceeds cantidad', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),  // cantidad
        fc.nat(999),                         // cantidadDevuelta
        fc.integer({ min: 1, max: 1000 }),  // Q > 0
        (cantidad, cantidadDevuelta, Q) => {
          fc.pre(cantidadDevuelta <= cantidad);
          const pendiente = cantidad - cantidadDevuelta;
          fc.pre(Q <= pendiente); // valid Q

          const resultado = validarDevolucion(cantidad, cantidadDevuelta, Q);
          expect(resultado.valid).toBe(true);
          expect(resultado.nuevaDevuelta).toBeLessThanOrEqual(cantidad);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('Q <= 0 always fails validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.nat(1000),
        fc.integer({ min: -100, max: 0 }),
        (cantidad, cantidadDevuelta, Q) => {
          fc.pre(cantidadDevuelta <= cantidad);
          const resultado = validarDevolucion(cantidad, cantidadDevuelta, Q);
          expect(resultado.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Q > pendiente always fails validation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.nat(999),
        (cantidad, cantidadDevuelta) => {
          fc.pre(cantidadDevuelta < cantidad);
          const pendiente = cantidad - cantidadDevuelta;
          const Q = pendiente + 1; // exceeds pendiente

          const resultado = validarDevolucion(cantidad, cantidadDevuelta, Q);
          expect(resultado.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
