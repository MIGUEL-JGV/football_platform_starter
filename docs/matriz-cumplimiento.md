# Matriz de cumplimiento — Especificación funcional vs. implementación

Referencia: especificación funcional de la plataforma de torneos de fútbol (39 pantallas, 15 secciones).
Última revisión: 2026-10-12.

Estados: **Implementado** (funciona de extremo a extremo) · **Parcial** (existe una parte, falta cobertura) · **Pendiente** (no existe) · **No verificado** (existe pero sin probar explícitamente).

Leyenda de alcance: `API` = backend NestJS · `Web` = Next.js · `Móvil` = React Native/Expo.

---

## 1. Resumen ejecutivo

La **API está muy completa** para el dominio deportivo y de gestión (organizaciones, torneos, equipos,
jugadores, inscripciones, fases/jornadas/partidos, resultados con validación, eventos, noticias, sedes).
La **capa de presentación es mayoritariamente de consulta**: web y móvil cubren catálogo, detalle,
clasificación y calendario, más autenticación. **No existe UI de administración** en ninguno de los dos.

Brechas estructurales:

- **Estadísticas derivadas** (goleo, asistencias, tarjetas, faltas, por equipo): **API + UI Web/Móvil Implementadas** (`GET /tournaments/:id/stats`); porteros sigue pendiente (requiere alineaciones/minutos).
- **Auditoría / control de modificaciones**: sin modelo ni endpoints (la especificación lo exige en varias pantallas).
- **Administrador global**: el modelo `User` no tiene rol de plataforma; no hay pantallas globales.
- **Notificaciones**: modelo `Notification` existe, sin módulo ni endpoints.
- **Correo**: no hay verificación de email ni recuperación de contraseña; OAuth no implementado (aunque `AuthIdentity` está listo).
- **Generador automático de calendario** y **disponibilidad de sedes**: pendientes.

Regla respetada: **no se duplican datos calculados** — la clasificación se calcula al vuelo desde
partidos `finished` (no se persiste). Permisos validados en el servidor (servicios + guards).

---

## 2. Matriz de pantallas

