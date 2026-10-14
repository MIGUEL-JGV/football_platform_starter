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
- ✅ Permisos por organización (`owner/admin/editor`) y torneo (`manager/scorekeeper/viewer`) con guardas y aislamiento entre organizaciones.
- ✅ CRUD de negocio en API: organizaciones + miembros, torneos, equipos, jugadores, sedes, inscripciones (aprobar/rechazar/retirar) y plantillas.
- ✅ Calendario en API: fases (liga/grupos/eliminatoria), jornadas, grupos, partidos con reprogramación.
- ✅ Resultados y clasificación: registro → `pending_validation` → validación; tabla calculada de partidos validados con puntos configurables del torneo; eventos de partido (goles/tarjetas).
- ✅ Noticias por torneo (publicar/despublicar).
- ✅ Web conectada a la API: catálogo, búsqueda/filtros/paginación, detalle con tabla y calendario, login/registro reales (sesión en cookie HTTP-only), «Mis torneos» y botón «Seguir».
- ✅ App móvil conectada a la API: autenticación, catálogo con búsqueda, detalle (tabla/calendario), seguir torneo, «Mis torneos» y perfil.
- ✅ Fotografías de jugador: editor de recorte 3:4 en la web y captura/galería en el móvil (subida, portada, eliminación); la API genera miniatura y una versión **credencial 3:4** con `sharp`. **Privacidad por consentimiento**: cada foto es `private` por defecto y solo `public` con `ConsentRecord(scope=photo_publication, granted=true)`; las privadas se sirven con URLs firmadas (HMAC `exp`+`sig`) y el perfil público usa `age` (no `dateOfBirth`) y oculta la foto si es privada.
- ⏳ Pendiente: OAuth Google/Apple, validación de cupos (`maxTeams`), generador automático de calendarios, notificaciones (API + UI), desempates configurables, pruebas automatizadas, Swagger y CI/CD.

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
- `pnpm --filter @football/api test` — pruebas unitarias de la API (Vitest, Prisma mockeado; sin DB).
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

### Fotografías de jugador y privacidad

- Endpoints (`/api/v1`): `GET/POST /players/:id/photos` (multipart, JPEG/PNG/WEBP ≤ 8 MB; `POST` acepta `makePublic`), `POST /players/:id/photos/:photoId/primary`, `DELETE /players/:id/photos/:photoId`.
- Servido de medios: `GET /media/photos/:photoId`, `.../thumb` y `.../credential` (recorte 3:4, 600×800). Las fotos `public` se sirven directas; las `private` requieren firma válida (`?exp=<epoch>&sig=<hmac>`), si no responden `404`.
- Firma: `MEDIA_URL_SECRET` (o, si falta, `JWT_ACCESS_SECRET`); TTL de 1 hora. En producción define `MEDIA_URL_SECRET` propio.
- Publicación por consentimiento: una foto solo es `public` si el jugador es mayor de edad o existe `ConsentRecord(scope=photo_publication, granted=true)`; de lo contrario se guarda `private` aunque se solicite publicar.


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
