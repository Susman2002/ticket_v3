# AGENTS.md - Reglas de trabajo para opencode

## ROL Y OBJETIVO
Actúa como desarrollador full-stack práctico, conservador y minimalista. Vamos a construir desde cero un sistema ligero de turnos para una institución pública pequeña.

La aplicación debe funcionar:
- Localmente, una vez instalados Node.js, Angular y PostgreSQL.
- Con el frontend Angular desplegado en Vercel.
- Con el backend Node.js desplegado en Render.
- Con PostgreSQL desde el inicio, tanto localmente como en producción.

La prioridad es entregar funcionalidades sencillas, estables y fáciles de mantener. Evita cualquier sobre-ingeniería.

## FORMA DE TRABAJO
Antes de escribir código:
1. Comprueba la rama activa y los cambios pendientes.
2. Explica brevemente qué vas a implementar.
3. Crea una rama específica para la funcionalidad.

Trabaja en pasos pequeños:
- Implementa una sola funcionalidad o cambio lógico a la vez.
- Respeta las convenciones existentes.
- Usa las dependencias mínimas indispensables.
- Realiza commits locales pequeños y claros.
- Al completar una fase, explícame brevemente qué se hizo y cómo probarlo manualmente.
- Detente y espera mi aprobación antes de continuar con la siguiente fase.

## REGLAS ESTRICTAS CONTRA LA SOBRE-INGENIERÍA
- Solo existirán dos carpetas principales:
  - /backend
  - /frontend
- No uses workspaces, Turborepo, Nx, carpetas packages, microservicios ni monorepo tooling.
- No uses Docker, Dockerfile ni docker-compose.
- No crees workers ni procesos adicionales.
- No agregues pruebas unitarias, pruebas e2e, pruebas de carga ni archivos de testing.
- No instales Jest, Vitest, Playwright, Cypress, k6 ni herramientas similares.
- Yo realizaré las pruebas funcionales manualmente.
- No agregues documentación, diagramas, ADR, git hooks ni archivos auxiliares innecesarios.
- No crees README ni archivos Markdown salvo que yo los solicite.
- No agregues comentarios innecesarios al código.
- No agregues una dependencia si la funcionalidad puede resolverse claramente con Node.js o con una dependencia ya instalada.
- No uses un ORM pesado.
- Usa PostgreSQL con el paquete `pg` y consultas SQL parametrizadas.
- Usa scripts SQL pequeños únicamente cuando sean necesarios para crear o actualizar el esquema.
- No cambies PostgreSQL, Angular, Express ni la arquitectura sin explicar el motivo y obtener mi autorización.
- No agregues archivos específicos para Render o Vercel salvo que sean realmente necesarios para desplegar.
- Nunca guardes contraseñas, tokens, URLs privadas ni secretos en Git.

## ESTRUCTURA DEL PROYECTO

### /backend
- Node.js.
- Express.
- PostgreSQL mediante `pg`.
- WebSocket nativo mediante `ws`.
- JWT para autenticación.
- `bcryptjs` para contraseñas.
- Un único proceso HTTP que también aloje el servidor WebSocket.
- Configuración mediante variables de entorno.
- Una estructura de archivos pequeña, sin capas ni abstracciones innecesarias.

### /frontend
- Angular standalone.
- Tailwind CSS.
- Servicios mínimos para API, autenticación y WebSocket.
- Rutas cargadas de forma sencilla.
- Una URL configurable para comunicarse con el backend.
- Vercel se utiliza solamente para desplegar el frontend.

## DESPLIEGUE OBJETIVO
- Backend Node.js en Render.
- Frontend Angular en Vercel.
- PostgreSQL administrado y persistente para producción.
- PostgreSQL local durante el desarrollo.
- WebSocket alojado en el mismo servicio backend de Render.
- No alojes el WebSocket ni el backend persistente en Vercel.
- El frontend debe usar HTTPS y WSS en producción.
- Configura CORS únicamente para los orígenes necesarios.
- El backend debe escuchar el puerto entregado en `process.env.PORT`.
- El backend debe incluir un endpoint sencillo de salud, por ejemplo `GET /api/health`.
- La API y la base de datos son la fuente de verdad.
- Los clientes deben recuperar el estado mediante HTTP al cargar o reconectar.
- Antes del despliegue, consulta la documentación vigente y confirma los límites, persistencia, suspensión y posibles costos de Render, Vercel y PostgreSQL.
- No selecciones ni contrates servicios con costo sin mi autorización.
- No dependas del sistema de archivos de Render para guardar información.
- No uses SQLite en producción porque el sistema de archivos de Render puede ser efímero.
- No mantengas una implementación SQLite paralela.

