// Lightweight astronomy helpers — moon phase, sun & moon position.
// Approximations good enough for "where is it in the sky right now".

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function toJulian(date: Date): number {
  return date.getTime() / 86400000 - 0.5 + 2440588;
}
function toDays(date: Date): number {
  return toJulian(date) - 2451545;
}

const e = RAD * 23.4397; // obliquity

function rightAscension(l: number, b: number) {
  return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
}
function declination(l: number, b: number) {
  return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
}
function azimuth(H: number, phi: number, dec: number) {
  return Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
}
function altitude(H: number, phi: number, dec: number) {
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
}
function siderealTime(d: number, lw: number) {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

function solarMeanAnomaly(d: number) {
  return RAD * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(M: number) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}
function sunCoords(d: number) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return { dec: declination(L, 0), ra: rightAscension(L, 0), L };
}
function moonCoords(d: number) {
  const L = RAD * (218.316 + 13.176396 * d);
  const M = RAD * (134.963 + 13.064993 * d);
  const F = RAD * (93.272 + 13.229350 * d);
  const l = L + RAD * 6.289 * Math.sin(M);
  const b = RAD * 5.128 * Math.sin(F);
  const dt = 385001 - 20905 * Math.cos(M);
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: dt, l };
}

export interface SkyPosition {
  altitude: number;   // degrees above horizon (-90..90)
  azimuth: number;    // degrees from north, clockwise (0..360)
  visible: boolean;   // above horizon
}

export function getSunPosition(date: Date, lat: number, lon: number): SkyPosition {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const c = sunCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  const alt = altitude(H, phi, c.dec) * DEG;
  let az = azimuth(H, phi, c.dec) * DEG + 180;
  az = ((az % 360) + 360) % 360;
  return { altitude: alt, azimuth: az, visible: alt > -0.833 };
}

export function getMoonPosition(date: Date, lat: number, lon: number): SkyPosition {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(date);
  const c = moonCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  const alt = altitude(H, phi, c.dec) * DEG;
  let az = azimuth(H, phi, c.dec) * DEG + 180;
  az = ((az % 360) + 360) % 360;
  return { altitude: alt, azimuth: az, visible: alt > 0 };
}

export interface MoonPhaseInfo {
  phase: number;        // 0..1 (0 new, 0.5 full)
  illumination: number; // 0..1
  name: string;
  emoji: string;
}

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
  const inc = Math.atan2(149598000 * Math.sin(phi), m.dist - 149598000 * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra)
  );
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI;
  const illumination = (1 + Math.cos(inc)) / 2;

  // Phase names
  let name = "New moon", emoji = "🌑";
  if (phase < 0.03 || phase > 0.97) { name = "New moon"; emoji = "🌑"; }
  else if (phase < 0.22) { name = "Waxing crescent"; emoji = "🌒"; }
  else if (phase < 0.28) { name = "First quarter"; emoji = "🌓"; }
  else if (phase < 0.47) { name = "Waxing gibbous"; emoji = "🌔"; }
  else if (phase < 0.53) { name = "Full moon"; emoji = "🌕"; }
  else if (phase < 0.72) { name = "Waning gibbous"; emoji = "🌖"; }
  else if (phase < 0.78) { name = "Last quarter"; emoji = "🌗"; }
  else { name = "Waning crescent"; emoji = "🌘"; }

  return { phase, illumination, name, emoji };
}

export function compass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}