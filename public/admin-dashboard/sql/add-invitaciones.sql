-- ============================================================
-- ADDBOX — Tabla de invitaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS invitaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT DEFAULT 'usuario',
  departamento TEXT,
  estado TEXT DEFAULT 'pendiente',
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMP DEFAULT now(),
  usado_en TIMESTAMP
);

-- RLS
ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_invitaciones" ON invitaciones FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_invitaciones" ON invitaciones FOR UPDATE TO anon USING (true);
CREATE POLICY "auth_all_invitaciones" ON invitaciones FOR ALL TO authenticated USING (true);
