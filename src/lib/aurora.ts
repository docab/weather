// Aurora forecast — pulls planetary K-index from NOAA SWPC (no key).
// Then estimates visibility for a given latitude.

export interface AuroraForecast {
  kpNow: number;         // 0..9
  kpNext: number;        // forecast for next 3h window
  updated: string;
  visibilityFor(absLat: number): {
    chance: "none" | "slim" | "possible" | "likely" | "very-likely";
    summary: string;
    minLat: number;
  };
}

// Approximate aurora oval southern reach (geographic latitude) per Kp.
// Source: NOAA SWPC public guidance (rounded).
const KP_LAT: Record<number, number> = {
  0: 67, 1: 66, 2: 65, 3: 63, 4: 60, 5: 57, 6: 54, 7: 50, 8: 47, 9: 44,
};

function visibilityLat(kp: number): number {
  const k = Math.max(0, Math.min(9, Math.round(kp)));
  return KP_LAT[k];
}

export async function fetchAurora(): Promise<AuroraForecast> {
  // Latest 3h Kp values
  const r = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
  if (!r.ok) throw new Error("Aurora fetch failed");
  const rows: string[][] = await r.json();
  // First row is headers
  const data = rows.slice(1);
  const last = data[data.length - 1];
  const prev = data[data.length - 2] ?? last;
  const kpNow = parseFloat(last[1]);
  const kpNext = parseFloat(prev[1]); // SWPC gives recent 3h, use prior as a stand-in trend
  const updated = last[0];
  const minLatNow = visibilityLat(kpNow);

  return {
    kpNow,
    kpNext,
    updated,
    visibilityFor(absLat: number) {
      const minLat = visibilityLat(kpNow);
      const diff = absLat - minLat;
      let chance: "none" | "slim" | "possible" | "likely" | "very-likely";
      let summary: string;
      if (diff >= 5) { chance = "very-likely"; summary = "You're well inside the aurora oval — look up tonight."; }
      else if (diff >= 0) { chance = "likely"; summary = "You're under the aurora band — clear skies and you're in business."; }
      else if (diff >= -3) { chance = "possible"; summary = "Just south of the band — peek north on the horizon."; }
      else if (diff >= -6) { chance = "slim"; summary = "A long shot — only a strong storm gets it down to you."; }
      else { chance = "none"; summary = "Too far south for tonight's activity."; }
      return { chance, summary, minLat };
    },
  };
}

export function kpDescription(kp: number): string {
  if (kp >= 7) return `Severe storm (Kp ${kp.toFixed(1)}) — auroras pushing into mid-latitudes.`;
  if (kp >= 5) return `Geomagnetic storm (Kp ${kp.toFixed(1)}) — visible from northern UK and Canada.`;
  if (kp >= 4) return `Active (Kp ${kp.toFixed(1)}) — high-latitude auroras likely.`;
  if (kp >= 2) return `Quiet to unsettled (Kp ${kp.toFixed(1)}) — only the far north sees a glow.`;
  return `Very quiet (Kp ${kp.toFixed(1)}) — only Arctic skies tonight.`;
}