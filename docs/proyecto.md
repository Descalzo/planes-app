# Documentación del proyecto

## Arquitectura actual

Este proyecto es una API backend construida con NestJS, MongoDB y autenticación JWT.

- `src/app.module.ts`: módulo raíz que registra `ConfigModule`, `MongooseModule`, `UsersModule`, `ActivitiesModule` y `AuthModule`.
- `src/main.ts`: arranca la aplicación y configura `ValidationPipe` global. También habilita Swagger en `/api` para probar los endpoints desde el navegador.
- `src/auth/`: contiene la lógica de autenticación JWT con Passport.
- `src/users/`: gestiona el dominio de usuarios, registro, login y obtención del perfil propio.
- `src/activities/`: gestiona el dominio de actividades, creación, listado, búsqueda por id y unirse a actividades.
- `src/messages/`: gestiona los mensajes asociados a actividades, creación y listado.

### Dependencias clave

- `@nestjs/common`, `@nestjs/core`, `@nestjs/mongoose`, `@nestjs/config`
- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
- `@nestjs/swagger`, `swagger-ui-express`
- `mongoose`
- `bcrypt`
- `class-validator`, `class-transformer`

## Endpoints disponibles

### Usuarios

- `POST /users`
  - Registra un usuario nuevo.
  - Request body:
    - `email` (string)
    - `nombre` (string)
    - `contraseña` (string)
    - `ciudad?` (string)
    - `bio?` (string)
    - `intereses?` (string[])

- `POST /users/login`
  - Inicia sesión y devuelve un JWT.
  - Request body:
    - `email` (string)
    - `contraseña` (string)
  - Response:
    - `access_token` (JWT)
    - `user` (usuario sin contraseña)

- `GET /users/me`
  - Devuelve los datos del usuario autenticado.
  - Requiere cabecera `Authorization: Bearer <token>`.

- `GET /users/:id`
  - Devuelve los datos de un usuario por su ID.

### Actividades

- `GET /activities`
  - Lista todas las actividades.

- `GET /activities/:id`
  - Devuelve una actividad por su ID.

- `POST /activities`
  - Crea una nueva actividad.
  - Requiere autenticación JWT.
  - El usuario autenticado se asigna como `creador`.
  - Request body:
    - `titulo` (string)
    - `descripcion?` (string)
    - `categoria?` (string)
    - `ciudad?` (string)
    - `fecha?` (Date)
    - `plazas?` (number)

- `PATCH /activities/:id/join`
  - Une al usuario autenticado a la actividad.
  - Requiere autenticación JWT.
  - No necesita enviar el nombre del usuario en el body; se usa el usuario del token.

### Mensajes

- `POST /activities/:activityId/messages`
  - Agrega un mensaje a la actividad.
  - Requiere autenticación JWT.
  - El autor se toma del token.
  - Request body:
    - `text` (string)

- `GET /activities/:activityId/messages`
  - Lista los mensajes de una actividad.
  - Hace `populate` del autor para mostrar `nombre` y `ciudad`.

### Ejemplos de uso

#### 1. Registrar usuario
POST `/users`
```json
{
  "email": "juan@example.com",
  "nombre": "Juan Perez",
  "contraseña": "MiPassword123",
  "ciudad": "Madrid",
  "bio": "Amante del senderismo",
  "intereses": ["senderismo", "fotografía"]
}
```

#### 2. Login
POST `/users/login`
```json
{
  "email": "juan@example.com",
  "contraseña": "MiPassword123"
}
```
Respuesta:
```json
{
  "access_token": "<JWT>",
  "user": {
    "_id": "...",
    "email": "juan@example.com",
    "nombre": "Juan Perez",
    "ciudad": "Madrid",
    "bio": "Amante del senderismo",
    "intereses": ["senderismo", "fotografía"]
  }
}
```

#### 3. Crear actividad autenticado
POST `/activities`
Header: `Authorization: Bearer <JWT>`
```json
{
  "titulo": "Ruta por la sierra",
  "descripcion": "Una caminata de 10 km",
  "categoria": "senderismo",
  "ciudad": "Madrid",
  "fecha": "2026-06-10T09:00:00.000Z",
  "plazas": 10
}
```

#### 4. Unirse a actividad autenticado
PATCH `/activities/:id/join`
Header: `Authorization: Bearer <JWT>`
Body:
```json
{}
```

#### 5. Crear mensaje en una actividad autenticado
POST `/activities/:activityId/messages`
Header: `Authorization: Bearer <JWT>`
```json
{
  "text": "Hola, me apunto a la ruta"
}
```

#### 6. Listar mensajes de una actividad
GET `/activities/:activityId/messages`

### Swagger / OpenAPI

- UI disponible en: `http://localhost:3000/api`
- Todos los endpoints y DTOs están documentados para prueba interactiva.

## Modelos de datos

### Usuario (`User`)

- `email`: string, obligatorio, único
- `nombre`: string, obligatorio
- `password`: string, obligatorio (almacenado con bcrypt)
- `ciudad?`: string
- `bio?`: string
- `intereses?`: string[]
- timestamps automáticos (`createdAt`, `updatedAt`)

### Actividad (`Activity`)

- `titulo`: string, obligatorio
- `descripcion?`: string
- `categoria?`: string
- `ciudad?`: string
- `fecha?`: Date
- `plazas`: number, valor por defecto `10`
- `participantes`: string[], valor por defecto `[]`
- `creador`: string
- timestamps automáticos (`createdAt`, `updatedAt`)

### Mensaje (`Message`)

- `activity`: ObjectId referencia a `Activity`
- `author`: ObjectId referencia a `User`
- `text`: string, obligatorio
- timestamps automáticos (`createdAt`, `updatedAt`)

## Autenticación

- Se usa JWT con Passport y `passport-jwt`.
- El token se firma con `JWT_SECRET` o con el valor por defecto `topSecret51` si no está definido.
- Nunca se expone la contraseña del usuario en las respuestas.
- Endpoints protegidos:
  - `GET /users/me`
  - `POST /activities`
  - `PATCH /activities/:id/join`
  - `POST /activities/:activityId/messages`

## Variables de entorno importantes

- `MONGODB_URI`: cadena de conexión a la base de datos MongoDB
- `JWT_SECRET`: secreto para firmar los tokens JWT (opcional, tiene valor por defecto)
- `PORT`: puerto en el que la aplicación escucha (por defecto `3000`)

## Flujo recomendado de prueba en Swagger

1. Abrir `http://localhost:3000/api`.
2. Registrar un usuario con `POST /users`.
3. Hacer login con `POST /users/login` y copiar el token JWT.
4. Autorizar en Swagger con el botón "Authorize" usando `Bearer <token>`.
5. Probar `GET /users/me` para verificar el perfil autenticado.
6. Crear actividad con `POST /activities`.
7. Listar actividades con `GET /activities`.
8. Unirse a una actividad con `PATCH /activities/:id/join`.
9. Crear mensaje con `POST /activities/:activityId/messages`.
10. Listar mensajes con `GET /activities/:activityId/messages`.

## Próximas tareas sugeridas

1. Añadir validación completa y documentación de respuestas para todos los endpoints.
2. Implementar control de errores centralizado y respuestas estándar.
3. Añadir autorización por roles si se requieren permisos avanzados.
4. Extender el modelo de usuario con verificación de correo y recuperación de contraseña.
5. Añadir pruebas e2e para autenticación, creación de actividades, join y mensajes.
6. Limitar la edición/eliminación de actividades solo al creador.
7. Mejorar la sanitización de entrada y el manejo de fechas en ISO.
8. Añadir paginación y filtros en `GET /activities`.
