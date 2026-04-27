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
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locs.slice(0, 5)));
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