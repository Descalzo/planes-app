# Continuidad del proyecto Planes

Documento de estado real del proyecto. Última actualización: **v0.6-pwa** — PWA instalable (service worker + manifest + iconos), chat en tiempo real con Socket.IO, sistema completo de notificaciones, favoritos ("Me gusta") y mejoras de moderación.

---

## Objetivo de la aplicación

Planes es una app social/local para encontrar y organizar actividades con otras personas. Los usuarios pueden registrarse, crear actividades, solicitar plaza, preguntar al organizador por chat privado, recibir avisos internos, chatear en el chat general cuando el organizador acepta la solicitud, ver perfiles públicos y gestionar su propia actividad como organizador.

---

## Arquitectura general

```
móvil / navegador
      │
      ▼
Frontend React (Vite) — puerto 4173
      │  Vite proxy en dev: /users, /activities y /notifications → localhost:3000
      ▼
Backend NestJS — puerto 3000
      │
      ▼
MongoDB (Mongoose)
```

- Backend NestJS en `http://localhost:3000`.
- Frontend React + Vite consumiendo la API con Axios, usando URLs relativas (`/users`, `/activities`).
- El proxy de Vite reenvía `/users`, `/activities` y `/notifications` al backend. En producción se necesita un reverse proxy (nginx, etc.) o configurar `VITE_API_URL`.
- Persistencia en MongoDB con Mongoose.
- Autenticación JWT con header `Authorization: Bearer TOKEN`.
- Notificaciones internas persistidas en MongoDB con polling (5 s para contadores).
- **Chat en tiempo real con Socket.IO**: el frontend se conecta via WebSocket (proxiado por Vite en dev) y recibe/envía mensajes sin polling. Polling HTTP a 30 s como fallback.

---

## Acceso desde red local (móvil, tablet)

El servidor Vite escucha en todas las interfaces (`host: true` en `vite.config.ts`). Al arrancar muestra las URLs disponibles:

```
➜  Local:    http://localhost:4173/
➜  Network:  http://192.168.1.X:4173/
```

El móvil accede a la URL de Network. Las llamadas a la API van a `192.168.1.X:4173/users` etc., que Vite proxea desde el PC a `localhost:3000`. El móvil nunca necesita acceder directamente al puerto 3000.

El CORS del backend acepta por defecto:
- `localhost` y `127.0.0.1` en cualquier puerto.
- Rangos `192.168.x.x` y `10.x.x.x` en cualquier puerto (redes locales comunes).
- Se puede sobreescribir con la variable `FRONTEND_URL` en el `.env` del backend.

---

## Tecnologías

| Capa | Stack |
|------|-------|
| Backend | NestJS 11, TypeScript, Mongoose 8, MongoDB, Passport JWT, bcrypt, class-validator, Swagger, @nestjs/websockets + socket.io |
| Frontend | React 18, Vite, TypeScript, React Router DOM 6, Axios, CSS nativo, socket.io-client, **vite-plugin-pwa** (Workbox) |
| Runtime | Node.js 20+, npm |

---

## Cómo arrancar

### Backend

```powershell
cd C:\proyectos\planes\backend
npm install
npm run start:dev
```

Swagger disponible en `http://localhost:3000/api`.

Build de producción:

```powershell
npm run build
node dist/src/main   # (no node dist/main — el build genera dist/src/)
```

### Frontend

```powershell
cd C:\proyectos\planes\frontend
npm install
npm run dev
```

Para build:

```powershell
npm run build
npm run preview
```

### Variables de entorno

`backend/.env`:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster/db
JWT_SECRET=un_secreto_largo_y_privado
PORT=3000
FRONTEND_URL=http://localhost:4173   # opcional; si no se define, acepta localhost y redes locales
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

`frontend/.env` (opcional, solo si no usas el proxy de Vite):

```env
VITE_API_URL=http://localhost:3000
```

---

## Estructura de directorios

```text
planes/
  backend/
    src/
      activities/
        dto/
          create-activity.dto.ts
          update-activity.dto.ts
        schemas/activity.schema.ts
        activities.controller.ts
        activities.service.ts
        activities.module.ts
      auth/
        auth.module.ts
        auth.service.ts
        current-user.decorator.ts
        jwt-auth.guard.ts
        jwt.strategy.ts
        optional-jwt-auth.guard.ts
      common/pipes/parse-object-id.pipe.ts
      database/database.module.ts
      messages/
        dto/create-message.dto.ts
        schemas/message.schema.ts
        messages.controller.ts
        messages.service.ts
        messages.module.ts
      notifications/
        schemas/notification.schema.ts
        notifications.controller.ts
        notifications.service.ts
        notifications.module.ts
      private-activity-messages/
        dto/create-private-activity-message.dto.ts
        schemas/private-activity-message.schema.ts
        private-activity-messages.controller.ts
        private-activity-messages.service.ts
        private-activity-messages.module.ts
      users/
        dto/
          create-user.dto.ts
          login-user.dto.ts
          update-user.dto.ts
        schemas/user.schema.ts
        users.controller.ts
        users.service.ts
        users.module.ts
      app.module.ts
      main.ts
    package.json
    .env
  frontend/
    src/
      components/
        ActivityCard.tsx
        ActivityForm.tsx
        AuthForm.tsx
        MessageInput.tsx
        MessageList.tsx
        Navigation.tsx
      pages/
        ActivitiesPage.tsx
        ActivityChatPage.tsx
        ActivityDetailPage.tsx
        CreateActivityPage.tsx
        EditActivityPage.tsx
        LoginPage.tsx
        MyActivitiesPage.tsx
        NotificationsPage.tsx
        ProfilePage.tsx
        PrivateActivityChatPage.tsx
        RegisterPage.tsx
        UserPublicProfilePage.tsx
      routes/AppRoutes.tsx
      services/
        api.ts
        activityService.ts
        authService.ts
        messageService.ts
        notificationService.ts
        internalNotificationService.ts
        privateActivityChatService.ts
      utils/activityImages.ts
      App.tsx
      App.css
      index.css
      main.tsx
    vite.config.ts
    package.json
  docs/
    CONTINUIDAD_PROYECTO.md
```

