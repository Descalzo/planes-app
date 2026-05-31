# Guía de Prueba - Perfiles Públicos Limitados para Actividades

## Descripción General
Se ha implementado un sistema de perfiles públicos limitados que permite a los usuarios ver quién va a participar en una actividad, pero sin permitir acceso a perfiles de forma abierta. El acceso a los perfiles está regulado por reglas de visibilidad específicas.

## Reglas de Visibilidad Implementadas

### 1. Perfil del Creador
- **Acceso**: Siempre visible desde la actividad
- **Datos mostrados**: id, nombre, ciudad, bio, intereses, fotoPerfilUrl, edad, género, instagram (si existe)
- **Datos no mostrados**: email, password, teléfono, datos privados

### 2. Perfil de Participantes
- **Acceso**: Solo para:
  - El creador de la actividad
  - Otros participantes de la misma actividad
- **No accesible**: Para usuarios no registrados o que no participan en la actividad
- **Datos mostrados**: Iguales al del creador
- **Datos no mostrados**: Iguales al del creador

### 3. Restricciones Globales
- No existe listado global de usuarios
- No es posible navegar perfiles aleatorios
- El acceso siempre está vinculado a una actividad

## Endpoint Backend

### GET `/users/:id/public`

**Parámetros:**
- `:id` (required): ID del usuario cuyo perfil se solicita
- `?activityId` (optional): ID de la actividad para validar permisos

**Headers:**
- `Authorization: Bearer <token>` (solo necesario para validar permisos como participante)

**Respuesta exitosa (200):**
```json
{
  "_id": "usuario_id",
  "nombre": "Juan Pérez",
  "ciudad": "Madrid",
  "bio": "Me encanta hacer senderismo",
  "intereses": ["senderismo", "naturaleza", "fotografía"],
  "fotoPerfilUrl": "https://...",
  "edad": 28,
  "genero": "Masculino",
  "instagram": "juan_perez"
}
```

**Errores:**
- `403 Forbidden`: Acceso denegado (sin permisos)
- `404 Not Found`: Usuario o actividad no encontrada
- `401 Unauthorized`: Requerido para ciertos casos

## Casos de Prueba

### Caso 1: Ver perfil del creador (SIN autenticación)
**Objetivo**: Verificar que cualquiera puede ver el perfil del creador desde una actividad

**Pasos**:
1. Obtener el ID de una actividad (GET `/activities/:id`)
2. Obtener el ID del creador desde esa actividad
3. Hacer request: `GET /users/{creatorId}/public?activityId={activityId}` SIN token de autenticación

**Resultado esperado**: 
- ✅ Respuesta 200 con datos públicos del creador
- Los datos deben incluir: nombre, ciudad, bio, intereses, etc.

---

### Caso 2: Ver perfil del creador (CON autenticación)
**Objetivo**: Verificar que usuarios autenticados también pueden ver el perfil del creador

**Pasos**:
1. Autenticarse como Usuario A
2. Obtener una actividad creada por Usuario B
3. Hacer request: `GET /users/{userId_B}/public?activityId={activityId}` CON token

**Resultado esperado**: 
- ✅ Respuesta 200 con datos públicos del creador

---

### Caso 3: Ver perfil de participante (Usuario es creador)
**Objetivo**: Verificar que el creador puede ver perfiles de sus participantes

**Pasos**:
1. Autenticarse como Usuario A (creador)
2. Obtener una actividad creada por Usuario A
3. Obtener ID de un participante (Usuario B) en esa actividad
4. Hacer request: `GET /users/{userId_B}/public?activityId={activityId}` CON token

**Resultado esperado**: 
- ✅ Respuesta 200 con datos públicos del participante

---

### Caso 4: Ver perfil de participante (Usuario es otro participante)
**Objetivo**: Verificar que participantes pueden ver perfiles de otros participantes

