# Nuevo esquema de roles y permisos

Se necesita hacer escalable y mantenible por lo que se cambiara el enfoque a permisos + roles.

Funcionara de la siguiente manera:

- Define permisos (constantes tipadas)

- Mapea roles → permisos

- Crea policies por “acciones” (no solo por rutas)

- Un solo can() que evalúa:

  - permiso requerido

  - y si aplica, reglas (tenant, owner, team, etc.)

- Usar el mismo can() / require() en:

  - UI (mostrar/ocultar)

  - middleware (bloquear páginas)

  - backend (API/server actions)