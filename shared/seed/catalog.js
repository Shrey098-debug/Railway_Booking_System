/**
 * Deterministic seed catalog for RailBook.
 *
 * Both the admin-service seed and the inventory-service seed import this SAME
 * module, so the IDs they generate are identical across the two databases
 * (database-per-service — there are no cross-DB foreign keys, so the shared IDs
 * are what keep them consistent).
 *
 * Nothing here is random — running it twice always produces the same data.
 *
 * Scope: ~72 trains across 12 real Indian corridors, running every day for the
 * seeded date window. Seats are created per train; schedules + seat inventory
 * are generated per (train, date).
 */

// ── Date window (2 months) ────────────────────────────────────────────────────
const SEED_START = '2026-09-01';
const SEED_END = '2026-10-31';

// ── 40 stations ───────────────────────────────────────────────────────────────
const STATIONS = [
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
  { code: 'BCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
  { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', state: 'West Bengal' },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', state: 'Telangana' },
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana' },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra' },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar' },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj', state: 'Uttar Pradesh' },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh' },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam' },
  { code: 'TVC', name: 'Thiruvananthapuram Central', city: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'ERS', name: 'Ernakulam Junction', city: 'Kochi', state: 'Kerala' },
  { code: 'CBE', name: 'Coimbatore Junction', city: 'Coimbatore', state: 'Tamil Nadu' },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu & Kashmir' },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab' },
  { code: 'CDG', name: 'Chandigarh', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'DDN', name: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
  { code: 'INDB', name: 'Indore Junction', city: 'Indore', state: 'Madhya Pradesh' },
  { code: 'RJT', name: 'Rajkot Junction', city: 'Rajkot', state: 'Gujarat' },
  { code: 'BRC', name: 'Vadodara Junction', city: 'Vadodara', state: 'Gujarat' },
  { code: 'ST', name: 'Surat', city: 'Surat', state: 'Gujarat' },
  { code: 'JU', name: 'Jodhpur Junction', city: 'Jodhpur', state: 'Rajasthan' },
  { code: 'UDZ', name: 'Udaipur City', city: 'Udaipur', state: 'Rajasthan' },
  { code: 'GKP', name: 'Gorakhpur Junction', city: 'Gorakhpur', state: 'Uttar Pradesh' },
  { code: 'RNC', name: 'Ranchi Junction', city: 'Ranchi', state: 'Jharkhand' },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'VSKP', name: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'BZA', name: 'Vijayawada Junction', city: 'Vijayawada', state: 'Andhra Pradesh' },
  { code: 'MYS', name: 'Mysuru Junction', city: 'Mysuru', state: 'Karnataka' },
  { code: 'GWL', name: 'Gwalior Junction', city: 'Gwalior', state: 'Madhya Pradesh' },
];

const stationByCode = Object.fromEntries(STATIONS.map((s) => [s.code, s]));
const stationId = (code) => `st_${code.toLowerCase()}`;

// ── 12 corridors (ordered station codes) ──────────────────────────────────────
const CORRIDORS = [
  ['NDLS', 'JP', 'ADI', 'BRC', 'ST', 'BCT'],
  ['NDLS', 'CNB', 'PRYJ', 'BSB', 'PNBE', 'HWH'],
  ['NDLS', 'BPL', 'NGP', 'BZA', 'MAS'],
  ['NDLS', 'BPL', 'SC', 'SBC'],
  ['CSMT', 'PUNE', 'SBC', 'MYS'],
  ['BCT', 'BRC', 'ADI', 'JP', 'JU'],
  ['HWH', 'RNC', 'BBS', 'VSKP', 'BZA', 'MAS'],
  ['NDLS', 'CDG', 'ASR'],
  ['NDLS', 'LKO', 'GKP', 'GHY'],
  ['SBC', 'SC', 'NGP', 'BPL', 'GWL', 'NDLS'],
  ['ADI', 'INDB', 'BPL', 'NGP'],
  ['MAS', 'CBE', 'ERS', 'TVC'],
];

const NAME_BANK = ['Rajdhani', 'Duronto', 'Superfast', 'Humsafar', 'Sampark Kranti', 'Express'];
const BASE_HOURS = [6, 10, 14, 16, 20, 22]; // departure hour per train slot

// Seat layout: 18 seats per train, fixed pattern of types
const SEAT_PATTERN = ['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER', 'LOWER'];
const PRICE_BY_TYPE = { LOWER: 1500, MIDDLE: 1300, UPPER: 1100, SIDE_LOWER: 1250, SIDE_UPPER: 1050 };
const SEATS_PER_TRAIN = 18;

function pad(n) {
  return String(n).padStart(2, '0');
}

// minutes-of-day -> "HH:MM" (wraps past midnight for display only)
function fmtTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function buildSeats(trainNumber) {
  const seats = [];
  for (let i = 0; i < SEATS_PER_TRAIN; i++) {
    const seatType = SEAT_PATTERN[i % SEAT_PATTERN.length];
    seats.push({
      id: `seat_${trainNumber}_${i + 1}`,
      seatNumber: i + 1,
      seatType,
      price: PRICE_BY_TYPE[seatType],
    });
  }
  return seats;
}

function buildRouteStations(trainNumber, codes, baseHour) {
  return codes.map((code, k) => {
    const depMin = baseHour * 60 + k * 150; // 2.5h between stops
    return {
      id: `rs_${trainNumber}_${k + 1}`,
      stationCode: code,
      stationName: stationByCode[code].name,
      stationId: stationId(code),
      sequenceNumber: k + 1,
      arrivalTime: k === 0 ? null : fmtTime(depMin - 10),
      departureTime: k === codes.length - 1 ? null : fmtTime(depMin),
      distanceFromOrigin: k * 200,
    };
  });
}

// ── Build the 72 trains ───────────────────────────────────────────────────────
function buildTrains() {
  const trains = [];
  CORRIDORS.forEach((corridor, c) => {
    for (let j = 0; j < 6; j++) {
      const trainNumber = String(12000 + c * 10 + j);
      // Second half of each corridor's trains run the reverse direction.
      const codes = j < 3 ? corridor : [...corridor].reverse();
      const origin = stationByCode[codes[0]];
      const dest = stationByCode[codes[codes.length - 1]];
      const trainName = `${origin.city} - ${dest.city} ${NAME_BANK[j]}`;

      trains.push({
        id: `tr_${trainNumber}`,
        trainNumber,
        trainName,
        coachName: 'A1',
        totalSeats: SEATS_PER_TRAIN,
        seats: buildSeats(trainNumber),
        routeStations: buildRouteStations(trainNumber, codes, BASE_HOURS[j]),
      });
    }
  });
  return trains;
}

const TRAINS = buildTrains();

// ── Schedule window helper ────────────────────────────────────────────────────
// Returns one schedule descriptor per (train, date) in [SEED_START, SEED_END].
function buildSchedules() {
  const out = [];
  const start = new Date(`${SEED_START}T00:00:00Z`);
  const end = new Date(`${SEED_END}T00:00:00Z`);

  for (const train of TRAINS) {
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const tag = iso.replace(/-/g, '');
      out.push({
        scheduleId: `sch_${train.trainNumber}_${tag}`,
        trainId: train.id,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        departureDate: `${iso}T00:00:00Z`,
        train, // reference for inventory seed (seats + route)
      });
    }
  }
  return out;
}

module.exports = {
  SEED_START,
  SEED_END,
  STATIONS,
  TRAINS,
  stationId,
  buildSchedules,
};