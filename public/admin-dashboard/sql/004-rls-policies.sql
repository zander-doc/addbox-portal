-- ============================================================
-- ADDBOX — POLÍTICAS RLS (Row Level Security)
-- Archivo: 004-rls-policies.sql
-- Descripción: Habilita RLS y define políticas de acceso por rol
--              para las tablas del módulo de inventario.
-- Ejecutar en Supabase SQL Editor
-- Requirements: 10.1, 10.2, 10.3, 10.4, 7.3
-- ============================================================

-- ============================================================
-- 1. HABILITAR RLS EN TABLAS DE INVENTARIO
-- ============================================================
ALTER TABLE stock_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteos_fisicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteo_lineas ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. POLÍTICAS PARA stock_obra
-- Req: 10.1, 10.2, 10.3
-- Admin/jefe/supervisor pueden leer todas las obras
-- Almacenista solo puede leer obras asignadas via usuario_obras
-- ============================================================

-- Lectura para admin, jefe y supervisor (todas las obras)
CREATE POLICY "stock_obra_select_admin" ON stock_obra FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe', 'supervisor')
    )
  );

-- Lectura para almacenista (solo obras asignadas)
CREATE POLICY "stock_obra_select_almacenista" ON stock_obra FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_obras uo
      JOIN usuarios u ON u.id = auth.uid()
      WHERE uo.usuario_id = auth.uid()
        AND uo.obra_id = stock_obra.obra_id
        AND u.rol = 'almacenista'
    )
  );

-- ============================================================
-- 3. POLÍTICAS PARA movimientos
-- Req: 10.1, 10.2, 10.3, 10.4
-- Lectura según rol (mismo patrón que stock_obra)
-- INSERT se realiza exclusivamente via funciones RPC (SECURITY DEFINER)
-- ============================================================

-- Lectura para admin, jefe y supervisor (todos los movimientos)
CREATE POLICY "movimientos_select_admin" ON movimientos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe', 'supervisor')
    )
  );

-- Lectura para almacenista (solo movimientos de obras asignadas)
CREATE POLICY "movimientos_select_almacenista" ON movimientos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuario_obras uo
      WHERE uo.usuario_id = auth.uid()
        AND uo.obra_id = movimientos.obra_id
    )
  );

-- ============================================================
-- 4. POLÍTICAS PARA auditoria (Pista de Auditoría)
-- Req: 7.3 — Solo SELECT para admin/jefe, bloquear UPDATE/DELETE
-- La auditoría es inmutable: nadie puede modificar ni eliminar registros
-- ============================================================

-- Habilitar RLS en auditoria
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Lectura solo para admin y jefe
CREATE POLICY "auditoria_select" ON auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe')
    )
  );

-- Bloquear UPDATE para todos (inmutabilidad)
CREATE POLICY "auditoria_no_update" ON auditoria FOR UPDATE
  USING (false);

-- Bloquear DELETE para todos (inmutabilidad)
CREATE POLICY "auditoria_no_delete" ON auditoria FOR DELETE
  USING (false);

-- ============================================================
-- 5. POLÍTICAS PARA conteos_fisicos
-- Req: 10.2 — Solo supervisores y admin/jefe pueden crear y leer
-- ============================================================

-- Lectura para admin, jefe y supervisor
CREATE POLICY "conteos_fisicos_select" ON conteos_fisicos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe', 'supervisor')
    )
  );

-- Inserción para admin, jefe y supervisor
CREATE POLICY "conteos_fisicos_insert" ON conteos_fisicos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe', 'supervisor')
    )
  );

-- ============================================================
-- 6. POLÍTICAS PARA conteo_lineas
-- Req: 10.2 — Acceso vinculado a conteos_fisicos (mismos roles)
-- ============================================================

-- Lectura para admin, jefe y supervisor
CREATE POLICY "conteo_lineas_select" ON conteo_lineas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe', 'supervisor')
    )
  );

-- Inserción para admin, jefe y supervisor
CREATE POLICY "conteo_lineas_insert" ON conteo_lineas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND rol IN ('admin', 'jefe', 'supervisor')
    )
  );

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