---

## Backend

### Módulos

| Módulo | Responsabilidad |
|--------|----------------|
| `UsersModule` | Registro, login, perfil propio, perfil público |
| `AuthModule` | JWT, estrategia Passport, guard, decorador `CurrentUser` |
| `ActivitiesModule` | CRUD actividades, unión, salida, moderación de participantes |
| `MessagesModule` | Mensajes por actividad |
| `NotificationsModule` | Notificaciones internas persistidas |
| `PrivateActivityMessagesModule` | Chat privado entre usuario interesado y organizador |
| `ChatModule` | **WebSocket Gateway** (Socket.IO) para chat general y privado en tiempo real |
| `DatabaseModule` | Conexión MongoDB |

### Schemas

#### User

| Campo | Tipo | Notas |
|-------|------|-------|
| `email` | String | Único, requerido |
| `nombre` | String | Requerido |
| `password` | String | Hash bcrypt, excluido de queries |
| `ciudad` | String | Opcional |
| `bio` | String | Opcional |
| `intereses` | String[] | Opcional, array |
| `fotoPerfilUrl` | String | Opcional, URL de foto de perfil |
| `edad` | Number | Opcional |
| `genero` | String | Opcional |
| `instagram` | String | Opcional |
| `telefono` | String | Opcional, `select: false` |
| timestamps | — | `createdAt`, `updatedAt` automáticos |

#### Activity

| Campo | Tipo | Notas |
|-------|------|-------|
| `titulo` | String | Requerido |
| `descripcion` | String | Opcional |
| `categoria` | String | Opcional; la UI ofrece 11 categorías predefinidas |
| `ciudad` | String | Opcional |
| `fecha` | Date | Opcional |
| `plazas` | Number | Default 10 |
| `plazasOcupadas` | Number | Campo calculado en respuestas; participantes aceptados |
| `plazasDisponibles` | Number | Campo calculado en respuestas; `plazas - plazasOcupadas` |
| `imagenUrl` | String | Opcional, URL de imagen principal |
| `participantes` | ObjectId[] | Ref User; usuarios aceptados, incluye al creador al crear |
| `solicitudesPendientes` | ObjectId[] | Ref User; usuarios que han solicitado plaza |
| `solicitudesRechazadas` | ObjectId[] | Ref User; usuarios rechazados, pueden volver a solicitar |
| `expulsados` | ObjectId[] | Ref User; bloqueados hasta desbaneo |
| `salidas` | ObjectId[] | Ref User; se desapuntaron voluntariamente |
| `chatSilenciados` | ObjectId[] | Ref User; no pueden escribir en el chat |
| `creador` | ObjectId | Ref User, requerido |
| timestamps | — | `createdAt`, `updatedAt` automáticos |

#### Message

| Campo | Tipo | Notas |
|-------|------|-------|
| `activity` | ObjectId | Ref Activity |
| `author` | ObjectId | Ref User |
| `text` | String | Requerido |
| timestamps | — | `createdAt`, `updatedAt` automáticos |

#### Notification

| Campo | Tipo | Notas |
|-------|------|-------|
| `recipient` | ObjectId | Ref User; destinatario |
| `actor` | ObjectId | Ref User; usuario que origina el aviso |
| `activity` | ObjectId | Ref Activity; actividad relacionada |
| `type` | String | `activity_request_created`, `activity_request_accepted`, `activity_request_rejected`, `private_activity_message` |
| `message` | String | Texto ya preparado para mostrar |
| `readAt` | Date | Ausente si está sin leer |
| timestamps | — | `createdAt`, `updatedAt` automáticos |

#### PrivateActivityMessage

| Campo | Tipo | Notas |
|-------|------|-------|
| `activity` | ObjectId | Ref Activity |
| `sender` | ObjectId | Ref User |
| `receiver` | ObjectId | Ref User |
| `text` | String | Requerido |
| timestamps | — | `createdAt`, `updatedAt` automáticos |

### DTOs relevantes

- `CreateUserDto`: `email`, `nombre`, `contraseña`, `ciudad?`, `bio?`, `intereses?`.
- `LoginUserDto`: `email`, `contraseña`.
- `UpdateProfileDto`: todos los campos de perfil opcionales. `fotoPerfilUrl` validado como URL solo si no está vacío (`@ValidateIf`).
- `CreateActivityDto`: `titulo`, `descripcion?`, `categoria?`, `ciudad?`, `fecha?`, `plazas?`, `imagenUrl?`. `imagenUrl` validado como URL solo si no está vacío.
- `UpdateActivityDto`: extiende `PartialType(CreateActivityDto)`, todos opcionales.
- `CreateMessageDto`: `text`.

