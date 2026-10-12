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

---

## Fase 3: Iniciar/Completar/Cancelar Atención, Transferencia, WebSocket Events (EN CURSO)

### Qué se está implementando
1. **Gestión de atención del ticket (operador)**
   - `POST /api/operator/ticket/start` - Iniciar atención (ticket `called` → `in_service`, `started_at`)
   - `POST /api/operator/ticket/complete` - Completar atención (ticket `in_service` → `completed`, `completed_at`)
   - `POST /api/operator/ticket/cancel` - Cancelar atención (ticket `waiting`/`called`/`in_service` → `cancelled`, `cancelled_at`)
   - Validaciones: solo el operador dueño de la sesión puede actuar sobre su ticket actual

2. **Transferencia directa entre operadores**
   - `POST /api/operator/ticket/transfer` - Transferir ticket a otra ventanilla
     - Body: `{ticket_id, target_window_id}`
     - Valida: ventanilla destino tiene sesión activa, operador destino tiene sesión
     - Ticket `in_service`/`called` → `transferred`, actualiza `window_id`, `operator_session_id`, `transferred_at`
     - Emite `ticket_transferred` con ventanilla origen y destino

3. **Eventos WebSocket (ya existe infraestructura, agregar eventos)**
   - `ticket_updated` - Cambio de estado (called/in_service/completed/cancelled/transferred)
   - `ticket_transferred` - Transferencia con info origen/destino
   - `operator_session_started` / `operator_session_ended` (ya emitidos en Fase 2)
   - `ticket_called` (ya emitido en Fase 2)
   - `ticket_created` (ya emitido en Fase 1)

4. **Endpoint para operador: ticket actual en atención**
   - `GET /api/operator/ticket/current` - Ticket en `called` o `in_service` de la sesión activa

### Por qué esta implementación
- Completa el ciclo de vida del ticket: waiting → called → in_service → completed/cancelled/transferred
- Transferencia directa requiere ventanilla destino con sesión activa (regla de negocio)
- WebSocket events para actualización en tiempo real en display, panel operador, seguimiento ciudadano
- Validaciones estrictas: operador solo maneja tickets de su sesión/servicio

### Archivos a crear/modificar en /backend
- `src/tickets.js` - Agregar funciones: startService, completeService, cancelService, transferTicket, getCurrentTicketForOperator
- `src/server.js` - Agregar endpoints operador + integrar eventos WebSocket

### Pruebas manuales esperadas al terminar
1. Operador llama siguiente → ticket `called`
2. `POST /api/operator/ticket/start` → ticket `in_service`, `started_at`
3. `POST /api/operator/ticket/complete` → ticket `completed`, `completed_at`
4. `POST /api/operator/ticket/cancel` (en waiting/called/in_service) → ticket `cancelled`
5. Transferencia: operador A en ventanilla 1 transfiere a ventanilla 2 (con sesión activa) → ticket `transferred`, nueva ventanilla
6. Verificar WebSocket events: `ticket_updated`, `ticket_transferred` llegan a clientes conectados
7. `GET /api/operator/ticket/current` → ticket en atención del operador
8. Validar que no se puede iniciar/completar/cancelar ticket de otro operador