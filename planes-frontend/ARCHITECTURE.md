# Arquitectura propuesta para planes-frontend

## Objetivo

Proveer una interfaz React limpia y modular para el MVP de planes, con los siguientes flujos principales:

- Login
- Registro
- Listado de actividades
- Crear actividad
- Detalle de actividad
- Chat de actividad

## Estructura de carpetas

- `src/pages/`: páginas que representan rutas completas.
- `src/components/`: componentes reutilizables y UI de apoyo.
- `src/services/`: capa de comunicación con la API backend.
- `src/routes/`: definición de rutas de React Router.
- `src/main.tsx`: punto de entrada.
- `src/App.tsx`: layout general y router.

## Flujo de navegación

1. El usuario llega a la página de login o registro.
2. Tras autenticarse, se redirige a `Listado de actividades`.
3. Desde el listado se puede:
   - crear una nueva actividad,
   - ver el detalle de una actividad,
   - acceder al chat asociado a una actividad.
4. El chat de actividad se usa para enviar y listar mensajes relacionados a esa actividad.

## Servicios

- `api.ts`: cliente Axios centralizado con URL base configurable.
- `authService.ts`: funciones de login, registro y obtención de perfil.
- `activityService.ts`: funciones de listado, creación, detalle y join de actividades.
- `messageService.ts`: funciones de envío y consulta de mensajes por actividad.

## Propuesta de crecimiento

- Añadir manejo de estado global con Context o Redux para token y usuario.
- Agregar validación de formularios con una librería como React Hook Form o Zod.
- Implementar protección de rutas y un layout de usuario autenticado.
- Añadir paginación y filtros en el listado de actividades.
- Preparar tests de componentes y servicios.
