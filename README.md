# Football Platform — Starter

Base inicial de una plataforma multiorganización para torneos de fútbol.

## Stack previsto
- Web: Next.js + TypeScript
- Móvil: React Native + Expo
- API: NestJS + TypeScript
- Persistencia: PostgreSQL + Prisma
- Monorepo: pnpm workspaces

## Estado actual (verificado)

- ✅ Monorepo pnpm instalado (Node 24, pnpm 10). Scripts: `dev`, `lint`, `typecheck`.
- ✅ PostgreSQL 16 en Docker (`infrastructure/docker/compose.yml`).
- ✅ Esquema Prisma validado y migración inicial aplicada (20 tablas).
- ✅ Relación inversa `Venue.matches` corregida.
- ✅ Integridad de partidos: los FKs compuestos garantizan que `home`/`away` y `phase` pertenecen al mismo torneo que el `match`.
- ✅ `GET /api/v1/health` comprueba la base de datos (`database: up|down`).
- ⏳ Pendiente: autenticación (correo/Google/Apple), permisos por organización/torneo, CRUD de negocio, calendario, resultados/clasificaciones, noticias/notificaciones, pruebas y conexión web/móvil con la API.

## Requisitos
- Node.js LTS compatible con las versiones elegidas
- pnpm 10 (instalable con `npm i -g pnpm@10` o `corepack enable`)
- Docker Desktop (para PostgreSQL local)

## Inicio rápido
1. Copia `.env.example` a `.env` (en la raíz) y cambia los secretos.
   ```bash
   cp .env.example .env
   ```
2. Instala dependencias:
   ```bash
   pnpm install
   ```
3. Inicia PostgreSQL:
   ```bash
   docker compose -f infrastructure/docker/compose.yml up -d
   ```
4. Genera el cliente Prisma y aplica migraciones (los comandos cargan el `.env` de la raíz):
   ```bash
   pnpm --filter @football/api prisma:generate
   pnpm --filter @football/api prisma:migrate
   ```
5. Arranca la API y la web:
   ```bash
   pnpm dev
   ```
   - API: `http://localhost:4000/api/v1/health`
   - Web: `http://localhost:3000`

## Comandos útiles
- `pnpm typecheck` — typecheck de api, web y mobile.
- `pnpm lint` — ESLint (API y web).
- `pnpm --filter @football/api prisma:validate` — valida el esquema.
- `pnpm --filter @football/api prisma:studio` — Prisma Studio.

## Estructura
- `apps/api`: backend NestJS.
- `apps/web`: portal y panel web.
- `apps/mobile`: aplicación Expo.
- `packages/shared-types`: contratos TypeScript compartidos.
- `packages/api-client`: punto de entrada para el cliente HTTP.
- `packages/validation`: esquemas de validación compartidos.
- `prisma/schema.prisma`: modelo inicial.

## Decisiones de dominio
- Un torneo pertenece a una organización.
- La inscripción del equipo es una relación entre equipo y torneo.
- Las fases, grupos, jornadas y partidos pertenecen al torneo.
- Los resultados oficiales se registran y validan desde usuarios autorizados.
- Las clasificaciones se derivan de resultados validados; no son editadas manualmente.
- Los identificadores de equipos en partidos deben corresponder a inscripciones del mismo torneo.

## Seguridad pendiente antes de producción
- Verificación de identidad OAuth para Google y Apple.
- Autorización por organización y torneo en cada endpoint.
- Protección del último propietario de una organización.
- Validación transaccional de resultados, eventos y calendario.
- Rate limiting, manejo seguro de sesiones, logs y monitoreo.
- Pruebas de integración, migraciones revisadas y políticas de backup.
