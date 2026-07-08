# Requirements Document

## Introduction

Sistema de inventario en tiempo real para ADDBOX que gestiona el stock físico de productos a través de múltiples ubicaciones (obras). El sistema rastrea movimientos de inventario (entradas, salidas, transferencias, ajustes), valida disponibilidad de stock, soporta reconciliación entre stock físico y del sistema, y proporciona actualizaciones en tiempo real mediante Supabase Realtime. Reemplaza la gestión manual actual de existencias con un flujo auditable y multi-almacén.

## Glossary

- **Sistema_Inventario**: Módulo principal de gestión de inventario en tiempo real dentro del dashboard ADDBOX
- **Movimiento**: Registro de una operación de stock (entrada, salida, transferencia o ajuste) con trazabilidad completa
- **Obra**: Ubicación física o proyecto de construcción que funciona como almacén independiente con su propio stock
- **Producto**: Artículo registrado en el catálogo de inventario con código, descripción, unidad y costo promedio
- **Stock_Sistema**: Cantidad de un producto calculada por el sistema a partir del historial de movimientos
- **Stock_Fisico**: Cantidad real de un producto verificada mediante conteo físico en una obra
- **Reconciliacion**: Proceso de comparar Stock_Fisico contra Stock_Sistema y generar ajustes para corregir diferencias
- **Transferencia**: Movimiento de stock de una obra origen a una obra destino
- **Ajuste**: Movimiento correctivo que modifica el stock sin entrada ni salida externa, generado por reconciliación o corrección manual
- **Conteo_Fisico**: Evento de inventario donde se registra la cantidad real de productos en una obra específica
- **Lote_Operacion**: Conjunto de movimientos agrupados que se procesan como una unidad atómica
- **Pista_Auditoria**: Registro inmutable de cada operación realizada, incluyendo usuario, fecha, tipo y detalle
- **Suscripcion_Realtime**: Conexión persistente a Supabase Realtime que notifica cambios de stock al cliente
- **Umbral_Critico**: Nivel mínimo de stock (por defecto 5 unidades) que activa alertas de reabastecimiento
- **Umbral_Alerta**: Nivel de stock entre crítico y normal (por defecto 5-9 unidades) que indica precaución
- **Usuario**: Persona autenticada con un rol asignado (admin, almacenista, supervisor, dueno/jefe)

## Requirements

### Requirement 1: Gestión de Movimientos de Stock

**User Story:** Como almacenista, quiero registrar entradas, salidas, transferencias y ajustes de productos, para que cada cambio de stock quede documentado con trazabilidad completa.

#### Acceptance Criteria

1. WHEN el Usuario registra una entrada de producto con una cantidad entre 1 y 999,999 unidades, THE Sistema_Inventario SHALL crear un Movimiento de tipo "entrada" con cantidad, producto, obra destino, fecha y usuario responsable
2. WHEN el Usuario registra una salida de producto con una cantidad entre 1 y 999,999 unidades, THE Sistema_Inventario SHALL crear un Movimiento de tipo "salida" con cantidad, producto, obra origen, fecha y usuario responsable
3. WHEN el Usuario registra una transferencia, THE Sistema_Inventario SHALL crear dos Movimientos vinculados: una salida en la obra origen y una entrada en la obra destino con la misma cantidad y referencia cruzada
4. WHEN el Usuario registra un ajuste, THE Sistema_Inventario SHALL crear un Movimiento de tipo "ajuste" con cantidad (entre -999,999 y 999,999, excluyendo cero), producto, obra, motivo con un mínimo de 10 caracteres y usuario responsable
5. THE Sistema_Inventario SHALL asociar cada Movimiento con un identificador único, marca de tiempo de creación y el identificador del Usuario que lo ejecutó
6. IF la cantidad ingresada está fuera del rango permitido o es cero para entradas y salidas, THEN THE Sistema_Inventario SHALL rechazar el registro y presentar un mensaje de error indicando el rango válido de cantidad
7. IF el stock disponible del producto en la obra origen es menor que la cantidad solicitada en una salida o transferencia, THEN THE Sistema_Inventario SHALL rechazar el registro y presentar un mensaje de error indicando el stock disponible actual
8. WHEN el Sistema_Inventario crea un Movimiento exitosamente, THE Sistema_Inventario SHALL actualizar el stock disponible del producto en la obra correspondiente sumando o restando la cantidad según el tipo de movimiento

