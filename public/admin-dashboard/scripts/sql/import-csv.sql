-- ============================================================
-- IMPORTAR CSV — ADDBOX
-- Instrucciones para importar datos desde archivos CSV
-- ============================================================

-- 1. IMPORTAR PRODUCTOS (FORMATO ACTUAL)
-- Formato del CSV: codigo;descripcion;costo_prom;estado
-- Comando psql:
-- \copy productos (codigo, descripcion, costo_prom, estado) FROM 'productos.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');

-- 2. IMPORTAR MOVIMIENTOS
-- Formato esperado del CSV: cantidad,tipo,creado_en,sitio,producto_id
-- Ejemplo:
-- cantidad,tipo,creado_en,sitio,producto_id
-- 50,entrada,2024-01-15 08:30:00,Obra Central,123e4567-e89b-12d3-a456-426614174000
-- 20,salida,2024-01-15 14:00:00,Obra Norte,123e4567-e89b-12d3-a456-426614174000

-- Comando psql:
-- \copy movimientos (cantidad, tipo, creado_en, sitio, producto_id) FROM 'movimientos.csv' WITH (FORMAT csv, HEADER true);

-- 3. IMPORTAR USUARIOS
-- Formato esperado del CSV: nombre,email,rol,activo
-- Ejemplo:
-- nombre,email,rol,activo
-- "Juan Pérez",juan@empresa.com,admin,true
-- "María López",maria@empresa.com,usuario,true

-- Comando psql:
-- \copy usuarios (nombre, email, rol, activo) FROM 'usuarios.csv' WITH (FORMAT csv, HEADER true);

-- 4. IMPORTAR OBRAS
-- Formato esperado del CSV: nombre,descripcion
-- Ejemplo:
-- nombre,descripcion
-- "Obra Central","Edificio de oficinas en el centro"
-- "Obra Norte","Residencial norte"

-- Comando psql:
-- \copy obras (nombre, descripcion) FROM 'obras.csv' WITH (FORMAT csv, HEADER true);

-- 5. IMPORTAR NOTIFICACIONES
-- Formato esperado del CSV: mensaje
-- Ejemplo:
-- mensaje
-- "Stock bajo de cemento"
-- "Entrega programada para mañana"

-- Comando psql:
-- \copy notificaciones (mensaje) FROM 'notificaciones.csv' WITH (FORMAT csv, HEADER true);

-- ============================================================
-- VERIFICAR DATOS DESPUÉS DE IMPORTAR
-- ============================================================

-- SELECT COUNT(*) FROM productos;
-- SELECT COUNT(*) FROM movimientos;
-- SELECT COUNT(*) FROM usuarios;
-- SELECT COUNT(*) FROM obras;
-- SELECT COUNT(*) FROM notificaciones;
