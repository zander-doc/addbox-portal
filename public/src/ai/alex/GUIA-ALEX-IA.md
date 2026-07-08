# 🤖 GUÍA COMPLETA — Alex IA v5.0
## Copiloto de Inventario para ADDBOX

---

## 1. VISIÓN GENERAL

Alex IA es un asistente de inteligencia artificial integrado en el dashboard de ADDBOX. Permite a los usuarios consultar, validar, simular y ejecutar operaciones de inventario usando lenguaje natural.

### Capacidades principales:
- Consultar productos y stock en tiempo real
- Validar y simular movimientos antes de ejecutarlos
- Ejecutar entradas, salidas y transferencias (con confirmación)
- Detectar anomalías y predecir agotamiento de stock
- Guiar paso a paso en operaciones
- Responder según el rol del usuario (almacenista, supervisor, admin)

---

## 2. ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                     │
│                                                          │
│  dashboard.html → chat-widget.css + chat-widget.js       │
│       ↓                                                  │
│  Botón FAB → Panel lateral → Input → fetch()             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP (POST)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + Express)               │
│                 Puerto: 3100                              │
│                                                          │
│  server.js → routes/ → engine.js → OpenAI API            │
│                  ↓                                        │
│  inventory.js ← Supabase (productos, movimientos)        │
│  actions.js   → Supabase (ejecutar movimientos)          │
│  predictive.js → Supabase (análisis histórico)           │
│  context.js   → Supabase (memoria conversacional)        │
│  rag.js       → Supabase (documentos + embeddings)       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                  │
│                                                          │
│  Tablas:                                                 │
│  - productos (inventario real)                           │
│  - movimientos (historial)                               │
│  - alex_context (memoria conversacional)                 │
│  - alex_feedback (👍/👎)                                 │
│  - alex_docs (RAG con embeddings)                        │
│  - alex_acciones (auditoría de ejecuciones)              │
└─────────────────────────────────────────────────────────┘
```

---

## 3. ESTRUCTURA DE ARCHIVOS

```
src/ai/alex/
├── chat-widget.css        → Estilos del widget (tema oscuro premium)
├── chat-widget.js         → Lógica frontend (streaming, estados, sugerencias)
├── chat-widget.html       → HTML del panel (referencia, integrado en dashboard)
├── GUIA-ALEX-IA.md        → Esta guía
│
└── server/                → Backend completo
    ├── server.js          → Express + CORS + Rate Limiting
    ├── config.js          → System prompt + configuración del modelo
    ├── db.js              → Conexión a Supabase (service role)
    ├── engine.js          → Motor IA: Function Calling + Streaming SSE
    ├── roles.js           → Roles y permisos por usuario
    ├── context.js         → Memoria conversacional (RAM + Supabase)
    ├── rag.js             → RAG vectorial + fallback local
    ├── inventory.js       → Consultas de inventario
    ├── actions.js         → Acciones ejecutables (entrada/salida/transferencia)
    ├── predictive.js      → Auditoría predictiva (anomalías + reorden)
    ├── tools.js           → 16 tools para OpenAI Function Calling
    ├── utils.js           → Sanitización de input
    ├── setup.sql          → SQL para crear tablas en Supabase
    ├── Dockerfile         → Deploy containerizado
    ├── railway.toml       → Config para Railway
    ├── .env.example       → Template de variables de entorno
    ├── .env               → Variables reales (NO subir a git)
    ├── package.json       → Dependencias
    ├── .gitignore         → Excluye node_modules y .env
    ├── README.md          → Documentación técnica
    └── routes/
        ├── chat.js        → POST /api/chat (respuesta completa)
        ├── stream.js      → POST /api/stream (SSE token por token)
        ├── feedback.js    → POST /api/feedback (👍/👎)
        └── docs.js        → CRUD /api/docs (RAG dinámico)
