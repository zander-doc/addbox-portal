-- ============================================================
-- ACTUALIZAR POLÍTICAS RLS — ADDBOX
-- Agregar políticas para permitir INSERT, UPDATE, DELETE
-- ============================================================

-- Políticas para productos
DROP POLICY IF EXISTS "Allow insert access" ON productos;
CREATE POLICY "Allow insert access" ON productos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update access" ON productos;
CREATE POLICY "Allow update access" ON productos FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete access" ON productos;
CREATE POLICY "Allow delete access" ON productos FOR DELETE USING (true);

-- Políticas para obras
DROP POLICY IF EXISTS "Allow insert access" ON obras;
CREATE POLICY "Allow insert access" ON obras FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update access" ON obras;
CREATE POLICY "Allow update access" ON obras FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete access" ON obras;
CREATE POLICY "Allow delete access" ON obras FOR DELETE USING (true);

-- Políticas para notificaciones
DROP POLICY IF EXISTS "Allow insert access" ON notificaciones;
CREATE POLICY "Allow insert access" ON notificaciones FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update access" ON notificaciones;
CREATE POLICY "Allow update access" ON notificaciones FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete access" ON notificaciones;
CREATE POLICY "Allow delete access" ON notificaciones FOR DELETE USING (true);

-- Políticas para movimientos
DROP POLICY IF EXISTS "Allow insert access" ON movimientos;
CREATE POLICY "Allow insert access" ON movimientos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update access" ON movimientos;
CREATE POLICY "Allow update access" ON movimientos FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete access" ON movimientos;
CREATE POLICY "Allow delete access" ON movimientos FOR DELETE USING (true);

-- Políticas para usuarios
DROP POLICY IF EXISTS "Allow insert access" ON usuarios;
CREATE POLICY "Allow insert access" ON usuarios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update access" ON usuarios;
CREATE POLICY "Allow update access" ON usuarios FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow delete access" ON usuarios;
CREATE POLICY "Allow delete access" ON usuarios FOR DELETE USING (true);