| # | Pantalla | Estado | Detalle |
|---|---|---|---|
| 1 | Inicio y catálogo | Parcial | API lista/filtra (q, status, format, org, paginación); Web + Móvil con búsqueda y cards. Faltan: filtro por ciudad/fechas, orden configurable, cupos visibles, destacados. |
| 2A | Detalle · Resumen | Implementado | Hero, formato, estado, conteos, seguir, métricas (partidos, goles, promedio), últimos resultados y líderes de goleo (Web y Móvil). Falta adelanto de reglamento. |
| 2B | Detalle · Equipos | Pendiente | Sin pestaña de equipos participantes. |
| 2C | Detalle · Calendario | Implementado | Pestaña dedicada con próximos partidos; cada partido enlaza a su detalle (Web y Móvil). Faltan filtros, vista calendario y compartir. |
| 2D | Detalle · Resultados | Parcial | Pestaña dedicada con resultados (Web y Móvil). Falta estado de validación visible. |
| 2E | Detalle · Clasificación | Parcial | Tabla con Pos, PJ, PG, PE, PP, GF, GC, DG, PTS y **Forma** (últimos 5, Web y Móvil). Faltan juego limpio, desempates configurables y filtro por grupo. |
| 2F | Detalle · Estadísticas | Parcial | Goleo, asistencias, disciplina (tarjetas/faltas) y por equipo (Web y Móvil) con **gráficos propios** (dona de resultados, barras de goleo/asistencias, disciplina apilada y balanza de goles) y tablas completas plegables. Faltan porteros. |
| 2G | Detalle · Noticias | Parcial | API de noticias + UI Web (lista y detalle). Falta pestaña de noticias en Móvil. |
| 2H | Detalle · Reglamento | Pendiente | `Tournament.rules` (JSON) existe; sin UI ni versionado. |
| 3 | Detalle de partido | Implementado | Pantalla con marcador y cronología de eventos (Web y Móvil), enlazada desde calendario/resultados. |
| 4 | Perfil de equipo | Implementado | Perfil público con rendimiento reciente, torneos, **Integrantes** (foto, dorsal, posición, edad; agrupados por torneo) y últimos partidos (Web y Móvil). |
| 5 | Perfil de jugador | Implementado | Perfil público con estadísticas agregadas, equipos y últimos eventos (Web y Móvil). **Galería de fotografías** (subida, portada, eliminación; solo dueño/manager; optimización y miniatura server-side). |
| 6 | Estadísticas generales | Parcial | Métricas agregadas de torneo (partidos, goles, promedio, resultados local/empate/visita) en `GET /stats`, presentadas con gráficos en Web y Móvil. Faltan más tipos de gráficos y export.
| 7 | Registro e inicio de sesión | Parcial | Email/contraseña reales (Web + Móvil). Faltan: verificación de correo, OAuth Google/Apple, recuperación de contraseña, términos. |
| 8 | Perfil y configuración | Parcial | Móvil muestra perfil + cerrar sesión. Faltan: editar datos, foto, cambiar contraseña, preferencias de notificación, privacidad, eliminar cuenta; Web sin página de perfil. |
| 9 | Mis torneos (Organizo/Participo/Sigo) | Parcial | Web/Móvil listan; **no separan** las 3 categorías. API ya expone `canManage`/`myOrgRole` para clasificar "Organizo". |
| 10 | Centro de notificaciones | Pendiente | Modelo `Notification` sin módulo/endpoints. |
| 11 | Gestión de equipos | Parcial | API equipos (CRUD, `/teams/me`) Implementada; sin UI. |
| 12 | Plantilla y jugadores | Parcial | API jugadores + roster (CRUD) Implementada; **plantilla enviada junto con el registro** (dorsal/posición, validación de club y dorsal duplicado); **editor de fotografías** (subida/servido/miniatura, permisos dueño/manager) Implementado; lectura pública vía perfil de equipo. Sin UI de edición de datos de jugador; sin reglas de duplicidad entre torneos. |
| 13 | Inscripciones a torneos | Implementado | API aplicar **con plantilla** (jugadores del club + dorsal + posición) y **representante de contacto**; **invitaciones con enlace/QR** y **registro de equipo desde `/join/:token`** (2 pasos: equipo → plantilla con **consentimiento de menores**); listar/aprobar/**rechazar con motivo**/retirar; re-aplicación tras rechazo reemplaza la plantilla y limpia el motivo. |
| 14 | Dashboard administrativo | Parcial | Hub `/panel` con organizaciones, torneos que administra y acceso a crear torneo; sin métricas ni widgets globales. |
| 15 | Crear/configurar torneo | Parcial | API crear/editar Implementada (con `maxTeams`, `location`, `categoryLabel`, `minAge/maxAge`, `competitionFormat`) y **`POST /tournaments`** (organización personal); **UI web `/panel/torneos/nuevo`** Implementada. Faltan: wizard por pasos, criterios de desempate, duración, sustituciones, fechas bloqueadas. |
| 16 | Gestión de inscripciones | Parcial | API Implementada (con validación de cupo); **panel de revisión web**: entradas por estado, plantilla expandible con estado de consentimientos y rechazo con motivo; faltan export e historial completo de decisiones. |
| 17 | Equipos y elegibilidad | Parcial | API listar/aprobar/rechazar Implementada; sin UI; sin suspensión/duplicados/bloqueo por fecha límite. |
| 18 | Generador/editor de calendario | Pendiente | Creación manual de fases/jornadas/partidos existe en API; **generación automática** y disponibilidad de sedes no. |
| 19 | Administración de partidos | Parcial | API CRUD + resultado/validar/limpiar Implementada; **UI de captura de resultado en el panel** (con conteo de resultados pendientes de validación) y **editor de eventos por partido** (panel). Sin alineaciones ni marcado "listo". |
| 20 | Captura de eventos | Parcial | API de eventos (gol, autogol, penal, tarjetas, sustitución, asistencia, **falta**, atajada, jugador secundario) Implementada; **UI web de captura/eliminación/anulación** en el panel. Sin modo en vivo. |
| 21 | Tabla de goleo | Implementado | `GET /tournaments/:id/stats` (goleo con penales) + UI Web/Móvil. Enlaza a perfil de jugador. |
| 22 | Tabla de asistencias | Implementado | Derivada de eventos (`goal.secondaryTeamRosterId` + `assist`) + UI Web/Móvil. |
| 23 | Tarjetas y disciplina | Implementado | Amarillas/2ª amarilla/rojas por jugador y por equipo (Web/Móvil). Faltan acumulaciones configurables por torneo. |
| 24 | Tabla de faltas | Implementado | Faltas cometidas/recibidas por jugador y por equipo (evento `foul`). |
| 25 | Estadísticas de porteros | Pendiente | Requiere alineaciones/minutos; no implementado (atajadas sí se cuentan como evento, sin tabla). |
| 26 | Estadísticas por equipo | Implementado | Tabla por equipo (PJ, GF, GC, vallas invictas, tarjetas, faltas) en `GET /stats` + UI. |
| 27 | Estadísticas generales y gráficos | Parcial | Métricas, tablas agregadas y **gráficos** (dona, rankings, disciplina apilada, balanza de goles) en Web y Móvil. Faltan export y más visualizaciones. |
| 28 | Resultados pendientes de validación | Parcial | API `pending_validation` → validar/limpiar Implementada; **UI web en el panel** (validar/limpiar + aviso de pendientes). Sin motivo de devolución ni reapertura auditada. |
| 29 | Reportes y exportaciones | Pendiente | Sin generación/descarga (CSV/Excel/PDF). |
| 30 | Administración de noticias | Parcial | API CRUD/publicar/despublicar Implementada; **UI web en el panel** (crear/editar/publicar/despublicar/eliminar + estado visible). Sin programación ni imagen destacada. |
| 31 | Centro de comunicaciones | Pendiente | Sin endpoints de envío ni seguimiento de entrega. |
| 32 | Perfil de organización | Parcial | API org (ver/editar) Implementada; sin UI. |
| 33 | Miembros y permisos | Parcial | API miembros CRUD Implementada (protección último owner); sin UI. |
| 34 | Sedes y campos | Parcial | API venue CRUD Implementada; sin UI; sin disponibilidad/bloqueos/campos múltiples. |
| 35 | Dashboard global | Pendiente | Sin rol de administrador global. |
| 36 | Gestión de usuarios (global) | Pendiente | Sin endpoints/servicio global. |
| 37 | Gestión de organizaciones (global) | Pendiente | Sin endpoints/servicio global. |
| 38 | Configuración general | Pendiente | Sin modelo de configuración. |
| 39 | Auditoría y seguridad | Pendiente | Sin modelo `AuditLog` ni endpoints. |
**Conteo (aprox.):** Implementado 9 · Parcial 19 · Pendiente 10.

