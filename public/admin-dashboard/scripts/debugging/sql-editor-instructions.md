# Instrucciones para Usar SQL Editor en Supabase

## Paso 1: Truncar Tablas

1. **Accede a tu proyecto de Supabase:**
   - URL: https://supabase.com/dashboard
   - Proyecto: `billwldqxupcavzurljo`

2. **Ve a SQL Editor**

3. **Ejecuta este script para truncar todas las tablas:**

```sql
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
```

## Paso 2: Verificar Tablas Vacías

Después de ejecutar el script anterior, deberías ver:

```
table_name      | count
----------------|------
movimientos     | 0
notificaciones  | 0
obras           | 0
productos       | 0
usuarios        | 0
```

## Paso 3: Ejecutar Script de Importación

Una vez que las tablas estén vacías, ejecuta:

```bash
node import-data.js
```

## Notas

- El script `truncate-tables.sql` ya está creado en la carpeta `scripts/`
- El script `import-data.js` ya está listo para importar los datos
- Asegúrate de que las tablas existan antes de importar (ejecuta `create-tables.sql` si es necesario)