### Requirement 2: Validación de Stock

**User Story:** Como administrador, quiero que el sistema impida salidas que excedan el stock disponible, para que no se registren cantidades negativas en el inventario.

#### Acceptance Criteria

1. WHEN el Usuario intenta registrar una salida, THE Sistema_Inventario SHALL verificar que la cantidad solicitada sea un número mayor que cero y menor o igual al Stock_Sistema del producto en la obra especificada
2. IF la cantidad de salida excede el Stock_Sistema disponible, THEN THE Sistema_Inventario SHALL rechazar la operación, mostrar un mensaje indicando el stock disponible actual y preservar los datos ingresados por el Usuario en el formulario
3. WHEN el Usuario intenta registrar una transferencia, THE Sistema_Inventario SHALL verificar que la cantidad a transferir sea un número mayor que cero y menor o igual al Stock_Sistema del producto en la obra origen
4. IF la cantidad de transferencia excede el Stock_Sistema en la obra origen, THEN THE Sistema_Inventario SHALL rechazar la operación, mostrar un mensaje indicando el stock disponible en la obra origen y preservar los datos ingresados por el Usuario en el formulario
5. THE Sistema_Inventario SHALL calcular el Stock_Sistema de un producto en una obra como la suma de entradas y ajustes positivos menos la suma de salidas y ajustes negativos para esa combinación producto-obra
6. IF dos o más operaciones concurrentes intentan reducir el Stock_Sistema del mismo producto en la misma obra, THEN THE Sistema_Inventario SHALL procesar cada operación de forma atómica verificando el Stock_Sistema al momento de persistir, y rechazar cualquier operación que resulte en stock negativo

### Requirement 3: Gestión Multi-Almacén

**User Story:** Como administrador, quiero gestionar el stock de productos por obra, para que cada ubicación tenga visibilidad independiente de su inventario.

#### Acceptance Criteria

1. THE Sistema_Inventario SHALL mantener un registro de Stock_Sistema independiente para cada combinación de Producto y Obra
2. WHEN el Usuario consulta el inventario, THE Sistema_Inventario SHALL mostrar el stock desglosado por Obra incluyendo para cada producto: nombre, código, cantidad en stock, unidad y estado de alerta, con opción de ver el total consolidado de todas las Obras
3. WHEN el Usuario selecciona una Obra específica, THE Sistema_Inventario SHALL mostrar únicamente los productos y los últimos 50 movimientos asociados a esa Obra, con opción de cargar movimientos anteriores mediante paginación
4. WHILE el Usuario tiene rol admin o jefe, THE Sistema_Inventario SHALL permitir visualizar el stock consolidado de todas las Obras en una vista resumen que muestre por cada producto: stock total sumado de todas las Obras, número de Obras donde está presente y valor total del inventario
5. WHEN se crea un nuevo Producto, THE Sistema_Inventario SHALL inicializar su Stock_Sistema en cero para todas las Obras existentes
6. WHEN se crea una nueva Obra, THE Sistema_Inventario SHALL inicializar el Stock_Sistema en cero para todos los Productos existentes en esa Obra
7. IF el Usuario con rol almacenista consulta el inventario, THEN THE Sistema_Inventario SHALL mostrar únicamente las Obras asignadas a ese Usuario

### Requirement 4: Actualizaciones en Tiempo Real

**User Story:** Como almacenista, quiero ver los cambios de stock reflejados inmediatamente sin recargar la página, para que siempre trabaje con información actualizada.

#### Acceptance Criteria

