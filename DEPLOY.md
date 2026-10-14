# Guía de Despliegue - Sistema de Turnos (Render + Vercel + Supabase)

## Variables de Entorno Requeridas

### Backend (Render)
| Variable | Descripción | Ejemplo Producción |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor (Render lo asigna automáticamente) | `10000` |
| `DATABASE_URL` | URL de conexión PostgreSQL (desde Supabase) | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |
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

## Paso a Paso: Despliegue Completo

### 1. Preparar Base de Datos en Supabase (GRATIS PERPETUO)

1. **Crear cuenta en [supabase.com](https://supabase.com)**
2. **New Project**:
   - Organization: tu cuenta
   - Name: `ticket-system` (o como quieras)
   - Database Password: **guárdalo bien** (ej: `TicketDB2024!Seguro`)
   - Region: closest to you (ej: South America - São Paulo)
   - Pricing Plan: **Free** (500 MB, sin límite de tiempo)
3. **Esperar a que termine el provisioning** (~2 min)
4. **Copiar Connection String**:
   - Settings → Database → Connection string → **URI**
   - Formato: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`
   - Reemplaza `[YOUR-PASSWORD]` con tu password real
   - **Guarda este string completo**

### 2. Desplegar Backend en Render

1. **Ir a [dashboard.render.com](https://dashboard.render.com) → New → Web Service**
2. **Conectar repositorio GitHub**: `Susman2002/ticket_v3`
3. **Configuración**:
   ```
   Name: ticket-backend (o tu nombre)
   Region: mismo que Supabase (ej: South America - São Paulo)
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```
4. **Variables de Entorno (Environment → Add Environment Variable)**:
   ```
   PORT=10000
   DATABASE_URL=postgresql://postgres:TicketDB2024!Seguro@db.xxx.supabase.co:5432/postgres
   JWT_SECRET=clave-super-secreta-produccion-2024-cambia-esto-32chars
   FRONTEND_URL=https://tu-app.vercel.app
   PUBLIC_FRONTEND_URL=https://tu-app.vercel.app
   ```
   ⚠️ **Importante**: Usa TU password de Supabase y TU URL de Vercel (ver paso 3)

5. **Health Check Path**: `/api/health` (Settings → Health Check Path)
6. **Create Web Service** → Esperar deploy (~3-5 min)
7. **Copiar URL del backend**: `https://ticket-backend-xxxx.onrender.com`

### 3. Desplegar Frontend en Vercel

1. **Ir a [vercel.com](https://vercel.com) → Add New → Project**
2. **Import Git Repository**: `Susman2002/ticket_v3`
3. **Configuración**:
   ```
   Framework Preset: Angular
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist/ticket-frontend/browser
   ```
4. **Variables de Entorno (Environment Variables)**:
   ```
   apiUrl=https://ticket-backend-xxxx.onrender.com/api
   wsUrl=wss://ticket-backend-xxxx.onrender.com/ws
   publicFrontendUrl=https://tu-app.vercel.app
   ```
   (Usa la URL REAL de tu backend de Render del paso 2)
5. **Deploy** → Esperar build (~2-3 min)
6. **Copiar URL del frontend**: `https://tu-app.vercel.app`

### 4. Actualizar CORS en Render (Backend)

1. **Render Dashboard → tu Web Service → Environment**
2. **Editar variables**:
   ```
   FRONTEND_URL=https://tu-app.vercel.app
   PUBLIC_FRONTEND_URL=https://tu-app.vercel.app
   ```
3. **Save Changes** → Render hará redeploy automático (~1-2 min)

### 5. Inicializar Base de Datos (Primera vez)

En la consola de Render (Shell) o localmente con `DATABASE_URL` de Supabase:
```bash
cd backend
npm run db:init
npm run db:seed
```
Esto crea las tablas y usuarios demo:
- **Admin**: `admin` / `admin123`
- **Operador**: `operador1` / `operador123`

---

## Pruebas de Verificación (Checklist Post-Despliegue)

### ✅ Backend (Render)
| Prueba | Comando/URL | Resultado Esperado |
|--------|-------------|-------------------|
| Health | `GET https://tu-backend.onrender.com/api/health` | `{"status":"ok",...}` |
| QR Actual | `GET https://tu-backend.onrender.com/api/qr/current` | `{token:"...", remainingSeconds:90,...}` |
| Validar QR | `GET https://tu-backend.onrender.com/api/qr/validate/<token>` | `{"valid":true}` |
| Login Admin | `POST /api/auth/login` + body `{username:"admin",password:"admin123"}` | `{token:"...", user:{role:"admin"}}` |
| Login Operador | `POST /api/auth/login` + body `{username:"operador1",password:"operador123"}` | `{token:"...", user:{role:"operator"}}` |
| Servicios | `GET /api/services` | `[{id:1,name:"Trámite General",prefix:"TR1",active:true},...]` |
| Ventanillas | `GET /api/windows` | `[{id:1,name:"Ventanilla 1",active:true},...]` |
| Usuarios (admin) | `GET /api/users` (con Bearer token admin) | Lista de usuarios |

### ✅ Frontend (Vercel)
| Prueba | URL | Verificar |
|--------|-----|-----------|
| Carga inicial | `https://tu-app.vercel.app` | Redirige a `/display` |
| Display | `https://tu-app.vercel.app/display` | QR visible, timer 90s, sin errores consola |
| Kiosco (QR válido) | `https://tu-app.vercel.app/kiosk/<token-del-display>` | Lista 3 trámites, permite emitir |
| Kiosco (QR inválido) | `https://tu-app.vercel.app/kiosk/token-falso` | "Acceso no válido..." |
| Ticket emitido | Tras emitir en kiosco | Muestra número grande, código seguimiento, botón "Sacar otro" deshabilitado hasta completar |
| Seguimiento | `https://tu-app.vercel.app/ticket/<token-del-ticket>` | Estado "waiting", posición en cola |
| Login Admin | `https://tu-app.vercel.app/login` | Credenciales admin → `/admin` |
| Panel Admin Users | `/admin/users` | Tabla usuarios, botón "Nuevo operador" funciona |
| Panel Admin Services | `/admin/services` | CRUD trámites funcional |
| Panel Admin Windows | `/admin/windows` | CRUD ventanillas funcional |
| Login Operador | `/login` con operador1 | `/operator` panel visible |
| Operador Sesión | `/operator` | Seleccionar ventanilla + trámite → "Iniciar sesión" |
| Llamar Siguiente | `/operator/panel` | "Llamar siguiente" → ticket pasa a "called" |
| Atender | `/operator/panel` | "Iniciar atención" → "En atención" → "Completar" |
| Transferir | `/operator/panel` | "Transferir" → modal → selecciona otra ventanilla |
| WebSocket Display | Abrir `/display` en 2 pestañas | Rotación QR sincronizada, tickets aparecen en ambas |

### ✅ Flujo Completo End-to-End
1. Abrir `/display` → ver QR y timer
2. Escanear QR (o abrir `/kiosk/<token>`) → seleccionar trámite → **emitir ticket**
3. Ver ticket emitido con número y código seguimiento
4. Abrir `/ticket/<token>` → estado "waiting", posición 1
5. Login operador → `/operator` → iniciar sesión (ventanilla + trámite)
6. `/operator/panel` → "Llamar siguiente" → ticket pasa a "called"
7. En `/display` → ticket aparece en "Últimos llamados" con ventanilla
8. En `/ticket/<token>` → estado "called", suena alerta, muestra ventanilla
9. Operador: "Iniciar atención" → "Completar"
10. En `/ticket/<token>` → estado "completed"
11. En kiosco (`/kiosk/<token>`) → ahora permite "Sacar otro turno" (ticket anterior completed)

---

## Troubleshooting Común

| Problema | Causa | Solución |
|----------|-------|----------|
| `CORS error` en frontend | `FRONTEND_URL` no coincide con Vercel | Verificar `FRONTEND_URL` y `PUBLIC_FRONTEND_URL` en Render = URL exacta de Vercel |
| `WebSocket connection failed` | URL `wsUrl` incorrecta | Usar `wss://` + misma domain que backend + `/ws` |
| `QR inválido` al emitir | Token expirado (90s) | Refrescar `/display`, obtener token nuevo, probar rápido |
| `Login falla` | Password hash distinto | Ejecutar `npm run db:seed` en backend conectado a Supabase |
| `Tablas no existen` | Schema no corrido | Ejecutar `npm run db:init && npm run db:seed` |
| `Supabase connection timeout` | IP no permitida | Supabase permite todas las IPs por defecto; verificar password en `DATABASE_URL` |
| `Render se duerme` | Plan Free | Primer request tarda ~30s en "despertar"; normal en free tier |

---

## Planes y Costos (Confirmados)

### Render (Backend)
- **Free Web Service**: 750 hrs/mes, duerme a 15 min inactividad, cold start ~30s
- **PostgreSQL**: **NO USAR Render PG** (solo 90 días free)

### Supabase (Base de Datos)
- **Free**: 500 MB storage, 2 GB bandwidth/mes, 50,000 MAU, **sin límite de tiempo**
- **Pro**: $25/mes si necesitas más

### Vercel (Frontend)
- **Hobby Free**: 100 GB bandwidth/mes, builds ilimitados, SSL automático
- **Pro**: $20/mes para teams/enterprise

**Total costo portafolio: $0/mes** (Free tiers suficientes para demo)

---

## URLs Finales (Ejemplo)

```
Frontend:  https://ticket-system.vercel.app
Backend:   https://ticket-backend.onrender.com
WS:        wss://ticket-backend.onrender.com/ws
Display:   https://ticket-system.vercel.app/display
Kiosco:    https://ticket-system.vercel.app/kiosk/<token>
Seguimiento: https://ticket-system.vercel.app/ticket/<token>
Admin:     https://ticket-system.vercel.app/admin
Operador:  https://ticket-system.vercel.app/operator
```

---

## Comandos Útiles

```bash
# Desarrollo local
cd backend && npm run dev
cd frontend && npm start

# Build producción
cd frontend && npm run build

# Inicializar BD en Supabase (local con DATABASE_URL de Supabase)
cd backend && DATABASE_URL="postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres" npm run db:init
cd backend && DATABASE_URL="postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres" npm run db:seed

# Verificar logs Render
# Dashboard → Web Service → Logs

# Verificar logs Vercel
# Dashboard → Project → Functions → View Logs
```