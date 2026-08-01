/** Sky-temperature gradient. No greens, no teals — only the hues you'd
 *  actually see in the sky at that temperature/condition. Shared between
 *  the 7-day forecast rows and the Smart Alerts strip so colour language
 *  stays consistent across the app. */
export function dayGradient(highC: number, sky: string): string {
  const t = Math.max(-10, Math.min(38, highC));
  let hue: number, sat: number, light: number;
  // Never interpolate straight from blue (205) to yellow (45) — the shortest
  // path runs through green, which the sky never does. Instead we hold blue,
  // fade it to a neutral pale, then pick the warm ramp back up.
  if (t < 5)        { hue = lerp(235, 215, (t + 10) / 15); sat = 55; light = 32; }
  else if (t < 14)  { hue = lerp(215, 205, (t - 5) / 9);   sat = 50; light = 42; }
  else if (t < 19)  { hue = 205; sat = lerp(50, 16, (t - 14) / 5); light = lerp(46, 58, (t - 14) / 5); }
  else if (t < 22)  { hue = 48;  sat = lerp(18, 46, (t - 19) / 3); light = lerp(60, 56, (t - 19) / 3); }
  else if (t < 28)  { hue = lerp(46, 28, (t - 22) / 6);    sat = 80; light = 52; }
  else              { hue = lerp(28, 8,  (t - 28) / 7);    sat = 85; light = 50; }
  if (sky === "rain")   { sat -= 25; light -= 6; }
  if (sky === "cloudy") { sat -= 18; light -= 2; }
  if (sky === "snow")   { sat = 12; light = 70; hue = 210; }
  const a = `hsl(${hue} ${clamp(sat, 8, 95)}% ${clamp(light, 18, 78)}% / 0.55)`;
  const b = `hsl(${hue} ${clamp(sat - 10, 6, 90)}% ${clamp(light - 10, 12, 70)}% / 0.18)`;
  return `linear-gradient(90deg, ${a} 0%, ${b} 60%, transparent 100%)`;
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }