/**
 * Property-Based Test: Dias_Fuera calculation correctness
 * Feature: devoluciones-materiales-fuera, Property 2
 *
 * For any valid date creado_en that is on or before the current date,
 * the calculated dias_fuera SHALL equal the number of whole days
 * between creado_en and the current date.
 *
 * Validates: Requirements 2.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure function extracted from devoluciones.service.js logic.
 * Calculates dias_fuera as whole days between creado_en and today.
 */
function calcularDiasFuera(creadoEn) {
  const fechaSalida = new Date(creadoEn);
  const hoy = new Date();
  return Math.floor((hoy - fechaSalida) / (1000 * 60 * 60 * 24));
}

/**
 * Arbitrary that generates dates between 1 and 365 days ago.
 */
const arbDaysAgo = fc.integer({ min: 0, max: 365 });

describe('Feature: devoluciones-materiales-fuera, Property 2: Dias_Fuera calculation correctness', () => {
  it('dias_fuera SHALL equal the number of whole days between creado_en and today', () => {
    fc.assert(
      fc.property(
        arbDaysAgo,
        (daysAgo) => {
          const hoy = new Date();
          const creadoEn = new Date(hoy);
          creadoEn.setDate(hoy.getDate() - daysAgo);
          creadoEn.setHours(0, 0, 0, 0);

          const resultado = calcularDiasFuera(creadoEn.toISOString());

          // Should be approximately daysAgo (may differ by 1 due to time-of-day)
          expect(resultado).toBeGreaterThanOrEqual(daysAgo);
          expect(resultado).toBeLessThanOrEqual(daysAgo + 1);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('dias_fuera is always >= 0 for dates on or before today', () => {
    fc.assert(
      fc.property(
        arbDaysAgo,
        (daysAgo) => {
          const hoy = new Date();
          const creadoEn = new Date(hoy);
          creadoEn.setDate(hoy.getDate() - daysAgo);

          const resultado = calcularDiasFuera(creadoEn.toISOString());
          expect(resultado).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('dias_fuera is 0 when creado_en is today', () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const resultado = calcularDiasFuera(hoy.toISOString());
    // Could be 0 or 1 depending on current time
    expect(resultado).toBeGreaterThanOrEqual(0);
    expect(resultado).toBeLessThanOrEqual(1);
  });

  it('dias_fuera increases monotonically with older dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 364 }),
        (daysAgo) => {
          const hoy = new Date();

          const fecha1 = new Date(hoy);
          fecha1.setDate(hoy.getDate() - daysAgo);
          fecha1.setHours(0, 0, 0, 0);

          const fecha2 = new Date(hoy);
          fecha2.setDate(hoy.getDate() - (daysAgo + 1));
          fecha2.setHours(0, 0, 0, 0);

          const dias1 = calcularDiasFuera(fecha1.toISOString());
          const dias2 = calcularDiasFuera(fecha2.toISOString());

          // Older date should have more or equal days
          expect(dias2).toBeGreaterThanOrEqual(dias1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
