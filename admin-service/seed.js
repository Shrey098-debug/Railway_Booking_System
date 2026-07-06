/**
 * Seeds the admin database with stations, trains (+ seats), routes, and
 * schedules for the date window defined in shared/seed/catalog.js.
 *
 * Run:  cd admin-service && node seed.js
 *
 * Safe to re-run — it clears the existing catalog first.
 */
require('dotenv').config();
const prisma = require('./src/config/prisma');
const { STATIONS, TRAINS, stationId, buildSchedules, SEED_START, SEED_END } = require('../shared/seed/catalog');

async function main() {
  console.log('Clearing existing admin catalog...');
  await prisma.schedule.deleteMany({});
  await prisma.routeStation.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.train.deleteMany({});
  await prisma.station.deleteMany({});

  console.log(`Seeding ${STATIONS.length} stations...`);
  await prisma.station.createMany({
    data: STATIONS.map((s) => ({
      id: stationId(s.code),
      name: s.name,
      code: s.code,
      city: s.city,
      state: s.state,
    })),
  });

  console.log(`Seeding ${TRAINS.length} trains (with seats + routes)...`);
  for (const t of TRAINS) {
    await prisma.train.create({
      data: {
        id: t.id,
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        coachName: t.coachName,
        totalSeats: t.totalSeats,
        seats: {
          create: t.seats.map((s) => ({
            id: s.id,
            seatNumber: s.seatNumber,
            seatType: s.seatType,
            price: s.price,
          })),
        },
        route: {
          create: {
            id: `route_${t.trainNumber}`,
            routeStations: {
              create: t.routeStations.map((rs) => ({
                id: rs.id,
                stationId: rs.stationId,
                sequenceNumber: rs.sequenceNumber,
                arrivalTime: rs.arrivalTime,
                departureTime: rs.departureTime,
                distanceFromOrigin: rs.distanceFromOrigin,
              })),
            },
          },
        },
      },
    });
  }

  console.log(`Seeding schedules (${SEED_START} → ${SEED_END})...`);
  const scheduleData = buildSchedules().map((s) => ({
    id: s.scheduleId,
    trainId: s.trainId,
    departureDate: new Date(s.departureDate),
    status: 'ACTIVE',
  }));

  for (let i = 0; i < scheduleData.length; i += 5000) {
    await prisma.schedule.createMany({ data: scheduleData.slice(i, i + 5000) });
    console.log(`  ...${Math.min(i + 5000, scheduleData.length)}/${scheduleData.length} schedules`);
  }

  console.log(`\n✅ Admin seed complete: ${STATIONS.length} stations, ${TRAINS.length} trains, ${scheduleData.length} schedules.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Admin seed failed:', e);
    process.exit(1);
  });