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
- ✅ Autenticación email/contraseña: registro, login y `GET /api/v1/auth/me` con JWT + bcrypt.
- ✅ Guard global (rutas protegidas por defecto) con decorador `@Public()` para rutas abiertas.
- ⏳ Pendiente: OAuth Google/Apple, permisos por organización/torneo, CRUD de negocio, calendario, resultados/clasificaciones, noticias/notificaciones, pruebas y conexión web/móvil con la API.

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

## API de autenticación (`/api/v1/auth`)

| Método | Ruta | Público | Descripción |
|---|---|---|---|
| POST | `/auth/register` | ✅ | Crea cuenta con email+contraseña. Devuelve `accessToken` y `user`. |
| POST | `/auth/login` | ✅ | Inicia sesión. Devuelve `accessToken` y `user`. |
| GET | `/auth/me` | ❌ | Datos del usuario autenticado (requiere `Authorization: Bearer <token>`). |

- El guard JWT es **global**: todas las rutas requieren token salvo las marcadas con `@Public()`.
- Contraseñas con bcrypt (coste 12). El correo se normaliza a minúsculas.
- Errores: `409` correo duplicado, `401` credenciales inválidas, `400` validación de DTO.

Ejemplo:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"tu@correo.com","password":"contraseña-segura","displayName":"Tu Nombre"}'

TOKEN=eyJhbGci...  # el accessToken devuelto arriba
curl http://localhost:4000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

### Variables de entorno de JWT

`JWT_ACCESS_SECRET` (obligatorio, secreto largo aleatorio) y `JWT_ACCESS_TTL` (por defecto `15m`).

### Google y Apple (pendiente de configuración)

Los modelos `AuthIdentity` ya soportan proveedores OAuth. La verificación de identidad de Google/Apple se implementará en una siguiente iteración; no hay credenciales configuradas todavía. No uses "inicio de sesión" social simulado en producción.
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
