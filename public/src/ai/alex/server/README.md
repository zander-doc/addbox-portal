# 🤖 Alex de ADDBOX — v5.0

Asistente técnico corporativo de inventario con IA.

## Arquitectura

```
src/ai/alex/server/
├── server.js          → Express + CORS + Rate Limiting
├── config.js          → System prompt + configuración
├── db.js              → Supabase (service role)
├── engine.js          → Motor IA: Function Calling + Streaming
├── roles.js           → Roles y permisos granulares
├── context.js         → Memoria RAM + Supabase
├── rag.js             → RAG vectorial + fallback local
├── inventory.js       → Consultas de inventario
├── actions.js         → Acciones ejecutables (entrada/salida/transferencia)
├── predictive.js      → Auditoría predictiva (anomalías + reorden)
├── tools.js           → 17 tools para OpenAI Function Calling
├── utils.js           → Sanitización
├── setup.sql          → SQL completo (tablas + RPC + RLS)
├── Dockerfile         → Deploy containerizado
├── railway.toml       → Config para Railway
├── .env.example       → Variables de entorno
└── routes/
    ├── chat.js        → POST /api/chat
    ├── stream.js      → POST /api/stream (SSE)
    ├── feedback.js    → POST /api/feedback
    └── docs.js        → CRUD /api/docs (RAG dinámico)
```

## Capacidades v5.0

| Feature | Estado |
|---------|--------|
| Streaming SSE | ✅ |
| Function Calling (17 tools) | ✅ |
| RAG vectorial + fallback | ✅ |
| Memoria persistente | ✅ |
| Roles y permisos | ✅ |
| Rate limiting | ✅ |
| Sanitización | ✅ |
| Feedback loop | ✅ |
| Ejecución de acciones | ✅ |
| Auditoría predictiva | ✅ |
| Panel de administración | ✅ |
| Deploy ready (Docker/Railway) | ✅ |
| RAG dinámico (upload docs) | ✅ |

## Instalación

```bash
cd src/ai/alex/server
npm install
cp .env.example .env
# Editar .env con tus keys
```

## Setup Supabase

Ejecutar `setup.sql` en el SQL Editor de Supabase.

## Ejecución

```bash
npm run dev   # desarrollo
npm start     # producción
```

## Deploy (Railway)

```bash
railway login
railway init
railway up
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/chat | Chat completo |
| POST | /api/stream | Streaming SSE |
| POST | /api/feedback | Feedback 👍/👎 |
| POST | /api/docs | Subir documento RAG |
| GET | /api/docs | Listar documentos |
| DELETE | /api/docs/:id | Eliminar documento |
| GET | /api/health | Health check |

## Tools disponibles (Function Calling)

1. buscar_producto
2. consultar_producto
3. validar_movimiento
4. simular_movimiento
5. resumen_inventario
6. productos_criticos
7. pasos_operacion
8. insights_operativos
9. sugerencias_rol
10. ejecutar_entrada
11. ejecutar_salida
12. ejecutar_transferencia
13. predecir_agotamiento
14. detectar_anomalias
15. recomendaciones_reorden
16. auditoria_predictiva
