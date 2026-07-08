# Instrucciones para Importar Datos a Supabase

## Problema Actual

Las tablas tienen Row Level Security (RLS) habilitado, lo que impide la inserción de datos mediante la API REST.

## Solución Temporal: Deshabilitar RLS

### Opción 1: Usar la Interfaz Web de Supabase (Recomendado)

1. **Accede a tu proyecto de Supabase:**
   - URL: https://supabase.com/dashboard
   - Proyecto: billwldqxupcavzurljo

2. **Deshabilita RLS temporalmente para cada tabla:**
   - Ve a **Table Editor**
   - Selecciona cada tabla: `productos`, `obras`, `movimientos`, `notificaciones`, `usuarios`
   - Haz clic en los tres puntos (...) → **Table Settings**
   - Desactiva la opción **Row Level Security**
   - Repite para todas las tablas

3. **Ejecuta el script de importación:**
   ```bash
   node import-data.js
   ```

4. **Vuelve a habilitar RLS:**
   - Repite el paso 2, pero esta vez activa **Row Level Security**
   - Luego ejecuta el script `update-rls-policies.sql` desde la interfaz SQL Editor

### Opción 2: Usar SQL Editor en Supabase

1. **Ve a SQL Editor** en el dashboard de Supabase

2. **Ejecuta este script para deshabilitar RLS:**
```sql
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE obras DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
```

3. **Ejecuta el script de importación:**
```bash
node import-data.js
```

4. **Vuelve a habilitar RLS y crea políticas:**
```sql
-- Habilitar RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir operaciones completas
CREATE POLICY "Allow read access" ON productos FOR SELECT USING (true);
CREATE POLICY "Allow insert access" ON productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access" ON productos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete access" ON productos FOR DELETE USING (true);

-- Repetir para obras, movimientos, notificaciones, usuarios
```

### Opción 3: Usar Service Role Key (No recomendado para producción)

Si necesitas una solución programática:

1. **Obtén tu Service Role Key:**
   - Ve a **Project Settings** → **API**
   - Copia la **service_role key** (no la publishable key)

2. **Actualiza el script `import-data.js`:**
   ```javascript
   const SUPABASE_KEY = "tu-service-role-key-aqui";
   ```

3. **Ejecuta el script:**
   ```bash
   node import-data.js
   ```

⚠️ **Advertencia:** La service role key bypassa todas las políticas RLS. No la uses en código del lado del cliente.

## Verificación

Después de importar los datos, verifica que todo esté correcto:

```sql
SELECT COUNT(*) FROM productos;  -- Debería mostrar 1083
SELECT COUNT(*) FROM obras;      -- Debería mostrar 5
SELECT COUNT(*) FROM movimientos; -- Debería mostrar 10
SELECT COUNT(*) FROM notificaciones; -- Debería mostrar 5
```

## Notas

- El script `clean-data.js` ya eliminó los duplicados del CSV de productos
- El archivo `productos-limpio.csv` está listo para importar
- Asegúrate de que las tablas existan antes de importar (ejecuta `create-tables.sql` si es necesario)