## FLUJO DE TRABAJO CON GIT
1. Crear una rama por funcionalidad
   - Usa nombres claros, por ejemplo: `feature/backend-base`, `feature/crear-ticket`, `feature/consulta-qr`, `feature/panel-operador`, `fix/error-generacion-qr`
   - No trabajes directamente sobre `main`.

2. Hacer commits locales pequeños
   - Cada commit debe representar un cambio lógico concreto.
   - Antes de cada commit: Revisa `git status`, Revisa el diff, Incluye únicamente los archivos relacionados, Verifica que no existan secretos ni archivos generados, No uses `git add .` sin revisar qué se incluirá, No hagas commits vacíos, No modifiques la configuración global de Git, No uses `--no-verify`, force push ni reescritura innecesaria del historial.

3. Push frecuente, pero siempre autorizado
   - Nunca ejecutes `git push` automáticamente.
   - Cuando una funcionalidad esté lista: Muéstrame el estado de la rama, Resume los commits locales, Indica qué debo probar manualmente, Detente para que yo realice las pruebas, Espera mi autorización explícita antes de hacer el push.

4. Verificar antes de integrar
   - Revisa `git status`, Revisa el diff completo contra `main`, Comprueba que no existan secretos, archivos `.env`, bases de datos, dependencias instaladas ni archivos generados, Ejecuta build y lint si existen scripts configurados, No crees archivos ni frameworks de pruebas automatizadas, Entrégame instrucciones concretas para probar manualmente la funcionalidad.

5. Integrar el trabajo terminado
   - Nunca fusiones una rama con `main` automáticamente.
   - Después del push: Espera a que yo pruebe la funcionalidad, Solicita mi autorización explícita para fusionar, Solo después de mi aprobación realiza el merge, No elimines la rama local ni remota sin mi autorización, Nunca hagas push directo a `main` salvo que yo lo ordene expresamente, Nunca hagas force push, Nunca hagas commit, push, merge, rebase, reset destructivo o eliminación de ramas si existe alguna duda sobre mi autorización.

## REQUERIMIENTOS FUNCIONALES

### Servicios y usuarios
- Tres trámites o servicios iniciales.
- Cada servicio tiene nombre, prefijo y estado activo.
- Dos roles: administrador y operador.
- Usuario administrador inicial.
- Las contraseñas deben guardarse con hash.
- Los paneles internos requieren autenticación JWT.
- Los secretos y credenciales se configuran con variables de entorno.

### Ventanillas y operadores
- Existen ventanillas configurables.
- Un operador inicia una sesión seleccionando una ventanilla disponible.
- Una ventanilla no puede estar ocupada simultáneamente por dos operadores.
- Un tramite puede ser atendido por mas de un operador.
- el operador elige cuál de los tres trámites atender.
- Al presionar "Llamar siguiente" el operador atiene el siguiente en la lista del tramite que el escogio no puede atender varios tramites al mismo tiempo.
- El sistema asigna el primer ticket en espera de ese trámite.
- El operador puede iniciar, completar o cancelar la atención.
- el operador no puede atender diferentes tipos de tramites en una secion, debe elegir uno y solo puede atender ese tipo de tramite hasta que el decida cambiarlo.
- Un ticket en atención puede transferirse directamente a otro operador con sesión y ventanilla activa.
- La transferencia debe indicar la ventanilla de destino.
- Solo el admin puede agregar, activar o eliminar tramites y ventanillas no el operador.

### Tickets
- Estados permitidos: `waiting`, `called`, `in_service`, `completed`, `cancelled`, `transferred`
- Los tickets nunca se eliminan físicamente.
- Cada ticket tiene un token público único para seguimiento.
- La numeración es independiente por servicio y fecha.
- Formato: `PREFIJO-NNN`, por ejemplo `TR1-001`.
- La numeración debe incrementarse mediante una transacción PostgreSQL segura.
- Usa bloqueo de fila, UPSERT u otra operación atómica sencilla para evitar duplicados.
- El contador nunca retrocede aunque un ticket sea cancelado.
- No implementes mecanismos distribuidos innecesarios.
- la numeracion de los tickets solo dura 1 dia y cada dia se reinicia.

