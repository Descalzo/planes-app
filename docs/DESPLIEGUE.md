# Despliegue de Planes

Guia para preparar un despliegue real del backend NestJS y el frontend React/Vite. No incluye despliegue automatico.

## Arquitectura de produccion

- Backend NestJS: servicio Node.js publico con HTTPS gestionado por Railway, Render u otro proveedor.
- Frontend React/Vite: build estatico servido desde Netlify, Vercel u otro hosting.
- MongoDB Atlas: base de datos remota.
- Cloudinary: almacenamiento de imagenes subidas.
- Socket.IO: corre en el mismo servicio del backend, en la ruta `/socket.io`.

## Backend

Directorio: `backend`

Scripts relevantes:

```bash
npm install
npm run build
npm run start:prod
```

`npm run start:prod` ejecuta `node dist/src/main`, que es la ruta generada por el build actual de Nest.

### Variables de entorno del backend

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://usuario:password@cluster/db
JWT_SECRET=un_secreto_largo_y_privado
FRONTEND_URL=https://tu-frontend.netlify.app
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

Notas:

- `PORT` normalmente lo inyecta Railway/Render. Si el proveedor define otro puerto, Nest usa `process.env.PORT`.
- `FRONTEND_URL` controla CORS HTTP y Socket.IO. Puede contener varios origenes separados por coma:

```env
FRONTEND_URL=https://app.example.com,https://preview.example.com
```

- No uses `localhost` en `FRONTEND_URL` para produccion.
- `JWT_SECRET` debe ser largo, aleatorio y privado.

### CORS y Socket.IO

El backend acepta solo los origenes de `FRONTEND_URL` cuando esa variable existe.

Socket.IO usa la misma lista de origenes que CORS HTTP. El frontend debe conectarse al backend publico mediante `VITE_SOCKET_URL`.

## Frontend

Directorio: `frontend`

Scripts relevantes:

```bash
npm install
npm run build
```

El build queda en:

```text
frontend/dist
```

### Variables de entorno del frontend

```env
VITE_API_URL=https://tu-backend.railway.app
VITE_SOCKET_URL=https://tu-backend.railway.app
```

Notas:

- En produccion, define siempre `VITE_API_URL` y `VITE_SOCKET_URL`.
- No incluyas una barra final si no hace falta. Ejemplo correcto: `https://api.example.com`.
- Si frontend y backend se sirven bajo el mismo dominio con reverse proxy, se pueden dejar vacias, pero en Netlify/Vercel normalmente deben apuntar al backend publico.
- Las variables `VITE_*` se leen en tiempo de build. Si las cambias, reconstruye el frontend.

## Railway

Backend en Railway:

1. Crea un nuevo proyecto desde el repositorio.
2. Selecciona el directorio `backend` como root del servicio, si Railway lo permite. Si no, configura comandos con prefijo `cd backend`.
3. Build command:

```bash
npm install && npm run build
```

4. Start command:

```bash
npm run start:prod
```

5. Define las variables de entorno del backend.
6. Copia la URL publica generada por Railway.
7. Usa esa URL en el frontend como `VITE_API_URL` y `VITE_SOCKET_URL`.

## Render

Backend en Render:

1. Crea un Web Service conectado al repositorio.
2. Root Directory: `backend`.
3. Runtime: Node.
4. Build Command:

```bash
npm install && npm run build
```

5. Start Command:

```bash
npm run start:prod
```

6. Define las variables de entorno del backend.
7. Verifica que el servicio queda expuesto por HTTPS.

## Netlify

Frontend en Netlify:

1. Crea un nuevo site desde el repositorio.
2. Base directory: `frontend`.
3. Build command:

```bash
npm run build
```

4. Publish directory:

```text
frontend/dist
```

Si Netlify usa `frontend` como base directory, el publish directory puede ser:

```text
dist
```

5. Define `VITE_API_URL` y `VITE_SOCKET_URL`.
6. Configura fallback SPA para React Router. Crea o configura una regla equivalente a:

```text
/* /index.html 200
```

## Vercel

Frontend en Vercel:

1. Importa el repositorio.
2. Framework preset: Vite.
3. Root Directory: `frontend`.
4. Build Command:

```bash
npm run build
```

5. Output Directory:

```text
dist
```

6. Define `VITE_API_URL` y `VITE_SOCKET_URL`.
7. Vercel suele configurar el fallback SPA automaticamente para Vite; valida recargando rutas internas como `/activities`.

## MongoDB Atlas

1. Crea un cluster en Atlas.
2. Crea un usuario de base de datos con password segura.
3. En Network Access, permite la IP del proveedor.
4. Para Railway/Render, si no tienes IP fija, usa temporalmente `0.0.0.0/0` y revisa restricciones cuando tengas una estrategia de red definitiva.
5. Usa una URI `mongodb+srv://...` en `MONGODB_URI`.
6. Verifica que la base elegida en la URI es la correcta.

## Cloudinary

1. Crea una cuenta/proyecto en Cloudinary.
2. Copia `cloud_name`, `api_key` y `api_secret`.
3. Define esas variables solo en el backend.
4. No expongas `CLOUDINARY_API_SECRET` en el frontend.
5. Las imagenes subidas se guardan en la carpeta `planes` de Cloudinary.
6. MongoDB guarda solo la URL segura devuelta por Cloudinary.

## Probar produccion

### API HTTP

1. Abre Swagger:

```text
https://tu-backend/api
```

2. Prueba registro/login.
3. Prueba listar actividades:

```text
GET https://tu-backend/activities
```

4. Prueba una accion protegida con JWT.

### Frontend

1. Abre la URL publica del frontend.
2. Registra o inicia sesion.
3. Crea una actividad.
4. Sube una imagen de perfil o actividad.
5. Abre el perfil publico de un usuario desde una actividad.

### WebSockets

1. Entra con dos usuarios distintos.
2. Crea una actividad con un usuario.
3. Acepta al segundo usuario como participante.
4. Abre el chat general en dos navegadores o sesiones.
5. Envia un mensaje y comprueba que aparece en tiempo real sin recargar.
6. Repite con chat privado organizador-participante.

Si falla Socket.IO:

- Revisa que `VITE_SOCKET_URL` apunta al backend publico.
- Revisa que `FRONTEND_URL` contiene exactamente el origen del frontend, incluyendo `https://`.
- En DevTools, revisa la conexion a `/socket.io`.
- Asegurate de que el proveedor soporta WebSockets. Railway y Render los soportan en servicios web normales.

## Checklist antes de desplegar

- `backend`: `npm run build` OK.
- `backend`: `npm run start:prod` apunta a `dist/src/main`.
- `frontend`: `npm run build` OK.
- `FRONTEND_URL` configurado en backend.
- `VITE_API_URL` configurado en frontend.
- `VITE_SOCKET_URL` configurado en frontend.
- `MONGODB_URI` de Atlas configurada.
- `JWT_SECRET` seguro configurado.
- Cloudinary configurado en backend.
- Rutas internas del frontend recargan sin 404.
