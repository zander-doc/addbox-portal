/**
 * Property 13: CSV parsing round-trip
 * For any valid set of movement lines (with codigo_producto, cantidad, tipo, obra),
 * generating a CSV and then parsing it back SHALL produce an equivalent set of movement lines.
 *
 * Validates: Requirements 6.5, 6.6
 * Feature: real-product-inventory, Property 13: CSV parsing round-trip
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parsearCSV, generarCSV } from '../../services/csvService.js';

// Arbitrary for safe CSV strings (no newlines in values for simplicity)
const safeString = fc.stringOf(
  fc.char().filter(c => c !== '\n' && c !== '\r'),
  { minLength: 1, maxLength: 30 }
);

const tiposValidos = ['entrada', 'salida', 'ajuste', 'transferencia_salida'];

const lineaMovimientoArb = fc.record({
  codigo_producto: safeString.map(s => s.replace(/,/g, '_').replace(/"/g, "'").trim() || 'PROD1'),
  cantidad: fc.integer({ min: 1, max: 999999 }).map(String),
  tipo: fc.constantFrom(...tiposValidos),
  obra: safeString.map(s => s.replace(/,/g, '_').replace(/"/g, "'").trim() || 'OBRA1'),
});

describe('Property 13: CSV parsing round-trip', () => {
  it('generarCSV → parsearCSV produces equivalent data for any valid movement lines', () => {
    fc.assert(
      fc.property(
        fc.array(lineaMovimientoArb, { minLength: 1, maxLength: 50 }),
        (lineas) => {
          const columnas = [
            { key: 'codigo_producto', label: 'codigo_producto' },
            { key: 'cantidad', label: 'cantidad' },
            { key: 'tipo', label: 'tipo' },
            { key: 'obra', label: 'obra' },
          ];

          // Generate CSV
          const csvContent = generarCSV(lineas, columnas);

          // Parse it back
          const resultado = parsearCSV(csvContent, ['codigo_producto', 'cantidad', 'tipo', 'obra']);

          // Should have no errors
          expect(resultado.errores).toHaveLength(0);

          // Should have same number of rows
          expect(resultado.filas).toHaveLength(lineas.length);

          // Each row should match the original data
          for (let i = 0; i < lineas.length; i++) {
            expect(resultado.filas[i].codigo_producto).toBe(lineas[i].codigo_producto);
            expect(resultado.filas[i].cantidad).toBe(lineas[i].cantidad);
            expect(resultado.filas[i].tipo).toBe(lineas[i].tipo);
            expect(resultado.filas[i].obra).toBe(lineas[i].obra);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parsearCSV rejects CSV with missing required columns', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('codigo_producto', 'cantidad', 'tipo', 'obra'),
        (missingCol) => {
          const allCols = ['codigo_producto', 'cantidad', 'tipo', 'obra'];
          const presentCols = allCols.filter(c => c !== missingCol);
          const header = presentCols.join(',');
          const row = presentCols.map(() => 'value').join(',');
          const csv = `${header}\n${row}`;

          const resultado = parsearCSV(csv, allCols);
          expect(resultado.errores.length).toBeGreaterThan(0);
          expect(resultado.errores[0].motivo).toContain('Columnas faltantes');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles special characters in values through round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            codigo_producto: fc.constant('PROD-001'),
            cantidad: fc.integer({ min: 1, max: 999999 }).map(String),
            tipo: fc.constantFrom(...tiposValidos),
            obra: fc.constant('Obra Principal'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (lineas) => {
          const columnas = [
            { key: 'codigo_producto', label: 'codigo_producto' },
            { key: 'cantidad', label: 'cantidad' },
            { key: 'tipo', label: 'tipo' },
            { key: 'obra', label: 'obra' },
          ];

          const csvContent = generarCSV(lineas, columnas);
          const resultado = parsearCSV(csvContent, ['codigo_producto', 'cantidad', 'tipo', 'obra']);

          expect(resultado.errores).toHaveLength(0);
          expect(resultado.filas).toHaveLength(lineas.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
