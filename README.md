# Football Platform — Starter

Base inicial de una plataforma multiorganización para torneos de fútbol.

## Stack previsto
- Web: Next.js + TypeScript
- Móvil: React Native + Expo
- API: NestJS + TypeScript
- Persistencia: PostgreSQL + Prisma
- Monorepo: pnpm workspaces

> Este starter contiene estructura, configuración inicial y modelo de datos base. No es una aplicación de producción completa: OAuth, permisos finos, endpoints de negocio, motor de calendario y pruebas deben implementarse antes del lanzamiento.

## Requisitos
- Node.js LTS compatible con las versiones elegidas
- pnpm
- Docker Desktop (para PostgreSQL local)

## Inicio rápido
1. Copia `.env.example` a `.env` y cambia los secretos.
2. Inicia PostgreSQL:
   ```bash
   docker compose -f infrastructure/docker/compose.yml up -d
   ```
3. Instala dependencias:
   ```bash
   pnpm install
   ```
4. Desde `apps/api`, genera el cliente y aplica migraciones una vez completado el paquete:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```
5. Arranca los proyectos que ya estén implementados con sus scripts correspondientes.

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
