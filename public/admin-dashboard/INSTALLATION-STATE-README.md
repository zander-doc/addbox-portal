# Guía de Instalación del Estado del Sistema

## Resumen

Este sistema ahora utiliza Supabase para gestionar el estado de instalación en lugar de archivos JSON. Esto permite que el estado se almacene de forma segura y esté disponible en todos los dispositivos.

## Estructura de la Base de Datos

### Tabla: `installation_state`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único del registro |
| `first_run` | BOOLEAN | Indica si es la primera ejecución |
| `master_key_hash` | TEXT | Hash SHA-256 de la clave maestra |
| `installation_complete` | BOOLEAN | Indica si la instalación está completa |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |
| `completed_at` | TIMESTAMP | Fecha de finalización de instalación |

## Configuración Inicial

### Paso 1: Crear la tabla en Supabase

Ejecute el script SQL en la pestaña SQL Editor de Supabase:

1. Vaya a su proyecto de Supabase
2. Abra el SQL Editor
3. Copie y pegue el contenido de `sql/installation-state.sql`
4. Ejecute el script

### Paso 2: Configurar RLS (Row Level Security)

El script SQL ya incluye las políticas RLS necesarias. Asegúrese de que RLS esté habilitado en la tabla `installation_state`.

### Paso 3: Iniciar la instalación

1. Abra `instalacion.html` en el navegador
2. Genere una clave maestra
3. Descárguela y guárdela en un lugar seguro
4. Haga clic en "Continuar" para guardar la configuración

### Paso 4: Crear el jefe de área

1. Abra `crear-jefe.html` en el navegador
2. Complete el formulario
3. Ingrese la clave maestra
4. El sistema se actualizará automáticamente y marcará `first_run` como `false`

## Archivos Modificados

- `admin-dashboard/instalacion.js` - Ahora usa `installation-state.js`
- `admin-dashboard/crear-jefe.js` - Ahora usa `installation-state.js`
- `admin-dashboard/modules/admin/installation-state.js` - NUEVO - Módulo para gestionar el estado
- `admin-dashboard/sql/installation-state.sql` - NUEVO - Script SQL para crear la tabla

## Funciones Disponibles

### `getInstallationState()`
Obtiene el estado actual de instalación.

### `updateInstallationState(updates)`
Actualiza el estado de instalación con los valores proporcionados.

### `isFirstRun()`
Verifica si es la primera ejecución del sistema.

### `getMasterKeyHash()`
Obtiene el hash de la clave maestra almacenado.

### `markInstallationComplete(masterKeyHash)`
Marca la instalación como completa y guarda el hash de la clave maestra.

## Notas de Seguridad

- La clave maestra nunca se almacena en texto plano
- Solo el hash SHA-256 se almacena en la base de datos
- RLS está habilitado para proteger los datos
- El usuario debe tener el rol `authenticated` para acceder

## Solución de Problemas

### Error: "Table does not exist"
Ejecute el script SQL para crear la tabla.

### Error: "Permission denied"
Verifique que las políticas RLS estén configuradas correctamente y que el usuario esté autenticado.

### Error: "No rows found"
Esto es normal la primera vez. El sistema creará un registro por defecto.