1. WHEN se inserta un nuevo Movimiento en la base de datos, THE Sistema_Inventario SHALL actualizar la vista de stock del producto afectado en todos los clientes conectados en un plazo máximo de 3 segundos
2. WHEN el Usuario abre la vista de inventario, THE Sistema_Inventario SHALL establecer una Suscripcion_Realtime a la tabla de movimientos filtrada por la Obra activa, y cancelar cualquier Suscripcion_Realtime previa cuando el Usuario cambia de Obra o abandona la vista
3. IF la Suscripcion_Realtime se desconecta, THEN THE Sistema_Inventario SHALL intentar reconectar automáticamente con un máximo de 5 intentos usando intervalos crecientes (1s, 2s, 4s, 8s, 16s) y mostrar un indicador visual de estado "reconectando" al Usuario durante los reintentos
4. WHEN se recibe una actualización en tiempo real, THE Sistema_Inventario SHALL actualizar los KPIs (total productos, valor inventario, stock crítico, productos activos) sin recargar la página completa
5. WHILE la Suscripcion_Realtime está activa, THE Sistema_Inventario SHALL mostrar un indicador visual de "conectado" en la interfaz
6. IF los 5 intentos de reconexión de la Suscripcion_Realtime se agotan sin éxito, THEN THE Sistema_Inventario SHALL mostrar un indicador visual de "desconectado", deshabilitar las actualizaciones automáticas y presentar al Usuario un botón para reintentar la conexión manualmente

### Requirement 5: Reconciliación de Inventario

**User Story:** Como supervisor, quiero comparar el stock físico con el stock del sistema, para identificar y corregir discrepancias de inventario.

#### Acceptance Criteria

1. WHEN el Usuario inicia un Conteo_Fisico para una Obra, THE Sistema_Inventario SHALL presentar la lista de productos de esa Obra con campos para ingresar la cantidad física contada, aceptando únicamente valores numéricos enteros iguales o mayores a cero y con un máximo de 999,999 unidades por producto
2. WHEN el Usuario confirma la finalización del Conteo_Fisico habiendo ingresado la cantidad física para al menos un producto, THE Sistema_Inventario SHALL calcular la diferencia entre Stock_Fisico y Stock_Sistema para cada producto contado y cambiar el estado del Conteo_Fisico a "completado"
3. IF existen diferencias entre Stock_Fisico y Stock_Sistema al completar un Conteo_Fisico, THEN THE Sistema_Inventario SHALL generar una Reconciliacion que liste cada producto con diferencia mostrando: nombre del producto, Stock_Sistema, Stock_Fisico y la diferencia (positiva o negativa), y permitir al Usuario aprobar o rechazar los ajustes
4. WHEN el Usuario aprueba una Reconciliacion, THE Sistema_Inventario SHALL crear Movimientos de tipo "ajuste" automáticos para igualar el Stock_Sistema al Stock_Fisico reportado y cambiar el estado del Conteo_Fisico a "reconciliado"
5. IF el Usuario rechaza una Reconciliacion, THEN THE Sistema_Inventario SHALL descartar los ajustes propuestos, mantener el Stock_Sistema sin cambios y retornar el Conteo_Fisico al estado "completado" permitiendo iniciar una nueva Reconciliacion
6. THE Sistema_Inventario SHALL registrar cada Conteo_Fisico con fecha, Obra, Usuario responsable y estado (en_progreso, completado, reconciliado)
7. WHILE un Conteo_Fisico está en estado "en_progreso" para una Obra, THE Sistema_Inventario SHALL mostrar una alerta visual indicando que hay un conteo activo en esa Obra a todos los Usuarios que accedan al inventario de dicha Obra
8. IF el Usuario intenta ingresar un valor de Stock_Fisico no numérico, negativo o superior a 999,999, THEN THE Sistema_Inventario SHALL rechazar la entrada y mostrar un mensaje de error indicando el rango válido

### Requirement 6: Operaciones por Lote

**User Story:** Como almacenista, quiero registrar múltiples movimientos de una sola vez, para agilizar la carga de entradas masivas o conteos de inventario.

#### Acceptance Criteria

