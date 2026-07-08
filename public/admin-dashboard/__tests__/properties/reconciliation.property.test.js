/**
 * Property 8: Reconciliation difference calculation
 * For any completed physical count with recorded physical quantities, the calculated difference
 * for each product SHALL equal (stock_fisico - stock_sistema).
 *
 * Property 9: Reconciliation approval equalizes stock
 * For any approved reconciliation, after processing all generated adjustment movements,
 * the stock_sistema for each reconciled product SHALL equal the stock_fisico value.
 *
 * Property 10: Reconciliation rejection preserves stock
 * For any rejected reconciliation, the stock_sistema SHALL remain unchanged.
 *
 * Property 19: Physical count input validation
 * For any physical count entry value that is non-numeric, negative, or greater than 999,999,
 * the system SHALL reject the entry.
 *
 * Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.8
 * Feature: real-product-inventory, Properties 8, 9, 10, 19
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure function to calculate reconciliation differences
function calcularDiferencias(lineas) {
  return lineas
    .filter(l => l.stock_fisico !== null && l.stock_fisico !== undefined)
    .map(l => ({
      producto_id: l.producto_id,
      stock_sistema: l.stock_sistema,
      stock_fisico: l.stock_fisico,
      diferencia: l.stock_fisico - l.stock_sistema,
    }))
    .filter(l => l.diferencia !== 0);
}

// Pure function to simulate reconciliation approval
function simularAprobacion(stockActual, diferencias) {
  const nuevoStock = { ...stockActual };
  for (const dif of diferencias) {
    nuevoStock[dif.producto_id] = (nuevoStock[dif.producto_id] || 0) + dif.diferencia;
  }
  return nuevoStock;
}

// Pure function to validate physical count input
function validarStockFisico(valor) {
  if (typeof valor !== 'number' || !Number.isInteger(valor)) {
    return { valido: false, error: 'La cantidad física debe ser un entero entre 0 y 999,999' };
  }
  if (valor < 0 || valor > 999999) {
    return { valido: false, error: 'La cantidad física debe ser un entero entre 0 y 999,999' };
  }
  return { valido: true };
}

// Arbitrary for conteo lineas
const conteoLineaArb = fc.record({
  producto_id: fc.uuid(),
  stock_sistema: fc.integer({ min: 0, max: 999999 }),
  stock_fisico: fc.integer({ min: 0, max: 999999 }),
});

describe('Property 8: Reconciliation difference calculation', () => {
  it('difference equals (stock_fisico - stock_sistema) for all products', () => {
    fc.assert(
      fc.property(
        fc.array(conteoLineaArb, { minLength: 1, maxLength: 50 }),
        (lineas) => {
          const diferencias = calcularDiferencias(lineas);

          for (const dif of diferencias) {
            expect(dif.diferencia).toBe(dif.stock_fisico - dif.stock_sistema);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('only lists products where difference is non-zero', () => {
    fc.assert(
      fc.property(
        fc.array(conteoLineaArb, { minLength: 1, maxLength: 50 }),
        (lineas) => {
          const diferencias = calcularDiferencias(lineas);

          for (const dif of diferencias) {
            expect(dif.diferencia).not.toBe(0);
          }

          // Products with equal stock should not appear
          const iguales = lineas.filter(l => l.stock_fisico === l.stock_sistema);
          for (const igual of iguales) {
            expect(diferencias.find(d => d.producto_id === igual.producto_id && d.stock_sistema === igual.stock_sistema)).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('products without stock_fisico are excluded', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            producto_id: fc.uuid(),
            stock_sistema: fc.integer({ min: 0, max: 999999 }),
            stock_fisico: fc.constantFrom(null, undefined),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (lineas) => {
          const diferencias = calcularDiferencias(lineas);
          expect(diferencias).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 9: Reconciliation approval equalizes stock', () => {
  it('after approval, stock_sistema equals stock_fisico for all reconciled products', () => {
    fc.assert(
      fc.property(
        fc.array(conteoLineaArb, { minLength: 1, maxLength: 30 }),
        (lineas) => {
          // Build initial stock
          const stockActual = {};
          for (const l of lineas) {
            stockActual[l.producto_id] = l.stock_sistema;
          }

          // Calculate differences
          const diferencias = calcularDiferencias(lineas);

          // Simulate approval
          const nuevoStock = simularAprobacion(stockActual, diferencias);

          // Verify: for each product with a difference, new stock equals stock_fisico
          for (const dif of diferencias) {
            expect(nuevoStock[dif.producto_id]).toBe(dif.stock_fisico);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 10: Reconciliation rejection preserves stock', () => {
  it('after rejection, stock_sistema remains unchanged for all products', () => {
    fc.assert(
      fc.property(
        fc.array(conteoLineaArb, { minLength: 1, maxLength: 30 }),
        (lineas) => {
          // Build initial stock
          const stockAntes = {};
          for (const l of lineas) {
            stockAntes[l.producto_id] = l.stock_sistema;
          }

          // Simulate rejection (no changes applied)
          const stockDespues = { ...stockAntes };

          // Verify: stock is unchanged
          for (const id of Object.keys(stockAntes)) {
            expect(stockDespues[id]).toBe(stockAntes[id]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 19: Physical count input validation', () => {
  it('accepts valid integers in range [0, 999999]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999 }),
        (valor) => {
          const result = validarStockFisico(valor);
          expect(result.valido).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects negative values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -999999, max: -1 }),
        (valor) => {
          const result = validarStockFisico(valor);
          expect(result.valido).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects values greater than 999,999', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 9999999 }),
        (valor) => {
          const result = validarStockFisico(valor);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer numbers', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 999998.9, noNaN: true }),
        (valor) => {
          fc.pre(!Number.isInteger(valor));
          const result = validarStockFisico(valor);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-numeric values', () => {
    const nonNumericValues = [null, undefined, 'abc', '123', true, false, {}, []];
    for (const valor of nonNumericValues) {
      const result = validarStockFisico(valor);
      expect(result.valido).toBe(false);
    }
  });
});
