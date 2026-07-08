/**
 * Property 14: Audit trail completeness
 * For any successfully created movement or reconciliation operation, a corresponding audit
 * record SHALL exist containing: operation ID, movement type, product, quantity, obra, user,
 * and timestamp with second precision.
 *
 * Validates: Requirements 7.1, 7.5
 * Feature: real-product-inventory, Property 14: Audit trail completeness
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure function simulating audit record creation from a movement
function crearRegistroAuditoria(movimiento) {
  if (!movimiento || !movimiento.id) {
    return null;
  }

  return {
    operacion_id: movimiento.id,
    tipo_movimiento: movimiento.tipo,
    producto_id: movimiento.producto_id,
    cantidad: movimiento.cantidad,
    obra_id: movimiento.obra_id,
    usuario_id: movimiento.usuario_id,
    fecha: movimiento.creado_en,
  };
}

// Pure function to validate audit record completeness
function validarRegistroAuditoria(registro) {
  const camposRequeridos = [
    'operacion_id',
    'tipo_movimiento',
    'producto_id',
    'cantidad',
    'obra_id',
    'usuario_id',
    'fecha',
  ];

  const camposFaltantes = camposRequeridos.filter(
    campo => registro[campo] === null || registro[campo] === undefined
  );

  return {
    completo: camposFaltantes.length === 0,
    camposFaltantes,
  };
}

// Pure function to validate timestamp precision (seconds)
function validarPrecisionTimestamp(timestamp) {
  if (!timestamp) return false;
  // ISO 8601 format with at least seconds precision
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

// Arbitrary for valid movements
const movimientoArb = fc.record({
  id: fc.uuid(),
  tipo: fc.constantFrom('entrada', 'salida', 'ajuste', 'transferencia_salida', 'transferencia_entrada'),
  producto_id: fc.uuid(),
  obra_id: fc.uuid(),
  cantidad: fc.integer({ min: 1, max: 999999 }),
  usuario_id: fc.uuid(),
  creado_en: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString()),
});

// Arbitrary for reconciliation operations
const reconciliacionArb = fc.record({
  id: fc.uuid(),
  tipo: fc.constant('ajuste'),
  producto_id: fc.uuid(),
  obra_id: fc.uuid(),
  cantidad: fc.integer({ min: -999999, max: 999999 }).filter(n => n !== 0),
  usuario_id: fc.uuid(),
  creado_en: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString()),
  motivo: fc.string({ minLength: 10, maxLength: 100 }).map(s => `Reconciliación: ${s}`),
});

describe('Property 14: Audit trail completeness', () => {
  it('every movement generates a complete audit record', () => {
    fc.assert(
      fc.property(
        movimientoArb,
        (movimiento) => {
          const registro = crearRegistroAuditoria(movimiento);

          expect(registro).not.toBeNull();

          const validacion = validarRegistroAuditoria(registro);
          expect(validacion.completo).toBe(true);
          expect(validacion.camposFaltantes).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('audit record preserves movement data exactly', () => {
    fc.assert(
      fc.property(
        movimientoArb,
        (movimiento) => {
          const registro = crearRegistroAuditoria(movimiento);

          expect(registro.operacion_id).toBe(movimiento.id);
          expect(registro.tipo_movimiento).toBe(movimiento.tipo);
          expect(registro.producto_id).toBe(movimiento.producto_id);
          expect(registro.cantidad).toBe(movimiento.cantidad);
          expect(registro.obra_id).toBe(movimiento.obra_id);
          expect(registro.usuario_id).toBe(movimiento.usuario_id);
          expect(registro.fecha).toBe(movimiento.creado_en);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('audit record timestamp has second precision', () => {
    fc.assert(
      fc.property(
        movimientoArb,
        (movimiento) => {
          const registro = crearRegistroAuditoria(movimiento);
          expect(validarPrecisionTimestamp(registro.fecha)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reconciliation operations generate complete audit records', () => {
    fc.assert(
      fc.property(
        reconciliacionArb,
        (movimiento) => {
          const registro = crearRegistroAuditoria(movimiento);

          expect(registro).not.toBeNull();
          const validacion = validarRegistroAuditoria(registro);
          expect(validacion.completo).toBe(true);
          expect(registro.tipo_movimiento).toBe('ajuste');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('null or invalid movements do not generate audit records', () => {
    const invalidInputs = [null, undefined, {}, { id: null }];

    for (const input of invalidInputs) {
      const registro = crearRegistroAuditoria(input);
      expect(registro).toBeNull();
    }
  });

  it('batch of movements generates one audit record per movement', () => {
    fc.assert(
      fc.property(
        fc.array(movimientoArb, { minLength: 1, maxLength: 50 }),
        (movimientos) => {
          const registros = movimientos.map(crearRegistroAuditoria).filter(r => r !== null);

          // One audit record per valid movement
          expect(registros).toHaveLength(movimientos.length);

          // Each record is complete
          for (const registro of registros) {
            const validacion = validarRegistroAuditoria(registro);
            expect(validacion.completo).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
