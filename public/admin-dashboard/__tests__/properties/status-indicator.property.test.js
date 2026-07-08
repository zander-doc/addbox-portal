/**
 * Property-Based Test: Status indicator determination
 * Feature: devoluciones-materiales-fuera, Property 9
 *
 * For any table row representing a MaterialFuera:
 * - IF pendiente == 0 THEN indicator SHALL be green (🟢)
 * - IF pendiente > 0 AND dias_fuera <= umbral THEN indicator SHALL be yellow (🟡)
 * - IF pendiente > 0 AND dias_fuera > umbral THEN indicator SHALL be red (🔴)
 *
 * Validates: Requirements 6.2, 6.3, 6.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { determinarIndicador } from '../../modules/devoluciones/devoluciones.controller.js';

describe('Feature: devoluciones-materiales-fuera, Property 9: Status indicator determination', () => {
  it('returns correct indicator for all combinations of pendiente, dias_fuera, and umbral', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),  // pendiente
        fc.integer({ min: 0, max: 365 }),   // dias_fuera
        fc.integer({ min: 1, max: 30 }),    // umbral
        (pendiente, dias_fuera, umbral) => {
          const material = { pendiente, dias_fuera };
          const resultado = determinarIndicador(material, umbral);

          if (pendiente <= 0) {
            expect(resultado).toBe("🟢");
          } else if (dias_fuera > umbral) {
            expect(resultado).toBe("🔴");
          } else {
            expect(resultado).toBe("🟡");
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('pendiente == 0 always produces 🟢 regardless of dias_fuera', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        (dias_fuera) => {
          const material = { pendiente: 0, dias_fuera };
          expect(determinarIndicador(material)).toBe("🟢");
        }
      ),
      { numRuns: 100 }
    );
  });

  it('pendiente > 0 AND dias_fuera <= umbral always produces 🟡', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 30 }),
        (pendiente, umbral) => {
          const dias_fuera = fc.sample(fc.integer({ min: 0, max: umbral }), 1)[0];
          const material = { pendiente, dias_fuera };
          expect(determinarIndicador(material, umbral)).toBe("🟡");
        }
      ),
      { numRuns: 200 }
    );
  });

  it('pendiente > 0 AND dias_fuera > umbral always produces 🔴', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 30 }),
        (pendiente, umbral) => {
          const dias_fuera = umbral + 1 + fc.sample(fc.nat(100), 1)[0];
          const material = { pendiente, dias_fuera };
          expect(determinarIndicador(material, umbral)).toBe("🔴");
        }
      ),
      { numRuns: 200 }
    );
  });
});
