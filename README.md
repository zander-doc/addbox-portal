# Addbox Inventario - Sistema de Gestión

## 🚀 Cómo Iniciar el Proyecto

### Opción Recomendada: Live Server en VS Code

1. **Instalar Live Server** (si no lo tienes):
   - Abre VS Code
   - Ve a Extensiones (Ctrl+Shift+X)
   - Busca "Live Server" por Ritwick Dey
   - Click en "Install"

2. **Abrir el proyecto**:
   ```bash
   cd D:\alexander\arte\addbox_a5grafic\Addbox\frontend\ADDBOX_SISTEM
   code .
   ```

3. **Iniciar Live Server**:
   - Click derecho en `admin-dashboard/inicio-de-sesion.html`
   - Selecciona "Open with Live Server"
   - Se abrirá automáticamente en: **http://127.0.0.1:5500**

## 🔗 URLs del Sistema

- **Login:** http://127.0.0.1:5500/admin-dashboard/inicio-de-sesion.html
- **Dashboard:** http://127.0.0.1:5500/admin-dashboard/modules/dashboard/dashboard.html
- **Inventario:** http://127.0.0.1:5500/admin-dashboard/modules/inventario/inventario.html
- **Movimientos:** http://127.0.0.1:5500/admin-dashboard/modules/movimientos/movimientos.html
- **Obras:** http://127.0.0.1:5500/admin-dashboard/modules/obras/obras.html
- **Presupuestos:** http://127.0.0.1:5500/admin-dashboard/modules/presupuesto/presupuesto.html
- **Reportes:** http://127.0.0.1:5500/admin-dashboard/modules/reportes/reportes.html

## ⚠️ Importante

- **NO** uses `http://localhost:3000` (no está configurado)
- **SIEMPRE** usa Live Server en `http://127.0.0.1:5500`
- Live Server recarga automáticamente cuando guardas cambios

## 📦 Instalación de Dependencias

```bash
npm install
```

## 🗄️ Base de Datos

El sistema usa **Neon PostgreSQL**. Las credenciales están en el archivo `.env`

## 🔐 Autenticación

El sistema usa **Clerk** para autenticación. Configuración en `.env`

## 📋 Scripts Disponibles

```bash
# Importar inventario desde CSV
npm run import-inventory

# Verificar base de datos
npm run verify-db

# Migrar desde Supabase (si aplica)
npm run migrate
```

## 🛠️ Tecnologías

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Neon PostgreSQL
- **Auth:** Clerk
- **Servidor:** Live Server (VS Code)
- **Puerto:** 5500

## 📁 Estructura del Proyecto

```
ADDBOX_SISTEM/
├── admin-dashboard/
│   ├── inicio-de-sesion.html
│   ├── modules/
│   │   ├── dashboard/
│   │   ├── inventario/
│   │   ├── movimientos/
│   │   ├── obras/
│   │   ├── presupuesto/
│   │   └── reportes/
│   └── services/
├── scripts/
│   ├── importar-inventario.js
│   └── verificar-importacion.js
├── sql-neon/
├── .env
├── .env.example
├── package.json
└── README.md
```

## 🆘 Solución de Problemas

### Live Server no abre

1. Verifica que el puerto 5500 no esté en uso
2. Reinicia VS Code
3. Reinstala la extensión Live Server

### Los cambios no se reflejan

1. Presiona Ctrl+Shift+R (recarga forzada)
2. Limpia la caché del navegador
3. Verifica que Live Server esté activo (barra inferior de VS Code)

### Error de conexión a Neon

1. Verifica que `NEON_DATABASE_URL` esté correcto en `.env`
2. Asegúrate de que la tabla `productos` exista

## � Notas

- Este proyecto está configurado para usar **Live Server** en el puerto **5500**
- No uses `python -m http.server` ni otros servidores
- La URL base es siempre `http://127.0.0.1:5500`

## 📄 Licencia

MIT © ADDBOX LLC