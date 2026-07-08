-- ============================================================
-- ADDBOX — FUNCIÓN RPC: registrar_movimiento
-- Archivo: 002-rpc-registrar-movimiento.sql
-- Descripción: Operación atómica de registro de movimientos
--              de inventario con validación de stock, concurrencia
--              y lógica de transferencia con referencia cruzada.
-- Ejecutar en Supabase SQL Editor (después de 001-schema)
-- ============================================================
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 2.1, 2.3, 2.6

CREATE OR REPLACE FUNCTION registrar_movimiento(
  p_tipo TEXT,
  p_producto_id UUID,
  p_obra_id UUID,
  p_cantidad INTEGER,
  p_usuario_id UUID,
  p_motivo TEXT DEFAULT NULL,
  p_observacion TEXT DEFAULT NULL,
  p_obra_destino_id UUID DEFAULT NULL,
  p_lote_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_stock_actual INTEGER;
  v_mov_id UUID;
  v_mov_entrada_id UUID;
BEGIN
  -- ============================================================
  -- VALIDACIÓN DE TIPO DE MOVIMIENTO
  -- ============================================================
  IF p_tipo NOT IN ('entrada', 'salida', 'ajuste', 'transferencia_salida', 'transferencia_entrada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tipo de movimiento inválido');
  END IF;

  -- ============================================================
  -- VALIDACIÓN DE CANTIDAD SEGÚN TIPO
  -- Req 1.6: Rango 1-999999 para entrada/salida
  -- Req 1.4: Cantidad != 0 para ajuste (rango -999999 a 999999)
  -- ============================================================
  IF p_tipo IN ('entrada', 'salida', 'transferencia_salida', 'transferencia_entrada') THEN
    IF p_cantidad < 1 OR p_cantidad > 999999 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cantidad fuera de rango permitido (1-999,999)');
    END IF;
  ELSIF p_tipo = 'ajuste' THEN
    IF p_cantidad = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'La cantidad no puede ser cero');
    END IF;
    IF p_cantidad < -999999 OR p_cantidad > 999999 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cantidad fuera de rango permitido (-999,999 a 999,999)');
    END IF;
  END IF;

  -- ============================================================
  -- VALIDACIÓN DE MOTIVO PARA AJUSTES
  -- Req 1.4: Motivo obligatorio con mínimo 10 caracteres
  -- ============================================================
  IF p_tipo = 'ajuste' THEN
    IF p_motivo IS NULL OR length(trim(p_motivo)) < 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'El motivo debe tener al menos 10 caracteres');
    END IF;
  END IF;

  -- ============================================================
  -- VALIDACIÓN DE OBRA DESTINO PARA TRANSFERENCIAS
  -- ============================================================
  IF p_tipo = 'transferencia_salida' AND p_obra_destino_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'La obra destino es obligatoria para transferencias');
  END IF;

  IF p_tipo = 'transferencia_salida' AND p_obra_destino_id = p_obra_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'La obra destino no puede ser igual a la obra origen');
  END IF;

  -- ============================================================
  -- VERIFICACIÓN DE STOCK PARA SALIDAS Y TRANSFERENCIAS
  -- Req 1.7, 2.1, 2.3: Verificar stock suficiente
  -- Req 2.6: FOR UPDATE para concurrencia (lock de fila)
  -- ============================================================
  IF p_tipo IN ('salida', 'transferencia_salida') THEN
    SELECT cantidad INTO v_stock_actual
    FROM stock_obra
    WHERE producto_id = p_producto_id AND obra_id = p_obra_id
    FOR UPDATE;

    IF v_stock_actual IS NULL OR v_stock_actual < p_cantidad THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Stock insuficiente. Disponible: %s', COALESCE(v_stock_actual, 0))
      );
    END IF;
  END IF;

  -- Para ajustes negativos: verificar que no resulte en stock negativo
  IF p_tipo = 'ajuste' AND p_cantidad < 0 THEN
    SELECT cantidad INTO v_stock_actual
    FROM stock_obra
    WHERE producto_id = p_producto_id AND obra_id = p_obra_id
    FOR UPDATE;

    IF COALESCE(v_stock_actual, 0) + p_cantidad < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Stock insuficiente para ajuste negativo. Disponible: %s', COALESCE(v_stock_actual, 0))
      );
    END IF;
  END IF;

  -- ============================================================
  -- INSERTAR MOVIMIENTO PRINCIPAL
  -- Req 1.1, 1.2, 1.5: Crear registro con todos los campos
  -- ============================================================
  INSERT INTO movimientos (
    tipo, producto_id, obra_id, cantidad, usuario_id,
    motivo, observacion, lote_id
  )
  VALUES (
    p_tipo, p_producto_id, p_obra_id, p_cantidad, p_usuario_id,
    p_motivo, p_observacion, p_lote_id
  )
  RETURNING id INTO v_mov_id;

  -- ============================================================
  -- ACTUALIZAR stock_obra SEGÚN TIPO DE MOVIMIENTO
  -- Req 1.8: Actualizar stock tras movimiento exitoso
  -- ============================================================
  IF p_tipo IN ('entrada', 'transferencia_entrada') THEN
    -- Sumar stock: UPSERT para crear fila si no existe
    INSERT INTO stock_obra (producto_id, obra_id, cantidad)
    VALUES (p_producto_id, p_obra_id, p_cantidad)
    ON CONFLICT (producto_id, obra_id)
    DO UPDATE SET
      cantidad = stock_obra.cantidad + EXCLUDED.cantidad,
      actualizado_en = now();

  ELSIF p_tipo IN ('salida', 'transferencia_salida') THEN
    -- Restar stock
    UPDATE stock_obra
    SET cantidad = cantidad - p_cantidad,
        actualizado_en = now()
    WHERE producto_id = p_producto_id AND obra_id = p_obra_id;

  ELSIF p_tipo = 'ajuste' THEN
    -- Ajuste: sumar cantidad (puede ser positiva o negativa)
    INSERT INTO stock_obra (producto_id, obra_id, cantidad)
    VALUES (p_producto_id, p_obra_id, GREATEST(0, p_cantidad))
    ON CONFLICT (producto_id, obra_id)
    DO UPDATE SET
      cantidad = GREATEST(0, stock_obra.cantidad + p_cantidad),
      actualizado_en = now();
  END IF;

  -- ============================================================
  -- LÓGICA DE TRANSFERENCIA CON REFERENCIA CRUZADA
  -- Req 1.3: Crear movimiento de entrada en destino vinculado
  -- ============================================================
  IF p_tipo = 'transferencia_salida' AND p_obra_destino_id IS NOT NULL THEN
    -- Crear movimiento de entrada en obra destino
    INSERT INTO movimientos (
      tipo, producto_id, obra_id, cantidad, usuario_id,
      observacion, lote_id, referencia_cruzada
    )
    VALUES (
      'transferencia_entrada', p_producto_id, p_obra_destino_id, p_cantidad,
      p_usuario_id, p_observacion, p_lote_id, v_mov_id
    )
    RETURNING id INTO v_mov_entrada_id;

    -- Actualizar referencia cruzada en el movimiento de salida
    UPDATE movimientos
    SET referencia_cruzada = v_mov_entrada_id
    WHERE id = v_mov_id;

    -- Actualizar stock en obra destino (sumar)
    INSERT INTO stock_obra (producto_id, obra_id, cantidad)
    VALUES (p_producto_id, p_obra_destino_id, p_cantidad)
    ON CONFLICT (producto_id, obra_id)
    DO UPDATE SET
      cantidad = stock_obra.cantidad + EXCLUDED.cantidad,
      actualizado_en = now();
  END IF;

  -- ============================================================
  -- RETORNO EXITOSO
  -- ============================================================
  RETURN jsonb_build_object('success', true, 'movimiento_id', v_mov_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- COMENTARIO DE FUNCIÓN
-- ============================================================
COMMENT ON FUNCTION registrar_movimiento IS
  'Registra un movimiento de inventario de forma atómica. '
  'Valida cantidad, stock disponible y motivo según tipo. '
  'Para transferencias, crea dos movimientos con referencia cruzada. '
  'Usa FOR UPDATE para prevenir condiciones de carrera en concurrencia.';

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
