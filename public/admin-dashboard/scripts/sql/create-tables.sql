-- ============================================================
-- CREAR TABLAS — ADDBOX
-- Tablas faltantes para el dashboard
-- ============================================================

-- Tabla de productos (con formato real)
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  descripcion TEXT,
  costo_prom NUMERIC,
  estado TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de obras (para relacionar con movimientos)
CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de notificaciones (para mostrar alertas en dashboard)
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensaje TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de movimientos (con relación a productos)
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantidad INTEGER NOT NULL,
  tipo TEXT CHECK (tipo IN ('entrada', 'salida')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  sitio TEXT,
  producto_id UUID REFERENCES productos(id)
);

-- Tabla de usuarios (con relación a auth.users)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre TEXT,
  email TEXT,
  rol TEXT,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_descripcion ON productos(descripcion);
CREATE INDEX IF NOT EXISTS idx_obras_nombre ON obras(nombre);
CREATE INDEX IF NOT EXISTS idx_notificaciones_creado_en ON notificaciones(creado_en);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto_id ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en ON movimientos(creado_en);

-- Habilitar RLS (Row Level Security) para seguridad
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir lectura pública para demo)
CREATE POLICY "Allow read access" ON productos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON obras FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON notificaciones FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON movimientos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON usuarios FOR SELECT USING (true);