## RUTAS PRINCIPALES DEL FRONTEND
- `/display` - Pantalla pública de sala. No requiere login. Muestra el QR vigente. Muestra los últimos turnos llamados y su ventanilla. Reproduce una alerta sonora cuando corresponda.
- `/kiosk/:token` - Kiosco público abierto desde el QR, su acceso es exclusivo solo desde el QR no se debe permitir el ingreso si este no fue escaneado por el qr. Valida el token recibido. Permite seleccionar uno de los tres trámites. Emite un ticket y muestra su número de seguimiento. no requiere login
- `/ticket/:token` - Seguimiento ciudadano. Muestra estado, posición cuando esté esperando y ventanilla cuando sea llamado o transferido. cuando su estado pase a called debe emitir un sonido de alerta.
- `/login` - Acceso solo para administradores y operadores.
- `/operator` - Inicio de sesión. Selecciona en que ventanilla que este disponible va a trabajar. Seleccióna el tramite en el que va a trabajar. Visualización de las colas llamar al siguiente. opciones de llamar, transferir, cancelar y finalizar el ticket. el operador solo podra llamar al siguiente solo cuando haya seleccionado la opcion de finalizar o en caso de transferir a otra ventanilla.
- `/operator/panel` - Iniciar atención. Finalizar. Cancelar. Transferir.
- `/admin` - Accesos administrativos.
- `/admin/users` - Gestión básica de usuarios(osea operadores). solo el admin puede crear nuevos operadores y solo el puede activarlos o desactivarlos o eliminarlos.
- `/admin/services` - Gestión básica de servicios el gestiona que tramites estaran disponibles para que los operadores trabajen.
- `/admin/windows` - Gestión básica de ventanillas, el gestiona cuales y que ventanillas estaran disponibles.

## QR ROTATIVO DE SALA
Objetivo: Solo una persona que tenga acceso al QR vigente puede ingresar al kiosco y emitir un ticket para que solo las personas que se encuentren fisicamente en la entidad puedan ser atendidas.

Backend:
- Genera el token con `crypto.randomBytes(8).toString('hex')`.
- Mantiene el token actual y el token anterior.
- Rota automáticamente cada 90 segundos.
- El token anterior permanece válido durante un único ciclo de gracia.
- Mantén esta lógica sencilla en memoria.
- Si el backend se reinicia, puede generarse un token nuevo.
- El frontend debe recuperarse consultando nuevamente el estado del backend.
- No agregues Redis para esta primera versión.
- No agregues almacenamiento distribuido mientras exista una sola instancia del backend.
- el qr debe mostrar abajo un temporizador para que vean los usuarios en cuanto tiempo se actializara o seguira siendo valido.
- el qr debe actualizarse solo automaticamente no presionando el refresh.

Endpoints mínimos:
- `GET /api/qr/current` - Devuelve el token vigente y el tiempo restante necesario para `/display`.
- `GET /api/qr/validate/:token` - Devuelve `{ "valid": true }` o `{ "valid": false }`.
- `POST /api/tickets` - Recibe `service_id` y `qr_token`. Acepta el token actual o el token anterior dentro de su ciclo de gracia. Si el token no es válido, devuelve HTTP 403 con este mensaje exacto: "El código QR ha expirado o no es válido. Por favor escana el código que se muestra en la pantalla de la sala."

Kiosco:
- `/kiosk/:token` valida el token al cargar. Si falta, expiró o es inválido, bloquea la emisión y muestra exactamente: "Acceso no válido. Debe escanear el código QR proyectado en la sala de atención."

Pantalla de sala:
- `/display` obtiene el estado vigente del QR desde el backend.
- Renderiza un QR que apunte a: Desarrollo: URL local del frontend. Producción: URL pública del frontend en Vercel.
- La URL base debe configurarse mediante variables de entorno.
- Muestra una cuenta regresiva de 90 segundos.
- Se actualiza al recibir `QR_ROTATED` y el nuevo QR debe mostrarse en pantalla automaticamente.
- Al reconectarse, vuelve a consultar `GET /api/qr/current`.

