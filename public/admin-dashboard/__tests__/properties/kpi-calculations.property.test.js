/**
 * Property-Based Test: KPI calculations correctness
 * Feature: devoluciones-materiales-fuera, Property 8
 *
 * For any set of MaterialFuera records:
 * - "Vencidos" SHALL equal the count of records where pendiente > 0 AND dias_fuera > umbral
 * - "Días promedio fuera" SHALL equal the arithmetic mean of dias_fuera
 * - "Devoluciones hoy" SHALL equal the count of records where fecha_devolucion equals today
 *
 * Validates: Requirements 5.2, 5.3, 5.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcularKPIs } from '../../modules/devoluciones/devoluciones.controller.js';

const UMBRAL = 7;

/**
 * Arbitrary for a MaterialFuera record.
 */
const arbMaterial = fc.record({
  pendiente: fc.integer({ min: 0, max: 500 }),
  dias_fuera: fc.integer({ min: 0, max: 365 }),
  fecha_devolucion: fc.oneof(
    fc.constant(new Date().toISOString().split("T")[0]), // today
    fc.constant("2020-01-01"),                           // not today
    fc.constant(null)                                    // no date
  )
});

describe('Feature: devoluciones-materiales-fuera, Property 8: KPI calculations correctness', () => {
  it('vencidos equals count where pendiente > 0 AND dias_fuera > umbral', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 50 }),
        (materiales) => {
          const result = calcularKPIs(materiales);
          const expected = materiales.filter(m => m.pendiente > 0 && m.dias_fuera > UMBRAL).length;
          expect(result.vencidos).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('diasPromedio equals rounded arithmetic mean of dias_fuera', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 50 }),
        (materiales) => {
          const result = calcularKPIs(materiales);
          const sumaDias = materiales.reduce((sum, m) => sum + (m.dias_fuera || 0), 0);
          const expected = Math.round(sumaDias / materiales.length);
          expect(result.diasPromedio).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('devolucionesHoy equals count where fecha_devolucion equals today (when no opciones)', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 50 }),
        (materiales) => {
          const result = calcularKPIs(materiales);
          const hoy = new Date().toISOString().split("T")[0];
          const expected = materiales.filter(m => m.fecha_devolucion === hoy).length;
          expect(result.devolucionesHoy).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('materialesFuera equals count where pendiente > 0', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 50 }),
        (materiales) => {
          const result = calcularKPIs(materiales);
          const expected = materiales.filter(m => m.pendiente > 0).length;
          expect(result.materialesFuera).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });
});
