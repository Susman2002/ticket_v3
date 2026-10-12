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

## Fase 2: Auth JWT, Servicios, Ventanillas, Sesiones Operador, Cola, Llamar Siguiente (EN CURSO)

### Qué se está implementando
1. **JWT Authentication**
   - `jsonwebtoken` dependency
   - `POST /api/auth/login` - Login admin/operador, retorna JWT
   - Middleware `authRequired` y `requireRole('admin'|'operator')`
   - Passwords con bcrypt (ya implementado)

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
     - Body: `{window_id, service_id}`
     - Valida: ventanilla disponible, servicio activo
     - Crea registro en `operator_sessions` con `active=true`
   - `POST /api/operator/session/end` - Finalizar sesión (operador)
     - Marca `active=false`, `ended_at=NOW()`
   - `GET /api/operator/session/current` - Sesión actual del operador logueado

5. **Cola de Espera**
   - `GET /api/queue/:service_id` - Tickets en estado `waiting` ordenados por fecha
   - `GET /api/queue` - Resumen de colas por servicio (contadores)

6. **Llamar Siguiente**
   - `POST /api/operator/call-next` - Operador llama siguiente ticket de SU servicio
     - Body: `{}` (usa service_id de la sesión activa)
     - Transacción: primer ticket `waiting` → `called`, asigna `window_id`, `operator_session_id`, `called_at`
     - Emite evento WebSocket `ticket_called`

### Por qué esta implementación
- JWT para autenticación stateless, compatible con Render/Vercel
- Separación clara: endpoints públicos vs admin vs operador
- Sesiones de operador vinculadas a ventanilla + servicio (regla: un operador = un servicio por sesión)
- Llamar siguiente atómico con transacción para evitar race conditions
- Base para Fase 3 (iniciar/completar/cancelar/transferir atención + WebSocket events)

### Archivos a crear/modificar en /backend
- `package.json` - agregar `jsonwebtoken`
- `src/auth.js` - JWT utils + middleware
- `src/services.js` - CRUD servicios
- `src/windows.js` - CRUD ventanillas
- `src/operatorSessions.js` - Sesiones operador
- `src/queue.js` - Cola + llamar siguiente
- `src/server.js` - Integrar nuevos endpoints + middlewares

### Pruebas manuales esperadas al terminar
1. `POST /api/auth/login` con admin → JWT token
2. `POST /api/auth/login` con operador → JWT token
3. `GET /api/services` (sin auth) → 3 servicios
4. `POST /api/services` (con JWT admin) → crear servicio
5. `GET /api/windows` → 3 ventanillas
6. `POST /api/operator/session/start` (JWT operador) → sesión creada, ventanilla ocupada
7. `GET /api/queue/:service_id` → tickets waiting
8. `POST /api/operator/call-next` → ticket pasa a `called`, asigna ventanilla
9. Verificar que no se puede iniciar 2 sesiones en misma ventanilla
10. Verificar que operador solo ve su servicio en llamar siguiente