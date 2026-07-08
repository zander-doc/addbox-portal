// ===============================================
//   DB CONFIG — ADDBOX
//   Configuración centralizada de tablas y esquemas
//   para Neon PostgreSQL + Clerk Auth
// ===============================================

/**
 * Constantes de nombres de tablas
 * Úsalas en lugar de strings hardcodeados:
 *   db.from(TABLES.PRODUCTS).select('*')
 *   en vez de db.from('productos').select('*')
 */
export const TABLES = {
  // Usuarios y autenticación
  USERS: 'usuarios',
  INSTALLATION: 'instalacion',
  USER_WORKS: 'usuario_obras',

  // Productos e inventario
  PRODUCTS: 'productos',
  STOCK_WORKS: 'stock_obra',
  MOVEMENTS: 'movimientos',
  BATCHES: 'lotes',
  RECONCILIATION: 'reconciliacion',

  // Obras y proyectos
  WORKS: 'obras',

  // Presupuestos
  BUDGETS: 'presupuestos',
  BUDGET_ITEMS: 'presupuesto_partidas',

  // Documentos
  DOCUMENTS: 'documentos_inventario',

  // Devoluciones
  RETURNS: 'devoluciones',

  // Notificaciones
  NOTIFICATIONS: 'notificaciones',

  // Auditoría
  AUDIT: 'auditoria',

  // Configuración
  EXCHANGE_RATE: 'tasa_cambio',
};

/**
 * Esquema completo de la base de datos para Neon PostgreSQL
 * Copiar y pegar en el SQL Editor de Neon Dashboard
 */
