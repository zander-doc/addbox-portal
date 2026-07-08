# Requirements Document

## Introduction

Gráfica de barras verticales que muestra la cantidad de productos agrupados por categoría en el módulo de productos del admin-dashboard de ADDBOX PRO. La funcionalidad se implementa mediante una función RPC en Supabase (`productos_por_categoria`) que realiza un LEFT JOIN entre las tablas `categorias` y `productos`, un servicio que normaliza los datos, un controlador que orquesta la carga, y un componente UI que renderiza la gráfica con ApexCharts. Se integra en la página `productos.html` y se invoca al cargar la página.

## Glossary

- **Sistema**: La aplicación ADDBOX admin-dashboard en su conjunto
- **RPC_Productos_Por_Categoria**: Función RPC de Supabase llamada `productos_por_categoria` que retorna el conteo de productos agrupados por categoría
- **Servicio_Productos**: Archivo `productos.service.js` que expone funciones de acceso a datos para el módulo de productos
- **Controlador_Productos**: Archivo `productos.controller.js` que orquesta flujos, eventos y carga de datos del módulo de productos
- **UI_Productos**: Archivo `productos.ui.js` que contiene funciones de renderizado visual del módulo de productos
- **ApexCharts**: Librería de gráficos JavaScript utilizada para visualizaciones en el proyecto
- **Dataset**: Array de objetos con estructura `[{label, value}]` que representa los datos normalizados para la gráfica
- **RLS**: Row Level Security de Supabase, políticas de acceso a nivel de fila

## Requirements

### Requirement 1: Función RPC en Supabase

**User Story:** Como desarrollador, quiero una función RPC en Supabase que retorne el conteo de productos por categoría, para obtener los datos agregados de forma eficiente desde la base de datos.

#### Acceptance Criteria

1. THE RPC_Productos_Por_Categoria SHALL ejecutar un LEFT JOIN entre la tabla `categorias` y la tabla `productos` agrupando por nombre de categoría, retornando columnas `category_name` (varchar) y `total_productos` (bigint), ordenados alfabéticamente por `category_name` de forma ascendente
2. WHEN una categoría no tiene productos asociados, THE RPC_Productos_Por_Categoria SHALL retornar esa categoría con `total_productos` igual a 0
3. THE RPC_Productos_Por_Categoria SHALL tener RLS habilitado con políticas que permitan únicamente operaciones de lectura (SELECT) para los roles admin, jefe y almacenista
4. IF un usuario sin rol autorizado (admin, jefe o almacenista) invoca la RPC, THEN THE Sistema SHALL denegar el acceso y retornar un error indicando permisos insuficientes, sin revelar datos de categorías ni conteos
5. THE RPC_Productos_Por_Categoria SHALL contabilizar en `total_productos` únicamente los productos cuyo estado sea activo en la tabla `productos`

### Requirement 2: Función de Servicio

**User Story:** Como desarrollador, quiero una función de servicio que invoque la RPC y normalice los datos, para desacoplar la capa de datos de la capa de presentación.

#### Acceptance Criteria

1. THE Servicio_Productos SHALL exportar una función asíncrona `getProductosPorCategoria()` sin parámetros que invoque la RPC `productos_por_categoria` mediante el cliente Supabase y retorne un Array de objetos `{label, value}`
2. WHEN la RPC retorna datos exitosamente, THE Servicio_Productos SHALL transformar cada registro `{category_name, total_productos}` en un objeto `{label, value}` donde `label` es el nombre de la categoría como cadena de texto y `value` es el total de productos convertido a número entero mediante truncamiento (sin decimales), con un valor mínimo de 0
3. IF la RPC retorna un error, THEN THE Servicio_Productos SHALL lanzar una excepción con el mensaje de error proporcionado por Supabase sin modificarlo
4. WHEN la RPC retorna un array vacío, THE Servicio_Productos SHALL retornar un array vacío sin lanzar error
5. THE Servicio_Productos SHALL garantizar que ningún objeto del array retornado contenga valores null en los campos `label` ni `value`; si `category_name` es null o undefined, el campo `label` SHALL ser la cadena "Sin categoría", y si `total_productos` es null o undefined, el campo `value` SHALL ser 0

### Requirement 3: Función de Controlador

**User Story:** Como desarrollador, quiero una función de controlador que orqueste la carga de datos y la renderización de la gráfica, para mantener la separación de responsabilidades del patrón controller/service/ui.

#### Acceptance Criteria

1. THE Controlador_Productos SHALL exportar una función asíncrona `cargarGraficaProductosPorCategoria()` que invoque `getProductosPorCategoria()` del Servicio_Productos y pase el Dataset resultante a `renderGraficaProductosPorCategoria(dataset)` de UI_Productos, incluyendo el caso en que el Dataset sea un array vacío
2. IF `getProductosPorCategoria()` lanza un error, THEN THE Controlador_Productos SHALL mostrar un mensaje de error al usuario mediante `showToast` con tipo "error" indicando que la carga de datos de la gráfica falló, y no invocar `renderGraficaProductosPorCategoria`
3. WHEN la página de productos se carga (evento DOMContentLoaded), THE Controlador_Productos SHALL invocar `cargarGraficaProductosPorCategoria()` sin depender de que otras funciones de inicialización se hayan completado previamente
4. IF `renderGraficaProductosPorCategoria()` lanza un error, THEN THE Controlador_Productos SHALL mostrar un mensaje de error al usuario mediante `showToast` con tipo "error" indicando que la renderización de la gráfica falló

