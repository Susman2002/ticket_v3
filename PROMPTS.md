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

## Fase 5: Display, Kiosco, Seguimiento ciudadano (UI completa) (COMPLETADA)

### Qué se implementó
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

4. **Componentes compartidos nuevos**
   - `QRDisplayComponent` - QR con animación de rotación
   - `TimerCircularComponent` - Timer circular con progreso y colores
   - `TicketCardComponent` - Card de ticket con animación slide-in
   - `StatusBadgeComponent` - Badge de estado con iconos SVG animados
   - `AlertSoundComponent` - Sonido de alerta con fallback Web Audio API

---

## Fase 6: Paneles de Operador (UI completa) (EN CURSO)

### Qué se está implementando
1. **`/operator` - Panel principal operador**
   - Header con estado de sesión claro (usuario, rol, sesión activa/inactiva)
   - Formulario inicio sesión (ventanilla + servicio) con validaciones visuales
   - Resumen de colas por servicio (cards con contadores animados en tiempo real)
   - Lista de turnos en espera con animaciones y detalles
   - Botón "Llamar siguiente" prominente con estado loading
   - WebSocket: actualizaciones en tiempo real sin recargar
   - Estados claros: sin sesión / con sesión / cargando

2. **`/operator/panel` - Panel de atención**
   - Ticket actual grande con estado visual prominente
   - Botones de acción contextuales (Iniciar/Completar/Cancelar/Transferir)
   - Selector de ventanilla destino para transferencia (solo ventanillas con sesión activa mismo servicio)
   - Historial de timestamps del turno
   - Confirmaciones antes de acciones destructivas
   - Botones: "Cerrar sesión de trabajo" vs "Cerrar sesión completa" (logout real)

3. **Componentes compartidos nuevos**
   - `QueueCardComponent` - Card de cola con contador animado y color por servicio
   - `ActionButtonComponent` - Botones de acción con estados loading/disabled/tooltip
   - `TransferModalComponent` - Modal para confirmar transferencia con selector
   - `SessionStatusComponent` - Badge de estado de sesión (activa/inactiva)
   - `OperatorHeaderComponent` - Header reutilizable con acciones de sesión

### Por qué esta implementación
- Los componentes base ya existen (Fase 4), ahora se pulen la UX/UI para operadores
- Prioridad: flujo de trabajo eficiente, estados claros, feedback visual inmediato
- WebSocket para tiempo real en colas y ticket actual
- Acciones destructivas con confirmación
- Distinción clara entre "cerrar sesión de trabajo" y "logout completo"

### Archivos a modificar en /frontend
- `src/app/features/operator/operator.component.ts` + template
- `src/app/features/operator/operator-panel.component.ts` + template
- `src/app/shared/components/` - Nuevos: QueueCard, ActionButton, TransferModal, SessionStatus, OperatorHeader

### Pruebas manuales esperadas al terminar
1. `/operator` sin sesión - Formulario ventanilla+servicio visible, botones claros
2. `/operator` con sesión - Colas en tiempo real, lista espera, botón "Llamar siguiente" funcional
3. WebSocket: contadores se actualizan solos, nuevo llamado aparece en lista
4. `/operator/panel` - Ticket actual grande, botones según estado (Iniciar solo en called, Completar solo in_service, etc.)
5. Transferencia - Modal con selector solo ventanillas válidas (sesión activa, mismo servicio)
6. Confirmaciones - Cancelar/Transferir piden confirmación
7. "Cerrar sesión de trabajo" vuelve a formulario, "Cerrar sesión completa" → /login
8. Responsive: escritorio y tablet
9. Accesibilidad: Tab navigation, labels, contraste

---

## Próximas fases (pendientes)
- Fase 7: Panel administrativo (UI completa)
- Fase 8: Revisión manual, build, lint, preparación Render/Vercel