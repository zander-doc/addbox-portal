-- ============================================================
-- ADDBOX — SCHEMA DE INVENTARIO EN TIEMPO REAL
-- Archivo: 001-schema-inventario.sql
-- Descripción: Tablas nuevas y extensiones para el módulo de
--              inventario multi-almacén con trazabilidad completa.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLA: stock_obra (stock materializado por producto-obra)
-- Req: 2.5, 3.1
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  actualizado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(producto_id, obra_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_obra_producto ON stock_obra(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_obra_obra ON stock_obra(obra_id);
CREATE INDEX IF NOT EXISTS idx_stock_obra_cantidad ON stock_obra(cantidad);

-- ============================================================
-- 2. TABLA: conteos_fisicos (eventos de conteo físico)
-- Req: 5.6
-- ============================================================
CREATE TABLE IF NOT EXISTS conteos_fisicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  estado TEXT NOT NULL DEFAULT 'en_progreso'
    CHECK (estado IN ('en_progreso', 'completado', 'reconciliado')),
  creado_en TIMESTAMPTZ DEFAULT now(),
  completado_en TIMESTAMPTZ,
  reconciliado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conteos_obra ON conteos_fisicos(obra_id);
CREATE INDEX IF NOT EXISTS idx_conteos_estado ON conteos_fisicos(estado);

-- ============================================================
-- 3. TABLA: conteo_lineas (detalle de cada producto contado)
-- Req: 5.6
-- ============================================================
CREATE TABLE IF NOT EXISTS conteo_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conteo_id UUID NOT NULL REFERENCES conteos_fisicos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  stock_sistema INTEGER NOT NULL,
  stock_fisico INTEGER,
  diferencia INTEGER GENERATED ALWAYS AS (stock_fisico - stock_sistema) STORED,
  UNIQUE(conteo_id, producto_id)
);

-- ============================================================
-- 4. TABLA: lotes_operacion (lotes de movimientos agrupados)
-- Req: 6.4
-- ============================================================
CREATE TABLE IF NOT EXISTS lotes_operacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  total_lineas INTEGER NOT NULL CHECK (total_lineas BETWEEN 1 AND 500),
  estado TEXT NOT NULL DEFAULT 'procesado'
    CHECK (estado IN ('procesado', 'fallido')),
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. TABLA: usuario_obras (asignación almacenista-obra)
-- Req: 10.1
-- ============================================================
CREATE TABLE IF NOT EXISTS usuario_obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  asignado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, obra_id)
);

-- ============================================================
-- 6. ALTER TABLE: productos — agregar umbrales de alerta
-- Req: 1.5
-- ============================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS umbral_critico INTEGER DEFAULT 5;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS umbral_alerta INTEGER DEFAULT 9;

-- Constraint: umbral_critico debe ser > 0 y umbral_alerta > umbral_critico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_umbrales'
  ) THEN
    ALTER TABLE productos ADD CONSTRAINT chk_umbrales
      CHECK (umbral_critico > 0 AND umbral_alerta > umbral_critico);
  END IF;
END $$;

-- ============================================================
-- 7. ALTER TABLE: movimientos — agregar columnas y constraints
-- Req: 1.5, 2.6
-- ============================================================

-- Nuevas columnas
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES obras(id);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS obra_destino_id UUID REFERENCES obras(id);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES lotes_operacion(id);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS referencia_cruzada UUID REFERENCES movimientos(id);
ALTER TABLE movimientos ADD COLUMN IF NOT EXISTS observacion TEXT;

-- Eliminar constraint de tipo antiguo y crear el nuevo con tipos extendidos
DO $$
BEGIN
  -- Eliminar constraint existente de tipo si existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'movimientos_tipo_check'
      AND conrelid = 'movimientos'::regclass
  ) THEN
    ALTER TABLE movimientos DROP CONSTRAINT movimientos_tipo_check;
  END IF;

  -- Crear constraint de tipo extendido
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tipo'
  ) THEN
    ALTER TABLE movimientos ADD CONSTRAINT chk_tipo
      CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'transferencia_salida', 'transferencia_entrada'));
  END IF;
END $$;

-- Constraint: cantidad no puede ser cero
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_cantidad_no_cero'
  ) THEN
    ALTER TABLE movimientos ADD CONSTRAINT chk_cantidad_no_cero
      CHECK (cantidad != 0);
  END IF;
END $$;

-- Constraint: motivo obligatorio y mínimo 10 caracteres para ajustes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_motivo_ajuste'
  ) THEN
    ALTER TABLE movimientos ADD CONSTRAINT chk_motivo_ajuste
      CHECK (tipo != 'ajuste' OR (motivo IS NOT NULL AND length(motivo) >= 10));
  END IF;
END $$;

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_movimientos_obra ON movimientos(obra_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_lote ON movimientos(lote_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en ON movimientos(creado_en DESC);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
