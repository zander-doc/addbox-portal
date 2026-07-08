-- ============================================================
-- ADDBOX — CREAR TABLA tasa_bcv (requerida por trigger de productos)
-- Ejecutar en Supabase SQL Editor ANTES de importar
-- ============================================================

-- 1. Crear tabla tasa_bcv
CREATE TABLE IF NOT EXISTS tasa_bcv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasa NUMERIC(10,4) NOT NULL DEFAULT 36.50,
  fecha DATE DEFAULT CURRENT_DATE,
  fuente TEXT DEFAULT 'BCV',
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- 2. Insertar tasa por defecto si está vacía
INSERT INTO tasa_bcv (tasa, fecha, fuente)
SELECT 36.50, CURRENT_DATE, 'BCV'
WHERE NOT EXISTS (SELECT 1 FROM tasa_bcv LIMIT 1);

-- 3. Agregar constraint UNIQUE a productos.codigo (necesario para upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productos_codigo_unique'
  ) THEN
    ALTER TABLE productos ADD CONSTRAINT productos_codigo_unique UNIQUE (codigo);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Constraint ya existe o no se pudo crear: %', SQLERRM;
END $$;

-- 4. Verificar
SELECT 'tasa_bcv creada' as status, COUNT(*) as registros FROM tasa_bcv;