```

---

## 4. CÓMO INICIAR EL SISTEMA

### Paso 1: Configurar variables de entorno

Editar `src/ai/alex/server/.env`:

```
OPENAI_API_KEY=sk-tu-key-de-openai
SUPABASE_URL=https://billwldqxupcavzurljo.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIs...
PORT=3100
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5500
```

### Paso 2: Crear tablas en Supabase

Ejecutar `setup.sql` en el SQL Editor de Supabase. Esto crea:
- `alex_context` — memoria conversacional
- `alex_feedback` — feedback de usuarios
- `alex_docs` — documentos RAG con embeddings
- `alex_acciones` — auditoría de acciones ejecutadas
- Funciones RPC: `match_docs`, `match_docs_vector`

### Paso 3: Instalar dependencias

```bash
cd src/ai/alex/server
npm install
```

### Paso 4: Iniciar el servidor

```bash
npm run dev    # desarrollo (auto-reload con --watch)
npm start      # producción
```

Deberías ver: `🤖 Alex de ADDBOX escuchando en puerto 3100`

### Paso 5: Verificar

Abrir en navegador: `http://localhost:3100/api/health`

Respuesta esperada:
```json
{"status":"ok","agent":"Alex de ADDBOX","version":"2.0.0"}
```

### Paso 6: Usar en el dashboard

Abrir el dashboard de ADDBOX → el botón flotante de Alex aparece en la esquina inferior derecha.

---

## 5. FLUJO DE UNA CONVERSACIÓN

```
1. Usuario abre el dashboard
2. Ve el botón FAB circular con avatar de Alex (esquina inferior derecha)
3. Click → Panel se abre con animación fade-in
4. Aparece mensaje de bienvenida + 3 sugerencias inteligentes
5. Usuario escribe o clickea una sugerencia
6. Widget envía POST a localhost:3100/api/stream
7. Estado cambia a "analyzing" (punto azul)
8. Indicador de typing aparece (3 puntos + "Alex IA está analizando…")
9. Backend:
   a. Carga contexto del usuario (RAM o Supabase)
   b. Busca en RAG (vectorial → texto → local)
   c. Construye mensajes con system prompt + rol + contexto + RAG
   d. Envía a OpenAI con tools disponibles
   e. Si OpenAI pide ejecutar una tool → la ejecuta → segunda llamada
   f. Respuesta llega token por token (streaming SSE)
10. Widget muestra respuesta progresivamente
11. Estado cambia a "available" (punto verde)
12. Aparecen botones de feedback (👍/👎)
13. Contexto se guarda en RAM + Supabase
```

---

## 6. ROLES Y PERMISOS

| Rol | Puede hacer | No puede hacer |
|-----|-------------|----------------|
| **almacenista** | Consultar stock, buscar productos, validar/simular movimientos, ver resumen, ver críticos, pasos operativos | Ver costos, auditoría, insights, ejecutar acciones |
| **supervisor** | Todo lo anterior + inconsistencias, resumen de movimientos | Ver costos detallados, configurar sistema |
| **admin** | Todo + insights operativos, explicar errores, ejecutar acciones, auditoría predictiva | Nada restringido |

### Cómo se detecta el rol:
1. El widget intenta leer `localStorage` (sesión de Supabase)
2. Si encuentra `user_metadata.role` → lo usa
3. Si no → usa `window.userRole` (definido en el HTML)
4. Fallback: `"default"` (permisos mínimos)

---

## 7. FUNCTION CALLING (16 TOOLS)

Alex decide automáticamente qué herramienta usar según la pregunta:

| # | Tool | Qué hace |
|---|------|----------|
| 1 | `buscar_producto` | Busca por nombre |
| 2 | `consultar_producto` | Detalle por ID |
| 3 | `validar_movimiento` | Verifica si es posible |
| 4 | `simular_movimiento` | Muestra stock resultante |
| 5 | `resumen_inventario` | Total productos, stock, valor |
| 6 | `productos_criticos` | Stock bajo umbral |
| 7 | `pasos_operacion` | Guía paso a paso |
| 8 | `insights_operativos` | Más usado, más costoso, sin stock |
| 9 | `sugerencias_rol` | Qué puede hacer el usuario |
| 10 | `ejecutar_entrada` | Registra entrada (con confirmación) |
| 11 | `ejecutar_salida` | Registra salida (con confirmación) |
| 12 | `ejecutar_transferencia` | Registra transferencia (con confirmación) |
| 13 | `predecir_agotamiento` | Días restantes de stock |
| 14 | `detectar_anomalias` | Patrones sospechosos |
| 15 | `recomendaciones_reorden` | Qué reabastecer |
| 16 | `auditoria_predictiva` | Resumen completo predictivo |

---

