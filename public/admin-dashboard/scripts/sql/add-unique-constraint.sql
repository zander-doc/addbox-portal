-- ============================================================
-- AGREGAR RESTRICCIÓN ÚNICA — ADDBOX
-- Script para agregar una restricción de unicidad en el campo codigo
-- ============================================================

-- Primero eliminar duplicados (mantener solo el primero)
DELETE FROM productos
WHERE id NOT IN (
    SELECT MIN(id)
    FROM productos
    GROUP BY codigo
);

-- Luego agregar restricción de unicidad
ALTER TABLE productos
ADD CONSTRAINT productos_codigo_key UNIQUE (codigo);

-- Crear índice para mejorar rendimiento de búsquedas
CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo_unique ON productos(codigo);