> **Nota sobre encoding**: algunos archivos tienen `contraseÃ±a` (mojibake de `contraseña`). El flujo funciona en runtime pero es una deuda técnica.

### Endpoints

#### Usuarios (`/users`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/users` | No | Registro |
| POST | `/users/login` | No | Login, devuelve JWT |
| GET | `/users/me` | JWT | Usuario autenticado |
| PATCH | `/users/me` | JWT | Actualizar perfil propio |
| GET | `/users/:id/public` | Opcional JWT | Perfil público (requiere `?activityId=` para ver otro usuario) |
| GET | `/users/:id` | No | Usuario por ID |

#### Actividades (`/activities`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/activities` | No | Listar con filtros y ordenación (`categoria`, `ciudad`, `estado`, `sort`) |
| POST | `/activities` | JWT | Crear (creator se añade como participante automáticamente) |
| GET | `/activities/:id` | No | Detalle |
| PATCH | `/activities/:id` | JWT | Editar (solo creador) |
| PATCH | `/activities/:id/join` | JWT | Solicitar plaza |
| PATCH | `/activities/:id/leave` | JWT | Desapuntarse |
| PATCH | `/activities/:id/requests/:userId/accept` | JWT | Aceptar solicitud (solo creador) |
| PATCH | `/activities/:id/requests/:userId/reject` | JWT | Rechazar solicitud (solo creador) |
| PATCH | `/activities/:id/participants/:pid/remove` | JWT | Expulsar (solo creador) |
| PATCH | `/activities/:id/participants/:pid/unban` | JWT | Desbanear (solo creador) |
| PATCH | `/activities/:id/participants/:pid/mute` | JWT | Silenciar en chat (solo creador) |
| PATCH | `/activities/:id/participants/:pid/unmute` | JWT | Permitir hablar (solo creador) |

Query params soportados por `GET /activities`:
- `categoria`: nombre exacto de la categoría.
- `ciudad`: búsqueda case-insensitive por ciudad.
- `estado`: `futuras` (default), `pasadas`, `todas`.
- `sort`: `fechaAsc` (default), `createdDesc`, `createdAsc`.

Por defecto devuelve actividades próximas (`fecha >= ahora`) y actividades sin fecha, ordenadas por fecha ascendente. Las actividades sin fecha van al final. Las actividades pasadas solo aparecen si se solicita `estado=pasadas` o `estado=todas`.

#### Mensajes (`/activities/:activityId/messages`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/activities/:id/messages` | JWT | Listar mensajes (solo creador o participantes aceptados) |
| POST | `/activities/:id/messages` | JWT | Enviar mensaje (solo creador o participantes aceptados) |

#### Notificaciones (`/notifications`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | Listar notificaciones del usuario autenticado |
| GET | `/notifications/unread-count` | JWT | Contador de notificaciones sin leer |
| PATCH | `/notifications/:id/read` | JWT | Marcar una notificación propia como leída |

#### Chat privado con organizador (`/activities/:activityId/private-chat`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/activities/:id/private-chat` | JWT | Listar conversaciones privadas de la actividad (solo creador) |
| GET | `/activities/:id/private-chat/:userId` | JWT | Ver conversación privada entre creador y usuario |
| POST | `/activities/:id/private-chat` | JWT | Enviar mensaje privado; usuario normal escribe al creador, creador responde indicando `receiverId` |

### Permisos del chat

- Solo el creador y los participantes aceptados pueden leer y escribir en el chat general.
- Los usuarios pendientes, rechazados, expulsados o ajenos a la actividad reciben 403 si intentan acceder por URL/API.
- Los usuarios silenciados (`chatSilenciados`) reciben 403 al intentar escribir.
- El creador puede silenciar/dessilenciar participantes desde la pantalla de detalle.

### Perfiles públicos

La ruta `GET /users/:id/public` aplica estas reglas:
- Sin `activityId`: solo el propio usuario puede verse a sí mismo.
- Con `activityId` válido:
  - Si el usuario solicitado es **creador** de la actividad → visible para todos.
  - Si es **participante** → visible para el creador y otros participantes.
  - En cualquier otro caso → 403.
- El `activityId` es validado como ObjectId antes de consultar; strings inválidos (`"undefined"`, `"null"`, etc.) se tratan como ausentes.

### Autenticación JWT

1. Registro: `POST /users` → devuelve usuario sin password.
2. Login: `POST /users/login` → devuelve `{ access_token, user }`.
3. Frontend guarda el token en `localStorage` con clave `planes_jwt`.
4. Axios añade `Authorization: Bearer TOKEN` en cada petición protegida.
5. `JwtAuthGuard` protege los endpoints sensibles.
6. `OptionalJwtAuthGuard` permite requests sin token pero expone el usuario si viene.
7. `CurrentUser` decorador extrae `{ id, email, nombre }` del payload JWT.

---

## Frontend

### Diseño y UX

