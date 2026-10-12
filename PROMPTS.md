# PROMPTS.md - Registro de trabajo por fase

## Fase 1: Backend Base (EN CURSO)

### Qué se está implementando
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

### Por qué esta implementación
- Cumple con los requisitos funcionales de la Fase 1 según AGENTS.md
- Base sólida para las siguientes fases (auth, operadores, WebSocket events)
- PostgreSQL desde el inicio (no SQLite) para consistencia local/producción
- QR rotativo en memoria simple, sin Redis, para una sola instancia
- Numeración atómica con transacciones PostgreSQL para evitar duplicados
- Estructura mínima sin capas innecesarias, fácil de mantener

### Archivos a crear en /backend
- package.json
- .env.example
- src/db.js (pool pg)
- src/schema.sql (DDL)
- src/seed.js (datos iniciales)
- src/qr.js (lógica QR rotativo)
- src/tickets.js (emisión atómica tickets)
- src/server.js (Express + ws + endpoints)

### Credenciales demo
- Admin: usuario `admin`, password `admin123`
- Operador: usuario `operador1`, password `operador123`
- Contraseñas guardadas como hash bcrypt

### Pruebas manuales esperadas al terminar
1. `GET /api/health` → 200 OK
2. `GET /api/qr/current` → token + segundos restantes
3. `GET /api/qr/validate/:token` → valid/invalid
4. `POST /api/tickets` con QR válido → ticket creado con número PREFIJO-NNN
5. `POST /api/tickets` con QR inválido → 403 mensaje exacto
6. Verificar tablas y semillas en PostgreSQL