La mayoría "Parcial" lo es por falta de UI en áreas aún no exploradas (organización/miembros/sedes/equipos admin) o por faltantes específicos (alineaciones, modo en vivo, wizard, gráficos).

---

## 3. Matriz de modelos de datos

| Modelo | Estado | Notas |
|---|---|---|
| `User` | Implementado | Sin rol de plataforma (falta admin global). |
| `AuthIdentity` | Implementado | Listo para OAuth; sin proveedores conectados. |
| `Organization` | Implementado | — |
| `OrganizationMember` | Implementado | Roles owner/admin/editor; estados de membresía. |
| `Tournament` | Implementado | **+`maxTeams`, `competitionFormat`, `location`, `categoryLabel`, `minAge/maxAge`, `registrationRequirements`** en esta iteración. |
| `TournamentMember` | Implementado | manager/scorekeeper/viewer. |
| `TournamentInvitation` | Implementado | Enlace/QR de inscripción; `tokenHash` SHA-256, `maxUses`, `usedCount`, `status`, `expiresAt`, `revokedAt`. |
| `PlayerInvitation` | Parcial | Modelo creado para invitar jugadores; sin endpoints/módulo todavía. |
| `PlayerPhoto` | Implementado | `storageKey`/`thumbKey`, dimensiones, `is_primary`; **`StorageService` (driver local, sustituible) + `sharp` (webp optimizada, EXIF/GPS removidos, miniatura)**; endpoints de subida/listado/portada/eliminación y servido público `GET /media/photos/:id(/thumb)`. Sin expiration/privacidad. |
| `PlayerDocument` | Parcial | Modelo creado (docType, status); sin endpoints. |
| `ConsentRecord` | Implementado | **Creación en el registro** (menores: tutor + parentesco + doc.), `scope=registration`, únicos por `(player, tournamentTeam, scope)`; expuestos en `GET .../entries/:entryId/roster`. Sin expiración/revocación. |
| `AuditLog` | Parcial | Modelo creado; sin servicio ni endpoints de consulta/escritura.
| `TournamentFollow` | Implementado | — |
| `Team` | Implementado | — |
| `Player` | Implementado | Sin documentos ni privacidad. |
| `TournamentTeam` (inscripción) | Parcial | Estados pending/approved/rejected; **+`invitationId`, `submittedAt`, `reviewNote`, `reviewedBy/reviewedAt`, datos de representante**; faltan estados borrador/en revisión/lista de espera. |
| `TeamRoster` | Implementado | Elegibilidad por reglas del torneo: falta. |
| `Phase` | Implementado | — |
| `CompetitionGroup` | Parcial | Modelo existe, **sin endpoints** de grupos. |
| `Matchday` | Implementado | — |
| `Venue` | Parcial | Sin disponibilidad/bloqueos; `latitude/longitude` sin uso. |
| `Match` | Implementado | FKs compuestas garantizan integridad torneo/fase/equipos. |
| `MatchEvent` | Implementado | **+`secondaryTeamRosterId`** (falta recibida, sustitución, etc.); `eventType` extensible. |
| `NewsPost` | Implementado | Sin imagen destacada ni programación. |
| `Notification` | Parcial | Modelo existe, sin módulo. |

