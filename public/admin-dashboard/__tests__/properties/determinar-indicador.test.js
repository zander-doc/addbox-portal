/**
 * Unit tests for determinarIndicador function.
 * Validates: Requirements 6.2, 6.3, 6.4
 */

import { describe, it, expect } from 'vitest';
import { determinarIndicador } from '../../modules/devoluciones/devoluciones.controller.js';

describe('determinarIndicador', () => {
  it('returns 🟢 when pendiente is 0', () => {
    const material = { pendiente: 0, dias_fuera: 10 };
    expect(determinarIndicador(material)).toBe('🟢');
  });

  it('returns 🟡 when pendiente > 0 and dias_fuera <= 7', () => {
    const material = { pendiente: 5, dias_fuera: 3 };
    expect(determinarIndicador(material)).toBe('🟡');
  });

  it('returns 🟡 when pendiente > 0 and dias_fuera is exactly 7', () => {
    const material = { pendiente: 1, dias_fuera: 7 };
    expect(determinarIndicador(material)).toBe('🟡');
  });

  it('returns 🔴 when pendiente > 0 and dias_fuera > 7', () => {
    const material = { pendiente: 2, dias_fuera: 8 };
    expect(determinarIndicador(material)).toBe('🔴');
  });

  it('returns 🔴 when pendiente > 0 and dias_fuera is very high', () => {
    const material = { pendiente: 10, dias_fuera: 100 };
    expect(determinarIndicador(material)).toBe('🔴');
  });

  it('returns 🟢 when pendiente is 0 regardless of dias_fuera', () => {
    const material = { pendiente: 0, dias_fuera: 0 };
    expect(determinarIndicador(material)).toBe('🟢');
  });
});
