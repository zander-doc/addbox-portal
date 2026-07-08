-- Agregar columna nombre a la tabla productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS nombre TEXT;

-- Actualizar índices
DROP INDEX IF EXISTS idx_productos_codigo;
DROP INDEX IF EXISTS idx_productos_descripcion;
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_descripcion ON productos(descripcion);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
