/**
 * Unit tests for aplicarFiltros function.
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect } from 'vitest';
import { aplicarFiltros } from '../../modules/devoluciones/devoluciones.controller.js';

// Sample test data
const materiales = [
  {
    detalle_id: "1",
    documento_id: "d1",
    numero: "DOC-001",
    tipo: "Traslado",
    proyecto: "Obra Norte",
    descripcion: "Cemento Portland",
    codigo: "CEM-001",
    pendiente: 5,
    dias_fuera: 3,
    fecha_salida: "2025-01-10",
    estado_doc: "abierto"
  },
  {
    detalle_id: "2",
    documento_id: "d2",
    numero: "DOC-002",
    tipo: "Requisición de materiales",
    proyecto: "Obra Sur",
    descripcion: "Varilla corrugada",
    codigo: "VAR-010",
    pendiente: 10,
    dias_fuera: 12,
    fecha_salida: "2024-12-20",
    estado_doc: "abierto"
  },
  {
    detalle_id: "3",
    documento_id: "d3",
    numero: "DOC-003",
    tipo: "Requisición de herramienta",
    proyecto: "Obra Este",
    descripcion: "Taladro percutor",
    codigo: "HER-005",
    pendiente: 1,
    dias_fuera: 5,
    fecha_salida: "2025-01-15",
    estado_doc: "abierto"
  },
  {
    detalle_id: "4",
    documento_id: "d4",
    numero: "DOC-004",
    tipo: "Traslado",
    proyecto: "Obra Oeste",
    descripcion: "Arena gruesa",
    codigo: "ARE-002",
    pendiente: 0,
    dias_fuera: 20,
    fecha_salida: "2024-12-01",
    estado_doc: "cerrado"
  }
];

describe('aplicarFiltros', () => {
  describe('edge cases', () => {
    it('returns empty array when materiales is null', () => {
      expect(aplicarFiltros(null, {})).toEqual([]);
    });

    it('returns empty array when materiales is not an array', () => {
      expect(aplicarFiltros("invalid", {})).toEqual([]);
    });

    it('returns all materiales when filtros is null', () => {
      expect(aplicarFiltros(materiales, null)).toEqual(materiales);
    });

    it('returns all materiales when all filters are empty', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      expect(aplicarFiltros(materiales, filtros)).toEqual(materiales);
    });
  });

  describe('filtro texto (búsqueda)', () => {
    it('filters by document number (case-insensitive)', () => {
      const filtros = { busqueda: "doc-001", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1);
      expect(result[0].numero).toBe("DOC-001");
    });

    it('filters by product description', () => {
      const filtros = { busqueda: "cemento", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1);
      expect(result[0].descripcion).toBe("Cemento Portland");
    });

    it('filters by product code', () => {
      const filtros = { busqueda: "var-010", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1);
      expect(result[0].codigo).toBe("VAR-010");
    });

    it('filters by project name', () => {
      const filtros = { busqueda: "norte", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1);
      expect(result[0].proyecto).toBe("Obra Norte");
    });

    it('returns multiple matches when text matches several items', () => {
      const filtros = { busqueda: "obra", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(4);
    });
  });

  describe('filtro tipo', () => {
    it('filters by exact type match - Traslado', () => {
      const filtros = { busqueda: "", tipo: "Traslado", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2);
      expect(result.every(m => m.tipo === "Traslado")).toBe(true);
    });

    it('filters by exact type match - Requisición de materiales', () => {
      const filtros = { busqueda: "", tipo: "Requisición de materiales", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1);
      expect(result[0].tipo).toBe("Requisición de materiales");
    });

    it('filters by exact type match - Requisición de herramienta', () => {
      const filtros = { busqueda: "", tipo: "Requisición de herramienta", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1);
      expect(result[0].tipo).toBe("Requisición de herramienta");
    });
  });

  describe('filtro estado', () => {
    it('filters pendiente: pendiente > 0 AND dias_fuera <= 7', () => {
      const filtros = { busqueda: "", tipo: "", estado: "pendiente", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-001 (3d) and DOC-003 (5d)
      expect(result.every(m => m.pendiente > 0 && m.dias_fuera <= 7)).toBe(true);
    });

    it('filters vencido: pendiente > 0 AND dias_fuera > 7', () => {
      const filtros = { busqueda: "", tipo: "", estado: "vencido", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1); // DOC-002 (12d)
      expect(result.every(m => m.pendiente > 0 && m.dias_fuera > 7)).toBe(true);
    });

    it('filters cerrado: estado_doc == "cerrado"', () => {
      const filtros = { busqueda: "", tipo: "", estado: "cerrado", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1); // DOC-004
      expect(result[0].estado_doc).toBe("cerrado");
    });
  });

  describe('filtro rango fechas', () => {
    it('filters by fechaDesde', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "2025-01-01", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-001 (Jan 10) and DOC-003 (Jan 15)
      expect(result.every(m => new Date(m.fecha_salida) >= new Date("2025-01-01"))).toBe(true);
    });

    it('filters by fechaHasta', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "", fechaHasta: "2024-12-31", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-002 (Dec 20) and DOC-004 (Dec 1)
      expect(result.every(m => new Date(m.fecha_salida) <= new Date("2024-12-31"))).toBe(true);
    });

    it('filters by date range (both fechaDesde and fechaHasta)', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "2024-12-15", fechaHasta: "2025-01-12", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-001 (Jan 10) and DOC-002 (Dec 20)
    });
  });

  describe('filtro rango días fuera', () => {
    it('filters by diasMin', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "10", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-002 (12d) and DOC-004 (20d)
      expect(result.every(m => m.dias_fuera >= 10)).toBe(true);
    });

    it('filters by diasMax', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "5" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-001 (3d) and DOC-003 (5d)
      expect(result.every(m => m.dias_fuera <= 5)).toBe(true);
    });

    it('filters by days range (both min and max)', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "4", diasMax: "15" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // DOC-003 (5d) and DOC-002 (12d)
      expect(result.every(m => m.dias_fuera >= 4 && m.dias_fuera <= 15)).toBe(true);
    });
  });

  describe('intersección (AND) de filtros', () => {
    it('combines text search with type filter', () => {
      const filtros = { busqueda: "obra", tipo: "Traslado", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(2); // Both Traslado items have "Obra" in proyecto
      expect(result.every(m => m.tipo === "Traslado")).toBe(true);
    });

    it('combines type and estado filters', () => {
      const filtros = { busqueda: "", tipo: "Traslado", estado: "pendiente", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1); // DOC-001: Traslado, pendiente > 0, dias_fuera 3 <= 7
      expect(result[0].numero).toBe("DOC-001");
    });

    it('combines all filters resulting in empty set', () => {
      const filtros = { busqueda: "cemento", tipo: "Requisición de materiales", estado: "", fechaDesde: "", fechaHasta: "", diasMin: "", diasMax: "" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(0);
    });

    it('combines date range with days range', () => {
      const filtros = { busqueda: "", tipo: "", estado: "", fechaDesde: "2024-12-01", fechaHasta: "2024-12-31", diasMin: "10", diasMax: "15" };
      const result = aplicarFiltros(materiales, filtros);
      expect(result).toHaveLength(1); // DOC-002: Dec 20, 12 days
      expect(result[0].numero).toBe("DOC-002");
    });
  });
});
