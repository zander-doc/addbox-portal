# 📋 CHECKLIST DEL SISTEMA — ADDBOX LLC

**Fecha:** 20 de mayo de 2026  
**Estado:** En progreso  
**Objetivo:** Sistema 100% funcional

---

## 🗺️ MAPA DEL SISTEMA DE PROCESOS

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        ADDBOX LLC — SISTEMA COMPLETO                    ║
╚══════════════════════════════════════════════════════════════════════════╝

                    ┌─────────────────────────┐
                    │  USUARIO NUEVO          │
                    │  (Primera vez)          │
                    └───────────┬─────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ FASE 1: SETUP INICIAL (una sola vez)                                  │
│                                                                       │
│  [DEV] /setup/dev-master-key.html                                     │
│    │  → Genera master key                                             │
│    │  → Guarda hash en tabla "instalacion"                            │
│    │  → Descarga archivo .key                                         │
│    ▼                                                                  │
│  [JEFE] /crear-jefe.html                                              │
│    │  → Ingresa datos + master key                                    │
│    │  → Crea cuenta en Supabase Auth                                  │
│    │  → Inserta perfil (rol: jefe)                                    │
│    │  → Marca first_run = false                                       │
│    ▼                                                                  │
│  ✅ Setup completado → Redirige a login                               │
└───────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ FASE 2: AUTENTICACIÓN                                                 │
│                                                                       │
│  /inicio-de-sesion.html                                               │
│    │  → Login (email + password)                                      │
│    │  → Supabase Auth valida                                          │
│    │  → Guarda sesión (sessionStorage + localStorage)                 │
│    │  → Registra auditoría                                            │
│    ▼                                                                  │
│  Guards:                                                              │
│    ├── auth-guard.js → ¿Tiene sesión? → Si no: redirige a login      │
│    ├── role-guard.js → ¿Tiene rol permitido? → Si no: acceso-denegado│
│    └── install-guard.js → ¿first_run? → Si sí: redirige a setup      │
└───────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ FASE 3: DASHBOARD Y MÓDULOS                                           │
│                                                                       │
│  /modules/dashboard/dashboard.html (Panel principal)                  │
│    ├── Indicadores: productos, stock, movimientos, usuarios           │
│    ├── Gráficas: ApexCharts (movimientos semana, entradas/salidas)    │
│    ├── Tabla: movimientos recientes                                   │
│    └── Acciones rápidas                                               │
│                                                                       │
│  MÓDULOS FUNCIONALES:                                                 │
│    ├── /modules/inventario/productos.html (CRUD productos)            │
│    ├── /modules/movimientos/movimientos.html (entradas/salidas)       │
│    ├── /modules/usuarios/usuarios.html (gestión usuarios)             │
│    ├── /modules/admin/invitaciones/ (invitaciones)                    │
│    ├── /modules/presupuesto/ (presupuestos)                           │
│    ├── /modules/notas/ (notas de entrega)                             │
│    ├── /modules/devoluciones/ (devoluciones)                          │
│    ├── /modules/partidas/ (partidas de obra)                          │
│    ├── /modules/fotos/ (galería)                                      │
│    └── /modules/reportes/ (inventario, obras, ejecutivo)              │
└───────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ FASE 4: PORTAL PÚBLICO                                                │
│                                                                       │
│  /portal-autoservicio.html (Punto de entrada)                         │
│    ├── Portal de trabajo → /inicio-de-sesion.html                     │
│    ├── Invitaciones → /modules/admin/invitaciones/                    │
│    ├── Centro de soporte → /soporte/index.html                        │
│    └── Estado del sistema → /estado-sistema.html                      │
│                                                                       │
│  /soporte/                                                            │
│    ├── index.html (hub)                                               │
│    ├── faq.html                                                       │
│    ├── ticket.html                                                    │
│    └── contacto.html                                                  │
│                                                                       │
│  /docs/                                                               │
│    ├── index.html (hub)                                               │
│    ├── guia-crear-jefe.html                                           │
│    ├── guia-desarrollador.html                                        │
│    ├── guia-sistema.html                                              │
│    └── guia-agente-ia.html                                            │
└───────────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST — Tareas pendientes para sistema 100% funcional

### 🔴 PRIORIDAD 1: BLOQUEANTES (Sin esto no arranca)

| # | Tarea | Estado | Detalle |
|---|-------|--------|---------|
| 1.1 | Tabla `instalacion` en Supabase | ⬜ | Crear tabla con registro id=1, first_run=true |
| 1.2 | Tabla `usuarios` en Supabase | ⬜ | id, nombre, email, rol, estado, creado_en, ultimo_login |
| 1.3 | Tabla `productos` en Supabase | ⬜ | Para módulo inventario |
| 1.4 | Tabla `movimientos` en Supabase | ⬜ | Para módulo movimientos |
| 1.5 | Tabla `obras` en Supabase | ⬜ | Para relaciones en movimientos |
| 1.6 | Políticas RLS en todas las tablas | ⬜ | Permitir operaciones según rol |
| 1.7 | `supabase-simple.js` está comentado | ⬜ | Descomentar para que window.supabaseClient funcione |
| 1.8 | CDN Supabase duplicado en módulos | ⬜ | Varios HTML cargan el CDN 2 veces |

### 🟠 PRIORIDAD 2: FUNCIONALIDAD CORE