## 8. RAG (RETRIEVAL-AUGMENTED GENERATION)

### Cómo funciona:
1. Usuario hace una pregunta
2. El sistema busca documentos relevantes en 3 niveles:
   - **Nivel 1**: Búsqueda vectorial (embeddings en Supabase)
   - **Nivel 2**: Búsqueda por texto (ILIKE en Supabase)
   - **Nivel 3**: Búsqueda por keywords (10 documentos locales)
3. Los documentos encontrados se agregan al prompt como contexto

### Cómo agregar documentos:
- Desde el Panel de Alex (`/admin-dashboard/modules/admin/alex-panel.html`)
- O via API: `POST /api/docs` con `{ "content": "texto del documento" }`

### Documentos locales incluidos:
- Reglas de inventario
- Reglas de transferencias
- Reglas de entradas/salidas
- Reglas de devoluciones
- Reglas de stock mínimo
- Roles y permisos
- Ajustes y reconciliación
- Obras y proyectos
- Reportes disponibles

---

## 9. ESTADOS VISUALES

El punto de estado junto al avatar cambia automáticamente:

| Estado | Color | Cuándo |
|--------|-------|--------|
| Disponible | 🟢 Verde | Listo para recibir mensajes |
| Analizando | 🔵 Azul | Procesando la pregunta |
| Procesando | 🟣 Morado | Ejecutando una acción |
| Esperando | 🟡 Amarillo | Esperando respuesta de OpenAI |
| Error | 🔴 Rojo | Fallo de conexión |

---

## 10. POSIBLES ERRORES Y SOLUCIONES

### Error: "Hubo un problema procesando tu solicitud"

**Causas posibles:**
1. `OPENAI_API_KEY` inválida o sin créditos
2. Servidor no está corriendo
3. Supabase no responde

**Solución:**
- Verificar que el servidor esté corriendo (`http://localhost:3100/api/health`)
- Verificar créditos en https://platform.openai.com/settings/organization/billing
- Verificar que la key en `.env` sea correcta

---

### Error: 429 (Rate limit / Quota exceeded)

**Causa:** Tu cuenta de OpenAI no tiene créditos suficientes.

**Solución:**
- Ir a https://platform.openai.com/settings/organization/billing
- Agregar método de pago
- Cargar mínimo $5 (dura mucho con gpt-4o-mini)

---

### Error: El servidor no arranca

**Causas posibles:**
1. Puerto 3100 ya está en uso
2. Faltan variables en `.env`
3. `npm install` no se ejecutó

**Solución:**
```bash
# Verificar puerto
netstat -ano | findstr :3100

# Reinstalar
cd src/ai/alex/server
npm install

# Verificar .env tiene las 3 variables obligatorias
```

---

### Error: El widget no aparece en el dashboard

**Causas posibles:**
1. Ruta del CSS/JS incorrecta
2. El HTML del panel no está en el archivo

**Solución:**
- Verificar que `dashboard.html` tenga:
  - `<link rel="stylesheet" href="../../../src/ai/alex/chat-widget.css">`
  - `<script src="../../../src/ai/alex/chat-widget.js"></script>`
  - El HTML del panel (`#alexPanel` + `#alexButton`)

---

### Error: Alex responde pero no ejecuta acciones

**Causa:** El rol del usuario no tiene permiso `"ejecutar"`.

**Solución:**
- Solo el rol `admin` puede ejecutar acciones
- Verificar que `window.userRole = "admin"` esté configurado

---

### Error: RAG no encuentra documentos

**Causa:** No hay documentos en la tabla `alex_docs` o la función RPC no existe.

**Solución:**
- Ejecutar `setup.sql` completo en Supabase
- Subir documentos desde el Panel de Alex o via API

---

### Error: Contexto se pierde entre sesiones

**Causa:** La tabla `alex_context` no existe o el `SUPABASE_SERVICE_ROLE` es incorrecto.

**Solución:**
- Verificar que `setup.sql` se ejecutó
- Verificar que la key en `.env` es la `service_role` (no la `anon`)

---

## 11. PANEL DE ADMINISTRACIÓN

Ubicación: `/admin-dashboard/modules/admin/alex-panel.html`