- **Mobile-first**. Sistema de tokens CSS en `:root` (`--primary`, `--surface`, `--bg`, radios, sombras, etc.).
- **Paleta**: fondo `#f8fafc`, superficies blancas, acento indigo `#6366f1`, gradiente indigo→violeta.
- **Navegación**: topbar minimal (brand + campana de notificaciones + botón logout) + barra inferior fija con 4 tabs:
  - **Explorar** (`/activities`)
  - **Mis planes** (`/my-activities`)
  - **FAB +** (`/activities/new`) — botón central de creación
  - **Perfil** (`/profile`)
  - En la página de chat la barra inferior se oculta para maximizar espacio.
- **Chat**: burbujas propias a la derecha (gradiente indigo), ajenas a la izquierda (blanco). Layout flex full-height con input pegado al fondo.
- **Cards de actividad**: imagen/placeholder en la cabecera, fecha del evento, badges de estado (`Creada por ti`, `Ya unido`, `Te han quitado`), notificaciones de mensajes nuevos y novedades clicables.
- Responsive con media queries para pantallas ≤640px. Botones full-width en móvil con excepciones para controles pequeños.

### Páginas

| Página | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `LoginPage` | `/login` | No | Formulario de login |
| `RegisterPage` | `/register` | No | Formulario de registro |
| `ActivitiesPage` | `/activities` | Sí | Listado con filtros por categoría, ciudad, estado y ordenación |
| `MyActivitiesPage` | `/my-activities` | Sí | Mis actividades con tabs: Todas / Creadas / Unidas |
| `CreateActivityPage` | `/activities/new` | Sí | Formulario de creación |
| `EditActivityPage` | `/activities/:id/edit` | Sí | Formulario de edición (solo creador) |
| `ActivityDetailPage` | `/activities/:id` | Sí | Detalle, participantes, moderación |
| `ActivityChatPage` | `/activities/:id/chat` | Sí | Chat de la actividad |
| `NotificationsPage` | `/notifications` | Sí | Listado de notificaciones internas pendientes |
| `ProfilePage` | `/profile` | Sí | Edición del perfil propio |
| `PrivateActivityChatPage` | `/activities/:id/private-chat/:userId` | Sí | Chat privado con el organizador |
| `UserPublicProfilePage` | `/users/:id/profile` | Sí | Perfil público de otro usuario |

### Componentes

| Componente | Descripción |
|------------|-------------|
| `Navigation` | Topbar + barra de navegación inferior. Detecta ruta de chat para ocultarla. |
| `ActivityCard` | Card con imagen/placeholder por categoría, badges, notificaciones clicables. |
| `ActivityForm` | Formulario de creación con selector de categoría e imagen. |
| `AuthForm` | Login/registro. |
| `MessageList` | Lista de mensajes con burbujas, auto-scroll. Modo controlado (mensajes vía prop) o modo polling (30 s fallback). |
| `MessageInput` | Input de chat con botón de envío. Acepta `onSend(text)` para modo WebSocket o `onSent()` para modo HTTP. |

### Servicios

| Servicio | Descripción |
|----------|-------------|
| `api.ts` | Instancia Axios, `baseURL = ''` (proxy Vite), gestión del JWT en localStorage. |
| `authService.ts` | Registro, login, usuario actual, perfil público. |
| `activityService.ts` | CRUD actividades, solicitar plaza, aceptar/rechazar solicitudes, leave, remove/unban/mute/unmute, helpers de estado. |
| `messageService.ts` | Listar y crear mensajes (HTTP). |
| `socketService.ts` | **Singleton Socket.IO** — conecta al backend, gestiona reconexión. |
| `notificationService.ts` | Marcas locales de visto por usuario+actividad en localStorage. |
| `internalNotificationService.ts` | Listar notificaciones persistidas, contador sin leer y marcar como leída. |
| `privateActivityChatService.ts` | Listar consultas privadas, leer conversación y enviar mensajes privados (HTTP fallback). |

### Utilidades

| Utilidad | Descripción |
|----------|-------------|
| `utils/activityImages.ts` | Mapa categoría → `{ gradient, emoji }` para placeholders. Exporta `CATEGORIES` y `getCategoryVisual()`. |

### Rutas del frontend

```
/                         → redirige a /activities o /login según JWT
/login
/register
/activities               → listado general + filtros por categoría
/my-activities            → mis planes (Todas / Creadas / Unidas)
/activities/new           → crear actividad
/activities/:id           → detalle
/activities/:id/edit      → editar (solo creador)
/activities/:id/chat      → chat
/activities/:id/private-chat/:userId → chat privado con organizador
/notifications            → notificaciones internas
/profile                  → perfil propio
/users/:id/profile        → perfil público
```

### PWA (Progressive Web App)

#### Archivos

| Archivo | Descripción |
|---------|-------------|
| `public/icon.svg` | Icono fuente vectorial (fondo indigo + "P" blanca) |
| `public/pwa-192x192.png` | Icono estándar 192×192 |
| `public/pwa-512x512.png` | Icono estándar 512×512 |
| `public/pwa-maskable-192x192.png` | Icono maskable 192×192 (full bleed, sin redondeo) |
| `public/pwa-maskable-512x512.png` | Icono maskable 512×512 |
| `public/favicon.png` | Favicon 64×64 |
| `scripts/generate-icons.cjs` | Script Node.js (sharp) para regenerar iconos desde `icon.svg` |

