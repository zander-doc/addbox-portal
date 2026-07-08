-- create-auditoria.sql
ALTER TABLE IF EXISTS usuarios 
ADD COLUMN IF NOT EXISTS rol text DEFAULT 'usuario',
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'activo',
ADD COLUMN IF NOT EXISTS creado_en timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS ultimo_login timestamptz,
ADD COLUMN IF NOT EXISTS ip_registro text,
ADD COLUMN IF NOT EXISTS ip_ultimo_login text;

CREATE TABLE IF NOT EXISTS auditoria (
  id bigserial PRIMARY KEY,
  usuario_id uuid,
  accion text NOT NULL,
  modulo text,
  descripcion text,
  fecha timestamptz DEFAULT now(),
  ip text
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);