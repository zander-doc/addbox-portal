/**
 * Property 17: Inventory valuation calculation
 * For any set of products across obras, the valuation report SHALL calculate the total value
 * as the sum of (stock_cantidad × costo_prom) for each product-obra combination, and the
 * grand total SHALL equal the sum of all individual product-obra values.
 *
 * Property 18: Rotation report ordering
 * For any set of products with movements in a given date range, the rotation report SHALL
 * count the total number of movements per product and order results from highest to lowest.
 *
 * Validates: Requirements 9.3, 9.5
 * Feature: real-product-inventory, Properties 17, 18
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure function to calculate valuation (mirrors reporteValorizacion logic)
function calcularValorizacion(stockItems) {
  const datos = stockItems.map(item => ({
    producto_id: item.producto_id,
    obra_id: item.obra_id,
    cantidad: item.cantidad,
    costo_prom: item.costo_prom,
    valor_total: item.cantidad * item.costo_prom,
  }));

  const granTotal = datos.reduce((sum, item) => sum + item.valor_total, 0);

  return { datos, granTotal };
}

// Pure function to calculate rotation (mirrors reporteRotacion logic)
function calcularRotacion(movimientos) {
  const conteo = {};

  for (const mov of movimientos) {
    const id = mov.producto_id;
    if (!conteo[id]) {
      conteo[id] = {
        producto_id: id,
        total_movimientos: 0,
      };
    }
    conteo[id].total_movimientos += 1;
  }

  return Object.values(conteo).sort(
    (a, b) => b.total_movimientos - a.total_movimientos
  );
}

// Arbitrary for stock items
const stockItemArb = fc.record({
  producto_id: fc.uuid(),
  obra_id: fc.uuid(),
  cantidad: fc.integer({ min: 0, max: 10000 }),
  costo_prom: fc.double({ min: 0, max: 100000, noNaN: true }),
});

// Arbitrary for movements
const movimientoArb = fc.record({
  producto_id: fc.constantFrom('prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5'),
  tipo: fc.constantFrom('entrada', 'salida', 'ajuste'),
  cantidad: fc.integer({ min: 1, max: 1000 }),
});

describe('Property 17: Inventory valuation calculation', () => {
  it('valor_total equals cantidad × costo_prom for each item', () => {
    fc.assert(
      fc.property(
        fc.array(stockItemArb, { minLength: 1, maxLength: 50 }),
        (items) => {
          const { datos } = calcularValorizacion(items);

          for (let i = 0; i < datos.length; i++) {
            const expected = items[i].cantidad * items[i].costo_prom;
            expect(datos[i].valor_total).toBeCloseTo(expected, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('granTotal equals sum of all individual valor_total', () => {
    fc.assert(
      fc.property(
        fc.array(stockItemArb, { minLength: 1, maxLength: 50 }),
        (items) => {
          const { datos, granTotal } = calcularValorizacion(items);

          const sumIndividual = datos.reduce((sum, item) => sum + item.valor_total, 0);
          expect(granTotal).toBeCloseTo(sumIndividual, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('granTotal equals sum of (cantidad × costo_prom) for all items', () => {
    fc.assert(
      fc.property(
        fc.array(stockItemArb, { minLength: 1, maxLength: 50 }),
        (items) => {
          const { granTotal } = calcularValorizacion(items);

          const expectedTotal = items.reduce(
            (sum, item) => sum + item.cantidad * item.costo_prom,
            0
          );
          expect(granTotal).toBeCloseTo(expectedTotal, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty stock produces zero granTotal', () => {
    const { datos, granTotal } = calcularValorizacion([]);
    expect(datos).toHaveLength(0);
    expect(granTotal).toBe(0);
  });

  it('zero quantity produces zero valor_total regardless of costo_prom', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100000, noNaN: true }),
        fc.uuid(),
        fc.uuid(),
        (costo, productoId, obraId) => {
          const items = [{ producto_id: productoId, obra_id: obraId, cantidad: 0, costo_prom: costo }];
          const { datos } = calcularValorizacion(items);
          expect(datos[0].valor_total).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 18: Rotation report ordering', () => {
  it('results are ordered from highest to lowest movement count', () => {
    fc.assert(
      fc.property(
        fc.array(movimientoArb, { minLength: 1, maxLength: 100 }),
        (movimientos) => {
          const resultado = calcularRotacion(movimientos);

          // Verify descending order
          for (let i = 1; i < resultado.length; i++) {
            expect(resultado[i - 1].total_movimientos).toBeGreaterThanOrEqual(
              resultado[i].total_movimientos
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total_movimientos equals actual count of movements per product', () => {
    fc.assert(
      fc.property(
        fc.array(movimientoArb, { minLength: 1, maxLength: 100 }),
        (movimientos) => {
          const resultado = calcularRotacion(movimientos);

          // Manually count movements per product
          const manualCount = {};
          for (const mov of movimientos) {
            manualCount[mov.producto_id] = (manualCount[mov.producto_id] || 0) + 1;
          }

          // Verify counts match
          for (const item of resultado) {
            expect(item.total_movimientos).toBe(manualCount[item.producto_id]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sum of all total_movimientos equals total number of movements', () => {
    fc.assert(
      fc.property(
        fc.array(movimientoArb, { minLength: 1, maxLength: 100 }),
        (movimientos) => {
          const resultado = calcularRotacion(movimientos);
          const sumTotal = resultado.reduce((sum, item) => sum + item.total_movimientos, 0);
          expect(sumTotal).toBe(movimientos.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty movements produces empty result', () => {
    const resultado = calcularRotacion([]);
    expect(resultado).toHaveLength(0);
  });
});