export const SCHEMA = `
-- =============================================
-- ADDBOX - ESQUEMA COMPLETO PARA NEON POSTGRESQL
-- Generado desde db-config.js
-- =============================================

-- 1. TABLA: usuarios (sincronizada con Clerk)
CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    nombre VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'usuario' CHECK (rol IN ('admin', 'jefe', 'supervisor', 'almacenista', 'usuario', 'invitado')),
    estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
    avatar_url TEXT,
    ultimo_login TIMESTAMPTZ,
    ip_ultimo_login TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: instalacion
CREATE TABLE IF NOT EXISTS instalacion (
    id SERIAL PRIMARY KEY,
    first_run BOOLEAN DEFAULT true,
    master_key_hash TEXT,
    empresa_nombre TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO instalacion (id, first_run) VALUES (1, false) ON CONFLICT (id) DO UPDATE SET first_run = false;

-- 3. TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    description TEXT,
    categoria VARCHAR(100),
    category VARCHAR(100),
    unidad VARCHAR(50) DEFAULT 'unidad',
    price DECIMAL(10,2) DEFAULT 0,
    precio_venta DECIMAL(12,2) DEFAULT 0,
    costo_prom DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    existencia NUMERIC(12,2) DEFAULT 0,
    umbral_critico INTEGER DEFAULT 5,
    umbral_alerta INTEGER DEFAULT 9,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: obras
CREATE TABLE IF NOT EXISTS obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva', 'finalizada', 'cancelada')),
    fecha_inicio DATE,
    fecha_fin DATE,
    presupuesto NUMERIC(14,2) DEFAULT 0,
    responsable TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: stock_obra
CREATE TABLE IF NOT EXISTS stock_obra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 0,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(producto_id, obra_id)
);

-- 6. TABLA: movimientos
CREATE TABLE IF NOT EXISTS movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'transferencia', 'ajuste', 'devolucion')),
    producto_id UUID NOT NULL REFERENCES productos(id),
    obra_id UUID REFERENCES obras(id),
    obra_destino_id UUID REFERENCES obras(id),
    cantidad INTEGER NOT NULL,
    usuario_id TEXT REFERENCES usuarios(id),
    motivo TEXT,
    observacion TEXT,
    lote_id UUID,
    referencia_cruzada UUID,
    sitio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) DEFAULT 'info' CHECK (tipo IN ('info', 'alerta', 'critico', 'exito')),
    titulo TEXT,
    mensaje TEXT NOT NULL,
    usuario_id TEXT REFERENCES usuarios(id),
    leido BOOLEAN DEFAULT false,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: devoluciones
CREATE TABLE IF NOT EXISTS devoluciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id),
    obra_id UUID REFERENCES obras(id),
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'completada')),
    usuario_id TEXT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLA: lotes
CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) NOT NULL,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INTEGER DEFAULT 0,
    fecha_vencimiento DATE,
    estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'vencido', 'agotado')),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLA: reconciliacion
CREATE TABLE IF NOT EXISTS reconciliacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras(id),
    producto_id UUID REFERENCES productos(id),
    cantidad_sistema INTEGER NOT NULL,
    cantidad_fisica INTEGER NOT NULL,
    diferencia INTEGER NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    usuario_id TEXT REFERENCES usuarios(id),
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA: presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(100) UNIQUE NOT NULL,
    obra_id UUID REFERENCES obras(id),
    cliente_nombre TEXT,
    cliente_email TEXT,
    cliente_telefono TEXT,
    total NUMERIC(14,2) DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviado', 'aprobado', 'rechazado', 'vencido')),
    usuario_id TEXT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABLA: presupuesto_partidas
CREATE TABLE IF NOT EXISTS presupuesto_partidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(14,2) DEFAULT 0,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABLA: documentos_inventario
CREATE TABLE IF NOT EXISTS documentos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'transferencia', 'ajuste', 'inventario')),
    codigo VARCHAR(100) UNIQUE NOT NULL,
    obra_id UUID REFERENCES obras(id),
    usuario_id TEXT REFERENCES usuarios(id),
    observacion TEXT,
    estado VARCHAR(50) DEFAULT 'completado' CHECK (estado IN ('borrador', 'completado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABLA: usuario_obras
CREATE TABLE IF NOT EXISTS usuario_obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, obra_id)
);

-- 15. TABLA: tasa_cambio
CREATE TABLE IF NOT EXISTS tasa_cambio (
    id SERIAL PRIMARY KEY,
    moneda_origen VARCHAR(10) DEFAULT 'USD',
    moneda_destino VARCHAR(10) DEFAULT 'VES',
    tasa NUMERIC(12,4) NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    fuente VARCHAR(100) DEFAULT 'BCV',
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 16. TABLA: auditoria
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accion VARCHAR(255) NOT NULL,
    entidad VARCHAR(100),
    entidad_id TEXT,
    usuario_id TEXT REFERENCES usuarios(id),
    datos_previos JSONB,
    datos_nuevos JSONB,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_stock_obra_producto ON stock_obra(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_obra_obra ON stock_obra(obra_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_obra ON movimientos(obra_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado ON movimientos(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido ON notificaciones(leido);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_creado ON auditoria(creado_en DESC);

-- =============================================
-- FUNCIÓN: registrar_movimiento
-- =============================================
CREATE OR REPLACE FUNCTION registrar_movimiento(
    p_tipo TEXT,
    p_producto_id UUID,
    p_obra_id UUID,
    p_cantidad INTEGER,
    p_usuario_id TEXT DEFAULT NULL,
    p_observacion TEXT DEFAULT NULL,
    p_obra_destino_id UUID DEFAULT NULL,
    p_motivo TEXT DEFAULT NULL
) RETURNS JSONB AS \$\$
DECLARE
    v_movimiento_id UUID;
BEGIN
    IF p_cantidad <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'La cantidad debe ser positiva');
    END IF;

    INSERT INTO movimientos (tipo, producto_id, obra_id, obra_destino_id, cantidad, usuario_id, observacion, motivo)
    VALUES (p_tipo, p_producto_id, p_obra_id, p_obra_destino_id, p_cantidad, p_usuario_id, p_observacion, p_motivo)
    RETURNING id INTO v_movimiento_id;

    IF p_tipo = 'entrada' THEN
        INSERT INTO stock_obra (producto_id, obra_id, cantidad)
        VALUES (p_producto_id, p_obra_id, p_cantidad)
        ON CONFLICT (producto_id, obra_id)
        DO UPDATE SET cantidad = stock_obra.cantidad + p_cantidad, actualizado_en = NOW();
        UPDATE productos SET stock = stock + p_cantidad WHERE id = p_producto_id;

    ELSIF p_tipo = 'salida' THEN
        IF NOT EXISTS (SELECT 1 FROM stock_obra WHERE producto_id = p_producto_id AND obra_id = p_obra_id AND cantidad >= p_cantidad) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente en la obra');
        END IF;
        UPDATE stock_obra SET cantidad = cantidad - p_cantidad, actualizado_en = NOW()
        WHERE producto_id = p_producto_id AND obra_id = p_obra_id;
        UPDATE productos SET stock = stock - p_cantidad WHERE id = p_producto_id;

    ELSIF p_tipo = 'transferencia' THEN
        IF NOT EXISTS (SELECT 1 FROM stock_obra WHERE producto_id = p_producto_id AND obra_id = p_obra_id AND cantidad >= p_cantidad) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stock insuficiente en obra origen');
        END IF;
        UPDATE stock_obra SET cantidad = cantidad - p_cantidad, actualizado_en = NOW()
        WHERE producto_id = p_producto_id AND obra_id = p_obra_id;
        INSERT INTO stock_obra (producto_id, obra_id, cantidad)
        VALUES (p_producto_id, p_obra_destino_id, p_cantidad)
        ON CONFLICT (producto_id, obra_id)
        DO UPDATE SET cantidad = stock_obra.cantidad + p_cantidad, actualizado_en = NOW();

    ELSIF p_tipo = 'ajuste' THEN
        UPDATE stock_obra SET cantidad = p_cantidad, actualizado_en = NOW()
        WHERE producto_id = p_producto_id AND obra_id = p_obra_id;
    END IF;

    INSERT INTO auditoria (accion, entidad, entidad_id, usuario_id, datos_nuevos)
    VALUES ('registrar_movimiento', 'movimientos', v_movimiento_id::TEXT, p_usuario_id,
            jsonb_build_object('tipo', p_tipo, 'producto_id', p_producto_id, 'obra_id', p_obra_id, 'cantidad', p_cantidad));

    RETURN jsonb_build_object('success', true, 'movimiento_id', v_movimiento_id);
END;
\$\$ LANGUAGE plpgsql;

-- =============================================
-- FUNCIÓN: productos_por_categoria
-- =============================================
CREATE OR REPLACE FUNCTION productos_por_categoria()
RETURNS TABLE(categoria TEXT, total BIGINT) AS \$\$
BEGIN
    RETURN QUERY
    SELECT p.categoria, COUNT(*)::BIGINT as total
    FROM productos p
    WHERE p.activo = true AND p.categoria IS NOT NULL
    GROUP BY p.categoria
    ORDER BY total DESC;
END;
\$\$ LANGUAGE plpgsql;

-- =============================================
-- FUNCIÓN: procesar_lote
-- =============================================
CREATE OR REPLACE FUNCTION procesar_lote(
    p_lote_id UUID,
    p_accion TEXT,
    p_cantidad INTEGER DEFAULT NULL
) RETURNS JSONB AS \$\$
DECLARE
    v_lote RECORD;
BEGIN
    SELECT * INTO v_lote FROM lotes WHERE id = p_lote_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lote no encontrado');
    END IF;
    IF p_accion = 'vencer' THEN
        UPDATE lotes SET estado = 'vencido' WHERE id = p_lote_id;
    ELSIF p_accion = 'agotar' THEN
        UPDATE lotes SET estado = 'agotado' WHERE id = p_lote_id;
    ELSIF p_accion = 'descontar' AND p_cantidad IS NOT NULL THEN
        UPDATE lotes SET cantidad = cantidad - p_cantidad WHERE id = p_lote_id;
        IF (SELECT cantidad FROM lotes WHERE id = p_lote_id) <= 0 THEN
            UPDATE lotes SET estado = 'agotado' WHERE id = p_lote_id;
        END IF;
    END IF;
    RETURN jsonb_build_object('success', true);
END;
\$\$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: actualizar timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.actualizado_en = NOW();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usuarios_timestamp') THEN
        CREATE TRIGGER update_usuarios_timestamp BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_productos_timestamp') THEN
        CREATE TRIGGER update_productos_timestamp BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_obras_timestamp') THEN
        CREATE TRIGGER update_obras_timestamp BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
END \$\$;

-- =============================================
-- DATOS INICIALES
-- =============================================
INSERT INTO obras (nombre, name, direccion, descripcion, estado)
SELECT 'Obra Principal', 'Obra Principal', 'Dirección principal', 'Obra por defecto del sistema', 'activa'
WHERE NOT EXISTS (SELECT 1 FROM obras LIMIT 1);

INSERT INTO productos (codigo, sku, nombre, name, descripcion, categoria, unidad, stock, umbral_critico, umbral_alerta)
SELECT 'PROD-001', 'PROD-001', 'Producto de ejemplo', 'Producto de ejemplo', 'Producto inicial del sistema', 'General', 'unidad', 100, 5, 10
WHERE NOT EXISTS (SELECT 1 FROM productos LIMIT 1);

INSERT INTO tasa_cambio (moneda_origen, moneda_destino, tasa, fecha, fuente)
SELECT 'USD', 'VES', 36.50, CURRENT_DATE, 'BCV'
WHERE NOT EXISTS (SELECT 1 FROM tasa_cambio LIMIT 1);

INSERT INTO notificaciones (tipo, titulo, mensaje)
SELECT 'exito', 'Sistema ADDBOX', 'Sistema configurado correctamente con Neon PostgreSQL. Bienvenido.'
WHERE NOT EXISTS (SELECT 1 FROM notificaciones LIMIT 1);

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT '✅ ESQUEMA ADDBOX COMPLETO' as mensaje,
       (SELECT COUNT(*) FROM usuarios) as usuarios,
       (SELECT COUNT(*) FROM productos) as productos,
       (SELECT COUNT(*) FROM obras) as obras;
`;

