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

- **Estadísticas derivadas** (goleo, asistencias, tarjetas, faltas, porteros, por equipo): sin endpoints ni UI.
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
| 2A | Detalle · Resumen | Parcial | Hero, formato, estado, conteos, seguir. Faltan: próximos partidos, últimos resultados, top goleadores, adelanto de reglamento. |
| 2B | Detalle · Equipos | Pendiente | Sin pestaña de equipos participantes. |
| 2C | Detalle · Calendario | Parcial | Lista de partidos (Web/Móvil). Faltan filtros, vista calendario y compartir. |
| 2D | Detalle · Resultados | Parcial | Incluidos en calendario; sin vista dedicada ni estado de validación visible. |
| 2E | Detalle · Clasificación | Parcial | Tabla calculada (Pos, PJ, PG, PE, PP, GF, GC, DG, PTS). Faltan columnas **Forma** y juego limpio; desempates configurables; filtro por grupo. |
| 2F | Detalle · Estadísticas | Pendiente | Sin endpoints ni UI de goleo/asistencias/tarjetas/faltas/porteros. |
| 2G | Detalle · Noticias | Pendiente | API de noticias completa; sin UI pública. |
| 2H | Detalle · Reglamento | Pendiente | `Tournament.rules` (JSON) existe; sin UI ni versionado. |
| 3 | Detalle de partido | Pendiente | API de partidos/eventos existe; sin pantalla pública de partido. |
| 4 | Perfil de equipo | Pendiente | API de equipos/inscripciones/roster existe; sin perfil público. |
| 5 | Perfil de jugador | Pendiente | API `Player` existe; sin perfil ni privacidad. |
| 6 | Estadísticas generales | Pendiente | Sin métricas agregadas ni gráficos. |
| 7 | Registro e inicio de sesión | Parcial | Email/contraseña reales (Web + Móvil). Faltan: verificación de correo, OAuth Google/Apple, recuperación de contraseña, términos. |
| 8 | Perfil y configuración | Parcial | Móvil muestra perfil + cerrar sesión. Faltan: editar datos, foto, cambiar contraseña, preferencias de notificación, privacidad, eliminar cuenta; Web sin página de perfil. |
| 9 | Mis torneos (Organizo/Participo/Sigo) | Parcial | Web/Móvil listan; **no separan** las 3 categorías. API ya expone `canManage`/`myOrgRole` para clasificar "Organizo". |
| 10 | Centro de notificaciones | Pendiente | Modelo `Notification` sin módulo/endpoints. |
| 11 | Gestión de equipos | Parcial | API equipos (CRUD, `/teams/me`) Implementada; sin UI. |
| 12 | Plantilla y jugadores | Parcial | API jugadores + roster (CRUD) Implementada; sin UI; sin reglas de duplicidad entre torneos. |
| 13 | Inscripciones a torneos | Parcial | API aplicar/listar/aprobar/rechazar/retirar Implementada; sin UI; sin motivo de rechazo, documentos ni estados borrador/en revisión. |
| 14 | Dashboard administrativo | Pendiente | Sin panel. |
| 15 | Crear/configurar torneo | Parcial | API crear/editar Implementada (ahora con `maxTeams`); sin UI ni pasos. Faltan campos: país/ciudad estructurados, criterios de desempate, duración, sustituciones, fechas bloqueadas. |
| 16 | Gestión de inscripciones | Parcial | API Implementada (con validación de cupo); sin UI; sin export ni historial de decisiones. |
| 17 | Equipos y elegibilidad | Parcial | API listar/aprobar/rechazar Implementada; sin UI; sin suspensión/duplicados/bloqueo por fecha límite. |
| 18 | Generador/editor de calendario | Pendiente | Creación manual de fases/jornadas/partidos existe en API; **generación automática** y disponibilidad de sedes no. |
| 19 | Administración de partidos | Parcial | API CRUD partidos + resultado/validar/limpiar + eventos Implementada; sin UI. Sin alineaciones ni marcado "listo". |
| 20 | Captura de eventos | Parcial | API de eventos (gol, autogol, penal, tarjetas, sustitución, asistencia, **falta**, atajada, jugador secundario) Implementada; sin UI ni modo en vivo. |
| 21 | Tabla de goleo | Pendiente | Sin endpoint/UI (derivable de eventos). |
| 22 | Tabla de asistencias | Pendiente | Sin endpoint/UI (derivable de eventos `assist`). |
| 23 | Tarjetas y disciplina | Pendiente | Sin endpoint/UI (acumulaciones configurables por torneo: no). |
| 24 | Tabla de faltas | Pendiente | Evento `foul` ya soportado en schema/DTO; sin cálculo ni UI. |
| 25 | Estadísticas de porteros | Pendiente | Requiere alineaciones/minutos; no implementado. |
| 26 | Estadísticas por equipo | Pendiente | Sin endpoint/UI. |
| 27 | Estadísticas generales y gráficos | Pendiente | Sin endpoint/UI. |
| 28 | Resultados pendientes de validación | Parcial | API `pending_validation` → validar/limpiar Implementada; sin UI; sin motivo de devolución ni reapertura auditada. |
| 29 | Reportes y exportaciones | Pendiente | Sin generación/descarga (CSV/Excel/PDF). |
| 30 | Administración de noticias | Parcial | API CRUD/publicar/despublicar Implementada; sin UI; sin programación ni imagen destacada. |
| 31 | Centro de comunicaciones | Pendiente | Sin endpoints de envío ni seguimiento de entrega. |
| 32 | Perfil de organización | Parcial | API org (ver/editar) Implementada; sin UI. |
| 33 | Miembros y permisos | Parcial | API miembros CRUD Implementada (protección último owner); sin UI. |
| 34 | Sedes y campos | Parcial | API venue CRUD Implementada; sin UI; sin disponibilidad/bloqueos/campos múltiples. |
| 35 | Dashboard global | Pendiente | Sin rol de administrador global. |
| 36 | Gestión de usuarios (global) | Pendiente | Sin endpoints/servicio global. |
| 37 | Gestión de organizaciones (global) | Pendiente | Sin endpoints/servicio global. |
| 38 | Configuración general | Pendiente | Sin modelo de configuración. |
| 39 | Auditoría y seguridad | Pendiente | Sin modelo `AuditLog` ni endpoints. |

