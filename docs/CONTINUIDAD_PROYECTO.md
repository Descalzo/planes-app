# Continuidad del proyecto Planes

Documento de estado real del proyecto para que cualquier agente o desarrollador pueda continuar sin contexto previo.

## Estado actual del proyecto

### Objetivo de la aplicacion

Planes es una app social/local para encontrar planes y actividades con otras personas. El usuario puede registrarse, iniciar sesion, crear actividades, unirse, salir, chatear dentro de una actividad y gestionar participantes si es el creador.

### Arquitectura general

- Backend NestJS en `http://localhost:3000`.
- Frontend React + Vite consumiendo la API con Axios.
- Persistencia en MongoDB con Mongoose.
- Autenticacion JWT con header `Authorization: Bearer TOKEN`.
- Notificaciones y refresco de estado en frontend con polling y `localStorage`, no con WebSockets.

### Tecnologias utilizadas

- Backend: NestJS 11, TypeScript, Mongoose, MongoDB, Passport JWT, bcrypt, class-validator, Swagger.
- Frontend: React 18, Vite, TypeScript, React Router DOM 6, Axios, CSS normal.
- Runtime: Node.js, npm.

### Estructura actual

```text
planes/
  backend/
    src/
      activities/
      auth/
      common/pipes/
      database/
      messages/
      users/
      app.module.ts
      main.ts
    package.json
    .env
  frontend/
    src/
      components/
      pages/
      routes/
      services/
      App.tsx
      App.css
      main.tsx
      index.css
    package.json
  docs/
    CONTINUIDAD_PROYECTO.md
  README.md
```

## Backend

### Modulos implementados

- `UsersModule`: registro, login, usuario actual y busqueda por ID.
- `AuthModule`: JWT, estrategia Passport, guard y decorador `CurrentUser`.
- `ActivitiesModule`: actividades, union, salida, expulsiones, desbaneo, silencio de chat.
- `MessagesModule`: mensajes por actividad.
- `DatabaseModule`: modulo de conexion.

### Schemas

#### User

- `email`: unico, requerido.
- `nombre`: requerido.
- `password`: hash bcrypt.
- `ciudad`: opcional.
- `bio`: opcional.
- `intereses`: array opcional.
- timestamps.

#### Activity

- `titulo`: requerido.
- `descripcion`: opcional.
- `categoria`: opcional.
- `ciudad`: opcional.
- `fecha`: `Date`.
- `plazas`: numero, default 10.
- `participantes`: array de `User`.
- `expulsados`: array de `User`, bloquea reingreso hasta desbaneo.
- `salidas`: array de `User`, usuarios que se desapuntaron voluntariamente.
- `chatSilenciados`: array de `User`, no pueden escribir en el chat.
- `creador`: `User`.
- timestamps.

#### Message

- `activity`: referencia a `Activity`.
- `author`: referencia a `User`.
- `text`: requerido.
- timestamps.

### DTOs

- `CreateUserDto`: `email`, `nombre`, `contraseña`, `ciudad?`, `bio?`, `intereses?`.
- `LoginUserDto`: `email`, `contraseña`.
- `CreateActivityDto`: `titulo`, `descripcion?`, `categoria?`, `ciudad?`, `fecha?`, `plazas?`.
- `CreateMessageDto`: `text`.
- `JoinActivityDto` existe en el repo historicamente, pero el flujo actual de join no usa body.

Nota: hay archivos con mojibake en la palabra `contraseÃ±a`. El flujo funciona, pero la codificacion del repo sigue siendo una deuda tecnica.

### Endpoints disponibles

#### Usuarios

- `POST /users`
- `POST /users/login`
- `GET /users/me`
- `GET /users/:id`

#### Actividades

- `GET /activities`
- `POST /activities`
- `GET /activities/:id`
- `PATCH /activities/:id/join`
- `PATCH /activities/:id/leave`
- `PATCH /activities/:id/participants/:participantId/remove`
- `PATCH /activities/:id/participants/:participantId/unban`
- `PATCH /activities/:id/participants/:participantId/mute`
- `PATCH /activities/:id/participants/:participantId/unmute`

#### Mensajes

- `GET /activities/:activityId/messages`
- `POST /activities/:activityId/messages`

### Flujo de autenticacion JWT

1. Registro con `POST /users`.
2. Login con `POST /users/login`.
3. Backend valida credenciales con bcrypt.
4. Backend firma JWT con `sub`, `email` y `nombre`.
5. Frontend guarda el token en `localStorage` con clave `planes_jwt`.
6. Axios manda `Authorization: Bearer TOKEN` en cada llamada protegida.
7. `JwtAuthGuard` protege los endpoints sensibles y `CurrentUser` expone el usuario autenticado.

### Variables de entorno necesarias

