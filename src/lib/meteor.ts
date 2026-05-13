// Static dataset of major annual meteor showers (IMO-recognised).
// We compute which are "active" or peaking around a given date.

export interface MeteorShower {
  name: string;
  start: string; // MM-DD
  end: string;   // MM-DD
  peak: string;  // MM-DD
  zhr: number;   // expected zenithal hourly rate at peak
  parent: string;
  blurb: string;
}

export const SHOWERS: MeteorShower[] = [
  { name: "Quadrantids",      start: "12-28", end: "01-12", peak: "01-04", zhr: 110, parent: "2003 EH₁",
    blurb: "Sharp, intense burst — short peak, often the year's strongest if skies are clear." },
  { name: "Lyrids",           start: "04-16", end: "04-25", peak: "04-22", zhr: 18,  parent: "Comet Thatcher",
    blurb: "Fast meteors with the odd bright fireball — best after midnight." },
  { name: "Eta Aquariids",    start: "04-19", end: "05-28", peak: "05-06", zhr: 50,  parent: "Halley's Comet",
    blurb: "Pre-dawn show, swift meteors leaving glowing trains." },
  { name: "Delta Aquariids",  start: "07-12", end: "08-23", peak: "07-30", zhr: 25,  parent: "Comet 96P/Machholz",
    blurb: "Steady, faint meteors all of late July — best from a dark site." },
  { name: "Perseids",         start: "07-17", end: "08-24", peak: "08-12", zhr: 100, parent: "Comet Swift-Tuttle",
    blurb: "The summer classic — bright, fast, plenty of fireballs. Pull up a chair." },
  { name: "Draconids",        start: "10-06", end: "10-10", peak: "10-08", zhr: 10,  parent: "Comet 21P/Giacobini–Zinner",
    blurb: "Slow meteors visible in the evening — kid-friendly timing." },
  { name: "Orionids",         start: "10-02", end: "11-07", peak: "10-21", zhr: 20,  parent: "Halley's Comet",
    blurb: "Quick, faint streaks — best after midnight from a dark spot." },
  { name: "Leonids",          start: "11-06", end: "11-30", peak: "11-17", zhr: 15,  parent: "Comet Tempel-Tuttle",
    blurb: "Swift meteors with the occasional fireball — pre-dawn is best." },
  { name: "Geminids",         start: "12-04", end: "12-20", peak: "12-14", zhr: 150, parent: "3200 Phaethon",
    blurb: "The year's best — bright, multicoloured, visible from evening onwards." },
  { name: "Ursids",           start: "12-17", end: "12-26", peak: "12-22", zhr: 10,  parent: "Comet 8P/Tuttle",
    blurb: "Modest, often-overlooked shower — circumpolar, visible all night." },
];

function mmddToDate(mmdd: string, year: number): Date {
  const [m, d] = mmdd.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, d));
}

export interface ActiveShower extends MeteorShower {
  daysToPeak: number;
  isPeakingNow: boolean;
}

export function activeShowers(date: Date): ActiveShower[] {
  const year = date.getUTCFullYear();
  const out: ActiveShower[] = [];
  for (const s of SHOWERS) {
    // Build start/end allowing year wrap (Quadrantids, Ursids)
    let start = mmddToDate(s.start, year);
    let end = mmddToDate(s.end, year);
    let peak = mmddToDate(s.peak, year);
    if (end < start) {
      // crosses year boundary — try previous year start
      const prevStart = mmddToDate(s.start, year - 1);
      if (date >= prevStart && date <= mmddToDate(s.end, year)) {
        start = prevStart;
        peak = mmddToDate(s.peak, peak.getUTCMonth() < 6 ? year : year - 1);
      } else if (date >= start) {
        end = mmddToDate(s.end, year + 1);
        peak = mmddToDate(s.peak, peak.getUTCMonth() < 6 ? year + 1 : year);
      }
    }
    if (date >= start && date <= end) {
      const daysToPeak = Math.round((peak.getTime() - date.getTime()) / 86400000);
      out.push({ ...s, daysToPeak, isPeakingNow: Math.abs(daysToPeak) <= 1 });
    }
  }
  return out.sort((a, b) => Math.abs(a.daysToPeak) - Math.abs(b.daysToPeak));
}