### Secciones:
1. **Métricas** — Total mensajes, usuarios únicos, feedback positivo/negativo
2. **Conversaciones** — Historial de mensajes recientes
3. **Feedback** — Detalle de 👍/👎 con fecha y usuario
4. **Documentos RAG** — Subir/eliminar documentos de conocimiento
5. **Configuración** — Estado del servidor (online/offline)

### Acceso:
- Link en el sidebar: "🤖 Alex Panel" (sección Inteligencia Artificial)
- Solo visible para admins

---

## 12. DEPLOY EN PRODUCCIÓN

### Opción A: Railway (recomendado)

```bash
cd src/ai/alex/server
railway login
railway init
railway up
```

Configurar variables de entorno en Railway Dashboard.

### Opción B: Docker

```bash
cd src/ai/alex/server
docker build -t alex-ia .
docker run -p 3100:3100 --env-file .env alex-ia
```

### Después del deploy:

Actualizar la URL en el frontend:
```html
<script>
  window.ALEX_API_URL = "https://tu-dominio-produccion.com/api";
</script>
```

---

## 13. COSTOS ESTIMADOS

| Concepto | Costo |
|----------|-------|
| OpenAI gpt-4o-mini (input) | $0.15 / 1M tokens |
| OpenAI gpt-4o-mini (output) | $0.60 / 1M tokens |
| OpenAI embeddings | $0.02 / 1M tokens |
| Supabase (free tier) | $0 |
| Railway (hobby) | ~$5/mes |

**Estimación mensual con uso moderado (100 conversaciones/día):**
- ~$2-5/mes en OpenAI
- $0 en Supabase (free tier)
- $5/mes en hosting

---

## 14. RECOMENDACIONES

### Inmediatas:
1. **Agregar créditos a OpenAI** — Sin esto, Alex no puede responder
2. **Ejecutar setup.sql** — Sin esto, no hay memoria ni RAG
3. **Subir documentos al RAG** — Manuales de ADDBOX, procedimientos, reglas de negocio

### A corto plazo:
4. **Configurar CORS para producción** — Restringir a tu dominio real
5. **Agregar autenticación al backend** — Verificar token de Supabase en cada request
6. **Monitorear feedback** — Revisar 👎 para mejorar el system prompt

### A mediano plazo:
7. **RAG con embeddings reales** — Subir todos los manuales de operación
8. **Alertas proactivas** — Alex notifica cuando detecta anomalías sin que le pregunten
9. **Integrar en más páginas** — No solo dashboard, también en movimientos, productos, etc.
10. **Historial exportable** — Permitir descargar conversaciones como PDF

### A largo plazo:
11. **Multi-idioma** — Soporte inglés para equipos internacionales
12. **Voz** — Integrar Web Speech API para hablar con Alex
13. **Entrenamiento fino** — Fine-tuning con datos reales de ADDBOX
14. **Dashboard de métricas de Alex** — Gráficas de uso, satisfacción, temas frecuentes

---

## 15. COMANDOS ÚTILES

```bash
# Iniciar servidor
cd src/ai/alex/server && npm run dev

# Ver logs del servidor
# (los errores aparecen en la terminal donde corre)

# Verificar que está corriendo
curl http://localhost:3100/api/health

# Subir documento al RAG
curl -X POST http://localhost:3100/api/docs \
  -H "Content-Type: application/json" \
  -d '{"content": "Las transferencias requieren aprobación del supervisor cuando superan 100 unidades."}'

# Ver documentos RAG
curl http://localhost:3100/api/docs

# Probar chat
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "resumen inventario", "user": {"id": "test", "role": "admin"}}'
```

---

## 16. SEGURIDAD

| Medida | Estado |
|--------|--------|
| Rate limiting (30 req/min) | ✅ Activo |
| Sanitización de input | ✅ Activo |
| CORS configurable | ✅ Activo |
| Límite de longitud (500 chars) | ✅ Activo |
| Service role key en backend | ✅ No expuesta al frontend |
| .env en .gitignore | ✅ No se sube a git |
| Confirmación antes de ejecutar | ✅ Alex pide confirmación |
| Auditoría de acciones | ✅ Todo se registra |

### Pendiente:
- ⚠️ Autenticación de requests (verificar JWT de Supabase)
- ⚠️ HTTPS en producción
- ⚠️ Rotación de API keys

---

*Última actualización: Mayo 2026*
*Versión: Alex IA v5.0*
*Autor: Kiro + Alexander García*