Regenerar iconos si se cambia el diseño:
```powershell
cd C:\proyectos\planes\frontend
node scripts/generate-icons.cjs
```

#### Manifest (`manifest.webmanifest`)

Generado automáticamente por `vite-plugin-pwa` en el build:

```json
{
  "name": "Planes",
  "short_name": "Planes",
  "description": "App para encontrar planes y actividades con otras personas",
  "theme_color": "#6366f1",
  "background_color": "#f8fafc",
  "display": "standalone",
  "start_url": "/",
  "scope": "/",
  "lang": "es"
}
```

#### Service Worker (Workbox)

- Estrategia `generateSW` (automática).
- **Precachea** el shell de la app: JS, CSS, HTML, imágenes, fuentes.
- **Network-only** para `/users`, `/activities`, `/notifications` y `/socket.io` — las llamadas API y WebSocket nunca se cachean.
- `navigateFallback: 'index.html'` para que el enrutado SPA funcione offline (muestra la app aunque las API fallen).
- `autoUpdate`: el SW se actualiza automáticamente cuando hay una nueva versión del build.

#### HTTPS obligatorio

Chrome Android exige HTTPS para registrar service workers y mostrar el prompt de instalación. `http://192.168.x.x` no activa ni el SW ni el banner.

**Solución configurada**: `@vitejs/plugin-basic-ssl` hace que tanto `npm run dev` como `npm run preview` sirvan por **HTTPS** con un certificado autofirmado. El móvil mostrará una advertencia de seguridad la primera vez; hay que aceptarla (Configuración avanzada → Continuar).

**Alternativa sin advertencias**: usar ngrok para un HTTPS válido:

```powershell
npm run preview        # sirve en https://0.0.0.0:4173
npx ngrok http 4173    # en otra terminal → URL pública HTTPS
```

Abrir la URL `https://xxxx.ngrok.io` en el móvil. No hay advertencia y el prompt de instalación aparece inmediatamente.

#### Cómo probar en Android

1. `npm run build && npm run preview` — servidor HTTPS en `https://192.168.x.x:4173`
2. En Chrome del móvil, abrir esa URL y aceptar la advertencia del certificado
3. El banner "Añadir a pantalla de inicio" aparece en la parte inferior (o en menú ⋮ → *Instalar aplicación*)
4. Al abrir desde el icono: pantalla completa, sin barra del navegador, barra de estado indigo

---

### WebSockets (Socket.IO)

#### Configuración

- **Backend**: `ChatGateway` en `backend/src/chat/chat.gateway.ts`, arranca en el mismo puerto que NestJS (3000).
- **Frontend**: `socketService.ts` crea un socket singleton. La URL por defecto es `''` (mismo origen), lo que Vite proxea a `localhost:3000` via la entrada `/socket.io` del proxy con `ws: true`.
- **Auth**: el cliente envía `socket.auth.token = JWT` en el handshake. El gateway verifica el token con `JwtService.verify()` y almacena el `userId` en `socket.data.userId`. Si el token falla, desconecta.

#### Rooms

| Room | Uso |
|------|-----|
| `activity:{activityId}` | Chat general de una actividad |
| `private:{activityId}:{idMin}:{idMax}` | Chat privado (IDs ordenados léxicamente) |

#### Eventos cliente → servidor

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `joinActivityChat` | `{ activityId }` | Validar acceso → entrar a la room del chat general |
| `leaveActivityChat` | `{ activityId }` | Salir de la room |
| `sendActivityMessage` | `{ activityId, text }` | Guardar en DB → emitir `newActivityMessage` |
| `joinPrivateChat` | `{ activityId, otherUserId }` | Validar acceso → entrar a la room privada |
| `leavePrivateChat` | `{ activityId, otherUserId }` | Salir de la room |
| `sendPrivateMessage` | `{ activityId, text, receiverId? }` | Guardar en DB → emitir `newPrivateMessage` |

#### Eventos servidor → cliente

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `newActivityMessage` | Objeto `Message` populado | Nuevo mensaje en el chat general |
| `newPrivateMessage` | Objeto `PrivateActivityMessage` populado | Nuevo mensaje en el chat privado |

#### Permisos

- `joinActivityChat`: el usuario debe ser creador o participante aceptado (misma lógica que HTTP).
- `sendActivityMessage`: respeta `chatSilenciados` (mute), devuelve `WsException` si está silenciado.
- `joinPrivateChat`: creador puede unirse con cualquier participante; participante solo con el creador.
- Si el token es inválido, el socket se desconecta en `handleConnection`.

#### Fallback HTTP

Los endpoints HTTP de mensajes siguen activos. Si el socket no está conectado, `MessageInput` usa HTTP y `MessageList` tiene polling a 30 s. Los mensajes enviados por HTTP **no** se emiten por WebSocket (el cliente que los envió los tiene en estado local; otros clientes los verán en el próximo poll o cuando se conecten).

#### Variables de entorno relacionadas

```env
# frontend/.env (opcional; por defecto '' = mismo origen proxiado)
VITE_SOCKET_URL=http://localhost:3000
```

