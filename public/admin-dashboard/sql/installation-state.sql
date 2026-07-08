-- Crear tabla para el estado de instalación
-- Esta tabla almacena el estado de instalación del sistema

CREATE TABLE IF NOT EXISTS installation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_run BOOLEAN NOT NULL DEFAULT true,
    master_key_hash TEXT,
    installation_complete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE installation_state ENABLE ROW LEVEL SECURITY;

-- Política para que solo el admin pueda leer/actualizar
CREATE POLICY "Admin can read installation state"
    ON installation_state
    FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can update installation state"
    ON installation_state
    FOR UPDATE
    TO authenticated
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert installation state"
    ON installation_state
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_installation_state_updated_at
    BEFORE UPDATE ON installation_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar registro inicial si no existe
INSERT INTO installation_state (first_run, master_key_hash, installation_complete)
VALUES (true, NULL, false)
ON CONFLICT DO NOTHING;
