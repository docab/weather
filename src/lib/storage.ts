import type { Location, NotificationPrefs } from "./types";

const LOCATIONS_KEY = "pw.locations";
const PRIMARY_KEY = "pw.primaryLocationId";
const PREFS_KEY = "pw.notificationPrefs";
const AUTO_KEY = "pw.autoLocation";

export function loadLocations(): Location[] {
  try { return JSON.parse(localStorage.getItem(LOCATIONS_KEY) || "[]"); }
  catch { return []; }
}
export function saveLocations(locs: Location[]) {
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locs.slice(0, 10)));
}

export function renameLocation(id: string, customName: string | undefined): Location[] {
  const list = loadLocations();
  const next = list.map(l => l.id === id ? { ...l, customName: customName?.trim() || undefined } : l);
  saveLocations(next);
  return next;
}

export function loadPrimaryId(): string | null {
  return localStorage.getItem(PRIMARY_KEY);
}
export function savePrimaryId(id: string) {
  localStorage.setItem(PRIMARY_KEY, id);
}

export function loadAutoLocation(): Location | null {
  try { return JSON.parse(localStorage.getItem(AUTO_KEY) || "null"); }
  catch { return null; }
}
export function saveAutoLocation(loc: Location | null) {
  if (loc) localStorage.setItem(AUTO_KEY, JSON.stringify(loc));
  else localStorage.removeItem(AUTO_KEY);
}

export const defaultPrefs: NotificationPrefs = {
  enabled: false,
  morningTime: "07:30",
  pollenAlerts: true,
  pollenThreshold: "high",
  aqiAlerts: true,
  rainAlerts: true,
  detailedLocation: false,
  weatherProvider: "open-meteo",
};

export function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch { return defaultPrefs; }
}
export function savePrefs(p: NotificationPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
/* -----------------------------------------------------------------------
 * Custom nicknames. Kept in their own map so the auto-detected location
 * (which never lands in the saved list) can be renamed too.
 * --------------------------------------------------------------------- */
const NAMES_KEY = "pw.locationNames";

export function loadNameOverrides(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NAMES_KEY) || "{}"); }
  catch { return {}; }
}
export function saveNameOverride(id: string, name: string | undefined): Record<string, string> {
  const map = loadNameOverrides();
  const clean = name?.trim();
  if (clean) map[id] = clean; else delete map[id];
  localStorage.setItem(NAMES_KEY, JSON.stringify(map));
  return map;
}

/** Move a saved location up (-1) or down (+1) in the ordering. */
export function reorderLocations(list: Location[], id: string, dir: -1 | 1): Location[] {
  const i = list.findIndex(l => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  saveLocations(next);
  return next;
}