### Categorías predefinidas

Las categorías se definen en `frontend/src/utils/activityImages.ts`:

| Categoría | Gradiente | Emoji |
|-----------|-----------|-------|
| Deporte y aire libre | verde | 🏃 |
| Ocio y social | ámbar | 🎉 |
| Conocer gente | rosa | 👋 |
| Gastronomía | naranja | 🍽️ |
| Cultura | indigo | 🎭 |
| Aficiones | teal | 🎨 |
| Viajes y escapadas | azul | ✈️ |
| Formación | amarillo | 📚 |
| Familia | rosa claro | 👨‍👩‍👧 |
| Voluntariado | rojo | ❤️ |
| Otros | gris | ✨ |

### Imágenes por URL

Las imágenes se gestionan mediante URLs externas. No hay subida de archivos.

- **`fotoPerfilUrl`** (User): campo URL en `ProfilePage`. Preview circular con iniciales como fallback. En perfiles públicos: foto o avatar con gradiente indigo + iniciales blancas.
- **`imagenUrl`** (Activity): campo URL en crear y editar actividad. Preview en formulario. En cards: imagen de cabecera o placeholder de color/emoji por categoría. En detalle: imagen grande a ancho completo.
- Tanto `fotoPerfilUrl` como `imagenUrl` permiten cadena vacía para borrar la imagen sin error de validación (`@ValidateIf` en el DTO).
- **Pendiente**: subida real de archivos con Cloudinary, S3 u otro proveedor.

### Filtros y vistas

**ActivitiesPage** — filtros y ordenación:
- Filtros server-side en `GET /activities` por categoría, ciudad y estado.
- Estado por defecto: próximas (`estado=futuras`), excluye pasadas salvo que se elija "Pasadas" o "Todas".
- Orden por defecto: `fechaAsc`, con actividades sin fecha al final.
- Ordenaciones disponibles: más cercanas en fecha, últimas creadas y más antiguas creadas.
- Los controles viven en un panel desplegable desde el botón "Filtros", con categoría, ciudad libre, estado y ordenación.
- Contador en el heading actualizado con los resultados recibidos.

**MyActivitiesPage** — tabs de vista:
- `Todas`: actividades en las que participa o fue expulsado.
- `Creadas por mí`: solo donde el usuario es organizador.
- `A las que me uní`: solo donde participa pero no es organizador.

---

## Base de datos

### Colecciones

- `users`
- `activities`
- `messages`
- `notifications`
- `privateactivitymessages`

### Relaciones

```
Activity.creador          → User
Activity.participantes[]  → User
Activity.solicitudesPendientes[] → User
Activity.solicitudesRechazadas[] → User
Activity.expulsados[]     → User
Activity.salidas[]        → User
Activity.chatSilenciados[] → User
Message.activity          → Activity
Message.author            → User
Notification.recipient    → User
Notification.actor        → User
Notification.activity     → Activity
PrivateActivityMessage.activity → Activity
PrivateActivityMessage.sender   → User
PrivateActivityMessage.receiver → User
```

---

## Flujos principales

### Registro y login

1. `POST /users` con `{ email, nombre, contraseña }`.
2. `POST /users/login` → recibe `access_token`.
3. Frontend guarda token en `localStorage`.
4. Todas las rutas privadas verifican el token con `ProtectedRoute`.

### Crear actividad

1. El creador rellena el formulario (título, descripción, categoría, ciudad, fecha, plazas, imagenUrl).
2. `POST /activities` → el backend añade al creador como primer participante.
3. Redirige al detalle.

### Solicitar plaza / salir

- `PATCH /activities/:id/join` → añade al usuario a `solicitudesPendientes`.
- Crea una notificación interna para el creador: `[usuario] ha solicitado unirse a tu actividad [actividad]`.
- Si el usuario ya participa o ya está pendiente, el backend devuelve error claro.
- Si estaba en `solicitudesRechazadas`, se elimina de rechazadas y vuelve a quedar pendiente.
- El creador acepta con `PATCH /activities/:id/requests/:userId/accept`, que mueve al usuario a `participantes`.
- Al aceptar se comprueba `participantes.length < plazas`; si está completa, se rechaza con error y no se notifica aceptación.
- El creador rechaza con `PATCH /activities/:id/requests/:userId/reject`, que mueve al usuario a `solicitudesRechazadas`.
- Aceptar o rechazar crea una notificación interna para el solicitante.
- `PATCH /activities/:id/leave` → mueve al usuario de `participantes` a `salidas`.

### Plazas y aforo

- `plazas` es el máximo de participantes aceptados.
- Si `plazas` falta en datos legacy, se trata como 10.
- Las respuestas de actividades incluyen `plazasOcupadas` y `plazasDisponibles`.
- El backend impide aceptar solicitudes si no quedan plazas.
- El backend impide editar una actividad a menos plazas que participantes aceptados actuales.
- Las cards muestran `X/Y plazas`, `Quedan N plazas` o `Completa`.
- El detalle muestra participantes aceptados, plazas totales y plazas disponibles.
- Si la actividad está completa, el frontend muestra `Actividad completa` y no permite solicitar plaza.

### Moderación (solo creador)

