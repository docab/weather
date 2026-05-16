/**
 * Lightweight visible-planet calculator. Returns rough current altitude /
 * azimuth and a friendly when-visible window for the five naked-eye planets.
 * Accuracy: well within a degree or two — plenty for "look in the SW around 9pm".
 *
 * Uses mean orbital elements at J2000 and propagates linearly. Good for the
 * near-term forecast we surface in the UI.
 */
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

interface OrbitalElements {
  a: number;        // semi-major axis (AU)
  e: number;        // eccentricity
  iDeg: number;     // inclination (deg)
  LDeg: number;     // mean longitude at J2000 (deg)
  wDeg: number;     // longitude of perihelion (deg)
  oDeg: number;     // longitude of ascending node (deg)
  ratePerCy: number;// degrees per century (mean longitude rate)
}

interface Planet {
  name: string;
  symbol: string;
  blurb: string;
  el: OrbitalElements;
}

// Mean elements (epoch J2000.0). Sufficient for short-term naked-eye prediction.
const PLANETS: Planet[] = [
  { name: "Mercury", symbol: "☿", blurb: "tiny and shy, hugs the horizon at twilight",
    el: { a: 0.38710, e: 0.20563, iDeg: 7.005, LDeg: 252.25084, wDeg: 77.45645, oDeg: 48.33167, ratePerCy: 149472.67411175 } },
  { name: "Venus", symbol: "♀", blurb: "the brightest dot in the sky — unmissable",
    el: { a: 0.72333, e: 0.00677, iDeg: 3.395, LDeg: 181.97973, wDeg: 131.53298, oDeg: 76.68069, ratePerCy: 58517.81538729 } },
  { name: "Mars", symbol: "♂", blurb: "rusty-red, easy to pick out by colour",
    el: { a: 1.52366, e: 0.09341, iDeg: 1.850, LDeg: 355.45332, wDeg: 336.04084, oDeg: 49.57854, ratePerCy: 19140.30268499 } },
  { name: "Jupiter", symbol: "♃", blurb: "big, steady, creamy-white — second only to Venus",
    el: { a: 5.20336, e: 0.04839, iDeg: 1.305, LDeg: 34.40438, wDeg: 14.72847, oDeg: 100.55615, ratePerCy: 3034.74612775 } },
  { name: "Saturn", symbol: "♄", blurb: "pale gold, slow-moving, faintly yellow",
    el: { a: 9.53707, e: 0.05415, iDeg: 2.484, LDeg: 49.94432, wDeg: 92.43194, oDeg: 113.71504, ratePerCy: 1222.49362201 } },
];

// Earth elements for geocentric conversion
const EARTH: OrbitalElements = {
  a: 1.00000, e: 0.01671, iDeg: 0, LDeg: 100.46435, wDeg: 102.94719, oDeg: 0, ratePerCy: 35999.37244981,
};

function toCenturies(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 6; i++) E = M + e * Math.sin(E);
  return E;
}

// Returns heliocentric ecliptic rectangular coords (AU)
function heliocentric(el: OrbitalElements, T: number): [number, number, number] {
  const L = (el.LDeg + el.ratePerCy * T) * RAD;
  const w = el.wDeg * RAD;
  const o = el.oDeg * RAD;
  const i = el.iDeg * RAD;
  const M = L - w;
  const E = solveKepler(M, el.e);
  const x0 = el.a * (Math.cos(E) - el.e);
  const y0 = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  // Rotate to ecliptic frame
  const cw = Math.cos(w - o), sw = Math.sin(w - o);
  const co = Math.cos(o), so = Math.sin(o);
  const ci = Math.cos(i), si = Math.sin(i);
  const x1 = cw * x0 - sw * y0;
  const y1 = sw * x0 + cw * y0;
  const xe = co * x1 - so * y1 * ci;
  const ye = so * x1 + co * y1 * ci;
  const ze = y1 * si;
  return [xe, ye, ze];
}

function geocentricRaDec(el: OrbitalElements, T: number): { ra: number; dec: number } {
  const [hx, hy, hz] = heliocentric(el, T);
  const [ex, ey, ez] = heliocentric(EARTH, T);
  const x = hx - ex;
  const y = hy - ey;
  const z = hz - ez;
  // Rotate ecliptic -> equatorial
  const eps = 23.4393 * RAD;
  const xe = x;
  const ye = y * Math.cos(eps) - z * Math.sin(eps);
  const ze = y * Math.sin(eps) + z * Math.cos(eps);
  const ra = Math.atan2(ye, xe);
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye));
  return { ra, dec };
}

function localSiderealTime(date: Date, lonDeg: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
             + T * T * 0.000387933 - (T * T * T) / 38710000;
  return ((GMST + lonDeg) % 360 + 360) % 360;
}

function altAz(ra: number, dec: number, lstDeg: number, latDeg: number): { altitude: number; azimuth: number } {
  const H = (lstDeg * RAD) - ra;
  const lat = latDeg * RAD;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  let az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  az = az * DEG + 180;
  return { altitude: alt * DEG, azimuth: ((az % 360) + 360) % 360 };
}

export interface VisiblePlanet {
  name: string;
  symbol: string;
  blurb: string;
  altitude: number;     // current altitude in degrees
  azimuth: number;      // 0..360 from N
  visible: boolean;     // above horizon now
  bestTime?: string;    // "around 22:14" — when it peaks above horizon tonight
}

/**
 * Compute the five naked-eye planets at `date` for an observer, and try to
 * find their peak altitude over the next 24 hours for a friendly "best time".
 */
export function visiblePlanets(date: Date, latitude: number, longitude: number): VisiblePlanet[] {
  const out: VisiblePlanet[] = [];
  for (const p of PLANETS) {
    const T = toCenturies(date);
    const eq = geocentricRaDec(p.el, T);
    const lst = localSiderealTime(date, longitude);
    const now = altAz(eq.ra, eq.dec, lst, latitude);

    // Sweep next 24h in 30-min steps for peak altitude
    let bestAlt = now.altitude;
    let bestDate = date;
    for (let step = 1; step <= 48; step++) {
      const d = new Date(date.getTime() + step * 30 * 60 * 1000);
      const tT = toCenturies(d);
      const e2 = geocentricRaDec(p.el, tT);
      const l2 = localSiderealTime(d, longitude);
      const a2 = altAz(e2.ra, e2.dec, l2, latitude);
      if (a2.altitude > bestAlt) { bestAlt = a2.altitude; bestDate = d; }
    }
    const bestTime = bestAlt > 5
      ? bestDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : undefined;
    out.push({
      name: p.name, symbol: p.symbol, blurb: p.blurb,
      altitude: now.altitude, azimuth: now.azimuth,
      visible: now.altitude > 0,
      bestTime,
    });
  }
  return out;
}
