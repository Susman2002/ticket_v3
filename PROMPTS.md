# PROMPTS.md - Registro de trabajo por fase

## Fase 1: Backend Base (COMPLETADA)

### Qué se implementó
Backend mínimo para el sistema de turnos con:
1. Conexión a PostgreSQL
2. Esquema de base de datos inicial (7 tablas)
3. Semillas: roles, 3 servicios, usuario admin y operador demo
4. QR rotativo en memoria (token actual + anterior, rotación 90s)
5. Endpoints REST:
   - `GET /api/health` - Health check
   - `GET /api/qr/current` - Token vigente y tiempo restante
   - `GET /api/qr/validate/:token` - Validación de token
   - `POST /api/tickets` - Emisión de tickets con validación QR
6. Numeración atómica de tickets por servicio y fecha (PREFIJO-NNN)
7. Servidor HTTP + WebSocket nativo (ws) en mismo puerto

---

## Fase 2: Auth JWT, Servicios, Ventanillas, Sesiones Operador, Cola, Llamar Siguiente (COMPLETADA)

### Qué se implementó
1. **JWT Authentication**
   - `jsonwebtoken` dependency
   - `POST /api/auth/login` - Login admin/operador, retorna JWT
   - Middleware `authRequired` y `requireRole('admin'|'operator')`
   - Passwords con bcrypt

2. **Servicios (CRUD admin)**
   - `GET /api/services` - Lista servicios activos (público)
   - `POST /api/services` - Crear servicio (admin)
   - `PUT /api/services/:id` - Actualizar servicio (admin)
   - `DELETE /api/services/:id` - Eliminar/desactivar servicio (admin)

3. **Ventanillas (CRUD admin)**
   - `GET /api/windows` - Lista ventanillas activas
   - `POST /api/windows` - Crear ventanilla (admin)
   - `PUT /api/windows/:id` - Actualizar ventanilla (admin)
   - `DELETE /api/windows/:id` - Eliminar/desactivar ventanilla (admin)

4. **Sesiones de Operador**
   - `POST /api/operator/session/start` - Iniciar sesión (operador autenticado)
   - `POST /api/operator/session/end` - Finalizar sesión (operador)
   - `GET /api/operator/session/current` - Sesión actual del operador logueado

5. **Cola de Espera**
   - `GET /api/queue/:service_id` - Tickets en estado `waiting` ordenados por fecha
   - `GET /api/queue` - Resumen de colas por servicio (contadores)

6. **Llamar Siguiente**
   - `POST /api/operator/call-next` - Operador llama siguiente ticket de SU servicio

---

## Fase 3: Iniciar/Completar/Cancelar Atención, Transferencia, WebSocket Events (COMPLETADA)

### Qué se implementó
1. **Gestión de atención del ticket (operador)**
   - `POST /api/operator/ticket/start` - Iniciar atención
   - `POST /api/operator/ticket/complete` - Completar atención
   - `POST /api/operator/ticket/cancel` - Cancelar atención

2. **Transferencia directa entre operadores**
   - `POST /api/operator/ticket/transfer` - Transferir ticket a otra ventanilla

3. **Eventos WebSocket**
   - `ticket_updated` - Cambio de estado
   - `ticket_transferred` - Transferencia con info origen/destino

4. **Endpoint para operador: ticket actual en atención**
   - `GET /api/operator/ticket/current` - Ticket en `called` o `in_service` de la sesión activa

---

## Fase 4: Base del Frontend Angular con Tailwind, Configuración API/WebSocket, Login y Guards (EN CURSO)

### Qué se está implementando
1. **Proyecto Angular Standalone**
   - Angular 18+ con standalone components
   - Tailwind CSS configurado
   - Estructura: `/frontend/src/app` con components, services, guards, interceptors

2. **Configuración de entorno**
   - `environment.ts` / `environment.prod.ts` con `apiUrl`, `wsUrl`, `publicFrontendUrl`
   - Proxy config para desarrollo local

