/**
 * Unit tests for calcularKPIs function.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect } from 'vitest';
import { calcularKPIs } from '../../modules/devoluciones/devoluciones.controller.js';

describe('calcularKPIs', () => {
  describe('when no materials exist', () => {
    it('returns zero for all KPIs with empty array', () => {
      const result = calcularKPIs([]);
      expect(result).toEqual({
        materialesFuera: 0,
        vencidos: 0,
        diasPromedio: 0,
        devolucionesHoy: 0
      });
    });

    it('returns zero for all KPIs with null input', () => {
      const result = calcularKPIs(null);
      expect(result).toEqual({
        materialesFuera: 0,
        vencidos: 0,
        diasPromedio: 0,
        devolucionesHoy: 0
      });
    });

    it('returns zero for all KPIs with undefined input', () => {
      const result = calcularKPIs(undefined);
      expect(result).toEqual({
        materialesFuera: 0,
        vencidos: 0,
        diasPromedio: 0,
        devolucionesHoy: 0
      });
    });

    it('preserves devolucionesHoy from opciones even with empty array', () => {
      const result = calcularKPIs([], { devolucionesHoy: 3 });
      expect(result.devolucionesHoy).toBe(3);
    });
  });

  describe('materialesFuera count', () => {
    it('counts records with pendiente > 0', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 2 },
        { pendiente: 3, dias_fuera: 4 },
        { pendiente: 0, dias_fuera: 10 }
      ];
      const result = calcularKPIs(materiales);
      expect(result.materialesFuera).toBe(2);
    });

    it('counts all records when all have pendiente > 0', () => {
      const materiales = [
        { pendiente: 1, dias_fuera: 1 },
        { pendiente: 10, dias_fuera: 5 },
        { pendiente: 100, dias_fuera: 20 }
      ];
      const result = calcularKPIs(materiales);
      expect(result.materialesFuera).toBe(3);
    });
  });

  describe('vencidos count', () => {
    it('counts records with pendiente > 0 AND dias_fuera > 7', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 8 },   // vencido
        { pendiente: 3, dias_fuera: 7 },   // NOT vencido (exactly 7)
        { pendiente: 2, dias_fuera: 10 },  // vencido
        { pendiente: 0, dias_fuera: 20 }   // NOT vencido (pendiente == 0)
      ];
      const result = calcularKPIs(materiales);
      expect(result.vencidos).toBe(2);
    });

    it('returns 0 when no materials exceed threshold', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 3 },
        { pendiente: 3, dias_fuera: 7 }
      ];
      const result = calcularKPIs(materiales);
      expect(result.vencidos).toBe(0);
    });
  });

  describe('diasPromedio calculation', () => {
    it('calculates arithmetic mean of dias_fuera', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 4 },
        { pendiente: 3, dias_fuera: 6 },
        { pendiente: 2, dias_fuera: 8 }
      ];
      // Mean: (4 + 6 + 8) / 3 = 6
      const result = calcularKPIs(materiales);
      expect(result.diasPromedio).toBe(6);
    });

    it('rounds the mean to nearest integer', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 3 },
        { pendiente: 3, dias_fuera: 5 }
      ];
      // Mean: (3 + 5) / 2 = 4
      const result = calcularKPIs(materiales);
      expect(result.diasPromedio).toBe(4);
    });

    it('rounds up when fractional part >= 0.5', () => {
      const materiales = [
        { pendiente: 1, dias_fuera: 3 },
        { pendiente: 1, dias_fuera: 4 },
        { pendiente: 1, dias_fuera: 4 }
      ];
      // Mean: (3 + 4 + 4) / 3 = 3.666... → rounds to 4
      const result = calcularKPIs(materiales);
      expect(result.diasPromedio).toBe(4);
    });

    it('handles single material', () => {
      const materiales = [{ pendiente: 5, dias_fuera: 12 }];
      const result = calcularKPIs(materiales);
      expect(result.diasPromedio).toBe(12);
    });
  });

  describe('devolucionesHoy', () => {
    it('uses opciones.devolucionesHoy when provided', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 3 }
      ];
      const result = calcularKPIs(materiales, { devolucionesHoy: 7 });
      expect(result.devolucionesHoy).toBe(7);
    });

    it('counts materials with fecha_devolucion matching today when opciones not provided', () => {
      const hoy = new Date().toISOString().split("T")[0];
      const materiales = [
        { pendiente: 5, dias_fuera: 3, fecha_devolucion: hoy },
        { pendiente: 3, dias_fuera: 5, fecha_devolucion: '2020-01-01' },
        { pendiente: 2, dias_fuera: 8, fecha_devolucion: hoy }
      ];
      const result = calcularKPIs(materiales);
      expect(result.devolucionesHoy).toBe(2);
    });

    it('returns 0 when no materials have today fecha_devolucion and no opciones', () => {
      const materiales = [
        { pendiente: 5, dias_fuera: 3, fecha_devolucion: '2020-01-01' },
        { pendiente: 3, dias_fuera: 5, fecha_devolucion: null }
      ];
      const result = calcularKPIs(materiales);
      expect(result.devolucionesHoy).toBe(0);
    });
  });
});
