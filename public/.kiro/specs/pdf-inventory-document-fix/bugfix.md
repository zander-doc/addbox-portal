# Bugfix Requirements Document

## Introduction

El PDF generado por el módulo de Documentos de Inventario presenta múltiples problemas de formato y renderizado que causan desbordamiento del contenido, posicionamiento incorrecto de elementos, y capturas incompletas del DOM. Estos defectos producen documentos PDF ilegibles o con formato roto cuando se generan desde la interfaz web usando html2pdf.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN el PDF se genera THEN el contenedor `.doc-print-inner` tiene un ancho de 800px que causa desbordamiento horizontal en formato A4

1.2 WHEN la tabla de materiales tiene columnas con contenido largo THEN las columnas se aplastan o desbordan porque no hay `table-layout: fixed`

1.3 WHEN el PDF se genera THEN el código QR puede desplazarse de su posición esperada (arriba a la derecha) por falta de restricciones de ancho mínimo y alineación

1.4 WHEN el encabezado contiene texto largo THEN los elementos del header se rompen en múltiples líneas por falta de `flex-wrap: nowrap`

1.5 WHEN html2pdf captura el DOM THEN el QR puede no estar completamente renderizado porque no hay delay antes de la captura

1.6 WHEN html2pdf genera el PDF THEN la captura puede ser incorrecta porque la configuración no incluye `windowWidth`, `scrollX` ni `scrollY`

1.7 WHEN el contenido del PDF abarca más de una página THEN pueden ocurrir cortes de página incorrectos por falta de reglas `@media print`

1.8 WHEN el PDF se genera en diferentes navegadores/sistemas THEN la fuente puede variar porque no está forzada explícitamente con `font-family` en todos los elementos del contenido PDF

### Expected Behavior (Correct)

2.1 WHEN el PDF se genera THEN el contenedor `.doc-print-inner` SHALL tener un ancho de 750px para caber correctamente en formato A4 sin desbordamiento

2.2 WHEN la tabla de materiales tiene columnas con contenido largo THEN la tabla SHALL usar `table-layout: fixed` y `word-wrap: break-word` para que las columnas mantengan proporciones fijas y el texto se ajuste

2.3 WHEN el PDF se genera THEN el código QR SHALL estar fijado con `min-width` y `text-align: right` para mantener su posición arriba a la derecha

2.4 WHEN el encabezado contiene texto largo THEN el header SHALL usar `flex-wrap: nowrap` para mantener todos los elementos en una sola línea

2.5 WHEN html2pdf captura el DOM THEN SHALL existir un delay de 150ms antes de la generación para permitir que el QR termine de renderizar

2.6 WHEN html2pdf genera el PDF THEN la configuración SHALL incluir `margin` como array, `windowWidth: 800`, `scrollX: 0`, `scrollY: 0` y `letterRendering: true` para capturas correctas

2.7 WHEN el contenido del PDF abarca más de una página THEN SHALL existir reglas `@media print` con `page-break-inside: avoid` en secciones críticas para evitar cortes incorrectos

2.8 WHEN el PDF se genera en cualquier navegador/sistema THEN el contenido SHALL usar `font-family: Arial, sans-serif` forzado explícitamente en todos los elementos para garantizar consistencia tipográfica

### Unchanged Behavior (Regression Prevention)

3.1 WHEN el usuario hace clic en el botón PDF de un documento THEN el sistema SHALL CONTINUE TO generar y descargar el archivo PDF con el nombre `DocInventario_{numero}.pdf`

3.2 WHEN el documento es de tipo TRASLADO THEN el PDF SHALL CONTINUE TO mostrar los campos Origen y Destino en la sección de metadatos

3.3 WHEN el documento no es de tipo TRASLADO THEN el PDF SHALL CONTINUE TO ocultar los campos Origen y Destino

3.4 WHEN el PDF se genera THEN SHALL CONTINUE TO incluir el encabezado con datos de empresa, título del tipo de documento, número, fecha y código QR

3.5 WHEN el PDF se genera THEN SHALL CONTINUE TO incluir la tabla de materiales con columnas Código, Descripción, Unidad, Cantidad y Observaciones

3.6 WHEN el PDF se genera THEN SHALL CONTINUE TO incluir la sección de firmas (Solicitante, Almacén, Autorizado, Transportista)

3.7 WHEN el PDF se genera THEN el contenedor de impresión SHALL CONTINUE TO ocultarse después de la generación (`display: none`)

3.8 WHEN html2pdf no está disponible THEN el sistema SHALL CONTINUE TO usar `window.print()` como fallback