3. **Servicios Angular**
   - `ApiService` - HTTP client con interceptors para JWT
   - `AuthService` - Login, logout, token storage, user state
   - `WebSocketService` - Conexión WS, reconexión, eventos (QR_ROTATED, ticket_created, ticket_called, ticket_updated, ticket_transferred, operator_session_started, operator_session_ended)
   - `TicketService` - Crear ticket, consultar ticket, colas
   - `OperatorService` - Sesiones, llamar siguiente, iniciar/completar/cancelar/transferir
   - `AdminService` - CRUD servicios, ventanillas, usuarios

4. **Autenticación y Guards**
   - `authGuard` - Rutas protegidas (operador, admin)
   - `roleGuard` - Verificar rol específico
   - `loginGuard` - Redirigir si ya autenticado
   - Interceptor: añade `Authorization: Bearer <token>` automáticamente

5. **Rutas principales (Lazy loading)**
   - `/login` - Login admin/operador
   - `/display` - Pantalla pública sala (QR + últimos llamados)
   - `/kiosk/:token` - Kiosco público (validar QR, seleccionar servicio, emitir ticket)
   - `/ticket/:token` - Seguimiento ciudadano (estado, posición, ventanilla, sonido al called)
   - `/operator` - Panel operador (sesión, ventanilla, servicio, cola, llamar siguiente)
   - `/operator/panel` - Ticket actual (iniciar, completar, cancelar, transferir)
   - `/admin` - Dashboard admin
   - `/admin/users` - Gestión operadores
   - `/admin/services` - Gestión servicios
   - `/admin/windows` - Gestión ventanillas

6. **Componentes base**
   - Layout con header/navigation según rol
   - Componentes compartidos: QR display, ticket card, queue list, loading, error

### Por qué esta implementación
- Angular standalone + Tailwind = ligero, moderno, sin módulos NgModule
- Servicios tipados con signals/reactive para estado reactivo
- Guards funcionales (Angular 15+) para protección de rutas
- WebSocket service con reconexión automática y sincronización con API al reconectar
- Configuración por entornos para desarrollo (localhost) y producción (Vercel + Render)

### Archivos a crear en /frontend
- `package.json` - Angular, Tailwind, rxjs, zone.js
- `angular.json` - Configuración proyecto standalone
- `tailwind.config.js` - Configuración Tailwind
- `src/main.ts` - Bootstrap aplicación
- `src/app/app.routes.ts` - Rutas con lazy loading y guards
- `src/app/app.config.ts` - Providers (HttpClient, guards, interceptors)
- `src/environments/environment.ts` - Config desarrollo
- `src/environments/environment.prod.ts` - Config producción
- `src/app/core/services/` - api, auth, websocket, ticket, operator, admin
- `src/app/core/guards/` - auth, role, login guards
- `src/app/core/interceptors/` - auth interceptor
- `src/app/features/` - login, display, kiosk, ticket, operator, admin
- `src/app/shared/components/` - Componentes reutilizables

### Pruebas manuales esperadas al terminar
1. `ng serve` levanta frontend en `http://localhost:4200`
2. `/login` - Login admin/operador funcional, redirige según rol
3. `/display` - Muestra QR actual, cuenta regresiva 90s, últimos llamados, actualiza por WS
4. `/kiosk/:token` - Valida QR token, permite seleccionar servicio, emite ticket
5. `/ticket/:token` - Muestra estado, posición, ventanilla, sonido al called
6. `/operator` - Login operador, iniciar sesión (ventanilla + servicio), ver cola, llamar siguiente
7. `/operator/panel` - Ticket actual: iniciar, completar, cancelar, transferir
8. `/admin/*` - Solo admin: CRUD usuarios, servicios, ventanillas
9. Guards: acceso denegado sin login, redirección correcta según rol
10. WebSocket: reconexión automática, eventos llegan a componentes

---

## Próximas fases (pendientes)
- Fase 5: Display, Kiosco, Seguimiento ciudadano (UI completa)
- Fase 6: Paneles de operador (UI completa)
- Fase 7: Panel administrativo (UI completa)
- Fase 8: Revisión manual, build, lint, preparación Render/Vercel