**Pasos**:
1. Autenticarse como Usuario B (participante)
2. Obtener una actividad donde está Usuario B
3. Obtener ID de otro participante (Usuario C)
4. Hacer request: `GET /users/{userId_C}/public?activityId={activityId}` CON token

**Resultado esperado**: 
- ✅ Respuesta 200 con datos públicos del otro participante

---

### Caso 5: Ver perfil de participante (Usuario NO está en la actividad)
**Objetivo**: Verificar que usuarios NO autorizados no pueden ver perfiles de participantes

**Pasos**:
1. Autenticarse como Usuario C (NO participa en la actividad)
2. Obtener una actividad donde participan otros
3. Obtener ID de un participante (Usuario B)
4. Hacer request: `GET /users/{userId_B}/public?activityId={activityId}` CON token

**Resultado esperado**: 
- ✅ Respuesta 403 Forbidden
- Mensaje: "Acceso denegado al perfil público"

---

### Caso 6: Ver perfil sin parámetro activityId (Usuario NO autenticado)
**Objetivo**: Verificar que no se puede ver perfiles sin indicar actividad

**Pasos**:
1. NO autenticarse
2. Hacer request: `GET /users/{userId}/public` SIN token y SIN activityId

**Resultado esperado**: 
- ✅ Respuesta 403 Forbidden
- Mensaje: "Acceso denegado al perfil público"

---

### Caso 7: Ver perfil propio (Usuario es el mismo)
**Objetivo**: Verificar que un usuario puede ver su propio perfil sin necesidad de actividad

**Pasos**:
1. Autenticarse como Usuario A
2. Hacer request: `GET /users/{userId_A}/public` CON token de Usuario A, SIN activityId

**Resultado esperado**: 
- ✅ Respuesta 200 con datos públicos del usuario
- Función correctamente aunque es el usuario mismo

---

### Caso 8: Ver perfil no participante (Usuario NO autenticado)
**Objetivo**: Verificar que NO se puede ver perfil de no participante sin autenticación

**Pasos**:
1. NO autenticarse
2. Obtener una actividad
3. Obtener ID de un participante
4. Hacer request: `GET /users/{participantId}/public?activityId={activityId}` SIN token

**Resultado esperado**: 
- ✅ Respuesta 403 Forbidden
- Nota: Solo el creador es accesible sin autenticación

---

## Frontend - Casos de Prueba de Navegación

### Test 1: Ver perfil del creador desde ActivityDetailPage
**Pasos**:
1. Ir a una actividad (autenticado)
2. Ver la sección "Organizador"
3. Hacer clic en "Ver perfil"

**Resultado esperado**: 
- ✅ Navega a `/users/{creatorId}/profile?activityId={activityId}`
- ✅ Se muestra el perfil público del creador
- ✅ Se visualizan: nombre, ciudad, bio, intereses, edad, género, instagram

---

### Test 2: Ver perfil de otro participante (siendo participante)
**Pasos**:
1. Autenticarse como Usuario A
2. Unirse a una actividad
3. Ir a la actividad (ActivityDetailPage)
4. Ver la sección "Otros participantes"
5. Hacer clic en "Ver perfil" de User B

**Resultado esperado**: 
- ✅ Aparece la sección "Otros participantes"
- ✅ Navega a `/users/{userId_B}/profile?activityId={activityId}`
- ✅ Se muestra el perfil público del participante
- ✅ Se pueden ver todos sus datos públicos

---

### Test 3: No ver perfiles de participantes (no siendo participante)
**Pasos**:
1. Autenticarse como Usuario A
2. Ver una actividad SIN estar apuntado
3. Ver la actividad (ActivityDetailPage)

**Resultado esperado**: 
- ✅ NO aparece la sección "Otros participantes"
- ✅ Solo se ve el organizador
- ✅ Solo está disponible el botón "Ver perfil" del organizador

---

