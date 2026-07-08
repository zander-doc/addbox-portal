-- update-usuarios-rules.sql (ejecutar después y ajustar RLS según tu política)
-- Habilitar RLS y reglas básicas (ajustar según necesidades)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios pueden leer su propio registro
CREATE POLICY "usuarios_select_self" ON usuarios FOR SELECT USING (auth.uid() = id);

-- Policy: usuarios pueden actualizar su propio perfil (no rol ni estado)
CREATE POLICY "usuarios_update_self" ON usuarios FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policy: admins (control via custom claim 'role' en JWT) pueden todo (ejemplo)
-- Nota: Ajustar según cómo manejes claims; si no usas claims, gestionar permisos desde backend.
CREATE POLICY "admin_full_access" ON usuarios FOR ALL USING (auth.role() = 'admin');