| # | Tarea | Estado | Detalle |
|---|-------|--------|---------|
| 2.1 | Probar flujo setup: generar key | ⬜ | /setup/dev-master-key.html |
| 2.2 | Probar flujo setup: crear jefe | ⬜ | /crear-jefe.html |
| 2.3 | Probar login completo | ⬜ | Email + password → dashboard |
| 2.4 | Probar logout en todos los módulos | ⬜ | Función logout() usa ruta relativa |
| 2.5 | Dashboard: install-guard lógica invertida | ⬜ | if (isInstalled) redirige a setup — corregir |
| 2.6 | Módulo productos: usa window.supabaseClient | ⬜ | Depende de supabase-simple.js activo |
| 2.7 | Módulo movimientos: verificar conexión | ⬜ | Verificar que carga datos |
| 2.8 | Módulo usuarios: verificar CRUD | ⬜ | Crear, editar, eliminar usuarios |

### 🟡 PRIORIDAD 3: CONSISTENCIA Y RUTAS

| # | Tarea | Estado | Detalle |
|---|-------|--------|---------|
| 3.1 | Eliminar CDN duplicados en módulos HTML | ⬜ | 11 archivos tienen script supabase duplicado |
| 3.2 | Activar supabase-simple.js | ⬜ | Descomentar código |
| 3.3 | Dashboard redirect a setup | ⬜ | Corregir lógica first_run |
| 3.4 | Sidebar: falta inicioinventario.html | ⬜ | Enlace roto en sidebar |
| 3.5 | Sidebar: falta reportes.html | ⬜ | Enlace roto en sidebar |
| 3.6 | Aplicar dark theme a /estado-sistema.html | ⬜ | Actualmente tiene fondo claro |

### 🟢 PRIORIDAD 4: MEJORAS Y PULIDO

| # | Tarea | Estado | Detalle |
|---|-------|--------|---------|
| 4.1 | Formulario ticket: conectar a backend | ⬜ | Actualmente no envía datos |
| 4.2 | Página 404 personalizada | ⬜ | Para rutas que no existen |
| 4.3 | Recuperar contraseña: verificar flujo | ⬜ | forgotPasswordLink usa window.supabaseClient |
| 4.4 | Registro de usuarios: verificar flujo | ⬜ | Tab "Crear cuenta" en login |
| 4.5 | Eliminar /admin-dashboard/public/ duplicado | ⬜ | Decidir si mantener o eliminar |
| 4.6 | Eliminar archivos legacy/comentados | ⬜ | supabase_backup.js, etc. |

---

## 📋 ORDEN DE EJECUCIÓN RECOMENDADO

```
PASO 1 → Configurar Supabase (tablas + RLS)
         ├── 1.1 Crear tabla instalacion
         ├── 1.2 Crear tabla usuarios
         ├── 1.3 Crear tabla productos
         ├── 1.4 Crear tabla movimientos
         ├── 1.5 Crear tabla obras
         └── 1.6 Configurar RLS

PASO 2 → Arreglar supabase-simple.js
         ├── 1.7 Descomentar código
         └── 1.8 Eliminar CDN duplicados

PASO 3 → Corregir lógica del dashboard
         ├── 2.5 Fix install-guard en dashboard.html
         └── 3.3 Corregir condición first_run

PASO 4 → Probar flujo completo de setup
         ├── 2.1 Generar master key
         ├── 2.2 Crear cuenta jefe
         └── 2.3 Login → Dashboard

PASO 5 → Verificar módulos funcionales
         ├── 2.6 Productos (CRUD)
         ├── 2.7 Movimientos
         └── 2.8 Usuarios

PASO 6 → Limpiar y pulir
         ├── 3.1 CDN duplicados
         ├── 3.4 Sidebar links rotos
         ├── 3.5 Reportes link
         └── 4.5 Eliminar duplicados
```

---

## �️ ELEMENTOS DEL DASHBOARD

### Header (Topbar)
- Título: "Panel de Control"
- Botón: "Salir" (logout)

### Sidebar (Menú lateral)
```
ADDBOX
├── Principal
│   ├── Dashboard (activo)
│   ├── Inventario general
│   ├── Productos
│   └── Movimientos
├── Gestión
│   ├── Usuarios
│   └── Reportes
```

### Indicadores (4 tarjetas)
- Total productos → consulta tabla `productos`
- Stock total → suma de `stock` en productos
- Movimientos hoy → count movimientos del día
- Usuarios → count tabla `usuarios`

### Gráficas (2)
- Movimientos por día (últimos 7 días) → Line chart
- Entradas vs Salidas → Donut chart

### Tabla
- Movimientos recientes (últimos 10)
- Columnas: Producto, Tipo, Cantidad, Sitio/Obra, Fecha

### Acciones rápidas (3 botones)
- Gestionar productos → /inventario/productos.html
- Registrar movimiento → /movimientos/movimientos.html
- Panel de usuarios → /usuarios/usuarios.html (admin-only)

### Guards activos en dashboard
- auth-guard.js → verifica sesión
- install-guard.js → verifica first_run
- role-guard.js → verifica rol (jefe/admin)

### Scripts cargados
- Supabase CDN v1
- supabase-simple.js (crea window.supabaseClient)
- ApexCharts CDN
- dashboard-simple.js (lógica del dashboard)

---

**Documento generado:** 20 de mayo de 2026  
**Próxima revisión:** Después de completar Paso 1
