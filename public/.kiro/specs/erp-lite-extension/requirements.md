# Requirements Document

## Introduction

Extensión ERP-Lite para ADDBOX: conjunto de módulos que amplían el sistema de inventario existente con gestión de categorías, unidades, proveedores, compras, costos/valorización y reportes avanzados. Incluye mejoras visuales premium al módulo de productos y optimización arquitectónica del módulo de inventario. Todo se integra sin romper los flujos CRUD ni modales existentes.

## Glossary

- **Sistema**: La aplicación ADDBOX admin-dashboard en su conjunto
- **Módulo_Productos**: Módulo existente de gestión de productos (controller/service/ui)
- **Módulo_Categorías**: Nuevo módulo CRUD para gestionar categorías de productos
- **Módulo_Unidades**: Nuevo módulo CRUD para gestionar unidades de medida
- **Módulo_Compras**: Nuevo módulo para registrar y gestionar órdenes de compra
- **Módulo_Proveedores**: Nuevo módulo CRUD para gestionar proveedores
- **Módulo_Costos**: Nuevo módulo de visualización de valorización de inventario
- **Módulo_Reportes**: Nuevo módulo de reportes avanzados con gráficos y filtros
- **Módulo_Inventario**: Módulo existente de inventario multi-almacén
- **Dashboard_KPI**: Panel de tarjetas con indicadores clave de rendimiento
- **ApexCharts**: Librería de gráficos utilizada para visualizaciones
- **Costo_Promedio_Ponderado**: Método de valorización: (stock_anterior × costo_anterior + cantidad_nueva × costo_nuevo) / (stock_anterior + cantidad_nueva)
- **Proveedor**: Entidad que suministra productos al almacén
- **Compra**: Orden de adquisición de productos a un proveedor con estados borrador/confirmado/anulado
- **Compra_Detalle**: Línea individual dentro de una compra con producto, cantidad y costo unitario
- **Rotación**: Métrica que mide entradas y salidas de un producto en un período
- **Aging**: Tiempo transcurrido sin movimiento para un producto

## Requirements

### Requirement 1: Dashboard Visual Premium del Módulo Productos

**User Story:** Como usuario del sistema, quiero ver un dashboard visual con KPIs, gráficas y filtros por categoría en el módulo de productos, para tener una visión rápida del estado del inventario.

#### Acceptance Criteria

1. WHEN el Módulo_Productos se carga, THE Dashboard_KPI SHALL mostrar tarjetas con: total de productos, productos activos, productos en stock crítico (existencia menor al umbral_critico del producto, con valor por defecto de 5 unidades) y valor total del inventario (suma de costo_prom × existencia de todos los productos)
2. WHEN el Módulo_Productos se carga, THE Sistema SHALL renderizar gráficas ApexCharts con: un gráfico de tipo dona mostrando la distribución de productos por categoría, un gráfico de tipo dona mostrando la distribución por estado (activo/inactivo), y un gráfico de tipo barra horizontal mostrando los top 5 productos con mayor valor de inventario (costo_prom × existencia)
3. WHEN el usuario hace clic en un botón chip de categoría, THE Módulo_Productos SHALL filtrar la tabla de productos mostrando solo los productos de la categoría seleccionada, resaltando visualmente el chip activo; WHEN el usuario hace clic en el mismo chip ya seleccionado, THE Módulo_Productos SHALL desactivar el filtro y mostrar todos los productos
4. IF no existen productos que coincidan con la categoría seleccionada, THEN THE Módulo_Productos SHALL mostrar un mensaje indicando que no hay productos en esa categoría, manteniendo visible la barra de chips de filtro
5. WHEN los datos de productos cambian por operación CRUD local o por evento realtime de Supabase, THE Dashboard_KPI SHALL actualizar los valores de las tarjetas KPI y las gráficas ApexCharts en un máximo de 2 segundos sin recargar la página
6. THE Sistema SHALL integrar las gráficas y filtros chip sin modificar el comportamiento de las operaciones CRUD (crear, editar, eliminar) ni los modales existentes del Módulo_Productos, manteniendo funcionales la búsqueda por texto y los botones de acciones rápidas
7. WHEN el Módulo_Productos se carga, THE Sistema SHALL obtener las categorías disponibles del campo categoría de los productos y renderizar un chip por cada categoría única encontrada; IF no existen categorías asignadas a ningún producto, THEN THE Sistema SHALL ocultar la sección de filtros por categoría