Regla "distinguir cero de desconocido": **pendiente** (requiere que las estadísticas declaren qué eventos
se capturaron; hoy solo hay clasificación, que no aplica).

---

## 4. Endpoints existentes (API `api/v1`)

- **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- **Health**: `GET /health`.
- **Organizaciones**: `POST/GET /organizations`, `GET/PATCH /organizations/:id`, `GET/POST /organizations/:id/members`, `PATCH/DELETE /organizations/:id/members/:userId`.
- **Torneos**: `GET /tournaments`, `GET /tournaments/me/tournaments`, `POST /tournaments` (autenticado; usa `organizationId` opcional o crea/reutiliza organización personal), `GET /tournaments/:id`, `POST/DELETE /tournaments/:id/follow`, `GET/POST/PATCH/DELETE /tournaments/:id/members`, `POST /organizations/:organizationId/tournaments`, `PATCH/DELETE /organizations/:organizationId/tournaments/:tournamentId`.
- **Invitaciones**: `GET/POST /tournaments/:id/invitations`, `GET .../invitations/:invitationId/entries`, `POST .../invitations/:invitationId/revoke|regenerate`, `GET /invitations/:token` (público; valida vigencia/usos/estado). Token aleatorio de 32 bytes; se guarda solo su hash SHA-256 y el enlace/QR se muestra una vez.
- **Inscripciones**: `GET/POST /tournaments/:id/entries`, `GET .../entries/:entryId` (detalle de revisión: roster/consentimientos/representante), `POST .../entries/:entryId/approve`, `.../reject` (**con `{reason}` → reviewNote**), `DELETE .../entries/:entryId`. `POST /entries` acepta `players[]` (playerId, jerseyNumber, position, `consent` para menores) y datos de representante; re-aplicar tras rechazo reemplaza la plantilla.
- **Roster**: `GET/POST /tournaments/:id/entries/:entryId/roster`, `PATCH/DELETE .../roster/:rosterId` (edición: admin del equipo `Team.createdBy`, requester de la inscripción o manager del torneo). `GET roster` incluye `isMinor` (de `dateOfBirth`) y `consents[]` del jugador.
- **Equipos**: `GET /teams`, `GET /teams/me`, `POST /teams`, `GET/PATCH/DELETE /teams/:id`, `GET /teams/:id/profile` (público; incluye `players` e `squads` con integrantes).
- **Estadísticas**: `GET /tournaments/:id/stats` (público; goleo, asistencias, disciplina, por equipo).
- **Jugadores**: `GET/POST /players`, `GET/PATCH/DELETE /players/:id`, `GET /players/:id/profile` (público).
- **Fotografías de jugador**: `GET/POST /players/:id/photos` (multipart, JPEG/PNG/WEBP ≤8 MB), `POST .../photos/:photoId/primary`, `DELETE .../photos/:photoId` (permisos: `Player.createdBy` o manager del torneo del roster); servido público `GET /media/photos/:photoId` y `.../thumb` (webp optimizada con `sharp`; `Player.photoUrl` apunta a la primaria).
- **Sedes**: `GET/POST /organizations/:organizationId/venues`, `GET/PATCH/DELETE .../venues/:venueId`.
- **Calendario**: `GET/POST/PATCH/DELETE /tournaments/:id/phases`, `.../phases/:phaseId/matchdays`.
- **Partidos**: `GET/POST /tournaments/:id/matches`, `GET/PATCH/DELETE .../matches/:matchId`, `POST .../result`, `.../result/validate`, `.../result/clear` (registro con marcador de penales si aplica, versionado de resultados).
- **Eventos de partido**: `GET/POST /tournaments/:id/matches/:matchId/events`, `PATCH/DELETE .../events/:eventId` (tipos: gol, autogol, penal, tarjetas, sustitución, asistencia, falta, atajada; con `secondaryTeamRosterId`, minuto y periodo; estado valid/anulado).
- **Eventos**: `GET/POST /tournaments/:id/matches/:matchId/events`, `PATCH/DELETE .../events/:eventId`.
- **Clasificación**: `GET /tournaments/:id/standings`.
- **Noticias**: `GET/POST /tournaments/:id/news`, `GET .../news/:slug`, `PATCH/DELETE .../news/:postId`, `POST .../news/:postId/publish`, `.../unpublish` (borradores solo visibles para managers).