- **Expulsar**: mueve a `expulsados`, elimina de `participantes`. Bloquea futuros `join`.
- **Desbanear**: elimina de `expulsados`. Permite volver a unirse.
- **Silenciar**: añade a `chatSilenciados`. El backend rechaza sus mensajes con 403.
- **Dessilenciar**: elimina de `chatSilenciados`.

### Chat

- `GET /activities/:id/messages` → historial, requiere JWT y ser creador o participante aceptado.
- `POST /activities/:id/messages` → enviar, requiere JWT y ser creador o participante aceptado.
- Frontend refresca cada 3 s y hace auto-scroll al último mensaje.
- Burbujas propias a la derecha, ajenas a la izquierda.

### Chat privado con el organizador

- Cualquier usuario autenticado puede abrir "Preguntar al organizador" desde el detalle.
- La conversación queda ligada a una actividad concreta y a dos usuarios: interesado y creador.
- No da acceso al chat general ni cambia el estado de participación.
- Si el usuario es aceptado después, el historial privado se conserva.
- Solo el creador y ese usuario pueden leer la conversación.
- El creador ve un panel "Consultas al organizador" en el detalle de sus actividades.
- Al recibir un mensaje privado se crea una notificación interna técnica `private_activity_message` solo si el destinatario no está dentro de esa conversación.
- Las notificaciones de mensajes privados no se muestran en `/notifications` ni cuentan en la campana.

### Ver perfil público

- Desde el detalle de una actividad → botón "Ver perfil" en organizador o participantes.
- Navega a `/users/:id/profile?activityId=:activityId`.
- Frontend llama a `GET /users/:id/public?activityId=:activityId`.
- Backend valida permisos: solo visible entre participantes de la misma actividad.
- Muestra foto de perfil o avatar con iniciales (gradiente indigo).

### Notificaciones internas

- Se guardan en la colección `notifications`.
- La topbar muestra una campana con contador de notificaciones sin leer.
- `/notifications` lista avisos pendientes del usuario autenticado.
- Al marcar una notificación como leída, desaparece del listado y se actualiza la campana.
- Al abrir una actividad desde una notificación, también se marca la actividad como vista en `localStorage` para limpiar el aviso de novedades de la card.
- Casos cubiertos:
  - solicitud nueva al creador;
  - solicitud aceptada al solicitante;
  - solicitud rechazada al solicitante;
  - mensaje privado recibido sobre una actividad, solo como aviso interno no listado.
- No hay WebSockets ni push reales; el frontend refresca el contador con polling.

---

## Polling y notificaciones

- Las actividades se recargan cada 8 s en las páginas de listado.
- Los mensajes se recargan cada 3 s en el chat.
- El detalle de actividad se recarga cada 5 s.
- El contador de notificaciones internas se recarga cada 15 s.
- Las marcas de "visto" se guardan en `localStorage` con clave `planes_seen_<userId>_<activityId>` y `planes_chat_seen_<userId>_<activityId>`.
- Los badges de "Mensajes nuevos" y "Novedades en tu actividad" son clicables y llevan directamente al chat o al detalle.
- Las notificaciones internas persistidas se marcan como leídas con `PATCH /notifications/:id/read`; el frontend oculta las leídas.

---

## Deuda técnica conocida

- `contraseña` tiene mojibake (`contraseÃ±a`) en algunos archivos. Funciona en runtime pero es un riesgo de mantenimiento.
- `npm run start:prod` no funciona. Usar `node dist/src/main` desde el directorio del backend.
- No hay tests automáticos actualizados para los flujos nuevos.
- Las marcas de visto viven en `localStorage`; si se cambia de usuario en el mismo navegador conviene cerrar sesión.
- Datos legacy en MongoDB de versiones anteriores pueden tener campos inconsistentes; el backend tolera la mayoría de casos.

---

## Subida de imagenes

- El backend expone `POST /uploads/image` con JWT y `multipart/form-data` (`file`).
- La imagen se sube a Cloudinary y MongoDB guarda solo la URL devuelta (`secure_url`).
- El frontend usa selector de archivos en perfil y en actividades, con preview antes de guardar.
- Los campos `fotoPerfilUrl` e `imagenUrl` siguen aceptando URLs manuales para compatibilidad.
- Si una actividad no tiene `imagenUrl`, la UI sigue usando la imagen local por categoria.
- Limites actuales: JPG, PNG, WEBP o GIF; maximo 5 MB.

---

# Roadmap

## v0.5 — Imágenes y localización

- Subida real de imágenes (Cloudinary / S3).
- Campo de geolocalización en actividades (coordenadas o dirección).
- Mostrar distancia al usuario en las cards.
- Filtro por distancia o ciudad en el listado.

## v0.6 — Chat en tiempo real

- Migrar mensajes a WebSockets (Socket.io o similar).
- Presencia en tiempo real (quién está en el chat).
- Indicador de "escribiendo...".
- Eliminación / moderación de mensajes.

## v0.7 — Notificaciones push

- Notificaciones push web (PWA / Service Worker).
- Extender las notificaciones internas persistidas a push web.
- Notificación cuando alguien se une a tu actividad.
- Notificación de mensaje nuevo cuando no estás en el chat.

## v0.8 — Confianza y verificación

