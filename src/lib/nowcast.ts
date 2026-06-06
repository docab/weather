// Minute-level precipitation nowcast.
//
// We try MET Norway's Nowcast 2.0 first (5-min resolution, ~2h ahead, covers
// the Nordics + parts of NW Europe). Browsers can't override `User-Agent` so
// the request goes out with the default UA — MET tolerates this for low
// volumes but may throttle, so we fall back to Open-Meteo's `minutely_15`
// (global, 15-min steps) on any failure or when the location is out of
// MET's coverage box.

export interface NowcastPoint {
  /** ISO timestamp */
  time: string;
  /** mm of precipitation in this step */
  mm: number;
}

export interface Nowcast {
  source: "met" | "open-meteo";
  stepMinutes: number;
  points: NowcastPoint[];
  /** Minutes from now until rain starts, if currently dry */
  startsInMin: number | null;
  /** Minutes from now until rain stops, if currently raining */
  stopsInMin: number | null;
  /** Confidence 0..1 — higher when models agree / MET is in range */
  confidence: number;
}

const MET_BOX = { minLat: 45, maxLat: 75, minLon: -10, maxLon: 45 };

function inMetBox(lat: number, lon: number) {
  return lat >= MET_BOX.minLat && lat <= MET_BOX.maxLat &&
         lon >= MET_BOX.minLon && lon <= MET_BOX.maxLon;
}

async function fetchMet(lat: number, lon: number): Promise<Nowcast | null> {
  try {
    const r = await fetch(
      `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const series = j?.properties?.timeseries as Array<{
      time: string;
      data?: { instant?: { details?: Record<string, number> };
        next_1_hours?: { details?: { precipitation_amount?: number } } };
    }> | undefined;
    if (!series?.length) return null;
    const pts: NowcastPoint[] = series.slice(0, 24).map(s => ({
      time: s.time,
      // Series steps are 5 min; the instant has rate (mm/h). Convert.
      mm: ((s.data?.instant?.details?.precipitation_rate as number | undefined) ?? 0) * (5 / 60),
    }));
    return finalize(pts, 5, "met", 0.9);
  } catch { return null; }
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<Nowcast | null> {
  try {
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", String(lat));
    u.searchParams.set("longitude", String(lon));
    u.searchParams.set("minutely_15", "precipitation,precipitation_probability");
    u.searchParams.set("forecast_minutely_15", "12"); // 12 × 15 = 3h
    u.searchParams.set("timezone", "auto");
    const r = await fetch(u.toString());
    if (!r.ok) return null;
    const j = await r.json();
    const t: string[] = j?.minutely_15?.time ?? [];
    const p: number[] = j?.minutely_15?.precipitation ?? [];
    if (!t.length) return null;
    const now = Date.now();
    const pts: NowcastPoint[] = [];
    for (let i = 0; i < t.length; i++) {
      if (new Date(t[i]).getTime() < now - 15 * 60_000) continue;
      pts.push({ time: t[i], mm: p[i] ?? 0 });
      if (pts.length >= 12) break;
    }
    return finalize(pts, 15, "open-meteo", 0.75);
  } catch { return null; }
}

function finalize(points: NowcastPoint[], stepMinutes: number,
                  source: Nowcast["source"], confidence: number): Nowcast {
  const wet = (mm: number) => mm >= 0.05;
  let startsInMin: number | null = null;
  let stopsInMin: number | null = null;
  const nowWet = wet(points[0]?.mm ?? 0);
  for (let i = 0; i < points.length; i++) {
    if (nowWet && !wet(points[i].mm)) { stopsInMin = i * stepMinutes; break; }
    if (!nowWet && wet(points[i].mm)) { startsInMin = i * stepMinutes; break; }
  }
  return { source, stepMinutes, points, startsInMin, stopsInMin, confidence };
}

export async function fetchNowcast(lat: number, lon: number): Promise<Nowcast | null> {
  if (inMetBox(lat, lon)) {
    const met = await fetchMet(lat, lon);
    if (met) return met;
  }
  return fetchOpenMeteo(lat, lon);
}