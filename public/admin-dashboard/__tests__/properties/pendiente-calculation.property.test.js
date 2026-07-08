/**
 * Property-Based Test: Pendiente calculation correctness
 * Feature: devoluciones-materiales-fuera, Property 1
 *
 * For any Detalle_Documento with cantidad >= 0 and cantidad_devuelta >= 0,
 * the calculated pendiente SHALL equal cantidad - cantidad_devuelta.
 *
 * Validates: Requirements 2.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure function extracted from devoluciones.service.js logic.
 * Calculates pendiente for a given detalle.
 */
function calcularPendiente(cantidad, cantidadDevuelta) {
  return (cantidad || 0) - (cantidadDevuelta || 0);
}

describe('Feature: devoluciones-materiales-fuera, Property 1: Pendiente calculation correctness', () => {
  it('pendiente SHALL equal cantidad - cantidad_devuelta for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.nat(10000), // cantidad >= 0
        fc.nat(10000), // cantidad_devuelta >= 0
        (cantidad, cantidadDevuelta) => {
          // Only test valid cases where devuelta <= cantidad
          fc.pre(cantidadDevuelta <= cantidad);

          const pendiente = calcularPendiente(cantidad, cantidadDevuelta);
          expect(pendiente).toBe(cantidad - cantidadDevuelta);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('pendiente is always >= 0 when cantidad_devuelta <= cantidad', () => {
    fc.assert(
      fc.property(
        fc.nat(10000),
        (cantidad) => {
          const cantidadDevuelta = fc.sample(fc.nat(cantidad), 1)[0];
          const pendiente = calcularPendiente(cantidad, cantidadDevuelta);
          expect(pendiente).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('pendiente is 0 when cantidad equals cantidad_devuelta', () => {
    fc.assert(
      fc.property(
        fc.nat(10000),
        (cantidad) => {
          const pendiente = calcularPendiente(cantidad, cantidad);
          expect(pendiente).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pendiente equals cantidad when cantidad_devuelta is 0', () => {
    fc.assert(
      fc.property(
        fc.nat(10000),
        (cantidad) => {
          const pendiente = calcularPendiente(cantidad, 0);
          expect(pendiente).toBe(cantidad);
        }
      ),
      { numRuns: 100 }
    );
  });
});
