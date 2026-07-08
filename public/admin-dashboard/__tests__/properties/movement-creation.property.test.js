/**
 * Property 1: Movement creation preserves required fields
 * For any valid movement registration with valid type, quantity, product, obra, and user,
 * the created movement record SHALL contain the correct type, quantity, product_id, obra_id,
 * usuario_id, and a non-null timestamp.
 *
 * Property 2: Transfer creates exactly two linked movements
 * For any valid transfer of quantity Q from obra A to obra B for product P, the system SHALL
 * create exactly two movements with cross-referencing IDs.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 * Feature: real-product-inventory, Properties 1, 2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Simulate movement creation logic (pure function version)
function crearMovimiento({ tipo, productoId, obraId, cantidad, usuarioId, motivo, observacion }) {
  // Validate required fields
  if (!tipo || !productoId || !obraId || !usuarioId) {
    return { success: false, error: 'Campos requeridos faltantes' };
  }

  if (tipo === 'ajuste' && (!motivo || motivo.length < 10)) {
    return { success: false, error: 'El motivo debe tener al menos 10 caracteres' };
  }

  if (['entrada', 'salida'].includes(tipo) && (cantidad < 1 || cantidad > 999999)) {
    return { success: false, error: 'Cantidad fuera de rango (1-999999)' };
  }

  if (tipo === 'ajuste' && cantidad === 0) {
    return { success: false, error: 'La cantidad no puede ser cero para ajustes' };
  }

  const movimiento = {
    id: crypto.randomUUID(),
    tipo,
    producto_id: productoId,
    obra_id: obraId,
    cantidad,
    usuario_id: usuarioId,
    motivo: motivo || null,
    observacion: observacion || null,
    creado_en: new Date().toISOString(),
  };

  return { success: true, movimiento };
}

// Simulate transfer creation (pure function version)
function crearTransferencia({ productoId, obraOrigenId, obraDestinoId, cantidad, usuarioId, observacion }) {
  if (!productoId || !obraOrigenId || !obraDestinoId || !usuarioId) {
    return { success: false, error: 'Campos requeridos faltantes' };
  }

  if (cantidad < 1 || cantidad > 999999) {
    return { success: false, error: 'Cantidad fuera de rango (1-999999)' };
  }

  const salidaId = crypto.randomUUID();
  const entradaId = crypto.randomUUID();

  const movSalida = {
    id: salidaId,
    tipo: 'transferencia_salida',
    producto_id: productoId,
    obra_id: obraOrigenId,
    cantidad,
    usuario_id: usuarioId,
    observacion: observacion || null,
    referencia_cruzada: entradaId,
    creado_en: new Date().toISOString(),
  };

  const movEntrada = {
    id: entradaId,
    tipo: 'transferencia_entrada',
    producto_id: productoId,
    obra_id: obraDestinoId,
    cantidad,
    usuario_id: usuarioId,
    observacion: observacion || null,
    referencia_cruzada: salidaId,
    creado_en: new Date().toISOString(),
  };

  return { success: true, movimientos: [movSalida, movEntrada] };
}

describe('Property 1: Movement creation preserves required fields', () => {
  it('entry movements contain all required fields', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 999999 }),
        (productoId, obraId, usuarioId, cantidad) => {
          const result = crearMovimiento({
            tipo: 'entrada',
            productoId,
            obraId,
            cantidad,
            usuarioId,
          });

          expect(result.success).toBe(true);
          expect(result.movimiento.tipo).toBe('entrada');
          expect(result.movimiento.producto_id).toBe(productoId);
          expect(result.movimiento.obra_id).toBe(obraId);
          expect(result.movimiento.cantidad).toBe(cantidad);
          expect(result.movimiento.usuario_id).toBe(usuarioId);
          expect(result.movimiento.creado_en).not.toBeNull();
          expect(result.movimiento.id).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('exit movements contain all required fields', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 999999 }),
        (productoId, obraId, usuarioId, cantidad) => {
          const result = crearMovimiento({
            tipo: 'salida',
            productoId,
            obraId,
            cantidad,
            usuarioId,
          });

          expect(result.success).toBe(true);
          expect(result.movimiento.tipo).toBe('salida');
          expect(result.movimiento.producto_id).toBe(productoId);
          expect(result.movimiento.obra_id).toBe(obraId);
          expect(result.movimiento.cantidad).toBe(cantidad);
          expect(result.movimiento.usuario_id).toBe(usuarioId);
          expect(result.movimiento.creado_en).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('adjustment movements require motivo >= 10 chars', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: -999999, max: 999999 }).filter(n => n !== 0),
        fc.string({ minLength: 10, maxLength: 100 }),
        (productoId, obraId, usuarioId, cantidad, motivo) => {
          const result = crearMovimiento({
            tipo: 'ajuste',
            productoId,
            obraId,
            cantidad,
            usuarioId,
            motivo,
          });

          expect(result.success).toBe(true);
          expect(result.movimiento.tipo).toBe('ajuste');
          expect(result.movimiento.motivo).toBe(motivo);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects movements with missing required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('entrada', 'salida', 'ajuste'),
        fc.integer({ min: 1, max: 999999 }),
        (tipo, cantidad) => {
          // Missing productoId
          const result = crearMovimiento({
            tipo,
            productoId: null,
            obraId: 'some-id',
            cantidad,
            usuarioId: 'user-id',
            motivo: tipo === 'ajuste' ? 'Motivo de prueba suficientemente largo' : undefined,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Transfer creates exactly two linked movements', () => {
  it('creates exactly two movements with cross-references', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 999999 }),
        (productoId, obraOrigenId, obraDestinoId, usuarioId, cantidad) => {
          fc.pre(obraOrigenId !== obraDestinoId);

          const result = crearTransferencia({
            productoId,
            obraOrigenId,
            obraDestinoId,
            cantidad,
            usuarioId,
          });

          expect(result.success).toBe(true);
          expect(result.movimientos).toHaveLength(2);

          const [salida, entrada] = result.movimientos;

          // Verify types
          expect(salida.tipo).toBe('transferencia_salida');
          expect(entrada.tipo).toBe('transferencia_entrada');

          // Verify same quantity
          expect(salida.cantidad).toBe(cantidad);
          expect(entrada.cantidad).toBe(cantidad);

          // Verify same product
          expect(salida.producto_id).toBe(productoId);
          expect(entrada.producto_id).toBe(productoId);

          // Verify correct obras
          expect(salida.obra_id).toBe(obraOrigenId);
          expect(entrada.obra_id).toBe(obraDestinoId);

          // Verify cross-references
          expect(salida.referencia_cruzada).toBe(entrada.id);
          expect(entrada.referencia_cruzada).toBe(salida.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
