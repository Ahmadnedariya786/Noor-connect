/**
 * Moon Phase calculation using standard synodic month algorithm.
 * Synodic month = 29.53058867 days (mean time between consecutive new moons).
 * Known reference epoch: 2024-01-11 11:57:00 UTC (New Moon).
 */

export interface MoonPhaseInfo {
  phase: number; // 0.0 to 1.0 (0/1=New, 0.25=First Qtr, 0.5=Full, 0.75=Last Qtr)
  ageDays: number; // 0.0 to 29.53 days
  fraction: number; // 0.0 to 1.0 (illumination ratio)
  phaseName: string;
}

const KNOWN_NEW_MOON_MS = Date.UTC(2024, 0, 11, 11, 57, 0);
const SYNODIC_MONTH = 29.53058867;
const MS_PER_DAY = 86400000;

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_MS) / MS_PER_DAY;
  const rawPhase = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = rawPhase / SYNODIC_MONTH; // 0.0 to 1.0
  const ageDays = rawPhase;
  // Illumination fraction: 0 at new moon, 1 at full moon
  const fraction = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  let phaseName = 'New Moon';
  if (phase < 0.03 || phase > 0.97) {
    phaseName = 'New Moon';
  } else if (phase < 0.22) {
    phaseName = 'Waxing Crescent';
  } else if (phase < 0.28) {
    phaseName = 'First Quarter';
  } else if (phase < 0.47) {
    phaseName = 'Waxing Gibbous';
  } else if (phase < 0.53) {
    phaseName = 'Full Moon';
  } else if (phase < 0.72) {
    phaseName = 'Waning Gibbous';
  } else if (phase < 0.78) {
    phaseName = 'Last Quarter';
  } else {
    phaseName = 'Waning Crescent';
  }

  return { phase, ageDays, fraction, phaseName };
}

/**
 * Generates an SVG path for the illuminated moon disk of radius R centered at (0, 0).
 */
export function getMoonSvgPath(phase: number, r: number): string {
  // Clamp phase to 0..1
  const p = ((phase % 1) + 1) % 1;
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.max(0.001, Math.abs(k) * r);

  if (p <= 0.5) {
    // Waxing: right side illuminated
    // Right semi-circle: (0, -r) -> (0, r)
    // Return arc along terminator back to (0, -r)
    const sweep = k >= 0 ? 0 : 1; // if crescent, sweep 0 (bulge right); if gibbous, sweep 1 (bulge left)
    return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
  } else {
    // Waning: left side illuminated
    // Left semi-circle: (0, -r) -> (0, r)
    const sweep = k < 0 ? 0 : 1;
    return `M 0 ${-r} A ${r} ${r} 0 0 0 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
  }
}
