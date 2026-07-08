-- ============================================================
-- ADDBOX — ACTUALIZAR ESQUEMA DE PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- Descripción: Añade columnas nuevas sin borrar datos existentes
-- ============================================================

-- ============================================================
-- 1. Añadir columnas a productos
-- ============================================================

-- Columna: costo_prom_$ (costo en dólares)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'costo_prom_dolares'
  ) THEN
    ALTER TABLE productos ADD COLUMN costo_prom_dolares NUMERIC(10,2);
  END IF;
END $$;

-- Columna: categoria (ya existe en setup-completo, pero verificar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'categoria'
  ) THEN
    ALTER TABLE productos ADD COLUMN categoria TEXT;
  END IF;
END $$;

-- Columna: estado (ya existe en setup-completo, pero verificar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'estado'
  ) THEN
    ALTER TABLE productos ADD COLUMN estado TEXT DEFAULT 'activo';
  END IF;
END $$;

-- Columna: umbral_critico (ya existe en 001-schema-inventario, pero verificar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'umbral_critico'
  ) THEN
    ALTER TABLE productos ADD COLUMN umbral_critico INTEGER DEFAULT 5;
  END IF;
END $$;

-- Columna: umbral_alerta (ya existe en 001-schema-inventario, pero verificar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'umbral_alerta'
  ) THEN
    ALTER TABLE productos ADD COLUMN umbral_alerta INTEGER DEFAULT 9;
  END IF;
END $$;

-- ============================================================
-- 2. Crear tabla de tasas de cambio
-- ============================================================
CREATE TABLE IF NOT EXISTS tasas_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  tasa NUMERIC(10,4) NOT NULL,
  fuente TEXT DEFAULT 'BCV',
  creado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fecha, fuente)
);

CREATE INDEX IF NOT EXISTS idx_tasas_fecha ON tasas_cambio(fecha DESC);

-- ============================================================
-- 3. Insertar tasa de cambio por defecto (si no existe)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tasas_cambio WHERE fecha = CURRENT_DATE) THEN
    INSERT INTO tasas_cambio (fecha, tasa, fuente)
    VALUES (CURRENT_DATE, 36.50, 'BCV');
  END IF;
END $$;

-- ============================================================
-- 4. Función para obtener tasa del día
-- ============================================================
CREATE OR REPLACE FUNCTION obtener_tasa_del_dia()
RETURNS NUMERIC(10,4) AS $$
DECLARE
  tasa NUMERIC(10,4);
BEGIN
  SELECT tasa INTO tasa
  FROM tasas_cambio
  WHERE fecha = CURRENT_DATE
  ORDER BY creado_en DESC
  LIMIT 1;
  
  IF tasa IS NULL THEN
    -- Si no hay tasa del día, usar la más reciente
    SELECT tasa INTO tasa
    FROM tasas_cambio
    WHERE fecha <= CURRENT_DATE
    ORDER BY fecha DESC
    LIMIT 1;
    
    IF tasa IS NULL THEN
      tasa := 36.50; -- Valor por defecto
    END IF;
  END IF;
  
  RETURN tasa;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Función para convertir USD a BS
-- ============================================================
CREATE OR REPLACE FUNCTION usd_a_bs(monto_usd NUMERIC)
RETURNS NUMERIC(10,2) AS $$
BEGIN
  RETURN monto_usd * obtener_tasa_del_dia();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Actualizar productos existentes con datos del CSV
-- ============================================================
-- Nota: Esta sección se ejecutará después de importar los CSVs
-- mediante el servicio de importación en JavaScript

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
