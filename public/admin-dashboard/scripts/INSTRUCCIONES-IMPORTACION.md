# 📦 Instrucciones para Importar Inventario Real

## Pasos:

### 1. Colocar el CSV completo
Copia tu archivo `CSV COMPLETO.csv` a:
```
admin-dashboard/data/CSV-COMPLETO.csv
```

> **IMPORTANTE**: El archivo que ya está ahí solo tiene las primeras 50 líneas como ejemplo. 
> Debes reemplazarlo con el CSV completo de ~580 productos.

### 2. Instalar dependencias
```bash
cd d:\alexander\arte\addbox_a5grafic\Addbox\frontend\public\admin-dashboard\scripts
npm install
```

### 3. Ejecutar el script
```bash
npm run importar
```

O directamente:
```bash
node importar-inventario-real.js
```

### 4. Verificar en Supabase
Abre el SQL Editor de Supabase y ejecuta:
```sql
-- Contar productos
SELECT COUNT(*) as total_productos FROM productos;

-- Contar movimientos de entrada
SELECT COUNT(*) as total_movimientos FROM movimientos WHERE motivo = 'Carga inicial de inventario real';

-- Ver resumen por categoría
SELECT categoria, COUNT(*) as cantidad 
FROM productos 
GROUP BY categoria 
ORDER BY cantidad DESC;
```

## ¿Qué hace el script?

1. **Lee el CSV** con separador `;` (punto y coma)
2. **Inserta ~580 productos** en la tabla `productos` (upsert por código)
3. **Crea movimientos de entrada** para cada producto con existencia > 0
4. **Actualiza el campo existencia** en la tabla productos

## Datos que se importan:
- Código (ej: CON-0001, HER-0001, MAT-0001)
- Descripción
- Unidad (UND, GALON, SACO, M3, etc.)
- Costo promedio en USD
- Categoría (CONSUMIBLES, HERRAMIENTAS, MATERIALES, ELECTRICIDAD, PINTURA, PLOMERIA)
- Estado (ACTIVO)
- Existencia actual → genera movimiento de entrada

## Fecha de entrada
Todos los movimientos se registran con fecha **2025-05-29** y motivo "Carga inicial de inventario real".