- Verificación de cuenta por email.
- Sistema de valoraciones entre participantes.
- Badge de usuario verificado.
- Historial de actividades pasadas en el perfil.
- Bloqueo de usuarios.

---

# Último estado verificado

Base **v0.4-social-profiles** con cambios posteriores de filtros, ordenación, solicitudes, notificaciones internas y chat privado con organizador. Verificado con build de backend y frontend.

### Autenticación

- [x] Registro de nuevo usuario.
- [x] Login con email y contraseña.
- [x] Persistencia del token en `localStorage`.
- [x] Logout limpia el token y redirige a `/login`.
- [x] Rutas protegidas redirigen a `/login` sin token.

### Actividades

- [x] Listado de actividades con polling, por defecto próximas y ordenadas por fecha ascendente.
- [x] Filtros por categoría, ciudad y estado (`Próximas`, `Pasadas`, `Todas`).
- [x] Ordenación por fecha más cercana, últimas creadas y más antiguas creadas.
- [x] Actividades sin fecha al final cuando se ordena por fecha.
- [x] Crear actividad con título, descripción, categoría, ciudad, fecha, plazas e imagen.
- [x] Editar actividad (solo el creador). Todos los campos editables incluyendo imagen.
- [x] Borrar imagen de actividad (campo vacío no da error de validación).
- [x] Detalle de actividad con imagen grande o placeholder por categoría.
- [x] Badge "Creada por ti" para el organizador, "Ya unido" para participantes.
- [x] Cards con `X/Y plazas`, plazas disponibles y estado `Completa`.
- [x] Detalle con participantes aceptados, plazas totales y plazas disponibles.
- [x] Edición de plazas bloqueada si baja de participantes aceptados.
- [x] Solicitar plaza en vez de unirse directamente.
- [x] Estado visible de solicitud pendiente y solicitud rechazada.
- [x] Reintento de solicitud tras rechazo.
- [x] Desapuntarse de una actividad.

### Participantes y moderación

- [x] El creador ve solicitudes pendientes, participantes, silenciados, expulsados y usuarios que se desapuntaron.
- [x] El creador puede aceptar o rechazar solicitudes.
- [x] Expulsar participante (lo bloquea para volver a unirse).
- [x] Desbanear participante.
- [x] Silenciar participante en el chat.
- [x] Dessilenciar participante.
- [x] El botón "Ver perfil" no aparece para el propio usuario.
- [x] El organizador no ve "Ver perfil" sobre sí mismo.

### Notificaciones internas

- [x] Notificación al creador cuando un usuario solicita plaza.
- [x] Notificación al solicitante cuando el creador acepta.
- [x] Notificación al solicitante cuando el creador rechaza.
- [x] Notificación al recibir mensaje privado sobre una actividad.
- [x] Contador de notificaciones sin leer en la topbar.
- [x] Página `/notifications` con listado de pendientes y acción de marcar como leída.
- [x] Abrir una actividad desde una notificación limpia también el aviso de novedades de la card.

### Chat privado

- [x] Usuario autenticado puede preguntar al organizador desde el detalle.
- [x] El creador ve "Consultas al organizador" en el detalle.
- [x] Creador y usuario pueden responder en una conversación privada por actividad.
- [x] El chat privado no da acceso al chat general ni convierte en participante.
- [x] Historial privado se conserva aunque luego se acepte al usuario.

### Chat

- [x] Cargar mensajes históricos solo si eres creador o participante aceptado.
- [x] Enviar mensaje solo si eres creador o participante aceptado.
- [x] Usuarios pendientes o no aceptados no ven botón de chat y reciben mensaje claro si entran por URL.
- [x] Usuarios silenciados reciben error 403.
- [x] Burbujas propias a la derecha (indigo), ajenas a la izquierda (blanco).
- [x] Auto-scroll al mensaje más reciente.
- [x] Polling cada 3 s.
- [x] Badge "Mensajes nuevos" clicable en cards.

### Perfiles

- [x] Editar perfil propio (nombre, ciudad, bio, intereses, foto, edad, género, instagram).
- [x] Foto de perfil por URL con preview circular.
- [x] Borrar foto de perfil (campo vacío no da error de validación).
- [x] Avatar con iniciales como fallback en el perfil propio.
- [x] Ver perfil público de otro usuario desde el detalle de actividad.
- [x] Avatar con gradiente indigo + iniciales blancas cuando no hay foto.
- [x] Permisos: solo visible entre participantes de la misma actividad.

### Mis actividades

- [x] Tab "Todas": actividades en las que participa o fue expulsado.
- [x] Tab "Creadas por mí": solo actividades donde es organizador.
- [x] Tab "A las que me uní": participante pero no organizador.

### Diseño y navegación

- [x] Barra inferior con tabs: Explorar, Mis planes, FAB +, Perfil.
- [x] Topbar minimal con logout.
- [x] Barra inferior oculta en la pantalla de chat.
- [x] Cards con imagen de cabecera o placeholder por categoría.
- [x] Cards con fecha del evento visible.
- [x] Diseño responsive en móvil.

### Red local

- [x] Frontend accesible desde móvil vía `http://192.168.1.X:4173`.
- [x] Registro y login desde móvil funcionan correctamente (proxy Vite).
- [x] Todas las funcionalidades disponibles desde móvil.