### Requirement 2: Módulo de Categorías

**User Story:** Como administrador, quiero gestionar categorías de productos con un CRUD completo, para organizar el inventario por tipo de producto.

#### Acceptance Criteria

1. THE Módulo_Categorías SHALL permitir crear, leer, actualizar y eliminar registros en la tabla categorias con campos: id, nombre (máximo 100 caracteres), descripcion (máximo 255 caracteres, opcional), estado (valores permitidos: "activo" o "inactivo", por defecto "activo"), creado_en, actualizado_en
2. IF el usuario envía el formulario de categoría con el campo nombre vacío, THEN THE Módulo_Categorías SHALL mostrar un mensaje de error indicando que el nombre es requerido y no guardar el registro
3. IF el usuario envía un nombre de categoría que ya existe en la base de datos (comparación sin distinción de mayúsculas/minúsculas y después de aplicar trim), THEN THE Módulo_Categorías SHALL mostrar un mensaje de error indicando que el nombre debe ser único y no guardar el registro
4. WHEN el usuario ingresa un nombre de categoría con espacios al inicio o final, THE Módulo_Categorías SHALL aplicar trim al valor antes de guardarlo
5. THE Módulo_Productos SHALL mostrar un campo select de categoría en los formularios de crear y editar producto, poblado con las categorías cuyo estado sea "activo", ordenadas alfabéticamente por nombre
6. WHEN el usuario selecciona una categoría en el formulario de producto, THE Sistema SHALL guardar el categoria_id en el registro del producto
7. IF el usuario intenta eliminar una categoría que tiene productos asociados, THEN THE Módulo_Categorías SHALL mostrar un mensaje de error indicando que la categoría no puede eliminarse mientras tenga productos asignados y no eliminar el registro

### Requirement 3: Módulo de Unidades

**User Story:** Como administrador, quiero gestionar unidades de medida con un CRUD completo, para estandarizar las unidades utilizadas en los productos.

#### Acceptance Criteria

1. THE Módulo_Unidades SHALL permitir crear, leer, actualizar y eliminar registros en la tabla unidades con campos: id, nombre (máximo 50 caracteres), abreviatura (máximo 10 caracteres), estado (valores permitidos: "activo" o "inactivo"), creado_en, actualizado_en
2. IF el usuario envía el formulario de unidad con el campo nombre vacío, THEN THE Módulo_Unidades SHALL mostrar un mensaje de error indicando que el nombre es requerido y no crear el registro
3. IF el usuario envía el formulario de unidad con el campo abreviatura vacío, THEN THE Módulo_Unidades SHALL mostrar un mensaje de error indicando que la abreviatura es requerida y no crear el registro
4. THE Módulo_Productos SHALL mostrar un campo select de unidad en los formularios de crear y editar producto, poblado únicamente con las unidades cuyo estado sea "activo", ordenadas alfabéticamente por nombre
5. WHEN el usuario selecciona una unidad en el formulario de producto, THE Sistema SHALL guardar el unidad_id en el registro del producto
6. IF el usuario intenta eliminar una unidad que está referenciada por al menos un producto existente, THEN THE Módulo_Unidades SHALL impedir la eliminación y mostrar un mensaje de error indicando que la unidad está en uso
7. IF el usuario envía el formulario de unidad con un nombre que ya existe en la tabla unidades, THEN THE Módulo_Unidades SHALL mostrar un mensaje de error indicando que el nombre de unidad ya está registrado y no crear ni actualizar el registro

### Requirement 4: Módulo de Proveedores

**User Story:** Como administrador, quiero gestionar proveedores con un CRUD completo y ver su historial de compras, para mantener un registro organizado de mis fuentes de suministro.

#### Acceptance Criteria

