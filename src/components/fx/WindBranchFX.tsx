import type { CSSProperties } from "react";

type Season = "spring" | "summer" | "autumn" | "winter";
function seasonFor(date: Date, lat = 51): Season {
  const m = date.getUTCMonth() + 1;
  const north = lat >= 0;
  const s: Record<number, Season> = north
    ? { 12: "winter", 1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring", 6: "summer", 7: "summer", 8: "summer", 9: "autumn", 10: "autumn", 11: "autumn" }
    : { 12: "summer", 1: "summer", 2: "summer", 3: "autumn", 4: "autumn", 5: "autumn", 6: "winter", 7: "winter", 8: "winter", 9: "spring", 10: "spring", 11: "spring" };
  return s[m];
}

// Higher saturation + opacity so the branch reads clearly against every
// hero sky (cream/butter mid-range especially). Trunk uses a warmer bark
// tone; leaves stay season-tinted.
const PALETTE: Record<Season, { branch: [string, string]; leaf: [string, string]; flower?: [string, string]; showFlowers: boolean; leafDensity: number }> = {
  spring:  { branch: ["hsl(24 45% 32% / 0.98)", "hsl(20 40% 18% / 0.90)"], leaf: ["hsl(120 60% 55% / 0.95)", "hsl(140 65% 32% / 0.85)"], flower: ["hsl(340 85% 78% / 0.98)", "hsl(348 75% 55% / 0.85)"], showFlowers: true, leafDensity: 42 },
  summer:  { branch: ["hsl(26 40% 28% / 0.98)", "hsl(20 40% 15% / 0.92)"], leaf: ["hsl(130 60% 42% / 0.98)", "hsl(140 65% 22% / 0.88)"], showFlowers: false, leafDensity: 56 },
  autumn:  { branch: ["hsl(22 55% 25% / 0.98)", "hsl(18 60% 12% / 0.92)"], leaf: ["hsl(28 92% 52% / 0.98)", "hsl(10 85% 34% / 0.88)"], showFlowers: false, leafDensity: 40 },
  winter:  { branch: ["hsl(24 25% 22% / 0.98)", "hsl(20 20% 10% / 0.92)"], leaf: ["hsl(20 20% 45% / 0.75)", "hsl(20 20% 22% / 0.55)"], showFlowers: false, leafDensity: 6 },
};

/**
 * A soft, frosted-glass silhouette of a swaying branch overlaid on top of
 * the hero / wind card. Sway amplitude and speed scale with wind speed.
 * Foliage and hues shift with the season — green leaves in summer, blossom
 * in spring, rust in autumn, bare twigs in winter. Purely decorative.
 */
export function WindBranchFX({ mph, className = "", latitude }: { mph: number; className?: string; latitude?: number }) {
  const season = seasonFor(new Date(), latitude);
  const pal = PALETTE[season];
  // Amplitude: 2° at calm, up to ~14° at 40 mph.
  const amp = Math.min(14, 2 + mph * 0.3);
  const dur = Math.max(1.4, 4 - mph * 0.05); // faster with more wind
  const style: CSSProperties = {
    filter: "blur(2.4px) drop-shadow(0 3px 6px rgb(0 0 0 / 0.30))",
    ["--sway-amp" as never]: `${amp}deg`,
    ["--sway-dur" as never]: `${dur.toFixed(2)}s`,
  };

  // Densify foliage points seasonally
  const points: [number, number, number][] = [
    [150,108,20],[140,96,-30],[134,82,15],[128,74,-20],[120,60,25],[112,60,40],[104,46,-10],[102,42,55],
    [96,34,20],[90,30,-35],[84,18,10],[78,24,50],[70,82,-25],[62,74,10],[55,90,-40],[46,82,20],
    [42,74,35],[34,68,-15],[155,108,-20],[162,118,30],[110,78,-50],[92,38,60],[70,64,-30],[30,44,15],
    [148,102,60],[126,66,-45],[118,52,-15],[106,58,30],[88,66,10],[82,56,-25],[68,50,20],[60,90,25],
    [50,72,-5],[38,58,45],[30,64,-10],[24,50,20],[144,88,-5],[136,74,-35],[122,80,40],[100,72,-40],
    [80,42,-20],[76,36,35],
  ];
  const shown = points.slice(0, Math.max(2, Math.min(points.length, pal.leafDensity)));
  const flowerPoints = pal.showFlowers ? points.slice(1, 14).filter((_, i) => i % 2 === 0) : [];
  return (
    <div className={`pointer-events-none absolute -top-4 -right-6 h-44 w-64 opacity-75 ${className}`} style={style}>
      <style>{`
        @keyframes wb-sway {
          0%,100% { transform: rotate(calc(var(--sway-amp) * -0.4)); }
          50%     { transform: rotate(var(--sway-amp)); }
        }
        @keyframes wb-leaf {
          0%,100% { transform: rotate(calc(var(--sway-amp) * -0.8)) translateX(0); }
          50%     { transform: rotate(calc(var(--sway-amp) * 1.4)) translateX(2px); }
        }
      `}</style>
      <svg viewBox="0 0 200 160" className="h-full w-full" style={{ animation: `wb-sway var(--sway-dur) ease-in-out infinite`, transformOrigin: "90% 100%" }}>
        <defs>
          <linearGradient id="wb-brk" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={pal.branch[0]} />
            <stop offset="1" stopColor={pal.branch[1]} />
          </linearGradient>
          <radialGradient id="wb-leaf" cx="35%" cy="35%">
            <stop offset="0" stopColor={pal.leaf[0]} />
            <stop offset="1" stopColor={pal.leaf[1]} />
          </radialGradient>
          {pal.flower && (
            <radialGradient id="wb-flower" cx="50%" cy="50%">
              <stop offset="0" stopColor={pal.flower[0]} />
              <stop offset="1" stopColor={pal.flower[1]} />
            </radialGradient>
          )}
        </defs>
        {/* Main branch — thicker, with a soft rim-light for a real-wood feel. */}
        <path d="M200,150 C160,110 130,90 90,70 C60,55 40,35 10,10" stroke="url(#wb-brk)" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M200,150 C160,110 130,90 90,70 C60,55 40,35 10,10" stroke="hsl(0 0% 100% / 0.18)" strokeWidth="1.4" strokeLinecap="round" fill="none" transform="translate(-1 -1)" />
        {/* Secondary limbs */}
        <path d="M150,110 C142,96 138,84 132,68" stroke="url(#wb-brk)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M130,88 C120,70 110,60 100,40" stroke="url(#wb-brk)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M110,78 C102,64 96,52 92,38" stroke="url(#wb-brk)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M90,70 C80,80 70,86 55,90" stroke="url(#wb-brk)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M70,64 C58,54 46,50 30,44" stroke="url(#wb-brk)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        {/* Twigs */}
        <path d="M132,68 C126,60 122,54 118,46" stroke="url(#wb-brk)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M100,40 C96,32 92,26 84,18" stroke="url(#wb-brk)" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Leaves — teardrop shapes, denser cluster near tips. Seasonal palette. */}
        {shown.map(([x, y, rot], i) => (
          <g
            key={i}
            style={{ animation: `wb-leaf ${(dur * 0.7 + (i % 3) * 0.15).toFixed(2)}s ease-in-out ${(i * 0.11).toFixed(2)}s infinite`, transformOrigin: `${x}px ${y}px` }}
          >
            <path
              d={`M ${x} ${y} q ${6} ${-3} ${11} ${1} q ${-4} ${5} ${-11} ${-1} z`}
              transform={`rotate(${rot} ${x} ${y})`}
              fill="url(#wb-leaf)"
            />
            <path
              d={`M ${x + 1} ${y - 0.4} q ${5} ${-1} ${9} ${0.6}`}
              transform={`rotate(${rot} ${x} ${y})`}
              stroke="hsl(0 0% 100% / 0.4)" strokeWidth="0.4" fill="none"
            />
          </g>
        ))}
        {/* Spring flowers — five-petal blossoms scattered near limb tips. */}
        {flowerPoints.map(([x, y], i) => (
          <g key={`f${i}`} style={{ animation: `wb-leaf ${(dur * 0.9 + i * 0.13).toFixed(2)}s ease-in-out ${(i * 0.17).toFixed(2)}s infinite`, transformOrigin: `${x}px ${y}px` }}>
            {[0, 72, 144, 216, 288].map(a => (
              <ellipse key={a} cx={x + Math.cos(a * Math.PI / 180) * 2.5} cy={y + Math.sin(a * Math.PI / 180) * 2.5} rx="2.2" ry="1.6" fill="url(#wb-flower)" transform={`rotate(${a} ${x} ${y})`} />
            ))}
            <circle cx={x} cy={y} r="0.9" fill="hsl(50 90% 70% / 0.9)" />
          </g>
        ))}
      </svg>
    </div>
  );
}