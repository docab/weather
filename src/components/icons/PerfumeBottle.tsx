/**
 * Animated perfume bottle that periodically sprays a little mist puff.
 * Uses CSS keyframes defined in index.css (fx-spray-puff, fx-spray-press).
 */
export function PerfumeBottle({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 36" width={size} height={size} fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* Sprayer button — presses down */}
      <g style={{ animation: "fx-spray-press 3.6s ease-in-out infinite", transformOrigin: "13px 5px" }}>
        <rect x="11" y="3" width="4" height="3" rx=".6" fill="currentColor" />
      </g>
      {/* Nozzle / collar */}
      <rect x="10" y="6" width="6" height="2" rx=".4" fill="currentColor" opacity=".85" />
      <path d="M16 7 L24 7" />
      {/* Mist puffs spraying out */}
      <g style={{ animation: "fx-spray-puff 3.6s ease-out infinite" }}>
        <circle cx="25" cy="7"  r="1.1" fill="currentColor" opacity=".75" />
        <circle cx="27" cy="5"  r=".8"  fill="currentColor" opacity=".55" />
        <circle cx="27.5" cy="9" r=".7" fill="currentColor" opacity=".45" />
        <circle cx="29" cy="7"  r=".5"  fill="currentColor" opacity=".35" />
      </g>
      {/* Bottle body */}
      <path d="M9 9 L17 9 L17 12 Q22 13 22 18 V28 Q22 31 19 31 H7 Q4 31 4 28 V18 Q4 13 9 12 Z"
            fill="currentColor" fillOpacity=".18" />
      <path d="M9 9 L17 9 L17 12 Q22 13 22 18 V28 Q22 31 19 31 H7 Q4 31 4 28 V18 Q4 13 9 12 Z" />
      {/* Liquid line */}
      <path d="M5 22 Q13 24 21 22" opacity=".7" />
    </svg>
  );
}