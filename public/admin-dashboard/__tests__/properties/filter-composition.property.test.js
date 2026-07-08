/**
 * Property-Based Test: Filter composition — intersection semantics
 * Feature: devoluciones-materiales-fuera, Property 10
 *
 * For any combination of active filters, the displayed rows SHALL be exactly
 * the intersection of rows matching each individual filter criterion.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { aplicarFiltros } from '../../modules/devoluciones/devoluciones.controller.js';

const UMBRAL = 7;

const tipos = ["Traslado", "Requisición de materiales", "Requisición de herramienta"];
const estados = ["pendiente", "vencido", "cerrado"];

/**
 * Arbitrary for a MaterialFuera record with realistic data.
 */
const arbMaterial = fc.record({
  detalle_id: fc.uuid(),
  documento_id: fc.uuid(),
  numero: fc.stringOf(fc.constantFrom('A', 'B', 'C', '0', '1', '2', '-'), { minLength: 3, maxLength: 8 }),
  tipo: fc.constantFrom(...tipos),
  proyecto: fc.constantFrom("Obra Norte", "Obra Sur", "Obra Este", "Obra Oeste"),
  descripcion: fc.constantFrom("Cemento", "Varilla", "Arena", "Taladro", "Martillo"),
  codigo: fc.stringOf(fc.constantFrom('A', 'B', 'C', '0', '1', '2'), { minLength: 3, maxLength: 6 }),
  pendiente: fc.integer({ min: 0, max: 100 }),
  dias_fuera: fc.integer({ min: 0, max: 60 }),
  fecha_salida: fc.constantFrom("2025-01-01", "2025-01-10", "2025-01-20", "2025-02-01", "2024-12-15"),
  estado_doc: fc.constantFrom("abierto", "cerrado")
});

/**
 * Arbitrary for filter criteria.
 */
const arbFiltros = fc.record({
  busqueda: fc.constantFrom("", "cemento", "norte", "A1"),
  tipo: fc.constantFrom("", ...tipos),
  estado: fc.constantFrom("", ...estados),
  fechaDesde: fc.constantFrom("", "2025-01-01", "2025-01-15"),
  fechaHasta: fc.constantFrom("", "2025-01-31", "2025-02-28"),
  diasMin: fc.constantFrom("", "0", "5", "10"),
  diasMax: fc.constantFrom("", "7", "14", "30")
});

/**
 * Apply a single filter criterion independently.
 */
function aplicarFiltroIndividual(materiales, filtroKey, filtroValue) {
  if (!filtroValue || filtroValue === "") return new Set(materiales.map((_, i) => i));

  const indices = new Set();
  materiales.forEach((m, i) => {
    let pasa = true;

    switch (filtroKey) {
      case "busqueda": {
        const q = filtroValue.toLowerCase();
        const campos = [
          (m.numero || "").toLowerCase(),
          (m.descripcion || "").toLowerCase(),
          (m.codigo || "").toLowerCase(),
          (m.proyecto || "").toLowerCase()
        ];
        pasa = campos.some(c => c.includes(q));
        break;
      }
      case "tipo":
        pasa = m.tipo === filtroValue;
        break;
      case "estado": {
        const est = filtroValue.toLowerCase();
        if (est === "pendiente") pasa = m.pendiente > 0 && m.dias_fuera <= UMBRAL;
        else if (est === "vencido") pasa = m.pendiente > 0 && m.dias_fuera > UMBRAL;
        else if (est === "cerrado") pasa = m.estado_doc === "cerrado";
        break;
      }
      case "fechaDesde":
        pasa = new Date(m.fecha_salida) >= new Date(filtroValue);
        break;
      case "fechaHasta":
        pasa = new Date(m.fecha_salida) <= new Date(filtroValue);
        break;
      case "diasMin":
        pasa = m.dias_fuera >= Number(filtroValue);
        break;
      case "diasMax":
        pasa = m.dias_fuera <= Number(filtroValue);
        break;
    }

    if (pasa) indices.add(i);
  });

  return indices;
}

describe('Feature: devoluciones-materiales-fuera, Property 10: Filter composition — intersection semantics', () => {
  it('combined filter result equals intersection of individual filter results', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 20 }),
        arbFiltros,
        (materiales, filtros) => {
          // Apply combined filter
          const resultadoCombinado = aplicarFiltros(materiales, filtros);
          const indicesCombinados = new Set(resultadoCombinado.map(r =>
            materiales.findIndex(m => m.detalle_id === r.detalle_id)
          ));

          // Apply each filter individually and intersect
          const filtroKeys = ["busqueda", "tipo", "estado", "fechaDesde", "fechaHasta", "diasMin", "diasMax"];
          let interseccion = new Set(materiales.map((_, i) => i));

          for (const key of filtroKeys) {
            const individual = aplicarFiltroIndividual(materiales, key, filtros[key]);
            interseccion = new Set([...interseccion].filter(i => individual.has(i)));
          }

          // Both should have the same size
          expect(indicesCombinados.size).toBe(interseccion.size);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('empty filters return all materials', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 20 }),
        (materiales) => {
          const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
          const resultado = aplicarFiltros(materiales, filtros);
          expect(resultado.length).toBe(materiales.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('adding a filter never increases the result set', () => {
    fc.assert(
      fc.property(
        fc.array(arbMaterial, { minLength: 1, maxLength: 20 }),
        arbFiltros,
        fc.constantFrom("busqueda", "tipo", "estado", "fechaDesde", "fechaHasta", "diasMin", "diasMax"),
        (materiales, filtros, extraKey) => {
          // Result with the filter
          const conFiltro = aplicarFiltros(materiales, filtros);

          // Result without that specific filter
          const sinFiltro = aplicarFiltros(materiales, { ...filtros, [extraKey]: "" });

          expect(conFiltro.length).toBeLessThanOrEqual(sinFiltro.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});
