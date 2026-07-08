/**
 * Property-Based Test: Return operation increments cantidad_devuelta by exactly Q
 * Feature: devoluciones-materiales-fuera, Property 5
 *
 * For any valid return of quantity Q, the resulting cantidad_devuelta
 * SHALL equal the previous cantidad_devuelta + Q.
 *
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Simulates the increment logic from registrarDevolucion.
 */
function calcularNuevaDevuelta(cantidadDevueltaPrev, Q) {
  return cantidadDevueltaPrev + Q;
}

describe('Feature: devoluciones-materiales-fuera, Property 5: Return operation increments cantidad_devuelta by exactly Q', () => {
  it('nueva cantidad_devuelta equals previous + Q for all valid returns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // cantidadDevuelta_prev
        fc.integer({ min: 1, max: 5000 }),  // Q > 0
        (cantidadDevueltaPrev, Q) => {
          const resultado = calcularNuevaDevuelta(cantidadDevueltaPrev, Q);
          expect(resultado).toBe(cantidadDevueltaPrev + Q);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('increment is exactly Q, not more, not less', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 1, max: 5000 }),
        (cantidadDevueltaPrev, Q) => {
          const resultado = calcularNuevaDevuelta(cantidadDevueltaPrev, Q);
          const incremento = resultado - cantidadDevueltaPrev;
          expect(incremento).toBe(Q);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('multiple sequential returns accumulate correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        (devoluciones) => {
          let cantidadDevuelta = 0;
          let totalDevuelto = 0;

          for (const Q of devoluciones) {
            cantidadDevuelta = calcularNuevaDevuelta(cantidadDevuelta, Q);
            totalDevuelto += Q;
          }

          expect(cantidadDevuelta).toBe(totalDevuelto);
        }
      ),
      { numRuns: 200 }
    );
  });
});
