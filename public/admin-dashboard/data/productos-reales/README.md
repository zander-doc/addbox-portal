# Productos Reales - ADDBOX

Este directorio contiene los archivos CSV con la estructura de productos del cliente.

## Archivos

- **cvs-1.csv** - 514 líneas con productos de tipo CON, HER, ELE, MAT, PIN, PLO
- **cvs-2.csv** - 474 líneas con productos de tipo MAT, ELE, CON, ACTIVO

## Estructura del CSV

```
CODIGO;DESCRIPCION;UNIDAD;COSTO_PROMEDIO_$;COSTO_PROMEDIO_BS;ENTRADA;SALIDA;EXISTENCIA;CATEGORIA;ESTADO
```

### Columnas

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| CODIGO | Código único del producto | CON-0001 |
| DESCRIPCION | Descripción del producto | AMBIENTADORES |
| UNIDAD | Unidad de medida | UND, LITRO, GALON |
| COSTO_PROMEDIO_$ | Costo en dólares | 9.10 |
| COSTO_PROMEDIO_BS | Costo en bolívares | 332.15 |
| ENTRADA | Cantidad de entrada | 4 |
| SALIDA | Cantidad de salida | 4 |
| EXISTENCIA | Existencia actual | 0 |
| CATEGORIA | Categoría del producto | CONSUMIBLES, HERRAMIENTAS |
| ESTADO | Estado del producto | ACTIVO |

## Uso

### 1. Actualizar Esquema de Base de Datos

Ejecutar el script SQL en Supabase:
```sql
-- Archivo: sql/update-productos-schema.sql
```

Este script:
- Añade columnas nuevas a la tabla `productos`
- Crea tabla `tasas_cambio`
- Crea funciones para conversión USD→VES

### 2. Importar Productos

1. Ir a **Importar Productos CSV** en el menú
2. Seleccionar `cvs-1.csv` o `cvs-2.csv`
3. Verificar vista previa
4. Hacer clic en **Importar Productos**

### 3. Configurar Tasa de Cambio

1. Ir a **Tasa de Cambio USD→VES** en el menú
2. Ver tasa actual
3. Actualizar manualmente si es necesario

## Notas

- Los productos se insertan con `ON CONFLICT (codigo)` para evitar duplicados
- Si un producto ya existe, se actualiza con los nuevos datos
- El stock inicial se crea en todas las obras activas con cantidad 0
- La conversión USD→VES se hace automáticamente usando la tasa del día
