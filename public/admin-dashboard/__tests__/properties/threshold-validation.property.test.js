/**
 * Property 16: Threshold validation
 * For any pair of threshold values (umbral_critico, umbral_alerta), the system SHALL accept
 * the configuration only if umbral_critico is an integer between 1 and 9999, umbral_alerta
 * is an integer between 2 and 9999, and umbral_critico is strictly less than umbral_alerta.
 *
 * Validates: Requirements 8.4
 * Feature: real-product-inventory, Property 16: Threshold validation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validarUmbrales } from '../../services/stockAlertService.js';

describe('Property 16: Threshold validation', () => {
  it('accepts valid threshold pairs (tc in [1,9999], ta in [2,9999], tc < ta)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9998 }),
        fc.integer({ min: 2, max: 9999 }),
        (tc, ta) => {
          fc.pre(tc < ta); // Only test when tc < ta
          const result = validarUmbrales(tc, ta);
          expect(result.valido).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when umbralCritico < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        fc.integer({ min: 2, max: 9999 }),
        (tc, ta) => {
          const result = validarUmbrales(tc, ta);
          expect(result.valido).toBe(false);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when umbralCritico > 9999', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 100000 }),
        fc.integer({ min: 10001, max: 100001 }),
        (tc, ta) => {
          const result = validarUmbrales(tc, ta);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when umbralAlerta < 2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: -1000, max: 1 }),
        (tc, ta) => {
          const result = validarUmbrales(tc, ta);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when umbralCritico >= umbralAlerta', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        (tc) => {
          // tc == ta
          const result1 = validarUmbrales(tc, tc);
          expect(result1.valido).toBe(false);

          // tc > ta (when possible)
          if (tc > 2) {
            const result2 = validarUmbrales(tc, tc - 1);
            expect(result2.valido).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer values for umbralCritico', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.1, max: 9998.9, noNaN: true }),
        fc.integer({ min: 2, max: 9999 }),
        (tc, ta) => {
          fc.pre(!Number.isInteger(tc));
          const result = validarUmbrales(tc, ta);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects non-integer values for umbralAlerta', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9998 }),
        fc.double({ min: 2.1, max: 9998.9, noNaN: true }),
        (tc, ta) => {
          fc.pre(!Number.isInteger(ta));
          const result = validarUmbrales(tc, ta);
          expect(result.valido).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
