/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const toDate = (value) => (value ? new Date(value) : null);

// --- Utilidades ------------------------------------------------------------

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// PRNG determinista para que el seed sea reproducible.
function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261012);
const rint = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const FIRST_NAMES = [
  'Luis', 'Carlos', 'Miguel', 'Jorge', 'Diego', 'Fernando', 'Ricardo', 'Andrés',
  'Raúl', 'Sergio', 'Emiliano', 'Julián', 'Alejandro', 'Manuel', 'Iván', 'Oscar',
  'Hugo', 'Mateo', 'Gerardo', 'Bruno', 'Rodrigo', 'Fabián', 'Cristian', 'Erick',
  'Ángel', 'Kevin', 'Omar', 'Edgar', 'Gael', 'Santiago', 'Damián', 'Leonardo',
];
const LAST_NAMES = [
  'García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Vargas', 'Rivera', 'Morales',
  'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Castillo', 'Mendoza', 'Ibarra',
  'Cervantes', 'Aguilar', 'Domínguez', 'Salazar', 'Rojas', 'Tapia', 'Núñez',
  'Cabrera', 'Espinoza', 'Lara', 'Bautista',
];

const POSITIONS = [
  { key: 'GK', label: 'Portero', count: 2 },
  { key: 'DF', label: 'Defensa', count: 5 },
  { key: 'MF', label: 'Mediocampista', count: 5 },
  { key: 'FW', label: 'Delantero', count: 4 },
];

const ROUND_ROBIN = (teams) => {
  const order = [...teams];
  const rounds = [];
  const half = order.length / 2;
  for (let r = 0; r < order.length - 1; r += 1) {
    const round = [];
    for (let i = 0; i < half; i += 1) {
      const a = order[i];
      const b = order[order.length - 1 - i];
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    order.splice(1, 0, order.pop());
  }
  return rounds;
};

// --- Reset -----------------------------------------------------------------

async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
      notifications, match_events, matches, competition_groups, matchdays,
      phases, team_rosters, tournament_teams, players, teams,
      tournament_follows, tournament_members, news_posts, venues,
      tournaments, organization_members, organizations, auth_identities, users
     RESTART IDENTITY CASCADE;`,
  );
  console.log('Base de datos reiniciada.');
}

// --- Datos -----------------------------------------------------------------

const TEAM_NAMES = [
  'Leones del Norte', 'Club Atlas Junior', 'Real Águilas', 'Furia Verde',
  'Deportivo Azteca', 'Tigres del Valle', 'Toros Neza FC', 'Halcones Dorados',
  'Pumas del Sur', 'Rayos de Occidente', 'Lobos Marinos', 'Cóndores FC',
  'Jaguares Negros', 'Guerreros del Golfo', 'Cimarrones Bravos', 'Panteras Rosas',
  'Dragones de Oriente', 'Centauros de Plata',
];

async function createTeamSquad(team, adminId) {
  const usedNames = new Set();
  const players = [];
  let sequence = 0;
  for (const group of POSITIONS) {
    for (let i = 0; i < group.count; i += 1) {
      let displayName = '';
      do {
        displayName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      } while (usedNames.has(displayName));
      usedNames.add(displayName);
      sequence += 1;
      players.push({
        displayName,
        dateOfBirth: new Date(Date.UTC(rint(1986, 2004), rint(0, 11), rint(1, 28))),
        photoUrl: `https://i.pravatar.cc/150?img=${((sequence * 7 + team.length) % 70) + 1}`,
        preferredPosition: group.label,
        createdBy: adminId,
        position: group.label,
        jerseyNumber: sequence,
      });
    }
  }
  return players;
}