### Test 4: Ver perfil como creador (siendo creador)
**Pasos**:
1. Autenticarse como Usuario A (creador)
2. Ir a su actividad creada
3. Hacer clic en "Ver perfil" del organizador (a sí mismo)

**Resultado esperado**: 
- ✅ Se muestra su propio perfil público
- ✅ Se pueden ver todos los datos públicos

---

### Test 5: Botones "Ver perfil" como creador
**Pasos**:
1. Autenticarse como Usuario A (creador)
2. Ir a su actividad
3. Ver la sección "Participantes"

**Resultado esperado**: 
- ✅ Aparece sección "Participantes" (solo visible para creador)
- ✅ Cada participante tiene un botón "Ver perfil"
- ✅ Al hacer clic navega al perfil correcto

---

## Flujo Completo Recomendado para Pruebas

### Preparación
1. **Crear 3 usuarios**: Usuario A (creador), Usuario B (participante), Usuario C (otro usuario)
2. **Usuario A crea una actividad**
3. **Usuario B se une a la actividad**
4. **Usuario C permanece fuera**

### Pruebas Secuenciales
1. **Sin autenticación**: 
   - ✅ Ver perfil del creador (con activityId)
   - ✅ NO poder ver perfil del participante (sin autenticación)

2. **Como Usuario B (participante)**:
   - ✅ Ver perfil del creador
   - ✅ Ver perfil de otros participantes
   - ✅ Ver su propio perfil desde la actividad
   - ✅ Ver desde UI: Organizador y Otros participantes

3. **Como Usuario C (no participante)**:
   - ✅ Ver perfil del creador
   - ✅ NO poder ver perfil del participante (401 Forbidden)
   - ✅ Ver desde UI: Solo el Organizador

4. **Como Usuario A (creador)**:
   - ✅ Ver perfil del participante
   - ✅ Ver sus propios datos
   - ✅ Ver desde UI: Participantes (con todos los botones)

---

## Datos No Permitidos en Respuesta

Los siguientes datos NUNCA deben aparecer en la respuesta del endpoint `/users/:id/public`:
- ❌ `email`
- ❌ `password`
- ❌ `teléfono`
- ❌ Cualquier dato privado sensible
- ❌ JWT tokens
- ❌ Fechas de creación/actualización

---

## Validación de Respuesta

Al recibir un perfil público, verificar que:
```json
{
  // ✅ Presente
  "_id": "...",
  "nombre": "...",
  "ciudad": "..." (si existe),
  "bio": "..." (si existe),
  "intereses": [...],
  "fotoPerfilUrl": "..." (si existe),
  "edad": 28 (si existe),
  "genero": "..." (si existe),
  "instagram": "..." (si existe),
  
  // ❌ Ausente
  "email": undefined,
  "password": undefined,
  "telefono": undefined
}
```

---

## Notas Importantes

1. **activityId es opcional en la query** pero cambia el comportamiento:
   - Con `activityId`: Se valida el permiso en relación a esa actividad
   - Sin `activityId`: Solo funciona para el usuario mismo

2. **El endpoint es público** (no requiere JWT) pero las validaciones dependen del contexto

3. **La foto de perfil** se devuelve como URL, el frontend es responsable de cargarla

4. **Los intereses** se devuelven como array de strings

5. **La edad y género** son opcionales según datos del usuario

---

## Troubleshooting

### Problema: Recibo 403 al ver perfil de creador
**Causa**: Probablemente no se envía el `activityId` o es inválido
**Solución**: Verificar que `activityId` sea válido y corresponda a una actividad existente

### Problema: Puedo ver perfiles sin estar apuntado
**Causa**: Probablemente estás viendo el perfil del creador
**Solución**: Los creadores siempre son visibles. Intenta con un participante

### Problema: El perfil no carga en el frontend
**Causa**: Probablemente hay un error en la ruta o los parámetros
**Solución**: Verificar console del navegador y que la ruta sea `/users/{id}/profile?activityId={id}`

