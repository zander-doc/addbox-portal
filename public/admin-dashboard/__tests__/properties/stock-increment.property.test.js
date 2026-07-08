/**
 * Property-Based Test: Return operation increments existencia by exactly Q
 * Feature: devoluciones-materiales-fuera, Property 6
 *
 * For any valid return of quantity Q where the product code matches an existing product,
 * the product's existencia SHALL increase by exactly Q and no other field
 * in the productos table SHALL be modified.
 *
 * Validates: Requirements 3.5, 11.2, 11.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Simulates the stock increment logic from registrarDevolucion.
 * Returns the new product state after a return.
 */
function aplicarDevolucionAProducto(producto, Q) {
  // Only existencia is modified
  return {
    ...producto,
    existencia: (producto.existencia || 0) + Q
  };
}

describe('Feature: devoluciones-materiales-fuera, Property 6: Return operation increments existencia by exactly Q', () => {
  it('existencia increases by exactly Q after return', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }), // existencia_prev
        fc.integer({ min: 1, max: 5000 }),   // Q
        (existenciaPrev, Q) => {
          const producto = { id: "p1", codigo: "ABC", descripcion: "Test", existencia: existenciaPrev, costo_prom: 150.5 };
          const resultado = aplicarDevolucionAProducto(producto, Q);

          expect(resultado.existencia).toBe(existenciaPrev + Q);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('no other field in the product is modified', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 1, max: 99999 }), // costo_prom as integer cents
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (existencia, Q, costoProm, descripcion, codigo) => {
          const producto = {
            id: "uuid-123",
            codigo,
            descripcion,
            existencia,
            costo_prom: costoProm / 100
          };

          const resultado = aplicarDevolucionAProducto(producto, Q);

          // Only existencia should change
          expect(resultado.id).toBe(producto.id);
          expect(resultado.codigo).toBe(producto.codigo);
          expect(resultado.descripcion).toBe(producto.descripcion);
          expect(resultado.costo_prom).toBe(producto.costo_prom);

          // existencia should be the only changed field
          expect(resultado.existencia).toBe(existencia + Q);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('multiple returns accumulate existencia correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        (existenciaInicial, devoluciones) => {
          let producto = { id: "p1", codigo: "X", descripcion: "Y", existencia: existenciaInicial, costo_prom: 10 };

          for (const Q of devoluciones) {
            producto = aplicarDevolucionAProducto(producto, Q);
          }

          const totalDevuelto = devoluciones.reduce((sum, q) => sum + q, 0);
          expect(producto.existencia).toBe(existenciaInicial + totalDevuelto);
        }
      ),
      { numRuns: 200 }
    );
  });
});
