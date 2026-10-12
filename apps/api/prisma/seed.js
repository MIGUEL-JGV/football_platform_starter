/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const toDate = (value) => (value ? new Date(value) : null);

async function main() {
  const demoPassword = await bcrypt.hash('demo1234', 12);
  const organizerPassword = await bcrypt.hash('organiza12', 12);

  const demo = await prisma.user.upsert({
    where: { email: 'demo@cancha.mx' },
    update: { displayName: 'Demo Cancha' },
    create: { email: 'demo@cancha.mx', displayName: 'Demo Cancha', passwordHash: demoPassword },
  });
  const organizer = await prisma.user.upsert({
    where: { email: 'organizador@liga.mx' },
    update: { displayName: 'Organizadora Liga' },
    create: {
      email: 'organizador@liga.mx',
      displayName: 'Organizadora Liga',
      passwordHash: organizerPassword,
    },
  });

  const ligaMetro = await prisma.organization.upsert({
    where: { slug: 'liga-metropolitana' },
    update: {},
    create: {
      name: 'Liga Metropolitana',
      slug: 'liga-metropolitana',
      description: 'La liga de la ciudad con torneos durante todo el año.',
      contactEmail: 'contacto@ligametro.example',
      createdBy: organizer.id,
    },
  });
  const orgRelampago = await prisma.organization.upsert({
    where: { slug: 'copa-relampago' },
    update: {},
    create: {
      name: 'Copa Relámpago',
      slug: 'copa-relampago',
      description: 'Copas rápidas de fin de semana para equipos que quieren competir ya.',
      contactEmail: 'contacto@relampago.example',
      createdBy: organizer.id,
    },
  });

  for (const org of [ligaMetro, orgRelampago]) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: organizer.id } },
      update: { role: 'owner', status: 'active' },
      create: { organizationId: org.id, userId: organizer.id, role: 'owner' },
    });
  }
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: ligaMetro.id, userId: demo.id } },
    update: { role: 'editor', status: 'active' },
    create: { organizationId: ligaMetro.id, userId: demo.id, role: 'editor' },
  });

  const tournamentSeed = [
    {
      key: 'copa-metropolitana',
      name: 'Copa Metropolitana',
      org: ligaMetro,
      format: 'football_7',
      status: 'registration',
      description: 'Torneo de fútbol 7 para equipos de la ciudad. Cuota accesible y arbitraje incluido.',
      startDate: '2026-11-02',
      endDate: '2027-01-24',
      registrationOpenAt: '2026-10-01T09:00:00Z',
      registrationCloseAt: '2026-11-01T23:59:00Z',
    },
    {
      key: 'liga-regional-norte',
      name: 'Liga Regional Norte',
      org: ligaMetro,
      format: 'football_11',
      status: 'in_progress',
      description:
        'La liga de fútbol 11 más competitiva de la región, con equipos de todas las ciudades cercanas.',
      startDate: '2026-09-01',
      endDate: '2026-12-20',
    },
    {
      key: 'copa-relampago',
      name: 'Copa Relámpago',
      org: orgRelampago,
      format: 'football_5',
      status: 'upcoming',
      description: 'Mini copa de fútbol 5 que se juega en un fin de semana. Música, comida y mucha acción.',
      startDate: '2026-10-24',
      endDate: '2026-10-25',
      registrationOpenAt: '2026-09-15T09:00:00Z',
      registrationCloseAt: '2026-10-20T23:59:00Z',
    },
    {
      key: 'torneo-de-invierno',
      name: 'Torneo de Invierno',
      org: orgRelampago,
      format: 'football_11',
      status: 'registration',
      description: 'Torneo de invierno con fase de grupos y eliminatorias.',
      startDate: '2026-12-01',
      endDate: '2027-02-28',
      registrationOpenAt: '2026-10-05T09:00:00Z',
      registrationCloseAt: '2026-11-30T23:59:00Z',
    },
    {
      key: 'liga-sabatina',
      name: 'Liga Sabatina',
      org: ligaMetro,
      format: 'football_7',
      status: 'completed',
      description: 'Edición 2026 de la liga sabatina de fútbol 7. ¡Gracias a todos los equipos!',
      startDate: '2026-03-01',
      endDate: '2026-08-15',
    },
  ];

  const tournaments = {};
  for (const item of tournamentSeed) {
    const tournament = await prisma.tournament.upsert({
      where: { organizationId_slug: { organizationId: item.org.id, slug: item.key } },
      update: {
        name: item.name,
        description: item.description,
        format: item.format,
        status: item.status,
        startDate: toDate(item.startDate),
        endDate: toDate(item.endDate),
        registrationOpenAt: toDate(item.registrationOpenAt),
        registrationCloseAt: toDate(item.registrationCloseAt),
      },
      create: {
        organizationId: item.org.id,
        name: item.name,
        slug: item.key,
        description: item.description,
        format: item.format,
        visibility: 'public',
        status: item.status,
        startDate: toDate(item.startDate),
        endDate: toDate(item.endDate),
        registrationOpenAt: toDate(item.registrationOpenAt),
        registrationCloseAt: toDate(item.registrationCloseAt),
      },
    });
    tournaments[item.key] = tournament;
  }

  // Demo user follows a couple of tournaments.
  for (const key of ['copa-metropolitana', 'liga-regional-norte']) {
    await prisma.tournamentFollow.upsert({
      where: { tournamentId_userId: { tournamentId: tournaments[key].id, userId: demo.id } },
      update: {},
      create: { tournamentId: tournaments[key].id, userId: demo.id },
    });
  }
  await prisma.tournamentMember.upsert({
    where: {
      tournamentId_userId: { tournamentId: tournaments['copa-metropolitana'].id, userId: demo.id },
    },
    update: { role: 'viewer', status: 'active' },
    create: { tournamentId: tournaments['copa-metropolitana'].id, userId: demo.id, role: 'viewer' },
  });

  // Venue for the league organization.
  let venue = await prisma.venue.findFirst({
    where: { organizationId: ligaMetro.id, name: 'Complejo Cancha Norte' },
  });
  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        organizationId: ligaMetro.id,
        name: 'Complejo Cancha Norte',
        address: 'Av. del Deporte 1200, Ciudad Norte',
        timezone: 'America/Mexico_City',
      },
    });
  }

  // Teams + approved entries + schedule for "Liga Regional Norte".
  const league = tournaments['liga-regional-norte'];
  const teamSeed = [
    { name: 'Leones del Norte', slug: 'leones-del-norte' },
    { name: 'Club Atlas Junior', slug: 'club-atlas-junior' },
    { name: 'Real Águilas', slug: 'real-aguilas' },
    { name: 'Furia Verde', slug: 'furia-verde' },
  ];
  const teams = {};
  for (const item of teamSeed) {
    teams[item.slug] = await prisma.team.upsert({
      where: { slug: item.slug },
      update: { name: item.name },
      create: { name: item.name, slug: item.slug, createdBy: demo.id },
    });
  }

  const entries = {};
  for (const item of teamSeed) {
    const entry = await prisma.tournamentTeam.upsert({
      where: { tournamentId_teamId: { tournamentId: league.id, teamId: teams[item.slug].id } },
      update: { registrationStatus: 'approved', approvedBy: organizer.id, approvedAt: new Date() },
      create: {
        tournamentId: league.id,
        teamId: teams[item.slug].id,
        registrationStatus: 'approved',
        requestedBy: demo.id,
        approvedBy: organizer.id,
        approvedAt: new Date(),
      },
    });
    entries[item.slug] = entry;
  }

  const existingMatches = await prisma.match.count({ where: { tournamentId: league.id } });
  if (existingMatches === 0) {
    const phase = await prisma.phase.upsert({
      where: { tournamentId_sequence: { tournamentId: league.id, sequence: 1 } },
      update: {},
      create: {
        tournamentId: league.id,
        name: 'Fase Única',
        phaseType: 'league',
        sequence: 1,
        status: 'active',
        startDate: toDate('2026-09-01'),
        endDate: toDate('2026-12-20'),
      },
    });
    const matchday1 = await prisma.matchday.upsert({
      where: { phaseId_sequence: { phaseId: phase.id, sequence: 1 } },
      update: {},
      create: { phaseId: phase.id, name: 'Jornada 1', sequence: 1, scheduledDate: toDate('2026-09-06') },
    });
    const matchday2 = await prisma.matchday.upsert({
      where: { phaseId_sequence: { phaseId: phase.id, sequence: 2 } },
      update: {},
      create: { phaseId: phase.id, name: 'Jornada 2', sequence: 2, scheduledDate: toDate('2026-09-13') },
    });

    const matchSeed = [
      { home: 'leones-del-norte', away: 'club-atlas-junior', hs: 3, as: 2, day: matchday1, at: '2026-09-06T15:00:00Z' },
      { home: 'real-aguilas', away: 'furia-verde', hs: 1, as: 1, day: matchday1, at: '2026-09-06T17:00:00Z' },
      { home: 'leones-del-norte', away: 'real-aguilas', hs: 2, as: 0, day: matchday2, at: '2026-09-13T15:00:00Z' },
      { home: 'club-atlas-junior', away: 'furia-verde', hs: 0, as: 2, day: matchday2, at: '2026-09-13T17:00:00Z' },
      { home: 'leones-del-norte', away: 'furia-verde', hs: 1, as: 1, day: matchday2, at: '2026-09-20T15:00:00Z' },
      { home: 'club-atlas-junior', away: 'real-aguilas', hs: 0, as: 3, day: matchday2, at: '2026-09-20T17:00:00Z' },
    ];
    for (const m of matchSeed) {
      await prisma.match.create({
        data: {
          tournamentId: league.id,
          phaseId: phase.id,
          matchdayId: m.day.id,
          homeTournamentTeamId: entries[m.home].id,
          awayTournamentTeamId: entries[m.away].id,
          venueId: venue.id,
          scheduledAt: toDate(m.at),
          status: 'finished',
          homeScore: m.hs,
          awayScore: m.as,
          recordedBy: demo.id,
          validatedBy: organizer.id,
          validatedAt: toDate(m.at),
        },
      });
    }
    console.log('Liga Regional Norte: 1 fase, 2 jornadas y 6 partidos creados.');
  } else {
    console.log('Liga Regional Norte: ya tiene partidos, se omite el calendario.');
  }

  console.log('Seed completado.');
  console.log('  Usuario demo:    demo@cancha.mx / demo1234');
  console.log('  Organizadora:    organizador@liga.mx / organiza12');
}

main()
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