## COMUNICACIÓN EN TIEMPO REAL
- Usa `ws`.
- El WebSocket comparte el mismo servidor HTTP y puerto de Express.
- Define mensajes JSON sencillos con: `event`, `data`.
- Eventos mínimos: `QR_ROTATED`, `ticket_created`, `ticket_called`, `ticket_updated`, `ticket_transferred`, `operator_session_started`, `operator_session_ended`.
- `/display` recibe el QR y los turnos llamados o transferidos.
- El panel operador actualiza las colas y el ticket activo.
- El seguimiento ciudadano recibe cambios de su ticket.
- No envíes el token privado de seguimiento de un ciudadano al canal público del display.
- Implementa reconexión sencilla en el frontend.
- Tras reconectar, el frontend debe volver a consultar la API.
- No agregues Redis, brokers de mensajes ni Socket.IO en esta primera versión.
- El sistema se desplegará inicialmente con una sola instancia del backend.

## BASE DE DATOS POSTGRESQL
Usa las tablas mínimas necesarias:
- `roles`
- `users`
- `services`
- `windows`
- `operator_sessions`
- `ticket_sequences`
- `tickets`

Requisitos:
- Claves foráneas e índices únicamente donde sean necesarios.
- Restricciones para estados y valores únicos cuando aporten integridad real.
- Consultas SQL parametrizadas.
- Transacciones únicamente para operaciones que necesiten atomicidad.
- No guardes información personal sensible del ciudadano.
- No implementes auditoría avanzada, soft-delete genérico ni tablas históricas adicionales.
- No agregues ORM, repositorios genéricos ni patrones innecesarios.

## VARIABLES DE ENTORNO
Usa únicamente las variables necesarias, por ejemplo:
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `PUBLIC_FRONTEND_URL`

Reglas:
- Incluye un `.env.example` sin valores secretos si es necesario para indicar las variables requeridas.
- Nunca incluyas `.env` real en Git.
- Añade al `.gitignore` únicamente archivos generados, dependencias, secretos y artefactos locales necesarios.
- No dupliques configuraciones innecesariamente.

## FASES DE DESARROLLO
Trabaja en este orden y detente al terminar cada fase:

Fase 1:
- Backend base.
- Conexión a PostgreSQL.
- Esquema mínimo y semillas.
- QR rotativo.
- Consulta y validación del QR.
- Emisión pública de tickets.
- Health check.

Fase 2:
- Autenticación JWT.
- Servicios y ventanillas.
- Sesiones de operador.
- Cola de espera.
- Llamar siguiente seleccionando trámite.

Fase 3:
- Iniciar, completar y cancelar atención.
- Transferencia directa entre operadores.
- Eventos WebSocket.

Fase 4:
- Base del frontend Angular con Tailwind.
- Configuración de API y WebSocket.
- Login y guards mínimos.

Fase 5:
- Display.
- Kiosco.
- Seguimiento ciudadano.

Fase 6:
- Paneles de operador.

Fase 7:
- Panel administrativo.

Fase 8:
- Revisión manual local.
- Build y lint.
- Preparación mínima para Render y Vercel.
- Confirmación de planes, límites y costos antes de desplegar.

## PRIMER PASO: DETENTE AL TERMINAR
Empieza únicamente con la Fase 1.
1. Inspecciona el repositorio.
2. Si tiene cambios pendientes o código anterior, informa antes de modificarlo.
3. Crea la rama local `feature/backend-base`.
4. Crea exclusivamente el backend mínimo necesario.
5. Usa Express, `pg`, `ws`, `bcryptjs`, JWT solo si ya es necesario en esta fase y las utilidades nativas de Node.js.
6. Implementa:
   - Conexión PostgreSQL.
   - Esquema inicial.
   - Semillas de roles, tres servicios y un administrador.
   - QR rotativo con ciclo anterior de gracia.
   - `GET /api/health`.
   - `GET /api/qr/current`.
   - `GET /api/qr/validate/:token`.
   - `POST /api/tickets`.
   - Numeración atómica por servicio y fecha.
7. Realiza commits locales pequeños por cambio lógico.
8. No hagas push.
9. No empieces el frontend.
10. No agregues Docker ni pruebas automatizadas.

Al terminar:
- Resume los archivos creados o modificados.
- Muestra los commits locales realizados.
- Indica los comandos necesarios para configurar PostgreSQL e iniciar el backend.
- Explica cómo verificar manualmente:
  - La conexión.
  - Las tablas.
  - Las semillas.
  - El health check.
  - El QR actual.
  - La validación del QR.
  - La emisión de un ticket.
  - El rechazo de un QR inválido.
- Indica qué debo revisar antes de autorizar el push.
- Detente y espera mis pruebas y mi autorización explícita.