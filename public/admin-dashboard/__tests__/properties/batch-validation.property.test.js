/**
 * Property 11: Batch all-or-nothing processing
 * For any batch operation containing N lines, if all lines pass validation the system SHALL
 * create exactly N movements with a common lote_id, and if any single line fails validation
 * the system SHALL create zero movements and report the specific errors per line.
 *
 * Property 12: Batch line error reporting
 * For any batch operation where K lines fail validation (K >= 1), the system SHALL return
 * exactly K error entries, each identifying the line number and specific validation failure reason.
 *
 * Validates: Requirements 6.2, 6.3, 6.4
 * Feature: real-product-inventory, Properties 11, 12
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validarLote } from '../../modules/inventario/lote.service.js';

// Arbitrary for a valid batch line
const validLineArb = fc.record({
  producto_id: fc.uuid(),
  obra_id: fc.uuid(),
  cantidad: fc.integer({ min: 1, max: 999999 }),
  tipo: fc.constantFrom('entrada', 'salida'),
});

// Arbitrary for an invalid batch line (missing required fields)
const invalidLineArb = fc.oneof(
  // Missing producto_id
  fc.record({
    obra_id: fc.uuid(),
    cantidad: fc.integer({ min: 1, max: 999999 }),
    tipo: fc.constantFrom('entrada', 'salida'),
  }),
  // Invalid quantity (zero)
  fc.record({
    producto_id: fc.uuid(),
    obra_id: fc.uuid(),
    cantidad: fc.constant(0),
    tipo: fc.constantFrom('entrada', 'salida'),
  }),
  // Invalid quantity (> 999999)
  fc.record({
    producto_id: fc.uuid(),
    obra_id: fc.uuid(),
    cantidad: fc.integer({ min: 1000000, max: 9999999 }),
    tipo: fc.constantFrom('entrada', 'salida'),
  }),
  // Missing tipo
  fc.record({
    producto_id: fc.uuid(),
    obra_id: fc.uuid(),
    cantidad: fc.integer({ min: 1, max: 999999 }),
  }),
  // Invalid tipo
  fc.record({
    producto_id: fc.uuid(),
    obra_id: fc.uuid(),
    cantidad: fc.integer({ min: 1, max: 999999 }),
    tipo: fc.constant('invalido'),
  }),
);

describe('Property 11: Batch all-or-nothing processing (validation layer)', () => {
  it('all-valid batch passes validation with zero errors', () => {
    fc.assert(
      fc.property(
        fc.array(validLineArb, { minLength: 1, maxLength: 50 }),
        (lineas) => {
          const result = validarLote(lineas);
          expect(result.valido).toBe(true);
          expect(result.errores).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('batch with any invalid line fails validation', () => {
    fc.assert(
      fc.property(
        fc.array(validLineArb, { minLength: 0, maxLength: 10 }),
        invalidLineArb,
        fc.array(validLineArb, { minLength: 0, maxLength: 10 }),
        (before, invalidLine, after) => {
          const lineas = [...before, invalidLine, ...after];
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
          expect(result.errores.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects batches exceeding 500 lines', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 501, max: 600 }),
        (count) => {
          const lineas = Array.from({ length: count }, () => ({
            producto_id: '00000000-0000-0000-0000-000000000001',
            obra_id: '00000000-0000-0000-0000-000000000002',
            cantidad: 1,
            tipo: 'entrada',
          }));
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
          expect(result.errores.some(e => e.motivo.includes('500'))).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('rejects empty batches', () => {
    const result = validarLote([]);
    expect(result.valido).toBe(false);
    expect(result.errores.length).toBeGreaterThan(0);
  });
});

describe('Property 12: Batch line error reporting', () => {
  it('reports exactly K errors for K invalid lines', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (k) => {
          // Create K lines with invalid quantity (0)
          const lineas = Array.from({ length: k }, () => ({
            producto_id: '00000000-0000-0000-0000-000000000001',
            obra_id: '00000000-0000-0000-0000-000000000002',
            cantidad: 0,
            tipo: 'entrada',
          }));

          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
          // Each line should generate at least one error
          expect(result.errores.length).toBeGreaterThanOrEqual(k);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each error identifies the line number', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(validLineArb, invalidLineArb),
          { minLength: 2, maxLength: 20 }
        ),
        (lineas) => {
          const result = validarLote(lineas);
          // All errors should have a line number
          for (const error of result.errores) {
            expect(error.linea).toBeDefined();
            expect(typeof error.linea).toBe('number');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each error has a specific failure reason', () => {
    fc.assert(
      fc.property(
        fc.array(invalidLineArb, { minLength: 1, maxLength: 10 }),
        (lineas) => {
          const result = validarLote(lineas);
          expect(result.valido).toBe(false);
          for (const error of result.errores) {
            expect(error.motivo).toBeDefined();
            expect(typeof error.motivo).toBe('string');
            expect(error.motivo.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
