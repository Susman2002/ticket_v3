# Guía de Despliegue - Sistema de Turnos

## Variables de Entorno Requeridas

### Backend (Render)
| Variable | Descripción | Ejemplo Producción |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor (Render lo asigna automáticamente) | `10000` |
| `DATABASE_URL` | URL de conexión PostgreSQL (Render la provee) | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mínimo 32 chars) | `clave-super-secreta-produccion-2024` |
| `FRONTEND_URL` | URL del frontend para CORS | `https://mi-app.vercel.app` |
| `PUBLIC_FRONTEND_URL` | URL pública del frontend (para QR) | `https://mi-app.vercel.app` |

### Frontend (Vercel)
| Variable | Descripción | Ejemplo Producción |
|----------|-------------|-------------------|
| `apiUrl` | URL del backend API | `https://mi-backend.onrender.com/api` |
| `wsUrl` | URL WebSocket del backend | `wss://mi-backend.onrender.com/ws` |
| `publicFrontendUrl` | URL pública del frontend | `https://mi-app.vercel.app` |

*Configurar en `environment.prod.ts` o variables de entorno de Vercel*

---

## Despliegue en Render (Backend)

1. **Crear Web Service**
   - Conectar repo GitHub
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Base de Datos PostgreSQL**
   - Crear PostgreSQL database en Render
   - Copiar `DATABASE_URL` al Web Service

3. **Variables de Entorno (Dashboard > Environment)**
   ```
   PORT=10000
   DATABASE_URL=<desde PostgreSQL render>
   JWT_SECRET=<generar clave segura 32+ chars>
   FRONTEND_URL=https://<tu-app>.vercel.app
   PUBLIC_FRONTEND_URL=https://<tu-app>.vercel.app
   ```

4. **Health Check**
   - Path: `/api/health`
   - Render verifica automáticamente

5. **WebSocket**
   - Render soporta WebSocket en el mismo puerto HTTP
   - Path: `/ws` (configurado en server.js)

---

## Despliegue en Vercel (Frontend)

1. **Importar Proyecto**
   - Framework Preset: Angular
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist/ticket-frontend/browser`

2. **Variables de Entorno (Project Settings > Environment Variables)**
   ```
   apiUrl=https://<tu-backend>.onrender.com/api
   wsUrl=wss://<tu-backend>.onrender.com/ws
   publicFrontendUrl=https://<tu-app>.vercel.app
   ```

3. **vercel.json** (ya incluido)
   - Maneja SPA routing (rewrites a index.html)
   - Configura output directory correcto

---

## Checklist Pre-Despliegue

- [ ] Build frontend: `cd frontend && npm run build` ✅
- [ ] Sintaxis backend: `cd backend && node --check src/server.js` ✅
- [ ] `.gitignore` excluye `.env` ✅
- [ ] `vercel.json` configurado ✅
- [ ] `environment.prod.ts` con placeholders ✅
- [ ] Backend escucha `process.env.PORT` ✅
- [ ] Health endpoint `/api/health` ✅
- [ ] CORS configurado para `FRONTEND_URL` ✅
- [ ] WebSocket en mismo puerto HTTP ✅
- [ ] PostgreSQL persistente en Render (no filesystem) ✅

---

## Planes y Límites (Verificar antes de desplegar)

### Render
- **Web Service Free**: 750 horas/mes, se duerme tras 15 min inactividad
- **PostgreSQL Free**: 90 días, 1 GB, luego se pausa
- **Paid**: $7/mes Web Service, $7/mes PostgreSQL (persistente, no duerme)

### Vercel
- **Hobby Free**: 100 GB bandwidth/mes, builds ilimitados
- **Pro**: $20/mes, 1 TB bandwidth, funciones serverless

### PostgreSQL Externo (Alternativa)
- Neon, Supabase, Railway ofrecen free tiers más generosos
- Render PostgreSQL free es solo 90 días

---

## URLs de Producción Esperadas

```
Frontend:  https://<nombre-app>.vercel.app
Backend:   https://<nombre-backend>.onrender.com
WS:        wss://<nombre-backend>.onrender.com/ws
QR Kiosco: https://<nombre-app>.vercel.app/kiosk/<token>
Display:   https://<nombre-app>.vercel.app/display
```

---

## Comandos Útiles

```bash
# Desarrollo local
cd backend && npm run dev
cd frontend && npm start

# Build producción
cd frontend && npm run build

# Inicializar BD (solo primera vez)
cd backend && npm run db:init && npm run db:seed
```