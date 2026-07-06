/**
 * Seeds the inventory database with per-schedule seat inventory + route stops,
 * matching the schedules created by admin-service/seed.js (same catalog, same IDs).
 *
 * Run AFTER the admin seed:  cd inventory-service && node seed.js
 *
 * Safe to re-run — it clears existing inventory first.
 */
require('dotenv').config();
const prisma = require('./src/config/prisma');
const { buildSchedules, SEED_START, SEED_END } = require('../shared/seed/catalog');

const CHUNK = 5000;

async function insertChunked(model, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await model.createMany({ data: rows.slice(i, i + CHUNK) });
  }
}

async function main() {
  console.log('Clearing existing inventory...');
  await prisma.seatInventory.deleteMany({});
  await prisma.seatSegmentLock.deleteMany({});
  await prisma.routeStop.deleteMany({});
  await prisma.scheduleInventory.deleteMany({});
  await prisma.idempotencyRecord.deleteMany({});

  console.log(`Building inventory rows (${SEED_START} → ${SEED_END})...`);
  const schedules = buildSchedules();

  const scheduleInv = [];
  const seatInv = [];
  const routeStops = [];

  for (const s of schedules) {
    const tag = s.departureDate.slice(0, 10).replace(/-/g, '');
    const schInvId = `schinv_${s.trainNumber}_${tag}`;
    const depDate = new Date(s.departureDate);

    scheduleInv.push({
      id: schInvId,
      scheduleId: s.scheduleId,
      trainId: s.trainId,
      trainNumber: s.trainNumber,
      trainName: s.trainName,
      departureDate: depDate,
      totalSeats: s.train.totalSeats,
      available: s.train.totalSeats,
      locked: 0,
      booked: 0,
      status: 'ACTIVE',
    });

    for (const seat of s.train.seats) {
      seatInv.push({
        id: `si_${s.trainNumber}_${tag}_${seat.seatNumber}`,
        scheduleInventoryId: schInvId,
        scheduleId: s.scheduleId,
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        price: seat.price,
        status: 'AVAILABLE',
      });
    }

    for (const rs of s.train.routeStations) {
      routeStops.push({
        id: `rst_${s.trainNumber}_${tag}_${rs.sequenceNumber}`,
        scheduleId: s.scheduleId,
        stationId: rs.stationId,
        stationName: rs.stationName,
        stationCode: rs.stationCode,
        sequenceNumber: rs.sequenceNumber,
      });
    }
  }

  console.log(`Inserting ${scheduleInv.length} schedule inventories...`);
  await insertChunked(prisma.scheduleInventory, scheduleInv);

  console.log(`Inserting ${routeStops.length} route stops...`);
  await insertChunked(prisma.routeStop, routeStops);

  console.log(`Inserting ${seatInv.length} seat inventory rows...`);
  await insertChunked(prisma.seatInventory, seatInv);

  console.log(`\n✅ Inventory seed complete: ${scheduleInv.length} schedules, ${seatInv.length} seats.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Inventory seed failed:', e);
    process.exit(1);
  });