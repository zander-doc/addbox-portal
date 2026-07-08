# Implementation Plan: Products by Category Chart

## Overview

Implementación de una gráfica de barras verticales que muestra la cantidad de productos agrupados por categoría en el módulo de productos del admin-dashboard. Se sigue el patrón Controller → Service → UI existente en el proyecto, con una función RPC en Supabase para la agregación de datos y ApexCharts para la visualización.

## Tasks

- [x] 1. Crear la función RPC en Supabase y configurar seguridad
  - [x] 1.1 Crear la función RPC `productos_por_categoria` en Supabase
    - Crear un archivo de migración SQL con la función `productos_por_categoria` que ejecute un LEFT JOIN entre `categorias` y `productos` (filtrando por `estado = 'activo'`), agrupando por nombre de categoría
    - La función debe retornar columnas `category_name` (VARCHAR) y `total_productos` (BIGINT), ordenadas alfabéticamente por `category_name` ASC
    - Usar `COALESCE(c.nombre, 'Sin categoría')` para manejar categorías con nombre null
    - Usar `SECURITY DEFINER` para la función
    - _Requirements: 1.1, 1.2, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 1.2 Configurar políticas RLS para la función RPC
    - Habilitar RLS en la función y crear políticas que permitan únicamente SELECT para los roles `admin`, `jefe` y `almacenista`
    - Usuarios sin rol autorizado deben recibir un error de permisos insuficientes sin revelar datos
    - _Requirements: 1.3, 1.4_

- [x] 2. Implementar la capa de servicio
  - [x] 2.1 Crear la función `getProductosPorCategoria()` en `productos.service.js`
    - Exportar una función asíncrona sin parámetros que invoque `supabase.rpc('productos_por_categoria')`
    - Transformar cada registro `{category_name, total_productos}` en `{label, value}` donde `label` es string y `value` es entero (truncado, mínimo 0)
    - Si `category_name` es null/undefined, asignar `label = "Sin categoría"`; si `total_productos` es null/undefined, asignar `value = 0`
    - Si la RPC retorna error, lanzar excepción con el mensaje exacto de Supabase
    - Si la RPC retorna array vacío, retornar array vacío sin error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 2.2 Escribir property test para transformación de datos con null safety
    - **Property 4: Data transformation with null safety**
    - Usar fast-check para generar arrays de objetos con campos null/undefined/válidos y verificar que el resultado siempre tiene `label` como string no vacío y `value` como entero >= 0
    - **Validates: Requirements 2.2, 2.5**

  - [x]* 2.3 Escribir property test para propagación de errores
    - **Property 5: Error message propagation**
    - Usar fast-check para generar strings aleatorios como mensajes de error y verificar que la excepción lanzada contiene el mensaje exacto sin modificación
    - **Validates: Requirements 2.3**

- [x] 3. Implementar la capa de controlador
  - [x] 3.1 Crear la función `cargarGraficaProductosPorCategoria()` en `productos.controller.js`
    - Implementar función asíncrona que invoque `getProductosPorCategoria()` del servicio y pase el dataset a `renderGraficaProductosPorCategoria(dataset)` de UI
    - Si el servicio lanza error, mostrar `showToast` con tipo "error" indicando fallo en carga de datos y NO invocar render
    - Si render lanza error, mostrar `showToast` con tipo "error" indicando fallo en renderización
    - Registrar la invocación de `cargarGraficaProductosPorCategoria()` en el evento `DOMContentLoaded`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x]* 3.2 Escribir property test para manejo de errores en controlador
    - **Property 6: Controller error handling**
    - Usar fast-check para generar errores aleatorios en service y render, verificando que siempre se muestra toast de error y que render no se invoca si service falla
    - **Validates: Requirements 3.2, 3.4**

- [x] 4. Checkpoint - Verificar servicio y controlador
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar el componente UI de la gráfica
  - [x] 5.1 Crear la función `renderGraficaProductosPorCategoria(dataset)` en `productos.ui.js`
    - Exportar función que reciba un dataset `Array<{label, value}>` y renderice una gráfica de barras verticales con ApexCharts en el contenedor `#chart-productos-por-categoria`
    - Si el contenedor no existe en el DOM, retornar silenciosamente sin error
    - Si dataset es vacío/null/undefined, mostrar mensaje "No hay datos disponibles para la gráfica" dentro del contenedor
    - Si `typeof ApexChart === 'undefined'`, mostrar mensaje "La gráfica no pudo ser cargada" en el contenedor
    - Si dataset tiene > 50 categorías, tomar las primeras 50 ordenadas alfabéticamente
    - Truncar labels > 20 caracteres con "…"
    - Configurar animación de entrada con duración de 800ms
    - Implementar función de hash determinista para asignar colores consistentes basados en el nombre de categoría usando una paleta de al menos 8 colores
    - Configurar barras distribuidas con `columnWidth: "60%"` y valores enteros en eje Y
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x]* 5.2 Escribir property test para truncamiento de labels
    - **Property 7: Label truncation**
    - Usar fast-check para generar strings de longitud variable (1-200 chars) y verificar que labels > 20 chars se truncan a 20 chars + "…"
    - **Validates: Requirements 4.2**

  - [x]* 5.3 Escribir property test para colores deterministas
    - **Property 8: Deterministic color mapping**
    - Usar fast-check para generar strings aleatorios como nombres de categoría y verificar que la misma categoría siempre recibe el mismo color en múltiples invocaciones
    - **Validates: Requirements 4.3**

  - [x]* 5.4 Escribir property test para límite de 50 categorías
    - **Property 9: Category limit enforcement**
    - Usar fast-check para generar arrays de 51-200 objetos `{label, value}` y verificar que solo se renderizan las primeras 50 categorías ordenadas alfabéticamente
    - **Validates: Requirements 4.6**

- [x] 6. Integración en HTML
  - [x] 6.1 Agregar contenedor y script de ApexCharts en `productos.html`
    - Agregar un `<div id="chart-productos-por-categoria" style="min-height:300px;">` dentro de una sección con título "Productos por Categoría", ubicado después de la sección de KPIs y antes de acciones rápidas
    - Agregar etiqueta `<script>` con CDN de ApexCharts posicionada antes del script del controlador de productos
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Checkpoint final - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- La función RPC usa `SECURITY DEFINER` y RLS para control de acceso
- El patrón Controller → Service → UI se mantiene consistente con el resto del proyecto
- ApexCharts se carga desde CDN antes del controlador para garantizar disponibilidad

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "6.1"] }
  ]
}
```
