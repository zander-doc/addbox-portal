-- ============================================================
-- ADDBOX — FUNCIÓN RPC: productos_por_categoria
-- Archivo: 005-rpc-productos-por-categoria.sql
-- Descripción: Función RPC que retorna el conteo de productos
--              activos agrupados por categoría mediante un
--              LEFT JOIN entre categorias y productos.
-- Ejecutar en Supabase SQL Editor (después de crear tabla categorias
-- y agregar columna categoria_id a productos)
-- ============================================================
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5

CREATE OR REPLACE FUNCTION productos_por_categoria()
RETURNS TABLE(category_name VARCHAR, total_productos BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_rol TEXT;
BEGIN
  -- ============================================================
  -- CONTROL DE ACCESO POR ROL
  -- Req 1.3, 1.4: Solo admin, jefe y almacenista pueden ejecutar
  -- ============================================================
  SELECT rol INTO v_user_rol
  FROM usuarios
  WHERE id = auth.uid();

  IF v_user_rol IS NULL OR v_user_rol NOT IN ('admin', 'jefe', 'almacenista') THEN
    RAISE EXCEPTION 'Permisos insuficientes para acceder a esta función';
  END IF;

  -- ============================================================
  -- CONSULTA PRINCIPAL
  -- ============================================================
  RETURN QUERY
  SELECT
    COALESCE(c.nombre, 'Sin categoría')::VARCHAR AS category_name,
    COUNT(p.id)::BIGINT AS total_productos
  FROM categorias c
  LEFT JOIN productos p ON p.categoria_id = c.id AND p.estado = 'activo'
  GROUP BY c.nombre
  ORDER BY category_name ASC;
END;
$$;

-- ============================================================
-- PERMISOS DE EJECUCIÓN
-- Req 1.3: Revocar acceso público y restringir a authenticated
-- ============================================================
REVOKE EXECUTE ON FUNCTION productos_por_categoria() FROM public;
REVOKE EXECUTE ON FUNCTION productos_por_categoria() FROM anon;
GRANT EXECUTE ON FUNCTION productos_por_categoria() TO authenticated;

-- ============================================================
-- COMENTARIO DE FUNCIÓN
-- ============================================================
COMMENT ON FUNCTION productos_por_categoria IS
  'Retorna el conteo de productos activos agrupados por categoría. '
  'Usa LEFT JOIN para incluir categorías sin productos (total_productos = 0). '
  'Solo contabiliza productos con estado activo. '
  'Ordena resultados alfabéticamente por nombre de categoría. '
  'Acceso restringido a roles: admin, jefe, almacenista.';

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
