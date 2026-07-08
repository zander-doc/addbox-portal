-- ============================================================
-- ADDBOX — Agregar soporte de avatar
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna avatar_url a tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Crear bucket de storage (ejecutar en Storage o via SQL)
-- Ve a Supabase Dashboard → Storage → New Bucket
-- Nombre: avatars
-- Public: YES (para que las URLs sean accesibles)

-- 3. Política de storage (ejecutar después de crear el bucket)
-- Permite a usuarios autenticados subir su propio avatar
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES 
  ('Avatar upload', 'avatars', 'INSERT', '(auth.role() = ''authenticated'')'),
  ('Avatar read', 'avatars', 'SELECT', 'true')
ON CONFLICT DO NOTHING;

-- NOTA: Si las políticas de storage no se pueden crear via SQL,
-- configúralas manualmente en:
-- Supabase Dashboard → Storage → avatars → Policies
-- - SELECT: Allow all (public read)
-- - INSERT: Allow authenticated users
-- - UPDATE: Allow authenticated users
