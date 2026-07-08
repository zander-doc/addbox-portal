# Cambios para Productos Reales - ADDBOX

## Resumen

Se ha actualizado el sistema para soportar la nueva estructura de productos del cliente con:
- Conversión automática USD → VES
- Importación de productos desde CSV
- Tasa de cambio configurable

## Archivos Creados

### 1. Datos
- `data/productos-reales/cvs-1.csv` - 514 líneas de productos
- `data/productos-reales/cvs-2.csv` - 474 líneas de productos
- `data/productos-reales/README.md` - Documentación de los CSV

### 2. Base de Datos
- `sql/update-productos-schema.sql` - Script para añadir columnas nuevas
- `sql/insert-productos-csv.sql` - Script auxiliar para insertar productos

### 3. Servicios
- `services/importService.js` - Servicio para importar CSV y gestionar tasas de cambio

### 4. Páginas
- `importar-productos.html` - Interfaz para importar productos desde CSV
- `importar-productos.js` - Controlador de importación
- `config-tasa-cambio.html` - Interfaz para configurar tasa de cambio
- `config-tasa-cambio.js` - Controlador de tasa de cambio

### 5. Configuración
- `assets/js/sidebar.js` - Actualizado con nuevos enlaces

## Estructura de Base de Datos

### Tabla: productos (actualizada)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| codigo | TEXT | Código único |
| nombre | TEXT | Nombre del producto |
| descripcion | TEXT | Descripción |
| costo_prom | NUMERIC(10,2) | Costo promedio en BS |
| costo_prom_dolares | NUMERIC(10,2) | Costo promedio en USD (NUEVO) |
| stock | INTEGER | Stock total |
| estado | TEXT | Estado (ACTIVO/INACTIVO) |
| unidad | TEXT | Unidad de medida |
| existencia | NUMERIC(10,2) | Existencia |
| ubicacion | TEXT | Ubicación |
| categoria | TEXT | Categoría (NUEVO) |
| creado_en | TIMESTAMP | Fecha de creación |
| umbral_critico | INTEGER | Umbral crítico (NUEVO) |
| umbral_alerta | INTEGER | Umbral de alerta (NUEVO) |

### Tabla: tasas_cambio (nueva)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Primary key |
| fecha | DATE | Fecha de la tasa |
| tasa | NUMERIC(10,4) | Tasa USD → VES |
| fuente | TEXT | Fuente (BCV, DolarToday, etc.) |
| creado_en | TIMESTAMPTZ | Fecha de creación |

## Funciones SQL

### `obtener_tasa_del_dia()`
Retorna la tasa de cambio actual del día.

### `usd_a_bs(monto_usd NUMERIC)`
Convierte un monto en dólares a bolívares usando la tasa del día.

## Uso

### Paso 1: Actualizar Base de Datos

Ejecutar en Supabase SQL Editor:
```sql
-- Archivo: sql/update-productos-schema.sql
```

### Paso 2: Importar Productos

1. Ir a **Importar Productos CSV** en el menú
2. Seleccionar `cvs-1.csv` o `cvs-2.csv`
3. Verificar vista previa
4. Hacer clic en **Importar Productos**

### Paso 3: Configurar Tasa de Cambio

1. Ir a **Tasa de Cambio USD→VES** en el menú
2. Ver tasa actual
3. Actualizar manualmente si es necesario

## Notas Importantes

- Los productos se insertan con `ON CONFLICT (codigo)` para evitar duplicados
- Si un producto ya existe, se actualiza con los nuevos datos
- El stock inicial se crea en todas las obras activas con cantidad 0
- La conversión USD→VES se hace automáticamente usando la tasa del día
- El sistema mantiene la compatibilidad con el esquema anterior

## Próximos Pasos

- [ ] Ejecutar script SQL `update-productos-schema.sql` en Supabase
- [ ] Importar productos desde CSV
- [ ] Configurar tasa de cambio inicial
- [ ] Verificar que los productos aparezcan en el inventario
- [ ] Probar conversión USD→VES
