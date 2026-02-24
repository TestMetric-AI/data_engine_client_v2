# AGENTS.md

## Contexto del proyecto
**Data Engine Client v2** es una aplicacion web para operacion de datasets y pipelines ETL, con modulos de:
- Carga y consulta de datasets (deposits, deposits_locked, deposits_trxlog, deposits_interest_change, deposit_activity, client_exonerated, etc.).
- Pipelines operativos (incluye disparo de pipeline en Azure cuando aplica).
- Gestion interna (projects, resources, tasks, roles).
- Registro y visualizacion de resultados de pruebas CI/CD (Playwright) en dashboard.

Stack principal actual:
- Next.js 16 (App Router)
- React 19 + TypeScript
- Prisma 7 + PostgreSQL
- NextAuth v4 (credenciales/JWT)
- RBAC dinamico (roles y permisos en DB)
- Tailwind CSS v4
- Jest + Testing Library

---

## Objetivo de este documento
Definir reglas claras para que cualquier agente/colaborador:
- entregue cambios consistentes con la arquitectura actual,
- no rompa seguridad ni permisos,
- mantenga trazabilidad en Prisma y APIs,
- deje cambios faciles de validar y revisar.

---

## Reglas obligatorias

### 1) Mantener consistencia con el producto actual
- No reutilizar nomenclatura de otros proyectos (por ejemplo, TMS/Test Manager) en codigo, UI o docs.
- Antes de crear nuevos patrones, revisar implementaciones existentes en:
  - `src/app/**`
  - `src/components/**`
  - `src/lib/services/**`
  - `src/lib/rbac/**`

### 2) Seguridad y permisos (no negociable)
- Toda accion sensible (API route, server action, pagina de administracion/gestion) debe validar autenticacion y autorizacion.
- No confiar solo en UI para restringir acciones.
- Si agregas una capability nueva:
  - registrar permiso en seed/config de permisos,
  - aplicar check en server (y opcionalmente reflejar en UI).

### 3) App Router y separacion de responsabilidades
- `src/app/**`: rutas, layouts, pages, route handlers y server actions.
- `src/components/**`: UI reusable/presentacional.
- `src/lib/services/**`: logica de negocio, consultas y operaciones de datos.
- `src/lib/**`: clientes compartidos (db, auth, rbac, utilidades).
- No mezclar parsing de archivos, acceso a DB y render UI en el mismo modulo si se puede separar sin sobreingenieria.

### 4) Cambios en base de datos (Prisma)
- Todo cambio de modelo debe pasar por `prisma/schema.prisma`.
- Mantener nombres consistentes con convenciones existentes (`snake_case` en columnas mapeadas, `camelCase` en codigo).
- Si agregas/ajustas entidades:
  - definir indices necesarios para consultas reales,
  - actualizar seed cuando aplique (roles, permisos, catalogos),
  - revisar impacto en servicios y endpoints.

### 5) Cargas ETL y validaciones de archivos
- En endpoints de upload:
  - validar tipo de archivo, nombre esperado y estructura de columnas,
  - manejar `overwrite` explicitamente,
  - retornar errores claros y accionables.
- Mantener el comportamiento de importacion robusto (sin truncar/mezclar datos por accidente).
- Si hay procesos en segundo plano (enriquecimiento/normalizacion), documentar claramente que es asincrono.

### 6) Configuracion y secretos
- No hardcodear URLs, tokens, credenciales, IDs de pipeline o secretos.
- Usar variables de entorno (`.env`) y defaults seguros.
- No exponer secretos en logs, respuestas de API ni mensajes de error.

### 7) Alcance de cada PR
- Preferir cambios pequenos, con un solo objetivo tecnico.
- No mezclar refactor grande + feature nueva + cambios de DB en el mismo PR sin justificacion.
- Cada PR debe incluir:
  - que cambia,
  - por que,
  - como validar.

---

## Estructura del repo (referencia)

### Raiz
- `src/` aplicacion (App Router, componentes, servicios)
- `prisma/` schema, migraciones y seed
- `docs/` documentacion funcional y tecnica
- `scripts/` scripts de soporte (roles/permisos/mantenimiento)
- `public/` assets estaticos

### Areas clave dentro de `src/`
- `src/app/` paginas, layouts, actions y APIs
- `src/components/` componentes UI (dashboard, pipelines, ui)
- `src/hooks/` hooks de sesion/permisos
- `src/lib/services/` servicios de dominio (deposits, resources, projects, tasks, dashboard)
- `src/lib/rbac/` roles, permisos, politicas y verificaciones
- `src/lib/auth*` autenticacion y utilidades relacionadas

---

## Convenciones de codigo

### Naming
- Componentes: `PascalCase` (`ProjectsTable.tsx`)
- Hooks: `useXxx` (`useCan.ts`)
- Funciones/variables: `camelCase`
- Segmentos de rutas: preferir `kebab-case` salvo cuando el modulo ya exista con otro formato.

### API y servicios
- En `route.ts`, mantener handlers delgados y delegar logica a `src/lib/services/**`.
- Validar input en server (query/body/form-data), no asumir que el front envia datos correctos.
- Estandarizar respuestas de error (codigo HTTP + mensaje claro).

### Frontend
- Reutilizar componentes de `src/components/ui` antes de crear nuevos.
- En vistas nuevas, contemplar al menos estados `loading`, `empty` y `error` cuando aplique.
- Mantener consistencia visual con dashboard y layouts actuales.

---

## Calidad minima antes de entregar
Ejecutar segun alcance del cambio:
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Si tocas ingestion ETL o APIs de datos, validar manualmente al menos un flujo real de carga/consulta del modulo afectado.

---

## Scripts disponibles (actual)
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm test`
- `pnpm test:watch`

> Prisma client se genera en `postinstall` (`prisma generate`).

---

## Checklist de PR
1. Que cambia (1-3 bullets).
2. Por que cambia.
3. Como probar (pasos concretos y datos de prueba).
4. Capturas o evidencia si hay cambios visuales.
5. Riesgo y rollback si toca auth, permisos o DB.

---

## No hacer
- No duplicar logica existente en servicios/componentes.
- No introducir dependencias nuevas sin justificar necesidad.
- No desactivar validaciones de auth/RBAC para "hacer que funcione".
- No cambiar estructura de DB/API sin actualizar documentacion afectada en `docs/`.
- No dejar endpoints de carga sin validacion de archivo y errores controlados.

---

## Cuando haya duda
1. Buscar un patron existente en el mismo modulo.
2. Elegir la opcion mas simple que cumpla seguridad + mantenibilidad.
3. Documentar el tradeoff tecnico en el PR (2-3 lineas).
