-- ============================================================
-- ADDBOX — RECONSTRUIR TABLA MOVIMIENTOS
-- Archivo: rebuild-movimientos-table.sql
-- Descripción: Elimina la tabla movimientos actual y la recrea
--              con estructura limpia y estándar para inventario.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. BACKUP DE DATOS EXISTENTES (opcional)
-- ============================================================
-- Si necesitas respaldar los datos actuales, ejecuta esto ANTES de borrar:
/*
CREATE TABLE IF NOT EXISTS movimientos_backup AS
SELECT * FROM movimientos;
*/

-- ============================================================
-- 2. ELIMINAR TABLA MOVIMIENTOS (si existe)
-- ============================================================
DROP TABLE IF EXISTS movimientos CASCADE;

-- ============================================================
-- 3. CREAR TABLA MOVIMIENTOS CON ESTRUCTURA LIMPIA
-- ============================================================
CREATE TABLE movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC NOT NULL CHECK (costo_unitario >= 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. ÍNDICES PARA RENDIMIENTO
-- ============================================================
CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha DESC);
CREATE INDEX idx_movimientos_creado ON movimientos(created_at DESC);

-- ============================================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- ============================================================
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Read movimientos" ON movimientos
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir inserción a roles específicos
CREATE POLICY "Insert movimientos" ON movimientos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('almacenista', 'jefe', 'administrador')
    )
  );

-- Permitir actualización a roles específicos
CREATE POLICY "Update movimientos" ON movimientos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('jefe', 'administrador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('jefe', 'administrador')
    )
  );

-- Permitir eliminación a roles específicos
CREATE POLICY "Delete movimientos" ON movimientos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('administrador')
    )
  );

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