/**
 * Obtiene un mapeo de nombres de columnas para compatibilidad
 * (nombres en inglés vs español)
 */
export const COLUMN_MAP = {
  usuarios: {
    id: 'id',
    email: 'email',
    nombre: 'nombre',
    full_name: 'full_name',
    rol: 'rol',
    estado: 'estado',
    avatar_url: 'avatar_url',
    ultimo_login: 'ultimo_login',
    creado_en: 'creado_en',
    actualizado_en: 'actualizado_en',
  },
  productos: {
    id: 'id',
    sku: 'sku',
    codigo: 'codigo',
    nombre: 'nombre',
    name: 'name',
    descripcion: 'descripcion',
    description: 'description',
    categoria: 'categoria',
    category: 'category',
    precio_venta: 'precio_venta',
    price: 'price',
    costo_prom: 'costo_prom',
    stock: 'stock',
    umbral_critico: 'umbral_critico',
    umbral_alerta: 'umbral_alerta',
    activo: 'activo',
    created_at: 'created_at',
    creado_en: 'creado_en',
    actualizado_en: 'actualizado_en',
  },
  obras: {
    id: 'id',
    nombre: 'nombre',
    name: 'name',
    direccion: 'direccion',
    descripcion: 'descripcion',
    estado: 'estado',
    fecha_inicio: 'fecha_inicio',
    fecha_fin: 'fecha_fin',
    presupuesto: 'presupuesto',
    responsable: 'responsable',
  },
  movimientos: {
    id: 'id',
    tipo: 'tipo',
    producto_id: 'producto_id',
    obra_id: 'obra_id',
    obra_destino_id: 'obra_destino_id',
    cantidad: 'cantidad',
    usuario_id: 'usuario_id',
    motivo: 'motivo',
    observacion: 'observacion',
    lote_id: 'lote_id',
    sitio: 'sitio',
    created_at: 'created_at',
    creado_en: 'creado_en',
  },
};

/**
 * Función helper para construir queries con nombres de tabla consistentes
 * @param {string} tableKey - Key del objeto TABLES
 * @returns {string} Nombre de la tabla
 */
export function table(tableKey) {
  return TABLES[tableKey] || tableKey;
}

/**
 * Helper para select con mapeo de columnas
 * @param {string} tableName - Nombre de la tabla
 * @returns {object} Columnas disponibles
 */
export function columns(tableName) {
  return COLUMN_MAP[tableName] || {};
}

export default { TABLES, SCHEMA, COLUMN_MAP, table, columns };