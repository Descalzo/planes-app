# Planes

Aplicacion para encontrar planes y actividades con otras personas. Incluye backend NestJS, frontend React/Vite, autenticacion JWT, actividades, participantes y chat por actividad.

## Requisitos

- Node.js y npm.
- MongoDB accesible mediante URI.
- Dos terminales: una para backend y otra para frontend.

## Estructura

```text
planes/
  backend/   API NestJS + MongoDB
  frontend/  React + Vite
  docs/      Documentacion de continuidad
```

El documento completo de estado esta en:

```text
docs/CONTINUIDAD_PROYECTO.md
```

## Configurar backend

```powershell
cd C:\proyectos\planes\backend
npm install
```

Crear `backend/.env`:

```env
MONGODB_URI=tu_uri_de_mongodb
JWT_SECRET=tu_secreto_jwt
PORT=3000
```

Arrancar en desarrollo:

```powershell
npm run start:dev
```

La API queda en:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3000/api
```

Build:

```powershell
npm run build
```

Nota: el script `npm run start:prod` actual apunta a `dist/main`, pero la build esta generando `dist/src/main`. Si necesitas arrancar desde build, usa:

```powershell
node dist/src/main
```

## Configurar frontend

```powershell
cd C:\proyectos\planes\frontend
npm install
```

Opcional: crear `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Arrancar:

```powershell
npm run dev
```

Vite mostrara el puerto disponible, por ejemplo:

```text
http://localhost:5173
```

Build:

```powershell
npm run build
```

## Flujo basico de prueba

1. Arranca backend.
2. Arranca frontend.
3. Abre el frontend en el navegador.
4. Registra un usuario.
5. Crea una actividad.
6. Comprueba que aparece en `Mis actividades`.
7. Con otro usuario, unete a la actividad.
8. Comprueba que el creador ve participantes y puede silenciar, quitar y desbanear.
9. Entra al chat y envia mensajes.
10. Comprueba que los mensajes nuevos aparecen por polling.

## Funcionalidades principales

- Registro/login con JWT.
- Rutas protegidas.
- Listado general de actividades.
- Pagina de mis actividades.
- Crear actividad.
- Unirse y desapuntarse.
- Creador ve y gestiona participantes.
- Creador puede quitar/desbanear usuarios.
- Creador puede silenciar/permitir hablar en chat.
- Chat por actividad.
- Avisos mediante polling y `localStorage`.

## Endpoints principales

- `POST /users`
- `POST /users/login`
- `GET /users/me`
- `GET /activities`
- `POST /activities`
- `GET /activities/:id`
- `PATCH /activities/:id/join`
- `PATCH /activities/:id/leave`
- `PATCH /activities/:id/participants/:participantId/remove`
- `PATCH /activities/:id/participants/:participantId/unban`
- `PATCH /activities/:id/participants/:participantId/mute`
- `PATCH /activities/:id/participants/:participantId/unmute`
- `GET /activities/:activityId/messages`
- `POST /activities/:activityId/messages`

## Notas importantes

- No commitear `.env` con secretos reales.
- Las notificaciones no son WebSocket: se calculan con polling y marcas locales.
- Hay tolerancia en backend para datos antiguos inconsistentes en actividades.
- Consultar `docs/CONTINUIDAD_PROYECTO.md` antes de continuar desarrollo.
