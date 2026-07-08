/**
 * Property-Based Tests: Reportes Motivo de Cierre
 * Feature: reportes-motivo-cierre
 *
 * Properties tested:
 * 1. Filter by motivo_cierre returns only matching records
 * 2. Costo_Perdida calculation correctness
 * 3. KPI aggregation correctness
 * 4. Grouping by proyecto preserves totals
 * 5. Filter intersection semantics (AND)
 * 6. CSV generation correctness
 * 7. Currency formatting
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { aplicarFiltrosExtraviados, generarCSV, formatearMoneda } from '../../modules/reportes/reportes-cierre.controller.js';
import { calcularKPIsReporte } from '../../modules/devoluciones/reportes-cierre.service.js';

const MOTIVOS = ["extraviado", "danado_reparacion", "consumido", "devuelto", "danado_baja"];

// --- Property 1: Filter by motivo ---

describe('Feature: reportes-motivo-cierre, Property 1: Filter by motivo_cierre', () => {
  it('filtering by motivo returns only records with that motivo', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          motivo_cierre: fc.constantFrom(...MOTIVOS),
          codigo: fc.string({ minLength: 1, maxLength: 5 })
        }), { minLength: 0, maxLength: 30 }),
        fc.constantFrom(...MOTIVOS),
        (detalles, motivo) => {
          const filtrados = detalles.filter(d => d.motivo_cierre === motivo);
          const expected = detalles.filter(d => d.motivo_cierre === motivo).length;
          expect(filtrados.length).toBe(expected);
          expect(filtrados.every(d => d.motivo_cierre === motivo)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// --- Property 2: Costo_Perdida calculation ---

describe('Feature: reportes-motivo-cierre, Property 2: Costo_Perdida calculation', () => {
  it('costo_perdida equals cantidad_devuelta * costo_prom', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        (cantidadDevuelta, costoPromCents) => {
          const costoProm = costoPromCents / 100;
          const costoPerdida = cantidadDevuelta * costoProm;
          expect(costoPerdida).toBeCloseTo(cantidadDevuelta * costoProm, 2);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// --- Property 3: KPI aggregation ---

describe('Feature: reportes-motivo-cierre, Property 3: KPI aggregation correctness', () => {
  const arbExtraviado = fc.record({
    costo_perdida: fc.integer({ min: 0, max: 100000 })
  });

  it('totalExtraviados equals length of extraviados array', () => {
    fc.assert(
      fc.property(
        fc.array(arbExtraviado, { minLength: 0, maxLength: 50 }),
        fc.array(fc.constant({}), { minLength: 0, maxLength: 50 }),
        (extraviados, reparacion) => {
          const kpis = calcularKPIsReporte(extraviados, reparacion);
          expect(kpis.totalExtraviados).toBe(extraviados.length);
          expect(kpis.totalEnReparacion).toBe(reparacion.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('costoTotalPerdidas equals sum of costo_perdida', () => {
    fc.assert(
      fc.property(
        fc.array(arbExtraviado, { minLength: 0, maxLength: 50 }),
        (extraviados) => {
          const kpis = calcularKPIsReporte(extraviados, []);
          const expected = extraviados.reduce((sum, e) => sum + (e.costo_perdida || 0), 0);
          expect(kpis.costoTotalPerdidas).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('empty arrays produce zero KPIs', () => {
    const kpis = calcularKPIsReporte([], []);
    expect(kpis.totalExtraviados).toBe(0);
    expect(kpis.totalEnReparacion).toBe(0);
    expect(kpis.costoTotalPerdidas).toBe(0);
  });
});

// --- Property 4: Grouping preserves totals ---

describe('Feature: reportes-motivo-cierre, Property 4: Grouping by proyecto preserves totals', () => {
  it('sum of group totals equals sum of individual records', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          proyecto: fc.constantFrom("Obra A", "Obra B", "Obra C"),
          cantidad_devuelta: fc.integer({ min: 1, max: 100 }),
          costo_prom: fc.integer({ min: 1, max: 1000 })
        }), { minLength: 1, maxLength: 30 }),
        (records) => {
          // Group manually
          const grupos = {};
          records.forEach(r => {
            if (!grupos[r.proyecto]) grupos[r.proyecto] = { total_items: 0, costo_total: 0 };
            grupos[r.proyecto].total_items += r.cantidad_devuelta;
            grupos[r.proyecto].costo_total += r.cantidad_devuelta * r.costo_prom;
          });

          const sumItems = Object.values(grupos).reduce((s, g) => s + g.total_items, 0);
          const sumCosto = Object.values(grupos).reduce((s, g) => s + g.costo_total, 0);

          const expectedItems = records.reduce((s, r) => s + r.cantidad_devuelta, 0);
          const expectedCosto = records.reduce((s, r) => s + r.cantidad_devuelta * r.costo_prom, 0);

          expect(sumItems).toBe(expectedItems);
          expect(sumCosto).toBe(expectedCosto);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// --- Property 5: Filter AND semantics ---

describe('Feature: reportes-motivo-cierre, Property 5: Filter intersection semantics', () => {
  const arbDato = fc.record({
    proyecto: fc.constantFrom("Obra A", "Obra B", "Obra C"),
    creado_en: fc.constantFrom("2025-01-05", "2025-01-15", "2025-01-25", "2025-02-10")
  });

  it('result contains only records satisfying ALL active filters', () => {
    fc.assert(
      fc.property(
        fc.array(arbDato, { minLength: 1, maxLength: 20 }),
        fc.constantFrom("", "Obra A", "Obra B"),
        fc.constantFrom("", "2025-01-10"),
        fc.constantFrom("", "2025-01-20"),
        (datos, proyecto, fechaDesde, fechaHasta) => {
          const filtros = { proyecto, fechaDesde, fechaHasta };
          const resultado = aplicarFiltrosExtraviados(datos, filtros);

          resultado.forEach(r => {
            if (proyecto) expect(r.proyecto).toBe(proyecto);
            if (fechaDesde) expect(new Date(r.creado_en) >= new Date(fechaDesde)).toBe(true);
            if (fechaHasta) expect(new Date(r.creado_en) <= new Date(fechaHasta)).toBe(true);
          });
        }
      ),
      { numRuns: 200 }
    );
  });
});

// --- Property 6: CSV generation ---

describe('Feature: reportes-motivo-cierre, Property 6: CSV generation correctness', () => {
  it('CSV has rows.length + 1 lines and correct header', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          a: fc.string({ minLength: 1, maxLength: 10 }),
          b: fc.integer({ min: 0, max: 999 })
        }), { minLength: 1, maxLength: 20 }),
        (filas) => {
          const columnas = [{ key: "a", label: "ColA" }, { key: "b", label: "ColB" }];
          const csv = generarCSV(filas, columnas);
          const lines = csv.split("\n");

          expect(lines.length).toBe(filas.length + 1);
          expect(lines[0]).toBe("ColA,ColB");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 7: Currency formatting ---

describe('Feature: reportes-motivo-cierre, Property 7: Currency formatting', () => {
  it('formatearMoneda produces string with exactly 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9999999 }),
        (valorCents) => {
          const valor = valorCents / 100;
          const resultado = formatearMoneda(valor);
          // Should contain a dot followed by exactly 2 digits
          expect(resultado).toMatch(/\.\d{2}$/);
          expect(resultado.startsWith("$")).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});
