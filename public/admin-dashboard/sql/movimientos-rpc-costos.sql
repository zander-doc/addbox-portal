-- ============================================================
-- ADDBOX — FUNCIONES RPC PARA MOVIMIENTOS
-- Archivo: movimientos-rpc-costos.sql
-- Descripción: Funciones para calcular costos en BS dinámicamente
--              basándose en la tasa del día.
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Función: costo_en_bs (calcular costo en bolívares)
-- ============================================================
CREATE OR REPLACE FUNCTION costo_en_bs(costo_usd NUMERIC)
RETURNS NUMERIC(10,2) AS $$
DECLARE
  tasa NUMERIC(10,4);
BEGIN
  -- Obtener tasa del día (o la más reciente si no hay del día)
  SELECT tasa INTO tasa
  FROM tasas_cambio
  WHERE fecha <= CURRENT_DATE
  ORDER BY fecha DESC
  LIMIT 1;
  
  -- Si no hay tasa, usar valor por defecto
  IF tasa IS NULL THEN
    tasa := 36.50;
  END IF;
  
  RETURN costo_usd * tasa;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Función: movimientos_resumen_diario
-- ============================================================
CREATE OR REPLACE FUNCTION movimientos_resumen_diario()
RETURNS TABLE (
  fecha DATE,
  entradas NUMERIC,
  salidas NUMERIC,
  total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.fecha,
    COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE 0 END), 0) AS entradas,
    COALESCE(SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad ELSE 0 END), 0) AS salidas,
    COUNT(*) AS total
  FROM movimientos m
  WHERE m.fecha >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY m.fecha
  ORDER BY m.fecha DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Función: get_kardex_producto
-- ============================================================
CREATE OR REPLACE FUNCTION get_kardex_producto(producto_id_input UUID)
RETURNS TABLE (
  fecha DATE,
  tipo TEXT,
  cantidad NUMERIC,
  costo_unitario_usd NUMERIC,
  costo_unitario_bs NUMERIC,
  saldo_cantidad NUMERIC,
  saldo_valor_usd NUMERIC,
  saldo_valor_bs NUMERIC
) AS $$
DECLARE
  saldo_cant NUMERIC := 0;
  saldo_valor_usd NUMERIC := 0;
  saldo_bs NUMERIC := 0;
  tasa NUMERIC(10,4);
BEGIN
  -- Obtener tasa del día
  SELECT tasa INTO tasa
  FROM tasas_cambio
  WHERE fecha <= CURRENT_DATE
  ORDER BY fecha DESC
  LIMIT 1;
  
  IF tasa IS NULL THEN
    tasa := 36.50;
  END IF;

  -- Cursor para recorrer movimientos ordenados por fecha
  FOR fecha, tipo, cantidad, costo_unitario_usd IN
    SELECT m.fecha, m.tipo, m.cantidad, m.costo_unitario
    FROM movimientos m
    WHERE m.producto_id = producto_id_input
    ORDER BY m.fecha, m.created_at
  LOOP
    -- Calcular costo en BS
    saldo_bs := costo_unitario_usd * tasa;
    
    -- Actualizar saldo
    IF tipo = 'entrada' THEN
      saldo_cant := saldo_cant + cantidad;
      saldo_valor_usd := saldo_valor_usd + (cantidad * costo_unitario_usd);
    ELSE
      saldo_cant := saldo_cant - cantidad;
      saldo_valor_usd := saldo_valor_usd - (cantidad * costo_unitario_usd);
    END IF;
    
    saldo_bs := saldo_valor_usd * tasa;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Función: get_saldo_actual_producto
-- ============================================================
CREATE OR REPLACE FUNCTION get_saldo_actual_producto(producto_id_input UUID)
RETURNS TABLE (
  cantidad NUMERIC,
  costo_promedio_usd NUMERIC,
  costo_promedio_bs NUMERIC,
  valor_total_usd NUMERIC,
  valor_total_bs NUMERIC
) AS $$
DECLARE
  total_cant NUMERIC := 0;
  total_valor_usd NUMERIC := 0;
  tasa NUMERIC(10,4);
BEGIN
  -- Obtener tasa del día
  SELECT tasa INTO tasa
  FROM tasas_cambio
  WHERE fecha <= CURRENT_DATE
  ORDER BY fecha DESC
  LIMIT 1;
  
  IF tasa IS NULL THEN
    tasa := 36.50;
  END IF;

  -- Calcular saldo actual
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE -cantidad END), 0),
    COALESCE(SUM(cantidad * costo_unitario), 0) / NULLIF(SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE -cantidad END), 0)
  INTO total_cant, total_valor_usd
  FROM movimientos
  WHERE producto_id = producto_id_input;

  -- Si no hay movimientos, usar existencia actual del producto
  IF total_cant IS NULL OR total_cant = 0 THEN
    SELECT existencia, costo_prom INTO total_cant, total_valor_usd
    FROM productos
    WHERE id = producto_id_input;
    
    IF total_cant IS NULL THEN
      total_cant := 0;
      total_valor_usd := 0;
    END IF;
  END IF;

  -- Calcular costo promedio
  IF total_cant > 0 THEN
    total_valor_usd := total_valor_usd / total_cant;
  ELSE
    total_valor_usd := 0;
  END IF;

  RETURN QUERY
  SELECT 
    total_cant,
    COALESCE(total_valor_usd, 0),
    COALESCE(total_valor_usd, 0) * tasa,
    COALESCE(total_cant * total_valor_usd, 0),
    COALESCE(total_cant * total_valor_usd * tasa, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