1. WHEN el Usuario inicia un Lote_Operacion, THE Sistema_Inventario SHALL permitir agregar entre 1 y 500 líneas de movimiento (producto, cantidad, tipo, obra) antes de confirmar
2. WHEN el Usuario confirma un Lote_Operacion, THE Sistema_Inventario SHALL validar cada línea individualmente (producto existente, cantidad mayor a cero, tipo válido, obra existente y stock suficiente para salidas) y rechazar la confirmación si alguna línea es inválida, sin procesar ninguna línea hasta que todas sean válidas
3. IF alguna línea del Lote_Operacion falla la validación, THEN THE Sistema_Inventario SHALL marcar cada línea inválida con el motivo específico del error y permitir al Usuario corregirlas sin perder las líneas válidas
4. WHEN todas las líneas del Lote_Operacion son válidas y el Usuario confirma, THE Sistema_Inventario SHALL procesar todas las líneas como una transacción atómica y registrar todos los Movimientos con una referencia común al lote para trazabilidad
5. THE Sistema_Inventario SHALL permitir al Usuario importar líneas de movimiento desde un archivo CSV con columnas: codigo_producto, cantidad, tipo, obra
6. IF el archivo CSV importado contiene errores de formato (columnas faltantes, filas malformadas o valores no reconocidos), THEN THE Sistema_Inventario SHALL rechazar la importación y mostrar un mensaje indicando el número de fila y el motivo del error para cada fila inválida
7. IF el archivo CSV importado excede 500 líneas de movimiento, THEN THE Sistema_Inventario SHALL rechazar la importación y mostrar un mensaje indicando el límite máximo permitido

### Requirement 7: Pista de Auditoría

**User Story:** Como administrador, quiero consultar el historial completo de operaciones de inventario, para tener trazabilidad total de quién hizo qué y cuándo.

#### Acceptance Criteria

1. THE Sistema_Inventario SHALL registrar en la Pista_Auditoria cada Movimiento con: identificador de operación, tipo de movimiento, producto, cantidad, obra, usuario, y marca de tiempo con precisión de segundos
2. WHEN el Usuario con rol admin o jefe consulta la Pista_Auditoria, THE Sistema_Inventario SHALL mostrar los registros ordenados por fecha descendente, paginados con un máximo de 50 registros por página, con filtros por tipo, producto, obra, usuario y rango de fechas
3. THE Sistema_Inventario SHALL impedir la modificación o eliminación de registros existentes en la Pista_Auditoria
4. WHEN el Usuario con rol admin o jefe exporta la Pista_Auditoria, THE Sistema_Inventario SHALL generar un archivo CSV con los registros que coincidan con los filtros aplicados, incluyendo las columnas: identificador, tipo de movimiento, producto, cantidad, obra, usuario y fecha, con un límite máximo de 10,000 registros por exportación
5. THE Sistema_Inventario SHALL registrar en la Pista_Auditoria las operaciones de Reconciliacion incluyendo las diferencias encontradas y los ajustes generados
6. IF la consulta de Pista_Auditoria no retorna registros que coincidan con los filtros aplicados, THEN THE Sistema_Inventario SHALL mostrar un mensaje indicando que no se encontraron registros para los criterios seleccionados

### Requirement 8: Alertas de Stock

**User Story:** Como administrador, quiero recibir alertas cuando el stock de un producto baje del umbral crítico, para tomar acciones de reabastecimiento oportunas.

#### Acceptance Criteria

1. WHEN el Stock_Sistema de un producto en una Obra desciende por debajo del Umbral_Critico (por defecto 5 unidades), THE Sistema_Inventario SHALL mostrar una notificación visual tipo badge en el dashboard y resaltar el producto con indicador visual de color rojo en la vista de inventario
2. WHILE el Stock_Sistema de un producto en una Obra es mayor o igual al Umbral_Critico y menor o igual al Umbral_Alerta (por defecto entre 5 y 9 unidades, ambos inclusive), THE Sistema_Inventario SHALL mostrar el producto con indicador visual de color naranja (alerta)
3. WHILE el Stock_Sistema de un producto en una Obra es superior al Umbral_Alerta, THE Sistema_Inventario SHALL mostrar el producto con indicador visual de color verde (normal)
4. WHERE el Usuario con rol admin configura umbrales personalizados por producto, THE Sistema_Inventario SHALL validar que el Umbral_Critico sea un entero entre 1 y 9999, que el Umbral_Alerta sea un entero entre 2 y 9999, y que el Umbral_Critico sea estrictamente menor que el Umbral_Alerta, y utilizar los umbrales personalizados en lugar de los valores por defecto
5. IF el Usuario con rol admin ingresa valores de umbral que no cumplen las reglas de validación, THEN THE Sistema_Inventario SHALL rechazar la configuración y mostrar un mensaje indicando la restricción incumplida
6. THE Sistema_Inventario SHALL mostrar un panel resumen en el dashboard principal con la lista de productos en estado crítico, ordenados por menor stock primero, incluyendo nombre del producto, Obra, stock actual y Umbral_Critico configurado
7. WHEN el Stock_Sistema de un producto en una Obra se recupera por encima del Umbral_Critico, THE Sistema_Inventario SHALL remover la notificación de estado crítico asociada a ese producto y Obra del dashboard y de la vista de inventario

