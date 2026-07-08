-- ============================================================
-- ADDBOX LLC — USUARIOS DEMO
-- Ejecutar en Supabase SQL Editor
-- NOTA: Estos son registros en la tabla "usuarios" solamente.
-- Para que puedan hacer login, deben existir también en Supabase Auth.
-- ============================================================

INSERT INTO usuarios (nombre, email, rol, estado, creado_en) VALUES
('Jefe Demo', 'jefe@addbox.com', 'jefe', 'activo', now()),
('Admin Demo', 'admin@addbox.com', 'admin', 'activo', now()),
('RRHH Demo', 'rrhh@addbox.com', 'rrhh', 'activo', now()),
('Almacenista Demo', 'almacenista@addbox.com', 'almacenista', 'activo', now()),
('Invitado Demo', 'invitado@addbox.com', 'invitado', 'activo', now());

-- ============================================================
-- NOTA IMPORTANTE:
-- Para que estos usuarios puedan hacer LOGIN, debes crearlos
-- también en Supabase Auth (Dashboard → Authentication → Users → Add user)
-- con los mismos emails y una contraseña (ej: Demo123!)
--
-- Roles disponibles en el sistema:
-- • jefe → acceso total
-- • admin → admin + inventario + obras + reportes
-- • rrhh → solo módulo RRHH
-- • almacenista → inventario + movimientos
-- • invitado → solo autopedidos
-- ============================================================