1. THE Módulo_Proveedores SHALL permitir crear, leer, actualizar y eliminar registros en la tabla proveedores con campos: id, nombre (máximo 150 caracteres), rif (máximo 20 caracteres), telefono (máximo 20 caracteres), email (máximo 100 caracteres), direccion (máximo 300 caracteres), estado ("activo" o "inactivo", por defecto "activo"), creado_en
2. WHEN el usuario envía el formulario de proveedor, THE Módulo_Proveedores SHALL validar que los campos nombre y rif no estén vacíos antes de permitir la creación o actualización del registro
3. IF el usuario envía el formulario de proveedor con algún campo requerido vacío (nombre o rif), THEN THE Módulo_Proveedores SHALL mostrar un mensaje de error indicando cuál campo es requerido sin enviar datos al servidor
4. WHEN el usuario consulta el detalle de un proveedor, THE Módulo_Proveedores SHALL mostrar el historial de compras asociadas a ese proveedor mostrando fecha, número de compra, monto total y estado de cada compra, ordenadas por fecha descendente, limitado a las 50 compras más recientes
5. IF el usuario intenta eliminar un proveedor que tiene compras asociadas, THEN THE Módulo_Proveedores SHALL impedir la eliminación y mostrar un mensaje de error indicando que existen compras vinculadas a ese proveedor
6. THE Módulo_Proveedores SHALL seguir la arquitectura modular del proyecto con archivos controller.js, service.js y ui.js separados

### Requirement 5: Módulo de Compras

**User Story:** Como administrador, quiero registrar órdenes de compra con detalle de productos, para controlar las adquisiciones y actualizar automáticamente el stock y costos al confirmar.

#### Acceptance Criteria

1. THE Módulo_Compras SHALL permitir crear registros en la tabla compras con campos: id, proveedor_id (referencia a un proveedor activo existente), fecha, estado (borrador/confirmado/anulado), total, creado_en
2. THE Módulo_Compras SHALL permitir agregar líneas de detalle en la tabla compras_detalle con campos: id, compra_id, producto_id (referencia a un producto activo existente), cantidad (entero entre 1 y 999,999), costo_unitario (valor numérico entre 0.01 y 999,999,999.99), subtotal, con un máximo de 100 líneas por compra
3. WHEN el usuario agrega una línea de detalle, THE Módulo_Compras SHALL calcular el subtotal como cantidad multiplicada por costo_unitario y actualizar el total de la compra como la suma de todos los subtotales de sus líneas de detalle
4. WHEN el usuario confirma una compra en estado borrador, THE Módulo_Compras SHALL cambiar el estado a confirmado, registrar un movimiento de entrada por cada línea de detalle y actualizar el stock del producto sumando la cantidad de cada línea al stock existente
5. WHEN una compra se confirma, THE Módulo_Compras SHALL actualizar el costo_prom del producto usando la fórmula de Costo_Promedio_Ponderado: (stock_anterior × costo_anterior + cantidad_nueva × costo_unitario) / (stock_anterior + cantidad_nueva); si stock_anterior + cantidad_nueva es cero, el costo_prom se establece igual al costo_unitario de la línea
6. WHEN una compra se confirma, THE Sistema SHALL registrar la operación en la tabla de auditoría con módulo compras, acción confirmar y descripción del movimiento
7. IF el usuario intenta confirmar una compra sin líneas de detalle, THEN THE Módulo_Compras SHALL rechazar la operación y mostrar un mensaje de error indicando que la compra debe tener al menos un producto
8. WHILE una compra está en estado confirmado o anulado, THE Módulo_Compras SHALL deshabilitar la edición de la compra y sus líneas de detalle, impidiendo modificar campos y agregar o eliminar líneas
9. WHEN el usuario anula una compra en estado borrador, THE Módulo_Compras SHALL cambiar el estado a anulado sin afectar el stock ni el costo_prom de los productos
10. WHEN el usuario anula una compra en estado confirmado, THE Módulo_Compras SHALL cambiar el estado a anulado, registrar un movimiento de salida por cada línea de detalle para revertir el stock y recalcular el costo_prom de cada producto afectado
11. IF el usuario intenta agregar una línea de detalle con cantidad fuera del rango 1 a 999,999 o costo_unitario fuera del rango 0.01 a 999,999,999.99, THEN THE Módulo_Compras SHALL rechazar la línea y mostrar un mensaje de error indicando el rango válido para el campo incumplido

### Requirement 6: Costos y Valorización

**User Story:** Como administrador, quiero ver la valorización del inventario por producto y total general, para conocer el valor monetario de mi stock.

#### Acceptance Criteria

