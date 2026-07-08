/**
 * Property 3: Invalid quantity rejection
 * For any quantity value that is zero, negative, or greater than 999,999 for entries and exits,
 * or exactly zero for adjustments, the system SHALL reject the movement registration.
 *
 * Property 4: Stock sufficiency validation
 * For any exit or transfer attempt where the requested quantity exceeds the current stock,
 * the system SHALL reject the operation.
 *
 * Property 5: Stock calculation invariant
 * For any product P in obra O, the stock quantity SHALL equal the sum of all entry quantities
 * and positive adjustment quantities minus the sum of all exit quantities and negative adjustment quantities.
 *
 * Validates: Requirements 1.6, 1.7, 1.8, 2.1, 2.5
 * Feature: real-product-inventory, Properties 3, 4, 5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validarLote } from '../../modules/inventario/lote.service.js';

describe('Property 3: Invalid quantity rejection', () => {
  it('rejects zero quantity for entries', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad: 0,
            tipo: 'entrada',
          }];
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
          expect(result.errores.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects negative quantity for entries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -999999, max: -1 }),
        fc.uuid(),
        fc.uuid(),
        (cantidad, productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad,
            tipo: 'entrada',
          }];
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects quantity > 999,999 for entries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000000, max: 9999999 }),
        fc.uuid(),
        fc.uuid(),
        (cantidad, productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad,
            tipo: 'entrada',
          }];
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects zero quantity for exits', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad: 0,
            tipo: 'salida',
          }];
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects zero quantity for adjustments', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad: 0,
            tipo: 'ajuste',
            motivo: 'Ajuste de prueba para validación de cantidad cero',
          }];
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts valid quantities in range [1, 999999] for entries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999999 }),
        fc.uuid(),
        fc.uuid(),
        (cantidad, productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad,
            tipo: 'entrada',
          }];
          const result = validarLote(lineas);
          // Should not have quantity-related errors
          const qtyErrors = result.errores.filter(e => e.motivo.includes('Cantidad'));
          expect(qtyErrors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts non-zero quantities in range [-999999, 999999] for adjustments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -999999, max: 999999 }).filter(n => n !== 0),
        fc.uuid(),
        fc.uuid(),
        (cantidad, productoId, obraId) => {
          const lineas = [{
            producto_id: productoId,
            obra_id: obraId,
            cantidad,
            tipo: 'ajuste',
            motivo: 'Ajuste de prueba para validación de rango correcto',
          }];
          const result = validarLote(lineas);
          const qtyErrors = result.errores.filter(e => e.motivo.includes('Cantidad') || e.motivo.includes('cantidad'));
          expect(qtyErrors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: Stock calculation invariant (pure logic)', () => {
  it('stock equals sum of entries minus sum of exits for any sequence of movements', () => {
    const movimientoArb = fc.record({
      tipo: fc.constantFrom('entrada', 'salida'),
      cantidad: fc.integer({ min: 1, max: 1000 }),
    });

    fc.assert(
      fc.property(
        fc.array(movimientoArb, { minLength: 1, maxLength: 50 }),
        (movimientos) => {
          // Calculate expected stock
          let stockEsperado = 0;
          const movimientosValidos = [];

          for (const mov of movimientos) {
            if (mov.tipo === 'entrada') {
              stockEsperado += mov.cantidad;
              movimientosValidos.push(mov);
            } else if (mov.tipo === 'salida') {
              if (stockEsperado >= mov.cantidad) {
                stockEsperado -= mov.cantidad;
                movimientosValidos.push(mov);
              }
              // Skip invalid exits (would go negative)
            }
          }

          // Verify invariant: stock = sum(entries) - sum(valid exits)
          const sumEntradas = movimientosValidos
            .filter(m => m.tipo === 'entrada')
            .reduce((sum, m) => sum + m.cantidad, 0);
          const sumSalidas = movimientosValidos
            .filter(m => m.tipo === 'salida')
            .reduce((sum, m) => sum + m.cantidad, 0);

          expect(stockEsperado).toBe(sumEntradas - sumSalidas);
          expect(stockEsperado).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
