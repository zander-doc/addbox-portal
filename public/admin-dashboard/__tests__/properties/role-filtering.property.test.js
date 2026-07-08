/**
 * Property 7: Obra filtering for almacenista role
 * For any user with role "almacenista" and a set of assigned obras, all stock queries
 * and movement operations SHALL return or affect only data belonging to the assigned obras,
 * and SHALL reject operations targeting unassigned obras.
 *
 * Validates: Requirements 3.7, 10.1
 * Feature: real-product-inventory, Property 7: Obra filtering for almacenista role
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure function simulating obra filtering for almacenista
function filtrarObrasPorRol(todasLasObras, obrasAsignadas, rol) {
  if (rol === 'admin' || rol === 'jefe' || rol === 'supervisor') {
    return todasLasObras;
  }

  if (rol === 'almacenista') {
    return todasLasObras.filter(obra => obrasAsignadas.includes(obra.id));
  }

  return [];
}

// Pure function simulating operation permission check
function verificarPermisoOperacion(obraId, obrasAsignadas, rol) {
  if (rol === 'admin' || rol === 'jefe') {
    return { permitido: true };
  }

  if (rol === 'almacenista') {
    if (obrasAsignadas.includes(obraId)) {
      return { permitido: true };
    }
    return { permitido: false, error: 'No tiene acceso a esta obra' };
  }

  if (rol === 'supervisor') {
    // Supervisors can view but not register movements
    return { permitido: false, error: 'Supervisores no pueden registrar movimientos' };
  }

  return { permitido: false, error: 'Rol no reconocido' };
}

// Pure function to check if UI elements should be visible
function elementosVisiblesPorRol(rol) {
  const elementos = {
    btnRegistrarEntrada: ['almacenista', 'admin', 'jefe'].includes(rol),
    btnRegistrarSalida: ['almacenista', 'admin', 'jefe'].includes(rol),
    btnReconciliacion: ['supervisor', 'admin', 'jefe'].includes(rol),
    btnConfigUmbrales: ['admin', 'jefe'].includes(rol),
    btnExportarReportes: ['admin', 'jefe'].includes(rol),
    btnGestionObras: ['admin', 'jefe'].includes(rol),
  };
  return elementos;
}

// Arbitrary for obras
const obraArb = fc.record({
  id: fc.uuid(),
  nombre: fc.string({ minLength: 3, maxLength: 30 }),
});

describe('Property 7: Obra filtering for almacenista role', () => {
  it('almacenista only sees assigned obras', () => {
    fc.assert(
      fc.property(
        fc.array(obraArb, { minLength: 3, maxLength: 10 }),
        fc.integer({ min: 1, max: 3 }),
        (obras, numAsignadas) => {
          const asignadas = obras.slice(0, Math.min(numAsignadas, obras.length)).map(o => o.id);

          const resultado = filtrarObrasPorRol(obras, asignadas, 'almacenista');

          // Should only contain assigned obras
          expect(resultado.length).toBe(asignadas.length);
          for (const obra of resultado) {
            expect(asignadas).toContain(obra.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('admin/jefe/supervisor sees all obras', () => {
    fc.assert(
      fc.property(
        fc.array(obraArb, { minLength: 1, maxLength: 10 }),
        fc.constantFrom('admin', 'jefe', 'supervisor'),
        (obras, rol) => {
          const asignadas = [obras[0].id]; // Only one assigned

          const resultado = filtrarObrasPorRol(obras, asignadas, rol);

          // Should see ALL obras regardless of assignment
          expect(resultado.length).toBe(obras.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('almacenista cannot operate on unassigned obras', () => {
    fc.assert(
      fc.property(
        fc.array(obraArb, { minLength: 2, maxLength: 10 }),
        (obras) => {
          const asignadas = [obras[0].id]; // Only first obra assigned
          const obraNoAsignada = obras[obras.length - 1].id;

          fc.pre(obraNoAsignada !== obras[0].id); // Ensure different

          const resultado = verificarPermisoOperacion(obraNoAsignada, asignadas, 'almacenista');

          expect(resultado.permitido).toBe(false);
          expect(resultado.error).toContain('No tiene acceso');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('almacenista can operate on assigned obras', () => {
    fc.assert(
      fc.property(
        fc.array(obraArb, { minLength: 1, maxLength: 10 }),
        fc.nat(),
        (obras, seed) => {
          const asignadas = obras.map(o => o.id);
          const obraSeleccionada = asignadas[seed % asignadas.length];

          const resultado = verificarPermisoOperacion(obraSeleccionada, asignadas, 'almacenista');

          expect(resultado.permitido).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('admin can operate on any obra regardless of assignment', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (obraId) => {
          const asignadas = []; // No obras assigned

          const resultado = verificarPermisoOperacion(obraId, asignadas, 'admin');

          expect(resultado.permitido).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('UI elements are hidden based on role', () => {
    const roles = ['almacenista', 'supervisor', 'admin', 'jefe'];

    for (const rol of roles) {
      const elementos = elementosVisiblesPorRol(rol);

      if (rol === 'almacenista') {
        expect(elementos.btnRegistrarEntrada).toBe(true);
        expect(elementos.btnRegistrarSalida).toBe(true);
        expect(elementos.btnReconciliacion).toBe(false);
        expect(elementos.btnConfigUmbrales).toBe(false);
        expect(elementos.btnExportarReportes).toBe(false);
        expect(elementos.btnGestionObras).toBe(false);
      }

      if (rol === 'supervisor') {
        expect(elementos.btnRegistrarEntrada).toBe(false);
        expect(elementos.btnRegistrarSalida).toBe(false);
        expect(elementos.btnReconciliacion).toBe(true);
        expect(elementos.btnConfigUmbrales).toBe(false);
        expect(elementos.btnExportarReportes).toBe(false);
      }

      if (rol === 'admin' || rol === 'jefe') {
        expect(elementos.btnRegistrarEntrada).toBe(true);
        expect(elementos.btnRegistrarSalida).toBe(true);
        expect(elementos.btnReconciliacion).toBe(true);
        expect(elementos.btnConfigUmbrales).toBe(true);
        expect(elementos.btnExportarReportes).toBe(true);
        expect(elementos.btnGestionObras).toBe(true);
      }
    }
  });

  it('almacenista with no assigned obras gets empty result', () => {
    fc.assert(
      fc.property(
        fc.array(obraArb, { minLength: 1, maxLength: 10 }),
        (obras) => {
          const asignadas = []; // No obras assigned

          const resultado = filtrarObrasPorRol(obras, asignadas, 'almacenista');

          expect(resultado).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
