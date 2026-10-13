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

## Fase 4: Base del Frontend Angular con Tailwind, Configuración API/WebSocket, Login y Guards (COMPLETADA)

### Qué se implementó
1. **Proyecto Angular Standalone**
   - Angular 18+ con standalone components
   - Tailwind CSS configurado
   - Estructura: `/frontend/src/app` con components, services, guards, interceptors

2. **Configuración de entorno**
   - `environment.ts` / `environment.prod.ts` con `apiUrl`, `wsUrl`, `publicFrontendUrl`

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

---

## Fase 5: Display, Kiosco, Seguimiento ciudadano (UI completa) (EN CURSO)

### Qué se está implementando
Mejorar y completar la UI de los componentes públicos ya existentes, enfocándose en:

1. **Display (`/display`) - Pantalla pública de sala**
   - QR grande centrado con animación suave al rotar
   - Timer circular visual (90s) con progreso
   - Lista de últimos 10 turnos llamados con ventanilla
   - Animaciones de entrada/salida para tickets llamados
   - Sonido de alerta cuando hay nuevo llamado
   - Auto-reconexión WebSocket robusta
   - Responsive: funciona en TV horizontal y monitor vertical

2. **Kiosco (`/kiosk/:token`) - Autoservicio**
   - Validación visual clara del QR (verde/rojo)
   - Grid de servicios con iconos, nombres y prefijos
   - Confirmación visual al emitir ticket (animación + número grande)
   - Código de seguimiento copiable
   - Botón "Otro turno" que reinicia selección
   - Manejo de errores: QR expirado, servicio inactivo
   - Accesibilidad: navegación por teclado, lectores de pantalla

3. **Seguimiento ciudadano (`/ticket/:token`) - Mi turno**
   - Estado visual claro: esperando/llamado/en atención/completado/cancelado/transferido
   - Posición en cola en tiempo real (cuenta regresiva)
   - Ventanilla destacada cuando es llamado/transferido
   - Sonido de alerta al cambiar a "called"
   - Historial de timestamps (creado, llamado, iniciado, completado)
   - Código de seguimiento para compartir
   - Auto-refresh vía WebSocket + fallback polling
   - Pantalla de "turno no encontrado" amigable

### Por qué esta implementación
- Los componentes base ya existen (Fase 4), ahora se pulen la UX/UI
- Prioridad: experiencia ciudadana fluida, accesible y sin fricciones
- WebSocket para tiempo real + fallback robusto
- Tailwind para estilos consistentes y responsive

### Archivos a modificar en /frontend
- `src/app/features/display/display.component.ts` + template
- `src/app/features/kiosk/kiosk.component.ts` + template
- `src/app/features/ticket/ticket.component.ts` + template
- `src/app/shared/components/` - Nuevos componentes reutilizables (QRDisplay, TimerCircular, TicketCard, StatusBadge, AlertSound)

### Pruebas manuales esperadas al terminar
1. `/display` - QR se actualiza solo cada 90s, timer circular, últimos 10 llamados con animación, sonido al nuevo llamado
2. `/kiosk/<token_valido>` - Valida QR, muestra servicios, emite ticket con animación, muestra código copiable
3. `/kiosk/<token_invalido>` - Muestra error claro "Acceso no válido..."
3. `/ticket/<token>` - Estado, posición, ventanilla, sonido al called, timestamps, código copiable
4. WebSocket: reconexión automática tras cortes, eventos llegan sin duplicados
5. Responsive: probar en móvil, tablet, desktop, TV
6. Accesibilidad: Tab navigation, screen reader labels, contraste

---

## Próximas fases (pendientes)
- Fase 6: Paneles de operador (UI completa)
- Fase 7: Panel administrativo (UI completa)
- Fase 8: Revisión manual, build, lint, preparación Render/Vercel