**Conteo (aprox.):** Implementado 0 pantallas completas · Parcial 18 · Pendiente 21.
La mayoría "Parcial" lo es por falta de UI (el backend ya existe).

---

## 3. Matriz de modelos de datos

| Modelo | Estado | Notas |
|---|---|---|
| `User` | Implementado | Sin rol de plataforma (falta admin global). |
| `AuthIdentity` | Implementado | Listo para OAuth; sin proveedores conectados. |
| `Organization` | Implementado | — |
| `OrganizationMember` | Implementado | Roles owner/admin/editor; estados de membresía. |
| `Tournament` | Implementado | **+`maxTeams`** añadido en esta iteración. |
| `TournamentMember` | Implementado | manager/scorekeeper/viewer. |
| `TournamentFollow` | Implementado | — |
| `Team` | Implementado | — |
| `Player` | Implementado | Sin documentos ni privacidad. |
| `TournamentTeam` (inscripción) | Parcial | Estados pending/approved/rejected; faltan borrador/en revisión/lista de espera y motivo de rechazo. |
| `TeamRoster` | Implementado | Elegibilidad por reglas del torneo: falta. |
| `Phase` | Implementado | — |
| `CompetitionGroup` | Parcial | Modelo existe, **sin endpoints** de grupos. |
| `Matchday` | Implementado | — |
| `Venue` | Parcial | Sin disponibilidad/bloqueos; `latitude/longitude` sin uso. |
| `Match` | Implementado | FKs compuestas garantizan integridad torneo/fase/equipos. |
| `MatchEvent` | Implementado | **+`secondaryTeamRosterId`** (falta recibida, sustitución, etc.); `eventType` extensible. |
| `NewsPost` | Implementado | Sin imagen destacada ni programación. |
| `Notification` | Parcial | Modelo existe, sin módulo. |
| `AuditLog` | Pendiente | No existe. |

Regla "distinguir cero de desconocido": **pendiente** (requiere que las estadísticas declaren qué eventos
se capturaron; hoy solo hay clasificación, que no aplica).

---

## 4. Endpoints existentes (API `api/v1`)

- **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- **Health**: `GET /health`.
- **Organizaciones**: `POST/GET /organizations`, `GET/PATCH /organizations/:id`, `GET/POST /organizations/:id/members`, `PATCH/DELETE /organizations/:id/members/:userId`.
- **Torneos**: `GET /tournaments`, `GET /tournaments/me/tournaments`, `GET /tournaments/:id`, `POST/DELETE /tournaments/:id/follow`, `GET/POST/PATCH/DELETE /tournaments/:id/members`, `POST /organizations/:organizationId/tournaments`, `PATCH/DELETE /organizations/:organizationId/tournaments/:tournamentId`.
- **Inscripciones**: `GET/POST /tournaments/:id/entries`, `POST .../entries/:entryId/approve`, `.../reject`, `DELETE .../entries/:entryId`.
- **Roster**: `GET/POST /tournaments/:id/entries/:entryId/roster`, `PATCH/DELETE .../roster/:rosterId`.
- **Equipos**: `GET /teams`, `GET /teams/me`, `POST /teams`, `GET/PATCH/DELETE /teams/:id`.
- **Jugadores**: `GET/POST /players`, `GET/PATCH/DELETE /players/:id`.
- **Sedes**: `GET/POST /organizations/:organizationId/venues`, `GET/PATCH/DELETE .../venues/:venueId`.
- **Calendario**: `GET/POST/PATCH/DELETE /tournaments/:id/phases`, `.../phases/:phaseId/matchdays`.
- **Partidos**: `GET/POST /tournaments/:id/matches`, `GET/PATCH/DELETE .../matches/:matchId`, `POST .../result`, `.../result/validate`, `.../result/clear`.
- **Eventos**: `GET/POST /tournaments/:id/matches/:matchId/events`, `PATCH/DELETE .../events/:eventId`.
- **Clasificación**: `GET /tournaments/:id/standings`.
- **Noticias**: `GET/POST /tournaments/:id/news`, `GET/PATCH/DELETE .../news/:slug|:postId`, `POST .../news/:postId/publish`, `.../unpublish`.

### Endpoints faltantes para la especificación

- Estadísticas: `/tournaments/:id/stats/scorers|assists|cards|fouls|goalkeepers|teams|overview`.
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
| Estadísticas confiables derivadas de eventos | Pendiente. |
| Distinguir cero de dato desconocido | Pendiente. |
| Control de modificaciones (quién/cuándo/por qué) | Pendiente (sin auditoría). |
| Permisos por función validados en servidor | Implementado (servicios + guards). |
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
7. **Crear/configurar torneo** (formulario por pasos).
8. Transversales posteriores: auditoría, notificaciones, OAuth/correo, global admin, reportes, generador automático.

Cada fase se cierra con verificación (typecheck/lint/build + prueba funcional) antes de continuar.