async function main() {
  const demoPassword = await bcrypt.hash('demo1234', 12);
  const organizerPassword = await bcrypt.hash('organiza12', 12);
  const adminPassword = await bcrypt.hash('equipo1234', 12);

  await resetDatabase();

  // --- Usuarios base -------------------------------------------------------
  await prisma.user.createMany({
    data: [
      { email: 'demo@cancha.mx', displayName: 'Demo Cancha', passwordHash: demoPassword },
      { email: 'organizador@liga.mx', displayName: 'Organizadora Liga', passwordHash: organizerPassword },
    ],
  });
  const demo = await prisma.user.findUnique({ where: { email: 'demo@cancha.mx' } });
  const organizer = await prisma.user.findUnique({ where: { email: 'organizador@liga.mx' } });

  // --- Organización --------------------------------------------------------
  const org = await prisma.organization.create({
    data: {
      name: 'Liga Metropolitana',
      slug: 'liga-metropolitana',
      description: 'La liga de la ciudad con torneos durante todo el año.',
      contactEmail: 'contacto@ligametro.example',
      createdBy: organizer.id,
    },
  });
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: organizer.id, role: 'owner', status: 'active' },
  });
  await prisma.organizationMember.create({
    data: { organizationId: org.id, userId: demo.id, role: 'editor', status: 'active' },
  });

  // --- Torneo --------------------------------------------------------------
  const tournament = await prisma.tournament.create({
    data: {
      organizationId: org.id,
      name: 'Liga Metropolitana',
      slug: 'liga-metropolitana-2026',
      description:
        'Temporada 2026 de fútbol 11 con 18 clubes de la ciudad. Formato de liga a una vuelta.',
      format: 'football_11',
      visibility: 'public',
      status: 'in_progress',
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      maxTeams: 18,
      startDate: toDate('2026-09-06'),
      endDate: toDate('2027-02-14'),
      registrationOpenAt: toDate('2026-07-01T09:00:00Z'),
      registrationCloseAt: toDate('2026-08-31T23:59:00Z'),
    },
  });
  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: organizer.id, role: 'manager', status: 'active' },
  });
  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: demo.id, role: 'viewer', status: 'active' },
  });
  await prisma.tournamentFollow.create({
    data: { tournamentId: tournament.id, userId: demo.id },
  });

  const venue = await prisma.venue.create({
    data: {
      organizationId: org.id,
      name: 'Complejo Cancha Norte',
      address: 'Av. del Deporte 1200, Ciudad Norte',
      timezone: 'America/Mexico_City',
    },
  });

  // --- Admins de equipo, equipos, jugadores, convocatorias -----------------
  const teamRecords = [];
  for (let i = 0; i < TEAM_NAMES.length; i += 1) {
    const name = TEAM_NAMES[i];
    const number = String(i + 1).padStart(2, '0');
    const admin = await prisma.user.create({
      data: {
        email: `club${number}@liga.mx`,
        displayName: `Admin ${name}`,
        passwordHash: adminPassword,
      },
    });
    const team = await prisma.team.create({
      data: {
        name,
        slug: slugify(name),
        description: `Club ${name} — temporada 2026.`,
        createdBy: admin.id,
      },
    });
    const entry = await prisma.tournamentTeam.create({
      data: {
        tournamentId: tournament.id,
        teamId: team.id,
        registrationStatus: 'approved',
        requestedBy: admin.id,
        approvedBy: organizer.id,
        approvedAt: new Date(),
      },
    });
    const squad = await createTeamSquad({ name, length: name.length }, admin.id);
    await prisma.player.createMany({
      data: squad.map((player) => ({
        displayName: player.displayName,
        dateOfBirth: player.dateOfBirth,
        photoUrl: player.photoUrl,
        preferredPosition: player.preferredPosition,
        createdBy: player.createdBy,
      })),
    });
    const createdPlayers = await prisma.player.findMany({
      where: { createdBy: admin.id },
      orderBy: { displayName: 'asc' },
    });
    // Reordena el roster según la posición planificada (GK, DF, MF, FW).
    const byName = new Map(createdPlayers.map((player) => [player.displayName, player]));
    await prisma.teamRoster.createMany({
      data: squad.map((player) => ({
        tournamentTeamId: entry.id,
        playerId: byName.get(player.displayName).id,
        jerseyNumber: player.jerseyNumber,
        position: player.position,
        status: 'active',
      })),
    });
    teamRecords.push({ team, admin, entry, squad });
  }
  console.log(`18 equipos con ${teamRecords.length * 16} jugadores y convocatorias creados.`);

  // --- Fase, jornadas y calendario -----------------------------------------
  const phase = await prisma.phase.create({
    data: {
      tournamentId: tournament.id,
      name: 'Fase Regular',
      phaseType: 'league',
      sequence: 1,
      status: 'active',
      startDate: toDate('2026-09-06'),
      endDate: toDate('2027-02-14'),
    },
  });

  const rounds = ROUND_ROBIN(teamRecords).slice(0, 10);
  const start = new Date(Date.UTC(2026, 8, 6));

  // Precarga de rostros por entry para elegir goleadores.
  const rostersByEntry = new Map();
  for (const record of teamRecords) {
    const rows = await prisma.teamRoster.findMany({
      where: { tournamentTeamId: record.entry.id },
      select: { id: true, jerseyNumber: true, position: true },
    });
    const grouped = { GK: [], DF: [], MF: [], FW: [], all: rows };
    for (const row of rows) {
      if (row.position === 'Portero') grouped.GK.push(row);
      else if (row.position === 'Defensa') grouped.DF.push(row);
      else if (row.position === 'Mediocampista') grouped.MF.push(row);
      else grouped.FW.push(row);
    }
    rostersByEntry.set(record.entry.id, grouped);
  }

  const pickFrom = (list) => list[numberIndex(list.length)];
  function numberIndex(length) {
    return Math.floor(rand() * length);
  }
  const scorer = (squad) => {
    const r = rand();
    if (r < 0.6 && squad.FW.length) return pickFrom(squad.FW);
    if (r < 0.85 && squad.MF.length) return pickFrom(squad.MF);
    if (r < 0.97 && squad.DF.length) return pickFrom(squad.DF);
    return pickFrom(squad.GK.length ? squad.GK : squad.all);
  };
  const assister = (squad, excludeId) => {
    const pool = [...squad.MF, ...squad.FW, ...squad.DF].filter((row) => row.id !== excludeId);
    return pool.length ? pickFrom(pool) : null;
  };

  const dryMatchDays = 9;
  let matchesCreated = 0;
  let eventsCreated = 0;
  let finishedCount = 0;
  let totalGoals = 0;

  for (let j = 0; j < rounds.length; j += 1) {
    const scheduledDate = new Date(start.getTime() + j * 7 * 86400000);
    const matchday = await prisma.matchday.create({
      data: {
        phaseId: phase.id,
        name: `Jornada ${j + 1}`,
        sequence: j + 1,
        scheduledDate,
      },
    });
    const round = rounds[j];
    for (let m = 0; m < round.length; m += 1) {
      const [home, away] = round[m];
      const kickoff = new Date(scheduledDate.getTime() + (m % 2 === 0 ? 15 : 17) * 3600000);
      const isFinished = j < dryMatchDays || m < 3;

      const homeSquad = rostersByEntry.get(home.entry.id);
      const awaySquad = rostersByEntry.get(away.entry.id);

      let homeScore = null;
      let awayScore = null;
      const events = [];
      if (isFinished) {
        const goalCount = () => {
          const r = rand();
          if (r < 0.2) return 0;
          if (r < 0.5) return 1;
          if (r < 0.78) return 2;
          if (r < 0.92) return 3;
          if (r < 0.98) return 4;
          return 5;
        };
        homeScore = goalCount() + (chance(0.18) ? 1 : 0);
        awayScore = goalCount();
        finishedCount += 1;
        totalGoals += homeScore + awayScore;

        const base = { recordedBy: organizer.id, status: 'valid' };
        const addGoals = (squad, rivalSquad, goals) => {
          for (let g = 0; g < goals; g += 1) {
            const minute = rint(1, 90);
            if (chance(0.03)) {
              const offender = pickFrom(rivalSquad.all);
              events.push({ ...base, eventType: 'own_goal', teamRosterId: offender.id, minute });
            } else if (chance(0.08)) {
              const player = scorer(squad);
              events.push({ ...base, eventType: 'penalty_goal', teamRosterId: player.id, minute });
            } else {
              const player = scorer(squad);
              const assist = chance(0.66) ? assister(squad, player.id) : null;
              events.push({
                ...base,
                eventType: 'goal',
                teamRosterId: player.id,
                secondaryTeamRosterId: assist ? assist.id : null,
                minute,
              });
            }
          }
        };
        addGoals(homeSquad, awaySquad, homeScore);
        addGoals(awaySquad, homeSquad, awayScore);

        // Faltas (infractor → víctima rival).
        for (const [offenderSquad, victimSquad] of [
          [homeSquad, awaySquad],
          [awaySquad, homeSquad],
        ]) {
          const fouls = rint(4, 12);
          for (let f = 0; f < fouls; f += 1) {
            events.push({
              ...base,
              eventType: 'foul',
              teamRosterId: pickFrom(offenderSquad.all).id,
              secondaryTeamRosterId: pickFrom(victimSquad.all).id,
              minute: rint(1, 90),
            });
          }
        }

        // Tarjetas.
        for (const squad of [homeSquad, awaySquad]) {
          const yellows = rint(0, 3);
          for (let y = 0; y < yellows; y += 1) {
            const player = pickFrom(squad.all);
            events.push({
              ...base,
              eventType: chance(0.12) ? 'second_yellow' : 'yellow_card',
              teamRosterId: player.id,
              minute: rint(1, 90),
            });
          }
          if (chance(0.18)) {
            events.push({
              ...base,
              eventType: 'red_card',
              teamRosterId: pickFrom(squad.all).id,
              minute: rint(1, 90),
            });
          }
        }

        // Atajadas de los porteros.
        for (const squad of [homeSquad, awaySquad]) {
          const keeper = pickFrom(squad.GK.length ? squad.GK : squad.all);
          const saves = rint(1, 6);
          for (let s = 0; s < saves; s += 1) {
            events.push({
              ...base,
              eventType: chance(0.1) ? 'penalty_saved' : 'save',
              teamRosterId: keeper.id,
              minute: rint(1, 90),
            });
          }
        }
      }

      await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          phaseId: phase.id,
          matchdayId: matchday.id,
          homeTournamentTeamId: home.entry.id,
          awayTournamentTeamId: away.entry.id,
          venueId: venue.id,
          scheduledAt: kickoff,
          status: isFinished ? 'finished' : 'scheduled',
          homeScore,
          awayScore,
          recordedBy: isFinished ? organizer.id : null,
          validatedBy: isFinished ? organizer.id : null,
          validatedAt: isFinished ? kickoff : null,
          resultVersion: isFinished ? 1 : 0,
          events: events.length ? { create: events } : undefined,
        },
      });
      matchesCreated += 1;
      eventsCreated += events.length;
    }
  }

  console.log(`Torneo "Liga Metropolitana": 1 fase, ${rounds.length} jornadas.`);
  console.log(`  Partidos: ${matchesCreated} (${finishedCount} finalizados, ${matchesCreated - finishedCount} programados).`);
  console.log(`  Goles en marcadores: ${totalGoals}. Eventos registrados: ${eventsCreated}.`);
  console.log('Seed completado.');
  console.log('  Usuario demo:        demo@cancha.mx / demo1234');
  console.log('  Organizadora:        organizador@liga.mx / organiza12');
  console.log('  Admin de equipo:     club01@liga.mx … club18@liga.mx / equipo1234');
}

main()
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