### Requirement 9: Reportes de Inventario

**User Story:** Como jefe/dueño, quiero generar reportes de inventario y movimientos, para tomar decisiones informadas sobre compras y distribución de materiales.

#### Acceptance Criteria

1. WHEN el Usuario solicita un reporte de existencias, THE Sistema_Inventario SHALL generar un listado con producto, stock por obra, stock total, valor unitario y valor total, ordenado alfabéticamente por nombre de producto
2. WHEN el Usuario solicita un reporte de movimientos, THE Sistema_Inventario SHALL generar un listado filtrable por rango de fechas, tipo de movimiento, producto y obra, aplicando por defecto el rango de los últimos 30 días naturales cuando el Usuario no especifica fechas
3. WHEN el Usuario solicita un reporte de valorización, THE Sistema_Inventario SHALL calcular el valor total del inventario multiplicando Stock_Sistema por costo promedio para cada producto en cada obra, y mostrar un gran total consolidado al final del reporte
4. THE Sistema_Inventario SHALL permitir exportar cada reporte en formato CSV incluyendo una fila de encabezado con los nombres de columna y la fecha de generación del reporte
5. WHEN el Usuario solicita un reporte de rotación, THE Sistema_Inventario SHALL calcular el número total de Movimientos registrados por producto dentro del período seleccionado por el Usuario y ordenar los resultados de mayor a menor cantidad de movimientos
6. IF los filtros aplicados a un reporte no retornan registros, THEN THE Sistema_Inventario SHALL mostrar el reporte vacío con un mensaje indicando que no se encontraron datos para los criterios seleccionados

### Requirement 10: Control de Acceso por Rol

**User Story:** Como administrador, quiero que las operaciones de inventario estén restringidas según el rol del usuario, para mantener la seguridad y segregación de funciones.

#### Acceptance Criteria

1. WHILE el Usuario tiene rol "almacenista", THE Sistema_Inventario SHALL permitir registrar entradas, salidas y consultar stock únicamente de las Obras asignadas a dicho Usuario, y SHALL impedir el acceso a operaciones de reconciliación, configuración de umbrales, exportación de reportes y gestión de Obras
2. WHILE el Usuario tiene rol "supervisor", THE Sistema_Inventario SHALL permitir consultar stock de todas las Obras, iniciar Conteos_Fisicos y aprobar Reconciliaciones, y SHALL impedir registrar entradas, salidas, configurar umbrales, exportar reportes y gestionar Obras
3. WHILE el Usuario tiene rol "admin" o "jefe", THE Sistema_Inventario SHALL permitir todas las operaciones del módulo de inventario incluyendo: registrar movimientos en cualquier Obra, configuración de umbrales, exportación de reportes, gestión de Obras y aprobación de Reconciliaciones
4. IF un Usuario sin permisos suficientes intenta ejecutar una operación restringida mediante manipulación directa de la interfaz o llamada al backend, THEN THE Sistema_Inventario SHALL rechazar la operación a nivel de servidor, descartar cualquier dato enviado en la solicitud y mostrar un mensaje indicando que el acceso fue denegado para esa operación
5. THE Sistema_Inventario SHALL ocultar botones, opciones de menú y secciones de página correspondientes a operaciones no permitidas según el rol del Usuario activo, de modo que dichos elementos no se rendericen en el DOM
6. WHEN el Usuario con rol "almacenista" no tiene ninguna Obra asignada, THE Sistema_Inventario SHALL mostrar un mensaje indicando que no tiene Obras asignadas y SHALL impedir el acceso a las operaciones de inventario hasta que un administrador le asigne al menos una Obra