### Endpoints faltantes para la especificación

- Estadísticas: subendpoints dedicados (`/stats/scorers|assists|cards|goalkeepers|overview`); hoy `GET /tournaments/:id/stats` devuelve todo.
- Grupos: CRUD de `CompetitionGroup`.
- Notificaciones: lista/leer/configurar.
- Auditoría: consulta de registros.
- Global admin: usuarios/organizaciones/configuración.
- Auth: verificación de correo, recuperar contraseña, OAuth (Google/Apple).
- Calendario automático y disponibilidad de sede.
- Reportes/exportación (CSV/Excel/PDF).
- Motivo de rechazo de inscripción, lista de espera, historial de decisiones.
- Reprogramación con historial de cambios de partido.

---

## 5. Reglas transversales (sección 13 de la especificación)

| Regla | Estado |
|---|---|
| Clasificación automática desde resultados oficiales | Implementado (calculada, no persistida). |
| Estadísticas confiables derivadas de eventos | Implementado (goleo, asistencias, disciplina y por equipo desde eventos `valid`). |
| Distinguir cero de dato desconocido | Pendiente. |
| Control de modificaciones (quién/cuándo/por qué) | Parcial (modelo `AuditLog` creado; sin escritura/consulta). |
| Permisos por función validados en servidor | Implementado (servicios + guards). |
| Pruebas automatizadas (unit de servicios API) | Implementado (Vitest con Prisma mockeado, sin DB: 46 tests en 6 suites — accesos a torneo, registro/plantilla/consentimiento, resultados, eventos, noticias, invitaciones). |
| Integridad del calendario (sin duplicados) | Parcial (FKs compuestas; sin validación de choques). |
| Experiencia móvil de captura | Pendiente. |

---

## 6. Orden de implementación propuesto (MVP, sección 14)

1. **Fase 0 — Habilitadores API** ✅ (esta iteración): `myRole` en organizaciones, `canManage`/`myOrgRole` en torneos, `maxTeams` + validación de cupo, ampliación de `MatchEvent`.
2. **Estadísticas MVP (API)**: goleo, asistencias, tarjetas/disciplina y faltas, más `Forma` en clasificación.
3. **Panel de gestión web**: hub `/panel`, inscripciones (aprobar/rechazar con motivo y cupo), resultados/validación.
4. **Calendario y partidos (panel)**: fases/jornadas/partidos y captura de eventos.
5. **Equipos/jugadores/roster** y perfiles públicos (equipo/jugador).
6. **Noticias (UI)** y **organización/miembros/sedes**.
7. **Crear/configurar torneo** (formulario) — **en progreso**: `POST /tournaments` con organización personal + formulario web `/panel/torneos/nuevo`; **invitaciones por enlace/QR** (API + UI + `/join/:token`), **registro de equipo desde la invitación** y **editor de fotografías de jugador** (subida/portada/miniatura + servido). Pendiente: wizard por pasos.
8. Transversales posteriores: auditoría, notificaciones, OAuth/correo, global admin, reportes, generador automático.

Cada fase se cierra con verificación (typecheck/lint/build + prueba funcional) antes de continuar.
