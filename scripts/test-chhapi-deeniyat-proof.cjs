/**
 * Automated Verification Script: Minute-for-Minute Deeniyat & Kashkol Match
 * Tests Chhapi (24.034072, 72.401621) on November 20, 2026.
 */

const assert = require('assert');
const adhan = require('adhan');

const CHHAPI_LAT = 24.034072;
const CHHAPI_LON = 72.401621;
const TEST_DATE = new Date(2026, 10, 20); // 20 Nov 2026

console.log('--- Noor Connect Minute-for-Minute Deeniyat Proof ---');
console.log(`Coordinates: ${CHHAPI_LAT}, ${CHHAPI_LON} (Chhapi, Gujarat, India)`);
console.log(`Date: ${TEST_DATE.toDateString()}`);

const coords = new adhan.Coordinates(CHHAPI_LAT, CHHAPI_LON);

// 1. Primary Hanafi Calculation
const paramsHanafi = adhan.CalculationMethod.Karachi();
paramsHanafi.madhab = adhan.Madhab.Hanafi;
if (paramsHanafi.methodAdjustments) {
  paramsHanafi.methodAdjustments.dhuhr = 0;
}
const timesH = new adhan.PrayerTimes(coords, TEST_DATE, paramsHanafi);

// 2. Alternate Shafi'i Calculation (for Asr alternate)
const paramsShafi = adhan.CalculationMethod.Karachi();
paramsShafi.madhab = adhan.Madhab.Shafi;
if (paramsShafi.methodAdjustments) {
  paramsShafi.methodAdjustments.dhuhr = 0;
}
const timesS = new adhan.PrayerTimes(coords, TEST_DATE, paramsShafi);

// 3. Tomorrow times for night duration & Isha end
const tomorrow = new Date(TEST_DATE);
tomorrow.setDate(tomorrow.getDate() + 1);
const timesTomorrow = new adhan.PrayerTimes(coords, tomorrow, paramsHanafi);

// Helper for formatting
const fmt = (d) => {
  const r = new Date(Math.round(d.getTime() / 60000) * 60000);
  return r.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Computations
const fajr = fmt(timesH.fajr);
const sunrise = fmt(timesH.sunrise);
const rawDhuhr = timesH.dhuhr;
const zawaalDate = new Date(rawDhuhr.getTime() - 5 * 60000);
const zawaal = fmt(zawaalDate);
const dhuhr = fmt(rawDhuhr);
const asrHanafi = fmt(timesH.asr);
const asrShafi = fmt(timesS.asr);
const sunset = fmt(timesH.maghrib);
const maghribPlus3 = fmt(new Date(timesH.maghrib.getTime() + 3 * 60000));
const isha = fmt(timesH.isha);

const nightMs = timesTomorrow.fajr.getTime() - timesH.maghrib.getTime();
const tahajjudSixth = fmt(new Date(timesTomorrow.fajr.getTime() - Math.round(nightMs / 6)));
const tahajjudThird = fmt(new Date(timesTomorrow.fajr.getTime() - Math.round(nightMs / 3)));
const ishraaq = fmt(new Date(timesH.sunrise.getTime() + 20 * 60000));
const chaasht = fmt(new Date(timesH.sunrise.getTime() + Math.round((zawaalDate.getTime() - timesH.sunrise.getTime()) / 2)));
const khatmSehri = fmt(new Date(timesH.fajr.getTime() - 10 * 60000));

const results = [
  { name: 'Khatm Sehri', calculated: khatmSehri, expected: '05:30 AM' },
  { name: 'Fajr', calculated: fajr, expected: '05:40 AM' },
  { name: 'Sunrise (Tulu)', calculated: sunrise, expected: '06:59 AM' },
  { name: 'Ishraaq (Sunrise +20m)', calculated: ishraaq, expected: '07:19 AM' },
  { name: 'Chaasht / Duha', calculated: chaasht, expected: '09:40 AM' },
  { name: 'Zawaal (Solar Noon)', calculated: zawaal, expected: '12:21 PM' },
  { name: 'Dhuhr / Jummah (Zawaal +5m)', calculated: dhuhr, expected: '12:26 PM' },
  { name: 'Asr Shafi (1x Shadow)', calculated: asrShafi, expected: '03:32 PM' },
  { name: 'Asr Hanafi (2x Shadow)', calculated: asrHanafi, expected: '04:17 PM' },
  { name: 'Sunset (Ghurub / Asr Qaza)', calculated: sunset, expected: '05:53 PM' },
  { name: 'Maghrib / Iftaar (+3m)', calculated: maghribPlus3, expected: '05:56 PM' },
  { name: 'Isha', calculated: isha, expected: '07:12 PM' },
  { name: 'Tahajjud (Last 1/6th South Asia)', calculated: tahajjudSixth, expected: '03:42 AM' },
  { name: 'Tahajjud (Last 1/3rd Classical)', calculated: tahajjudThird, expected: '01:44 AM' },
];

let allPassed = true;
for (const item of results) {
  const pass = item.calculated === item.expected;
  if (!pass) allPassed = false;
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'} ${item.name.padEnd(35)}: ${item.calculated} (Expected: ${item.expected})`);
}

if (!allPassed) {
  console.error('\nERROR: Some prayer timings do not match Deeniyat expectations!');
  process.exit(1);
}

console.log('\nALL 14/14 DEENIYAT TIMINGS MATCH TO THE EXACT MINUTE (0-min variance)!');
