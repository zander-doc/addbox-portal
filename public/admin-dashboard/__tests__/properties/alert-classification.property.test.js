/**
 * Property 15: Alert status classification
 * For any product with stock quantity Q, critical threshold TC, and alert threshold TA (where TC < TA),
 * the alert status SHALL be "critico" if Q < TC, "alerta" if TC <= Q <= TA, and "normal" if Q > TA.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.7
 * Feature: real-product-inventory, Property 15: Alert status classification
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { clasificarAlerta } from '../../services/stockAlertService.js';

// Arbitrary for valid threshold pairs (TC < TA)
const validThresholds = fc.integer({ min: 1, max: 9998 }).chain(tc =>
  fc.integer({ min: tc + 1, max: 9999 }).map(ta => ({ tc, ta }))
);

describe('Property 15: Alert status classification', () => {
  it('returns "critico" when quantity < umbralCritico', () => {
    fc.assert(
      fc.property(
        validThresholds,
        fc.integer({ min: 0, max: 999999 }),
        ({ tc, ta }, baseQ) => {
          // Ensure Q < TC
          const q = baseQ % tc; // q will be in [0, tc-1]
          const result = clasificarAlerta(q, tc, ta);
          expect(result).toBe('critico');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "alerta" when umbralCritico <= quantity <= umbralAlerta', () => {
    fc.assert(
      fc.property(
        validThresholds,
        fc.nat(),
        ({ tc, ta }, seed) => {
          // Generate Q in range [TC, TA]
          const range = ta - tc + 1;
          const q = tc + (seed % range);
          const result = clasificarAlerta(q, tc, ta);
          expect(result).toBe('alerta');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns "normal" when quantity > umbralAlerta', () => {
    fc.assert(
      fc.property(
        validThresholds,
        fc.integer({ min: 1, max: 990000 }),
        ({ tc, ta }, offset) => {
          const q = ta + offset;
          const result = clasificarAlerta(q, tc, ta);
          expect(result).toBe('normal');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('classification is exhaustive: every quantity maps to exactly one status', () => {
    fc.assert(
      fc.property(
        validThresholds,
        fc.integer({ min: 0, max: 999999 }),
        ({ tc, ta }, q) => {
          const result = clasificarAlerta(q, tc, ta);
          expect(['critico', 'alerta', 'normal']).toContain(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary: quantity exactly at umbralCritico is "alerta"', () => {
    fc.assert(
      fc.property(
        validThresholds,
        ({ tc, ta }) => {
          const result = clasificarAlerta(tc, tc, ta);
          expect(result).toBe('alerta');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary: quantity exactly at umbralAlerta is "alerta"', () => {
    fc.assert(
      fc.property(
        validThresholds,
        ({ tc, ta }) => {
          const result = clasificarAlerta(ta, tc, ta);
          expect(result).toBe('alerta');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary: quantity one above umbralAlerta is "normal"', () => {
    fc.assert(
      fc.property(
        validThresholds,
        ({ tc, ta }) => {
          const result = clasificarAlerta(ta + 1, tc, ta);
          expect(result).toBe('normal');
        }
      ),
      { numRuns: 100 }
    );
  });
});
