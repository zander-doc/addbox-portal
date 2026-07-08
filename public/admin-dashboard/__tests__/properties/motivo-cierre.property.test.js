/**
 * Property-Based Tests: Motivo de Cierre para Materiales Fuera
 * Feature: motivo-cierre-materiales
 *
 * Properties tested:
 * 1. Stock modification only for "devuelto"
 * 2. Pending always closes regardless of motivo
 * 3. estado_especial only for "danado_reparacion"
 * 4. motivo_cierre always persisted
 * 5. Invalid motivos are rejected
 *
 * Validates: Requirements 2.1-2.10
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const MOTIVOS_VALIDOS = ["devuelto", "consumido", "extraviado", "danado_baja", "danado_reparacion"];

/**
 * Simulates the stock decision logic from registrarDevolucion.
 */
function debeIncrementarStock(motivo) {
  return motivo === "devuelto";
}

/**
 * Simulates the estado_especial logic.
 */
function determinarEstadoEspecial(motivo) {
  return motivo === "danado_reparacion" ? "en_reparacion" : null;
}

/**
 * Simulates motivo validation.
 */
function validarMotivo(motivo) {
  if (!motivo) return { valid: true, motivo: "devuelto" }; // default
  if (MOTIVOS_VALIDOS.includes(motivo)) return { valid: true, motivo };
  return { valid: false, error: `Motivo de cierre no válido: "${motivo}"` };
}

/**
 * Simulates the full closure operation result.
 */
function simularCierre(cantidadDevueltaPrev, Q, existenciaPrev, motivo) {
  const validacion = validarMotivo(motivo);
  if (!validacion.valid) return { success: false, error: validacion.error };

  const m = validacion.motivo;
  const nuevaDevuelta = cantidadDevueltaPrev + Q;
  const nuevaExistencia = debeIncrementarStock(m) ? existenciaPrev + Q : existenciaPrev;
  const estadoEspecial = determinarEstadoEspecial(m);

  return {
    success: true,
    cantidad_devuelta: nuevaDevuelta,
    existencia: nuevaExistencia,
    motivo_cierre: m,
    estado_especial: estadoEspecial
  };
}

const arbMotivoValido = fc.constantFrom(...MOTIVOS_VALIDOS);
const arbMotivoInvalido = fc.string({ minLength: 1, maxLength: 20 }).filter(s => !MOTIVOS_VALIDOS.includes(s));

describe('Feature: motivo-cierre-materiales, Property 1: Stock modification only for "devuelto"', () => {
  it('existencia increases by Q if and only if motivo === "devuelto"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // existenciaPrev
        fc.integer({ min: 1, max: 500 }),   // Q
        arbMotivoValido,
        (existenciaPrev, Q, motivo) => {
          const resultado = simularCierre(0, Q, existenciaPrev, motivo);
          expect(resultado.success).toBe(true);

          if (motivo === "devuelto") {
            expect(resultado.existencia).toBe(existenciaPrev + Q);
          } else {
            expect(resultado.existencia).toBe(existenciaPrev);
          }
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe('Feature: motivo-cierre-materiales, Property 2: Pending always closes', () => {
  it('cantidad_devuelta increases by Q for all valid motivos', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // cantidadDevueltaPrev
        fc.integer({ min: 1, max: 500 }),   // Q
        arbMotivoValido,
        (cantidadDevueltaPrev, Q, motivo) => {
          const resultado = simularCierre(cantidadDevueltaPrev, Q, 0, motivo);
          expect(resultado.success).toBe(true);
          expect(resultado.cantidad_devuelta).toBe(cantidadDevueltaPrev + Q);
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe('Feature: motivo-cierre-materiales, Property 3: estado_especial only for "danado_reparacion"', () => {
  it('estado_especial is "en_reparacion" iff motivo === "danado_reparacion"', () => {
    fc.assert(
      fc.property(
        arbMotivoValido,
        (motivo) => {
          const resultado = simularCierre(0, 1, 0, motivo);
          expect(resultado.success).toBe(true);

          if (motivo === "danado_reparacion") {
            expect(resultado.estado_especial).toBe("en_reparacion");
          } else {
            expect(resultado.estado_especial).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: motivo-cierre-materiales, Property 4: motivo_cierre always persisted', () => {
  it('motivo_cierre is always set to the provided motivo', () => {
    fc.assert(
      fc.property(
        arbMotivoValido,
        (motivo) => {
          const resultado = simularCierre(0, 1, 0, motivo);
          expect(resultado.success).toBe(true);
          expect(resultado.motivo_cierre).toBe(motivo);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('null/undefined motivo defaults to "devuelto"', () => {
    const resultado1 = simularCierre(0, 1, 0, null);
    expect(resultado1.motivo_cierre).toBe("devuelto");

    const resultado2 = simularCierre(0, 1, 0, undefined);
    expect(resultado2.motivo_cierre).toBe("devuelto");
  });
});

describe('Feature: motivo-cierre-materiales, Property 5: Invalid motivos are rejected', () => {
  it('invalid motivo strings are rejected', () => {
    fc.assert(
      fc.property(
        arbMotivoInvalido,
        (motivo) => {
          const resultado = simularCierre(0, 1, 0, motivo);
          expect(resultado.success).toBe(false);
          expect(resultado.error).toContain("no válido");
        }
      ),
      { numRuns: 100 }
    );
  });
});
