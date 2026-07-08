# 📖 GUÍA PASO A PASO: Crear Cuenta del Jefe — ADDBOX LLC

**Versión:** 1.0  
**Fecha:** 19 de mayo de 2026  
**Audiencia:** Desarrollador / Administrador del sistema  
**Tiempo estimado:** 5 minutos

---

## 📋 Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Paso 1: Generar la Master Key](#2-paso-1-generar-la-master-key)
3. [Paso 2: Guardar la Master Key](#3-paso-2-guardar-la-master-key)
4. [Paso 3: Crear la cuenta del Jefe](#4-paso-3-crear-la-cuenta-del-jefe)
5. [Paso 4: Verificar el acceso](#5-paso-4-verificar-el-acceso)
6. [Solución de problemas](#6-solución-de-problemas)
7. [Diagrama del flujo completo](#7-diagrama-del-flujo-completo)

---

## 1. Requisitos Previos

Antes de comenzar, asegúrate de tener:

| Requisito | Descripción |
|-----------|-------------|
| ✅ Servidor corriendo | El frontend debe estar servido (localhost o producción) |
| ✅ Supabase configurado | La base de datos debe estar activa con la tabla `instalacion` |
| ✅ Tabla `instalacion` | Debe existir con un registro `id=1` y `first_run=true` |
| ✅ Tabla `usuarios` | Debe existir para almacenar el perfil del jefe |
| ✅ Navegador moderno | Chrome, Firefox, Edge (soporte para ES modules y crypto) |

### Estructura de tablas requerida en Supabase

```sql
-- Tabla instalacion
CREATE TABLE instalacion (
  id INTEGER PRIMARY KEY DEFAULT 1,
  first_run BOOLEAN DEFAULT true,
  master_key_hash TEXT,
  updated_at TIMESTAMP
);

-- Insertar registro inicial
INSERT INTO instalacion (id, first_run) VALUES (1, true);

-- Tabla usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol TEXT DEFAULT 'usuario',
  estado TEXT DEFAULT 'activo',
  creado_en TIMESTAMP DEFAULT now(),
  ultimo_login TIMESTAMP,
  ip_registro TEXT,
  ip_ultimo_login TEXT
);
```

---

## 2. Paso 1: Generar la Master Key

### Navegar a la página de generación

```
URL: http://tu-servidor/admin-dashboard/setup/dev-master-key.html
```

### Pantalla que verás:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🔑 Generar Master Key (Desarrollador)              │
│                                                     │
│  Esta clave se usará una sola vez para que el       │
│  jefe cree su cuenta. Guárdala en un lugar seguro.  │
│                                                     │
│  ⚠️ Importante: Esta clave no se puede recuperar    │
│  después de cerrar esta página. Descárgala o        │
│  cópiala antes de salir.                            │
│                                                     │
│  ┌─────────────────────────────────────┐            │
│  │     [ Generar Master Key ]          │            │
│  └─────────────────────────────────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Acción: Hacer clic en "Generar Master Key"

Al hacer clic, el sistema:
1. Genera una clave aleatoria con formato: `ADDBOX-OWNER-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx`
2. Calcula el hash SHA-256 de la clave
3. Guarda el hash en Supabase (tabla `instalacion`)
4. Muestra la clave en pantalla

### Resultado esperado:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  🔑 Generar Master Key (Desarrollador)              │
│                                                     │
│  [Generar Master Key] (ya presionado)               │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ✅ Master Key Generada                       │    │
│  │                                             │    │
│  │ ┌─────────────────────────────────────────┐ │    │
│  │ │ ADDBOX-OWNER-a3f2b1c4-d5e6f7a8-         │ │    │
│  │ │ b9c0d1e2-f3a4b5c6                       │ │    │
│  │ └─────────────────────────────────────────┘ │    │
│  │                                             │    │
│  │ [📥 Descargar como archivo (.key)]          │    │
│  │                                             │    │
│  │ Después de generar la clave, puedes ir a    │    │
│  │ crear la cuenta del jefe.                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. Paso 2: Guardar la Master Key

### ⚠️ IMPORTANTE: La clave NO se puede recuperar después

Tienes dos opciones para guardarla:

### Opción A: Descargar como archivo

1. Hacer clic en **"📥 Descargar como archivo (.key)"**
2. Se descargará un archivo llamado `addbox-owner.key`
3. Guardar este archivo en un lugar seguro

### Opción B: Copiar manualmente

1. Seleccionar el texto de la clave (hacer triple clic sobre ella)
2. Copiar (Ctrl+C)
3. Pegar en un documento seguro o gestor de contraseñas

### Verificación en Supabase

Si quieres confirmar que se guardó correctamente:

```sql
SELECT master_key_hash, first_run FROM instalacion WHERE id = 1;
```

Resultado esperado:
```
master_key_hash: "a1b2c3d4e5f6..." (hash SHA-256, 64 caracteres)
first_run: false
```

---

## 4. Paso 3: Crear la Cuenta del Jefe

### Navegar a la página de creación

```
URL: http://tu-servidor/admin-dashboard/crear-jefe.html
```

### Pantalla que verás:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  👤 Crear cuenta del Jefe                           │
│                                                     │
│  Introduce tus datos y la master key que te         │
│  entregó el desarrollador.                          │
│                                                     │
│  Nombre completo                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ Ej: Juan Pérez                              │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Correo electrónico                                 │
│  ┌─────────────────────────────────────────────┐    │
│  │ correo@empresa.com                          │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Contraseña                                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ Mínimo 6 caracteres                         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Master Key                                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ ADDBOX-OWNER-xxxx-xxxx-xxxx-xxxx            │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │         [ Crear cuenta del jefe ]           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Llenar los campos:

| Campo | Qué poner | Ejemplo |
|-------|-----------|---------|
| Nombre completo | Nombre real del jefe/dueño | `Carlos Rodríguez` |
| Correo electrónico | Email válido (será el login) | `carlos@addbox.com` |
| Contraseña | Mínimo 6 caracteres | `MiClave123!` |
| Master Key | La clave generada en el Paso 1 | `ADDBOX-OWNER-a3f2b1c4-d5e6f7a8-b9c0d1e2-f3a4b5c6` |

### Acción: Hacer clic en "Crear cuenta del jefe"

### Proceso interno (lo que sucede al hacer clic):

```
┌──────────────────────────────────────────────────────┐
│ 1. Validar que todos los campos estén llenos         │
│    └─ Si falta alguno → Mensaje: "Completa todos    │
│       los campos"                                    │
│                                                      │
│ 2. Validar contraseña ≥ 6 caracteres                 │
│    └─ Si es corta → Mensaje: "La contraseña debe    │
│       tener al menos 6 caracteres"                   │
│                                                      │
│ 3. Consultar hash de master_key en Supabase          │
│    └─ Si error → Mensaje: "Error al verificar       │
│       instalación"                                   │
│                                                      │
│ 4. Comparar hash ingresado vs hash guardado          │
│    └─ Si no coincide → Mensaje: "Master key         │
│       incorrecta"                                    │
│                                                      │
│ 5. Crear usuario en Supabase Auth (signUp)           │
│    └─ Si error → Mensaje con detalle del error       │
│                                                      │
│ 6. Insertar perfil en tabla "usuarios"               │
│    └─ Con rol: "jefe", estado: "activo"              │
│                                                      │
│ 7. Marcar first_run = false en tabla instalacion     │
│                                                      │
│ 8. Mostrar mensaje de éxito                          │
│                                                      │
│ 9. Redirigir a inicio-de-sesion.html (2 segundos)    │
└──────────────────────────────────────────────────────┘
```

### Resultado exitoso:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  👤 Crear cuenta del Jefe                           │
│                                                     │
│  [Campos llenos...]                                 │
│                                                     │
│  [Crear cuenta del jefe]                            │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ✅ Cuenta del jefe creada correctamente.     │    │
│  │    Redirigiendo al login...                  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘

        ↓ (2 segundos después)

Redirige automáticamente a:
/admin-dashboard/inicio-de-sesion.html
```

---

## 5. Paso 4: Verificar el Acceso

### Navegar al login

```
URL: http://tu-servidor/admin-dashboard/inicio-de-sesion.html
```

### Pantalla de login:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           [LOGO ADDBOX]                             │
│           Acceso Personal                           │
│                                                     │
│  [Iniciar sesión]  [Crear cuenta]                   │
│                                                     │
│  Bienvenido de nuevo                                │
│  Ingresa tus credenciales                           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ carlos@addbox.com                           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ••••••••••  👁️                              │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ¿Olvidaste tu contraseña?                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │            [ Ingresar ]                     │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Ingresar credenciales:

1. **Correo:** El mismo que usaste en crear-jefe.html
2. **Contraseña:** La misma que definiste

### Resultado esperado:

```
Login exitoso → Redirige a:
/admin-dashboard/modules/dashboard/dashboard.html

El dashboard muestra:
- Panel de control completo
- Menú lateral con todos los módulos
- Rol: "jefe" (acceso total)
```

---

## 6. Solución de Problemas

### ❌ "Completa todos los campos"
**Causa:** Uno o más campos están vacíos.  
**Solución:** Verifica que todos los campos tengan contenido.

### ❌ "La contraseña debe tener al menos 6 caracteres"
**Causa:** Contraseña muy corta.  
**Solución:** Usa una contraseña de 6+ caracteres.

### ❌ "Error al verificar instalación"
**Causa:** No se puede conectar a Supabase o la tabla `instalacion` no existe.  
**Solución:**
1. Verificar que Supabase esté activo
2. Verificar que la tabla `instalacion` existe con registro `id=1`
3. Abrir consola (F12) para ver el error detallado

### ❌ "No se ha generado una master key aún"
**Causa:** No se ejecutó el Paso 1 (generar master key).  
**Solución:** Ir primero a `/admin-dashboard/setup/dev-master-key.html` y generar la clave.

### ❌ "Master key incorrecta"
**Causa:** La clave ingresada no coincide con la generada.  
**Solución:**
1. Verificar que copiaste la clave completa (sin espacios extra)
2. El formato debe ser: `ADDBOX-OWNER-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx`
3. Si perdiste la clave, debes regenerarla (esto sobreescribe la anterior)

### ❌ "Error al crear cuenta: User already registered"
**Causa:** Ya existe un usuario con ese correo en Supabase Auth.  
**Solución:** Usar un correo diferente o eliminar el usuario existente desde el panel de Supabase.

### ❌ "Error al guardar perfil"
**Causa:** Error al insertar en la tabla `usuarios`.  
**Solución:**
1. Verificar que la tabla `usuarios` existe
2. Verificar que no hay conflicto de `id` o `email` duplicado
3. Revisar las políticas RLS de la tabla

### ❌ La página se ve sin estilos
**Causa:** CSS no carga.  
**Solución:** Los estilos están inline en el HTML, debería verse correctamente. Si no, verificar que el servidor sirve archivos estáticos.

---

## 7. Diagrama del Flujo Completo

```
╔══════════════════════════════════════════════════════════════════╗
║                    FLUJO DE SETUP INICIAL                        ║
╚══════════════════════════════════════════════════════════════════╝

     DESARROLLADOR                           JEFE/DUEÑO
     ─────────────                           ──────────

         │                                       │
         ▼                                       │
┌─────────────────────┐                          │
│ 1. Acceder a        │                          │
│ /setup/dev-master-  │                          │
│ key.html            │                          │
└────────┬────────────┘                          │
         │                                       │
         ▼                                       │
┌─────────────────────┐                          │
│ 2. Clic "Generar    │                          │
│ Master Key"         │                          │
│                     │                          │
│ Sistema genera:     │                          │
│ ADDBOX-OWNER-xxx... │                          │
│ Guarda hash en DB   │                          │
└────────┬────────────┘                          │
         │                                       │
         ▼                                       │
┌─────────────────────┐                          │
│ 3. Descargar/copiar │                          │
│ la master key       │                          │
└────────┬────────────┘                          │
         │                                       │
         │    ┌──────────────────────┐           │
         │    │ 4. Entregar la       │           │
         ├───▶│ master key al jefe   │──────────▶│
         │    │ (email, archivo,     │           │
         │    │  en persona)         │           │
         │    └──────────────────────┘           │
         │                                       │
         │                                       ▼
         │                          ┌─────────────────────┐
         │                          │ 5. Acceder a        │
         │                          │ /crear-jefe.html    │
         │                          └────────┬────────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────────┐
         │                          │ 6. Llenar:          │
         │                          │ - Nombre            │
         │                          │ - Correo            │
         │                          │ - Contraseña        │
         │                          │ - Master Key        │
         │                          └────────┬────────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────────┐
         │                          │ 7. Clic "Crear      │
         │                          │ cuenta del jefe"    │
         │                          │                     │
         │                          │ Sistema:            │
         │                          │ ✓ Verifica key      │
         │                          │ ✓ Crea auth user    │
         │                          │ ✓ Inserta perfil    │
         │                          │ ✓ first_run=false   │
         │                          └────────┬────────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────────┐
         │                          │ 8. Redirige a       │
         │                          │ inicio-de-sesion    │
         │                          └────────┬────────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────────┐
         │                          │ 9. Login con        │
         │                          │ correo + contraseña │
         │                          └────────┬────────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────────┐
         │                          │ 10. DASHBOARD       │
         │                          │ (Acceso completo    │
         │                          │  como rol "jefe")   │
         │                          └─────────────────────┘
         │
         ▼
   ┌──────────────┐
   │ SETUP        │
   │ COMPLETADO ✅ │
   └──────────────┘
```

---

## 📌 URLs de Referencia Rápida

| Paso | URL |
|------|-----|
| Generar Master Key | `/admin-dashboard/setup/dev-master-key.html` |
| Crear cuenta Jefe | `/admin-dashboard/crear-jefe.html` |
| Login | `/admin-dashboard/inicio-de-sesion.html` |
| Dashboard | `/admin-dashboard/modules/dashboard/dashboard.html` |

---

## 🔒 Notas de Seguridad

1. **La master key es de un solo uso.** Una vez creada la cuenta del jefe, la clave ya no sirve para nada más.
2. **No compartas la master key por canales inseguros.** Preferiblemente entrégala en persona o por un canal cifrado.
3. **El hash SHA-256 es irreversible.** Nadie puede obtener la clave original desde el hash guardado en la base de datos.
4. **Después del setup, `first_run` queda en `false`.** Esto impide que se vuelva a usar el flujo de creación de jefe.
5. **El rol "jefe" tiene acceso total** al sistema, incluyendo gestión de usuarios, configuración y todos los módulos.

---

**Documento generado:** 19 de mayo de 2026  
**Proyecto:** ADDBOX LLC  
**Autor:** Sistema de documentación automatizado
