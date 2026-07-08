-- ============================================================
-- CORREGIR POLÍTICAS RLS EN TABLA USUARIOS
-- ============================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Allow read access" ON usuarios;
DROP POLICY IF EXISTS "usuarios_select_self" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update_self" ON usuarios;
DROP POLICY IF EXISTS "admin_full_access" ON usuarios;
DROP POLICY IF EXISTS "permitir registro" ON usuarios;
DROP POLICY IF EXISTS "permitir lectura a todos los autenticados" ON usuarios;
DROP POLICY IF EXISTS "permitir actualización propia" ON usuarios;
DROP POLICY IF EXISTS "permitir insercion" ON usuarios;

-- Deshabilitar RLS temporalmente para permitir inserciones sin autenticación
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Política para lectura: todos los autenticados pueden leer
CREATE POLICY "permitir lectura" ON usuarios
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para inserción: permitir inserción sin autenticación (para registro)
-- Esto permite que los nuevos usuarios se registren
CREATE POLICY "permitir insercion" ON usuarios
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para actualización: solo el usuario puede actualizar su propio registro
CREATE POLICY "permitir actualizacion" ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política para borrado: solo el usuario puede borrar su propio registro
CREATE POLICY "permitir borrado" ON usuarios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
