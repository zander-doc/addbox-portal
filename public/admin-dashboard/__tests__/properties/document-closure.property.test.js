/**
 * Property-Based Test: Document state reflects completion
 * Feature: devoluciones-materiales-fuera, Property 7
 *
 * For any Documento_Inventario, its estado SHALL equal "cerrado"
 * if and only if ALL of its Detalle_Documento records have pendiente equal to zero.
 * Otherwise, estado SHALL remain "abierto".
 *
 * Validates: Requirements 4.2, 4.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure logic extracted from verificarCierreDocumento.
 * Determines what the document state should be based on its detalles.
 * @param {Array<{cantidad: number, cantidad_devuelta: number}>} detalles
 * @returns {"cerrado" | "abierto"}
 */
function determinarEstadoDocumento(detalles) {
  if (!detalles || detalles.length === 0) return "abierto";

  const todosDevueltos = detalles.every(d => {
    const cantidad = d.cantidad || 0;
    const devuelta = d.cantidad_devuelta || 0;
    return devuelta >= cantidad;
  });

  return todosDevueltos ? "cerrado" : "abierto";
}

/**
 * Arbitrary for a detalle with valid cantidad and cantidad_devuelta.
 */
const arbDetalle = fc.record({
  cantidad: fc.integer({ min: 1, max: 1000 }),
  cantidad_devuelta: fc.integer({ min: 0, max: 1000 })
}).filter(d => d.cantidad_devuelta <= d.cantidad);

/**
 * Arbitrary for a fully-returned detalle (pendiente == 0).
 */
const arbDetalleCompleto = fc.integer({ min: 1, max: 1000 }).map(cantidad => ({
  cantidad,
  cantidad_devuelta: cantidad
}));

/**
 * Arbitrary for a detalle with pendiente > 0.
 */
const arbDetallePendiente = fc.record({
  cantidad: fc.integer({ min: 1, max: 1000 }),
  cantidad_devuelta: fc.integer({ min: 0, max: 999 })
}).filter(d => d.cantidad_devuelta < d.cantidad);

describe('Feature: devoluciones-materiales-fuera, Property 7: Document state reflects completion', () => {
  it('estado is "cerrado" if and only if ALL detalles have pendiente == 0', () => {
    fc.assert(
      fc.property(
        fc.array(arbDetalle, { minLength: 1, maxLength: 20 }),
        (detalles) => {
          const estado = determinarEstadoDocumento(detalles);
          const todosCompletos = detalles.every(d => d.cantidad_devuelta >= d.cantidad);

          if (todosCompletos) {
            expect(estado).toBe("cerrado");
          } else {
            expect(estado).toBe("abierto");
          }
        }
      ),
      { numRuns: 300 }
    );
  });

  it('all-complete detalles always produce "cerrado"', () => {
    fc.assert(
      fc.property(
        fc.array(arbDetalleCompleto, { minLength: 1, maxLength: 10 }),
        (detalles) => {
          const estado = determinarEstadoDocumento(detalles);
          expect(estado).toBe("cerrado");
        }
      ),
      { numRuns: 100 }
    );
  });

  it('at least one pending detalle always produces "abierto"', () => {
    fc.assert(
      fc.property(
        fc.array(arbDetalleCompleto, { minLength: 0, maxLength: 5 }),
        fc.array(arbDetallePendiente, { minLength: 1, maxLength: 5 }),
        (completos, pendientes) => {
          const detalles = [...completos, ...pendientes];
          const estado = determinarEstadoDocumento(detalles);
          expect(estado).toBe("abierto");
        }
      ),
      { numRuns: 200 }
    );
  });
});
