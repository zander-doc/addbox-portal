# Scripts de Base de Datos — ADDBOX

## Archivos Disponibles

### 1. create-tables.sql
Script SQL completo para crear todas las tablas:
- `productos` — Con formato real: `codigo;descripcion;costo_prom;estado`
- `obras` — Para gestionar obras/proyectos
- `notificaciones` — Para mostrar alertas en dashboard
- `movimientos` — Con relación a productos
- `usuarios` — Con relación a auth.users

**Cómo usar:**
```bash
psql -h tu-servidor.supabase.co -U postgres -d postgres -f create-tables.sql
```

### 2. import-csv.sql
Instrucciones para importar datos desde archivos CSV con formato esperado.

### 3. sample-data/
Carpeta con ejemplos de datos CSV listos para importar:
- `productos.csv` — Productos reales (formato: `codigo;descripcion;costo_prom;estado`)
- `obras.csv` — 5 obras de ejemplo
- `movimientos.csv` — 10 movimientos de ejemplo
- `notificaciones.csv` — 5 notificaciones de ejemplo

## Pasos para Configurar tu Base de Datos

1. **Crear tablas:**
   ```bash
   psql -h billwldqxupcavzurljo.supabase.co -U postgres -d postgres -f create-tables.sql
   ```

2. **Importar productos (formato actual):**
   ```bash
   psql -h billwldqxupcavzurljo.supabase.co -U postgres -d postgres -c "\copy productos (codigo, descripcion, costo_prom, estado) FROM 'sample-data/productos.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';')"
   ```

3. **Importar obras:**
   ```bash
   psql -h billwldqxupcavzurljo.supabase.co -U postgres -d postgres -c "\copy obras (nombre, descripcion) FROM 'sample-data/obras.csv' WITH (FORMAT csv, HEADER true)"
   ```

4. **Importar movimientos:**
   ```bash
   psql -h billwldqxupcavzurljo.supabase.co -U postgres -d postgres -c "\copy movimientos (cantidad, tipo, creado_en, sitio, producto_id) FROM 'sample-data/movimientos.csv' WITH (FORMAT csv, HEADER true)"
   ```

5. **Importar notificaciones:**
   ```bash
   psql -h billwldqxupcavzurljo.supabase.co -U postgres -d postgres -c "\copy notificaciones (mensaje) FROM 'sample-data/notificaciones.csv' WITH (FORMAT csv, HEADER true)"
   ```

## Notas Importantes

- Reemplaza `billwldqxupcavzurljo.supabase.co` con tu URL de Supabase
- Necesitas las credenciales de tu base de datos
- Los `producto_id` en `movimientos.csv` deben coincidir con los IDs reales de tu tabla `productos`
- Si no tienes los IDs, puedes importar primero los productos y luego actualizar el CSV con los IDs correctos
