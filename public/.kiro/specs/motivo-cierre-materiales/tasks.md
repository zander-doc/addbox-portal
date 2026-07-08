# Implementation Plan: Motivo de Cierre para Materiales Fuera

## Overview

Extensión del módulo de Devoluciones para soportar motivos de cierre (devuelto, consumido, extraviado, dañado-baja, dañado-reparación). Solo "devuelto" incrementa stock. Se agregan 2 columnas a la BD, se modifica el servicio, el controlador y el modal HTML.

## Tasks

- [x] 1. Configurar esquema de base de datos
  - [x] 1.1 Agregar columnas motivo_cierre y estado_especial
    - Actualizar `modules/devoluciones/devoluciones-setup.sql`
    - `ALTER TABLE documentos_inventario_detalle ADD COLUMN IF NOT EXISTS motivo_cierre text`
    - `ALTER TABLE documentos_inventario_detalle ADD COLUMN IF NOT EXISTS estado_especial text`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Actualizar capa de servicio
  - [x] 2.1 Modificar `registrarDevolucion()` para recibir y procesar motivo
    - Agregar parámetro `motivo` con default "devuelto"
    - Validar que motivo sea uno de los 5 valores permitidos
    - Solo incrementar `existencia` cuando motivo === "devuelto"
    - Siempre actualizar `cantidad_devuelta += Q` y `fecha_devolucion = hoy`
    - Siempre persistir `motivo_cierre` en el UPDATE del detalle
    - Si motivo === "danado_reparacion", set `estado_especial = "en_reparacion"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 3. Actualizar UI del modal
  - [x] 3.1 Agregar select de motivo en el modal HTML
    - En `registrar_devolucion.html`, agregar columna "Motivo" en la tabla del modal
    - Select con opciones: Devuelto, Consumido, Extraviado, Dañado - Baja, Dañado - Reparación
    - Default: "Devuelto"
    - Agregar CSS para el select consistente con el módulo
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Modificar `confirmarDevolucion()` para enviar motivo
    - Leer el valor del select de motivo por cada fila
    - Pasar motivo a `registrarDevolucion()`
    - Validar que motivo no esté vacío antes de enviar
    - _Requirements: 3.4, 3.5_

  - [x] 3.3 Ajustar "Devolver todo" para usar motivo default
    - El botón "Devolver todo" usa "devuelto" como motivo sin mostrar modal
    - _Requirements: 3.6_

- [x] 4. Indicadores visuales
  - [x] 4.1 Mostrar motivo en tabla cuando documentos cerrados están visibles
    - Cuando toggle "Mostrar documentos cerrados" está activo, mostrar motivo como badge en columna Estado
    - Colores: Devuelto (verde), Consumido (azul), Extraviado (naranja), Baja (rojo), Reparación (amarillo + 🔧)
    - Mostrar 🔧 para items con estado_especial = "en_reparacion"
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Property-based tests
  - [x]* 5.1 Test: stock solo se modifica con motivo "devuelto"
    - **Property 1**: existencia += Q si y solo si motivo === "devuelto"
    - _Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 5.2 Test: pendiente siempre se cierra independiente del motivo
    - **Property 2**: cantidad_devuelta += Q para todos los motivos
    - _Validates: Requirements 2.7_

  - [x]* 5.3 Test: estado_especial solo con "danado_reparacion"
    - **Property 3**: estado_especial = "en_reparacion" ↔ motivo === "danado_reparacion"
    - _Validates: Requirements 2.6_

  - [x]* 5.4 Test: motivo_cierre siempre se persiste
    - **Property 4**: motivo_cierre siempre se guarda
    - _Validates: Requirements 2.9_

  - [x]* 5.5 Test: motivos inválidos son rechazados
    - **Property 5**: motivo ∉ valores permitidos → error
    - _Validates: Requirements 2.10_

- [x] 6. Checkpoint final
  - Verificar que todo funciona correctamente.

## Notes

- Retrocompatible: si no se pasa motivo, se asume "devuelto"
- No se crean reportes en esta iteración, solo se persisten datos
- El realtime existente ya cubre los cambios (suscripción a UPDATE en detalle)
- Tasks marcadas con `*` son opcionales para MVP

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] }
  ]
}
```
