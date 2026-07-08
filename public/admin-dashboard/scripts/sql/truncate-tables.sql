-- ============================================================
-- TRUNCAR TABLAS — ADDBOX
-- Script para eliminar todos los datos de las tablas
-- ============================================================

-- Truncar tablas (esto elimina todos los datos y reinicia los IDs)
TRUNCATE TABLE movimientos RESTART IDENTITY CASCADE;
TRUNCATE TABLE notificaciones RESTART IDENTITY CASCADE;
TRUNCATE TABLE obras RESTART IDENTITY CASCADE;
TRUNCATE TABLE productos RESTART IDENTITY CASCADE;
TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE;

-- Verificar que las tablas están vacías
SELECT 'movimientos' AS table_name, COUNT(*) AS count FROM movimientos
UNION ALL
SELECT 'notificaciones' AS table_name, COUNT(*) AS count FROM notificaciones
UNION ALL
SELECT 'obras' AS table_name, COUNT(*) AS count FROM obras
UNION ALL
SELECT 'productos' AS table_name, COUNT(*) AS count FROM productos
UNION ALL
SELECT 'usuarios' AS table_name, COUNT(*) AS count FROM usuarios;