### Requirement 4: Componente UI de Gráfica

**User Story:** Como usuario del sistema, quiero ver una gráfica de barras verticales con los productos agrupados por categoría, para visualizar rápidamente la distribución de productos en el inventario.

#### Acceptance Criteria

1. THE UI_Productos SHALL exportar una función `renderGraficaProductosPorCategoria(dataset)` que reciba un dataset en formato de array de objetos con las propiedades `label` (string, nombre de la categoría) y `value` (number, cantidad de productos), y renderice una gráfica de barras verticales utilizando ApexCharts dentro del contenedor con id `chart-productos-por-categoria`
2. THE UI_Productos SHALL configurar la gráfica con barras verticales (tipo "bar"), etiquetas en el eje X correspondientes a los nombres de categoría con un máximo de 20 caracteres visibles (truncando con "…" los nombres que excedan ese límite), valores numéricos enteros en el eje Y correspondientes al total de productos, y una animación de entrada con duración de 800 milisegundos
3. WHEN el dataset contiene al menos un objeto con propiedad `label` de tipo string no vacío y propiedad `value` de tipo number mayor o igual a cero, THE UI_Productos SHALL asignar colores consistentes a las barras utilizando una paleta predefinida de al menos 8 colores que asigne el mismo color a la misma categoría entre recargas mediante un mapeo determinista basado en el nombre de la categoría
4. IF el dataset es un array vacío o es null o undefined, THEN THE UI_Productos SHALL mostrar un mensaje de texto dentro del contenedor indicando que no hay datos disponibles para la gráfica, sin renderizar ejes ni elementos del chart
5. IF el contenedor `chart-productos-por-categoria` no existe en el DOM, THEN THE UI_Productos SHALL no ejecutar la renderización y no lanzar errores
6. IF el dataset contiene más de 50 categorías, THEN THE UI_Productos SHALL renderizar únicamente las primeras 50 categorías ordenadas alfabéticamente por nombre de categoría

### Requirement 5: Integración en HTML

**User Story:** Como usuario del sistema, quiero que la gráfica de productos por categoría se muestre en la página de productos, para acceder a la visualización sin navegar a otra sección.

#### Acceptance Criteria

1. THE Sistema SHALL incluir en `productos.html` un contenedor `<div>` con id `chart-productos-por-categoria` y una altura mínima de 300px, ubicado después de la sección de KPIs y antes de la sección de acciones rápidas
2. THE Sistema SHALL cargar la librería ApexCharts mediante una etiqueta `<script>` con fuente CDN en `productos.html`, posicionada antes de la etiqueta `<script>` del controlador de productos
3. WHEN la página de productos dispara el evento DOMContentLoaded, THE Sistema SHALL obtener los productos de la base de datos, agruparlos por categoría, y renderizar una gráfica de tipo barra dentro del contenedor `chart-productos-por-categoria` mostrando la cantidad de productos por cada categoría
4. IF no existen productos registrados o ningún producto tiene categoría asignada, THEN THE Sistema SHALL mostrar dentro del contenedor `chart-productos-por-categoria` un mensaje indicando que no hay datos disponibles para generar la gráfica
5. IF la librería ApexCharts no se carga correctamente, THEN THE Sistema SHALL mostrar dentro del contenedor `chart-productos-por-categoria` un mensaje indicando que la gráfica no pudo ser cargada

### Requirement 6: Validación de Datos

**User Story:** Como desarrollador, quiero garantizar la integridad de los datos retornados por la RPC, para evitar errores de renderizado y asegurar la consistencia de la gráfica.

#### Acceptance Criteria

1. THE RPC_Productos_Por_Categoria SHALL retornar un valor de `total_productos` mayor o igual a 0 para cada fila del resultado, garantizando que no existan valores negativos
2. THE RPC_Productos_Por_Categoria SHALL retornar exactamente una fila por cada categoría, sin nombres de categoría duplicados en el resultado; los productos cuyo `categoria_id` sea null SHALL agruparse bajo una única fila con `category_name` igual a "Sin categoría"
3. THE RPC_Productos_Por_Categoria SHALL garantizar que la suma de todos los valores `total_productos` del resultado sea igual al número total de filas en la tabla `productos`, incluyendo tanto los productos con categoría asignada como los productos sin categoría agrupados bajo "Sin categoría"
4. THE RPC_Productos_Por_Categoria SHALL retornar un valor numérico entero (no null) en la columna `total_productos` para cada fila del resultado
5. WHEN la tabla `productos` no contiene registros, THE RPC_Productos_Por_Categoria SHALL retornar las categorías existentes con `total_productos` igual a 0 y no incluir la fila "Sin categoría"
