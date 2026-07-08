-- ============================================================
-- ADDBOX — RPC: procesar_lote
-- Archivo: 003-rpc-procesar-lote.sql
-- Descripción: Función RPC para procesamiento atómico de lotes
--              de movimientos de inventario (1-500 líneas).
-- Ejecutar en Supabase SQL Editor
-- Req: 6.2, 6.4
-- ============================================================

CREATE OR REPLACE FUNCTION procesar_lote(
  p_lineas JSONB,      -- Array de {producto_id, obra_id, cantidad, tipo, motivo?, observacion?, obra_destino_id?}
  p_usuario_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_linea JSONB;
  v_lote_id UUID;
  v_resultado JSONB;
  v_total INTEGER;
BEGIN
  -- ============================================================
  -- 1. Validar límite de líneas (1-500)
  -- Req: 6.2 — El lote debe tener entre 1 y 500 líneas
  -- ============================================================
  v_total := jsonb_array_length(p_lineas);

  IF v_total < 1 OR v_total > 500 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El lote debe tener entre 1 y 500 líneas'
    );
  END IF;

  -- ============================================================
  -- 2. Registrar lote en lotes_operacion con estado inicial
  -- Req: 6.4 — Registrar todos los Movimientos con referencia
  --            común al lote para trazabilidad
  -- ============================================================
  INSERT INTO lotes_operacion (usuario_id, total_lineas)
  VALUES (p_usuario_id, v_total)
  RETURNING id INTO v_lote_id;

  -- ============================================================
  -- 3. Procesamiento atómico: iterar sobre cada línea
  -- Req: 6.2 — Validar cada línea individualmente
  -- Req: 6.4 — Procesar como transacción atómica
  -- ============================================================
  FOR v_linea IN SELECT * FROM jsonb_array_elements(p_lineas)
  LOOP
    v_resultado := registrar_movimiento(
      v_linea->>'tipo',
      (v_linea->>'producto_id')::UUID,
      (v_linea->>'obra_id')::UUID,
      (v_linea->>'cantidad')::INTEGER,
      p_usuario_id,
      v_linea->>'motivo',
      v_linea->>'observacion',
      CASE WHEN v_linea->>'obra_destino_id' IS NOT NULL
        THEN (v_linea->>'obra_destino_id')::UUID
        ELSE NULL
      END,
      v_lote_id
    );

    -- Si alguna línea falla, lanzar excepción para rollback automático
    IF NOT (v_resultado->>'success')::BOOLEAN THEN
      RAISE EXCEPTION 'Error en línea del lote: %', v_resultado->>'error';
    END IF;
  END LOOP;

  -- ============================================================
  -- 4. Éxito: retornar resultado con lote_id y total procesado
  -- ============================================================
  RETURN jsonb_build_object(
    'success', true,
    'lote_id', v_lote_id,
    'movimientos_creados', v_total
  );

EXCEPTION
  WHEN OTHERS THEN
    -- ============================================================
    -- 5. Rollback automático: la excepción revierte toda la
    --    transacción. Marcar lote como fallido.
    -- Req: 6.2 — Sin procesar ninguna línea si alguna falla
    -- ============================================================
    UPDATE lotes_operacion SET estado = 'fallido' WHERE id = v_lote_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