`backend/.env`:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster/db
JWT_SECRET=un_secreto_largo_y_privado
PORT=3000
FRONTEND_URL=http://localhost:5173
```

Notas:
- `PORT` es opcional.
- `FRONTEND_URL` es opcional. Si no existe, CORS permite `localhost` y `127.0.0.1` en puertos locales.
- No guardar secretos reales en git.

### Pendientes conocidos del backend

- No hay WebSockets.
- No hay sistema de notificaciones persistente en backend.
- No hay edicion/borrado de actividades.
- No hay paginacion ni busqueda avanzada.
- No hay tests actualizados para los flujos nuevos.
- `start:prod` sigue apuntando a `dist/main`, pero el build actual genera `dist/src/main`; para arrancar desde build se usa `node dist/src/main`.
- Existen documentos antiguos en MongoDB con datos inconsistentes; el backend ya tolera varios casos, pero la base sigue sucia.

## Frontend

### Paginas implementadas

- `LoginPage`
- `RegisterPage`
- `ActivitiesPage`
- `MyActivitiesPage`
- `CreateActivityPage`
- `ActivityDetailPage`
- `ActivityChatPage`

### Componentes implementados

- `Navigation`: barra superior, cambia segun exista JWT.
- `AuthForm`: login/registro.
- `ActivityForm`: crear actividad.
- `ActivityCard`: card con estados visuales de unido, expulsado, novedades y mensajes.
- `MessageList`: lista de mensajes con polling y auto-scroll al final.
- `MessageInput`: envio de mensajes con errores de permisos.

### Servicios API

- `api.ts`: instancia Axios, base URL, `setAuthToken`, `getAuthToken`, persistencia del JWT.
- `authService.ts`: registro, login, usuario actual.
- `activityService.ts`: actividades, join, leave, remove, unban, mute, unmute y helpers de estado.
- `messageService.ts`: listar y crear mensajes.
- `notificationService.ts`: marcas locales por usuario+actividad para actividad vista y chat visto.

### Rutas existentes

- `/` -> redirige a `/activities` si hay JWT, o a `/login` si no.
- `/login`
- `/register`
- `/activities`
- `/my-activities`
- `/activities/new`
- `/activities/:activityId`
- `/activities/:activityId/chat`

Las rutas de app estan protegidas por presencia de JWT en `localStorage`.

### Flujo de navegacion

Sin JWT:
- Solo se ven `Login` y `Registro`.
- Rutas protegidas redirigen a `/login`.

Con JWT:
- Se ven `Actividades`, `Mis actividades`, `Crear actividad` y `Cerrar sesion`.
- `Cerrar sesion` borra el token y manda a `/login`.

### Estado actual del diseno

- Layout centrado con ancho maximo.
- Fondo suave y cards modernas.
- Estados visuales:
  - unido.
  - expulsado.
  - novedades de actividad.
  - mensajes nuevos.
- Formularios limpios.
- Chat con caja de mensajes, input visible, boton enviar y auto-scroll.
- Responsive basico para movil.

### Problemas conocidos del frontend

- Las notificaciones son por polling, no tiempo real real.
- Las marcas de visto viven en `localStorage`.
- Si se cambia de usuario en el mismo navegador, conviene cerrar sesion correctamente.
- Algunos textos conservan acentos simples o sin acento para evitar problemas de encoding.

## Base de datos

### Colecciones existentes

- `users`
- `activities`
- `messages`

### Relaciones entre entidades

- `Activity.creador` -> `User`
- `Activity.participantes[]` -> `User`
- `Activity.expulsados[]` -> `User`
- `Activity.salidas[]` -> `User`
- `Activity.chatSilenciados[]` -> `User`
- `Message.activity` -> `Activity`
- `Message.author` -> `User`

## Funcionalidades ya terminadas

- Registro y login reales.
- JWT en `localStorage`.
- Header `Authorization` automatico.
- Rutas protegidas.
- Listado general de actividades.
- Pagina `Mis actividades`.
- Crear actividad.
- Crear actividad mete al creador como participante.
- Unirse a actividad.
- Desapuntarse de una actividad.
- Expulsar participantes.
- Desbanear expulsados.
- Creador ve participantes, expulsados y usuarios que se desapuntaron.
- Creador puede silenciar y permitir hablar en chat.
- Backend bloquea mensajes de usuarios silenciados.
- Chat por actividad.
- Polling de actividad y mensajes.
- Avisos visuales de mensajes nuevos y novedades de actividad.

## Funcionalidades parcialmente implementadas

- Avisos: funcionan con polling y `localStorage`, no con notificaciones push.
- Moderacion: ya hay quitar, desbanear y silenciar, pero no existe historial o razon del moderado.
- Chat: no hay websockets ni presencia en tiempo real.

## Proximos pasos recomendados

1. Pasar avisos y chat a WebSockets o SSE.
2. Persistir estado de notificaciones vistas en backend.
3. Arreglar codificacion UTF-8 en todos los archivos con mojibake.
4. Arreglar `start:prod` para que use la ruta real de build.
5. Limpiar datos antiguos incoherentes de MongoDB.
6. AÃ±adir tests para join/leave/remove/unban/mute/unmute y mensajes.
7. AÃ±adir busqueda, filtros y paginacion.
8. AÃ±adir borrado o edicion de actividades si entra en alcance.

## Errores conocidos

- `npm run start:prod` no arranca la build actual tal como esta escrita.
- El proyecto tiene algunos textos con codificacion mezclada.
- No hay cobertura automatica suficiente para los flujos nuevos.
- Las notificaciones dependen de polling y pueden tardar unos segundos.

## Como arrancar el proyecto

### Backend

```powershell
cd C:\proyectos\planes\backend
npm install
npm run start:dev
```

Build:

```powershell
npm run build
```

Arranque desde build actual:

```powershell
node dist/src/main
```

Swagger:

```text
http://localhost:3000/api
```

### Frontend

```powershell
cd C:\proyectos\planes\frontend
npm install
npm run dev
```

Opcional `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Build:

```powershell
npm run build
```

## Ultimo estado verificado

Ultima verificacion manual de esta sesion:

- `npm run build` en backend: OK.
- `npm run build` en frontend: OK.
- Backend levantado en `http://localhost:3000`.
- `GET /activities` responde `200`.
- Login funciona.
- El listado de actividades carga.
- Crear actividad funciona.
- Unirse, salir, quitar, desbanear, silenciar y permitir hablar funcionan.
- El chat carga mensajes y los envia.
- Los mensajes nuevos y cambios de actividad aparecen por polling.
- El auto-scroll del chat baja al final cuando llegan mensajes nuevos.
