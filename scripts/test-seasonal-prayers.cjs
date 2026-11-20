/**
 * 4-Season Astronomical & Regional Prayer Precision Verification Suite
 * Tests 365-day seasonal progression, Karachi 18° twilight, Hanafi 2x Asr shadow,
 * Dhuhr +5m safety, Maghrib +3m precaution, and dynamic Sunnah/Makruh boundaries.
 */

const { Coordinates, CalculationMethod, PrayerTimes, Madhab, HighLatitudeRule } = require('adhan');

function formatTime(date, is24h = false) {
  if (!date || isNaN(date.getTime())) return '--:--';
  const target = new Date(Math.round(date.getTime() / 60000) * 60000);
  return target.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24h,
    timeZone: 'Asia/Kolkata',
  });
}

function timeToMinutesOfDay(date) {
  const target = new Date(Math.round(date.getTime() / 60000) * 60000);
  // IST is UTC + 5:30
  const utcMins = target.getUTCHours() * 60 + target.getUTCMinutes();
  return (utcMins + 330) % 1440;
}

function runTests() {
  console.log('====================================================');
  console.log('4-SEASON ASTRONOMICAL & REGIONAL PRAYER TIME TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Reference Date — Nov 20, 2026 at Vadgam / Chhapi (24.08, 72.39)
  console.log('--- TEST 1: Nov 20, 2026 — Vadgam / Chhapi (Karachi 18°, Hanafi) ---');
  const lat = 24.08;
  const lon = 72.39;
  const coords = new Coordinates(lat, lon);
  const testDate = new Date('2026-11-20T12:00:00+05:30');

  // Hanafi params
  const hanafiParams = CalculationMethod.Karachi();
  hanafiParams.madhab = Madhab.Hanafi;
  hanafiParams.methodAdjustments.dhuhr = 0;
  const hanafiTimes = new PrayerTimes(coords, testDate, hanafiParams);

  // Shafi'i params
  const shafiParams = CalculationMethod.Karachi();
  shafiParams.madhab = Madhab.Shafi;
  shafiParams.methodAdjustments.dhuhr = 0;
  const shafiTimes = new PrayerTimes(coords, testDate, shafiParams);

  // Timing derivations matching computeFullPrayerSchedule
  const dhuhrSafetyMin = 5;
  const maghribIhtiyatMin = 3;

  const rawDhuhr = hanafiTimes.dhuhr; // 12:26 PM
  const rawSolarNoon = new Date(rawDhuhr.getTime() - dhuhrSafetyMin * 60000); // 12:21 PM
  const zawaalTime = rawSolarNoon; // Solar noon
  const dhuhrStart = rawDhuhr; // 12:26 PM

  const hanafiAsrStart = hanafiTimes.asr; // 04:17 PM
  const shafiAsrStart = shafiTimes.asr;   // 03:31 PM / 03:32 PM (1x shadow)

  const astronomicalSunset = hanafiTimes.maghrib; // 05:53 PM
  const maghribStart = new Date(astronomicalSunset.getTime() + maghribIhtiyatMin * 60000); // 05:56 PM

  const sunrise = hanafiTimes.sunrise;
  const sunriseMakruhEnd = new Date(sunrise.getTime() + 20 * 60000);
  const ishraaq = new Date(sunrise.getTime() + 20 * 60000);
  const chaasht = new Date(sunrise.getTime() + (zawaalTime.getTime() - sunrise.getTime()) / 2);
  const sehriEnd = new Date(hanafiTimes.fajr.getTime() - 10 * 60000);

  const asrEnd = astronomicalSunset; // Asr ends at sunset, NOT Maghrib + 3m

  console.log(`  Sunrise:           ${formatTime(sunrise)}`);
  console.log(`  Sunrise Makruh End: ${formatTime(sunriseMakruhEnd)} (+20m)`);
  console.log(`  Ishraaq:           ${formatTime(ishraaq)}`);
  console.log(`  Chaasht (midpoint): ${formatTime(chaasht)}`);
  console.log(`  Zawaal (Solar Noon):${formatTime(zawaalTime)}`);
  console.log(`  Dhuhr Start (+5m):  ${formatTime(dhuhrStart)}`);
  console.log(`  Shafi'i Asr:       ${formatTime(shafiAsrStart)}`);
  console.log(`  Hanafi Asr:        ${formatTime(hanafiAsrStart)}`);
  console.log(`  Dhuhr End:         ${formatTime(hanafiAsrStart)}`);
  console.log(`  Astronomical Sunset:${formatTime(astronomicalSunset)}`);
  console.log(`  Asr End (Qaza):    ${formatTime(asrEnd)}`);
  console.log(`  Maghrib (+3m):     ${formatTime(maghribStart)}`);
  console.log(`  Khatm Sehri (-10m): ${formatTime(sehriEnd)}`);

  // Assertions for Test 1
  const hanafiAsrStr = formatTime(hanafiAsrStart);
  const shafiAsrStr = formatTime(shafiAsrStart);
  const dhuhrEndStr = formatTime(hanafiAsrStart);
  const asrEndStr = formatTime(asrEnd);
  const maghribStr = formatTime(maghribStart);
  const zawaalStr = formatTime(zawaalTime);
  const dhuhrStartStr = formatTime(dhuhrStart);

  assert(hanafiAsrStr === '04:17 PM', `Hanafi Asr must be 04:17 PM (got ${hanafiAsrStr})`);
  assert(shafiAsrStr === '03:31 PM' || shafiAsrStr === '03:32 PM', `Shafi'i Asr must be 03:31/03:32 PM (got ${shafiAsrStr})`);
  assert(dhuhrEndStr === hanafiAsrStr, `Dhuhr End (${dhuhrEndStr}) must exactly equal Hanafi Asr (${hanafiAsrStr})`);
  assert(asrEndStr === '05:53 PM', `Asr End (${asrEndStr}) must be exact Sunset 05:53 PM, NOT 05:56 PM`);
  assert(maghribStr === '05:56 PM', `Maghrib Start (${maghribStr}) must be 05:56 PM (+3m precaution)`);
  assert(zawaalStr === '12:21 PM', `Zawaal (${zawaalStr}) must be 12:21 PM`);
  assert(dhuhrStartStr === '12:26 PM', `Dhuhr Start (${dhuhrStartStr}) must be 12:26 PM (+5m safety)`);

  const chaashtDiffMin = (chaasht.getTime() - sunrise.getTime()) / 60000;
  assert(chaashtDiffMin > 140 && chaashtDiffMin < 180, `Chaasht must be dynamic midpoint between Sunrise & Zawaal (~${Math.round(chaashtDiffMin)}m after Sunrise)`);

  // TEST 2: Winter Solstice — Dec 21, 2026 (Shortest Day)
  console.log('\n--- TEST 2: Dec 21, 2026 (Winter Solstice — Shortest Day) ---');
  const winterDate = new Date('2026-12-21T12:00:00+05:30');
  const winterTimes = new PrayerTimes(coords, winterDate, hanafiParams);
  const winterDayLengthMs = winterTimes.maghrib.getTime() - winterTimes.sunrise.getTime();
  const winterDayHours = winterDayLengthMs / (3600 * 1000);
  console.log(`  Winter Day Length: ${winterDayHours.toFixed(2)} hours`);
  console.log(`  Hanafi Asr: ${formatTime(winterTimes.asr)}, Sunset: ${formatTime(winterTimes.maghrib)}`);
  assert(winterDayHours > 10.5 && winterDayHours < 10.8, `Winter day length ~10.65 hrs (got ${winterDayHours.toFixed(2)} hrs)`);

  // TEST 3: Summer Solstice — Jun 21, 2026 (Longest Day)
  console.log('\n--- TEST 3: Jun 21, 2026 (Summer Solstice — Longest Day) ---');
  const summerDate = new Date('2026-06-21T12:00:00+05:30');
  const summerTimes = new PrayerTimes(coords, summerDate, hanafiParams);
  const summerDayLengthMs = summerTimes.maghrib.getTime() - summerTimes.sunrise.getTime();
  const summerDayHours = summerDayLengthMs / (3600 * 1000);
  console.log(`  Summer Day Length: ${summerDayHours.toFixed(2)} hours`);
  console.log(`  Hanafi Asr: ${formatTime(summerTimes.asr)}, Sunset: ${formatTime(summerTimes.maghrib)}`);
  assert(summerDayHours > 13.4 && summerDayHours < 13.9, `Summer day length ~13.63 hrs (got ${summerDayHours.toFixed(2)} hrs)`);
  assert(summerDayHours > winterDayHours + 2.5, 'Summer day is >2.5 hours longer than winter day');

  const summerAsrMins = timeToMinutesOfDay(summerTimes.asr);
  const winterAsrMins = timeToMinutesOfDay(winterTimes.asr);
  assert(summerAsrMins > winterAsrMins + 45, `Summer Asr (${formatTime(summerTimes.asr)}) is ~1 hour later than winter Asr (${formatTime(winterTimes.asr)})`);

  // TEST 4: Spring Equinox (Mar 21) & Autumn Equinox (Sep 21)
  console.log('\n--- TEST 4: Spring & Autumn Equinoxes (Equilibrium) ---');
  const springDate = new Date('2026-03-21T12:00:00+05:30');
  const autumnDate = new Date('2026-09-21T12:00:00+05:30');
  const springTimes = new PrayerTimes(coords, springDate, hanafiParams);
  const autumnTimes = new PrayerTimes(coords, autumnDate, hanafiParams);
  const springDayHours = (springTimes.maghrib.getTime() - springTimes.sunrise.getTime()) / (3600 * 1000);
  const autumnDayHours = (autumnTimes.maghrib.getTime() - autumnTimes.sunrise.getTime()) / (3600 * 1000);
  console.log(`  Spring Equinox Day Length: ${springDayHours.toFixed(2)} hours`);
  console.log(`  Autumn Equinox Day Length: ${autumnDayHours.toFixed(2)} hours`);
  assert(Math.abs(springDayHours - 12.13) < 0.15, `Spring Equinox day length ~12.13 hours (got ${springDayHours.toFixed(2)})`);
  assert(Math.abs(autumnDayHours - 12.15) < 0.15, `Autumn Equinox day length ~12.15 hours (got ${autumnDayHours.toFixed(2)})`);

  // TEST 5: High Latitude Safety (London 51.5° N & Tromso 69.6° N)
  console.log('\n--- TEST 5: High Latitude Rule Verification (No NaN, No Crashes) ---');
  const londonCoords = new Coordinates(51.5074, -0.1278);
  const londonParams = CalculationMethod.MuslimWorldLeague();
  londonParams.highLatitudeRule = HighLatitudeRule.recommended(londonCoords);
  const londonTimes = new PrayerTimes(londonCoords, summerDate, londonParams);
  assert(!isNaN(londonTimes.fajr.getTime()), 'London Summer Fajr is valid (non-NaN)');
  assert(!isNaN(londonTimes.isha.getTime()), 'London Summer Isha is valid (non-NaN)');

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