1. WHEN el usuario accede al Módulo_Costos, THE Sistema SHALL mostrar una tabla con columnas: código de producto, descripción, stock actual (campo existencia), costo promedio (campo costo_prom con formato de 2 decimales) y valorización unitaria calculada como existencia multiplicado por costo_prom
2. THE Módulo_Costos SHALL mostrar el total general de valorización como la suma de todas las valorizaciones individuales, posicionado debajo de la tabla y actualizado cada vez que se recarga la vista
3. THE Módulo_Costos SHALL leer los datos de productos invocando las funciones exportadas por productos.service.js sin realizar llamadas directas a Supabase desde el módulo de costos
4. THE Módulo_Costos SHALL incluir una estructura preparada para futura implementación de métodos PEPS y UEPS, exponiendo un selector de método de costeo con las opciones "Costo Promedio", "PEPS" y "UEPS", donde solo "Costo Promedio" estará funcional y las demás mostrarán un indicador de "no disponible"
5. IF el servicio de productos retorna un error o no hay productos registrados, THEN THE Módulo_Costos SHALL mostrar un mensaje indicando que no hay datos de valorización disponibles y el total general SHALL mostrarse como 0
6. IF un producto tiene costo_prom igual a null o 0, THEN THE Módulo_Costos SHALL mostrar la valorización de ese producto como 0 e incluirlo en la tabla con costo promedio mostrado como 0.00

### Requirement 7: Módulo de Reportes Avanzados

**User Story:** Como administrador o jefe, quiero acceder a reportes avanzados con gráficos y filtros, para analizar la rotación, uso y valor de los productos del inventario.

#### Acceptance Criteria

1. WHEN el usuario accede al reporte de rotación, THE Módulo_Reportes SHALL mostrar las entradas y salidas de cada producto en el período seleccionado, con un período por defecto de los últimos 30 días naturales si el usuario no selecciona un rango
2. WHEN el usuario accede al reporte de productos más usados, THE Módulo_Reportes SHALL mostrar los top N productos ordenados por cantidad total de movimientos, donde N es configurable por el usuario con un valor por defecto de 10 y un rango permitido entre 5 y 50
3. WHEN el usuario accede al reporte de mayor valor, THE Módulo_Reportes SHALL mostrar los productos ordenados por valorización descendente (existencia multiplicado por costo_prom), incluyendo las columnas código, descripción, stock, costo promedio y valorización
4. WHEN el usuario accede al reporte de aging, THE Módulo_Reportes SHALL mostrar los productos con el tiempo transcurrido en días desde su último movimiento registrado (campo creado_en de la tabla movimientos), ordenados de mayor a menor antigüedad
5. THE Módulo_Reportes SHALL renderizar los datos en tablas y gráficos utilizando la librería ApexCharts, mostrando al menos un gráfico de barras o líneas por cada tipo de reporte junto con la tabla de datos correspondiente
6. WHEN el usuario aplica filtros de fecha, categoría o proveedor, THE Módulo_Reportes SHALL actualizar los resultados en un máximo de 3 segundos mostrando solo los datos que coincidan con todos los filtros seleccionados simultáneamente
7. IF no existen datos que coincidan con los filtros aplicados, THEN THE Módulo_Reportes SHALL mostrar un mensaje indicando que no se encontraron resultados para los filtros seleccionados y los gráficos SHALL mostrarse vacíos sin errores visuales

### Requirement 8: Optimización del Módulo Inventario

**User Story:** Como desarrollador, quiero que el módulo de inventario siga la misma arquitectura limpia que el módulo de productos, para facilitar el mantenimiento y evitar lógica duplicada.

#### Acceptance Criteria

1. THE Módulo_Inventario SHALL mantener la separación de responsabilidades en archivos: controller.js para orquestación de flujos y eventos, service.js para acceso a datos, y ui.js para renderizado de interfaz
2. THE Módulo_Inventario SHALL centralizar todas las llamadas a Supabase exclusivamente en los archivos service.js, sin que controller.js ni ui.js importen ni invoquen directamente el cliente de Supabase para operaciones de datos del módulo inventario
3. WHEN se refactoriza el Módulo_Inventario, THE Sistema SHALL mantener todos los flujos funcionales existentes sin cambios en el comportamiento del usuario, verificable ejecutando los mismos escenarios de uso (carga de stock por obra, registro de movimientos, vista consolidada, paginación y realtime) con resultados idénticos pre y post refactorización
4. THE Módulo_Inventario SHALL eliminar lógica inline duplicada moviendo funciones reutilizables a los archivos service.js correspondientes, de modo que ninguna función de acceso a datos o transformación de datos aparezca definida en más de un archivo dentro del módulo
