import type { CSSProperties } from "react";

/**
 * A soft, frosted-glass silhouette of a swaying branch overlaid on top of
 * the hero / wind card. Sway amplitude and speed scale with wind speed.
 * Purely decorative — pointer-events disabled.
 */
export function WindBranchFX({ mph, className = "" }: { mph: number; className?: string }) {
  // Amplitude: 2° at calm, up to ~14° at 40 mph.
  const amp = Math.min(14, 2 + mph * 0.3);
  const dur = Math.max(1.4, 4 - mph * 0.05); // faster with more wind
  const style: CSSProperties = {
    filter: "blur(1.5px)",
    ["--sway-amp" as never]: `${amp}deg`,
    ["--sway-dur" as never]: `${dur.toFixed(2)}s`,
  };
  return (
    <div className={`pointer-events-none absolute -bottom-4 -right-6 h-40 w-56 opacity-40 ${className}`} style={style}>
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
            <stop offset="0" stopColor="hsl(0 0% 100% / 0.85)" />
            <stop offset="1" stopColor="hsl(0 0% 100% / 0.45)" />
          </linearGradient>
          <radialGradient id="wb-leaf" cx="35%" cy="35%">
            <stop offset="0" stopColor="hsl(120 40% 92% / 0.85)" />
            <stop offset="1" stopColor="hsl(140 45% 72% / 0.45)" />
          </radialGradient>
        </defs>
        {/* Main branch */}
        <path d="M200,150 C160,110 130,90 90,70 C60,55 40,35 10,10" stroke="url(#wb-brk)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {/* Secondary limbs */}
        <path d="M150,110 C142,96 138,84 132,68" stroke="url(#wb-brk)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <path d="M130,88 C120,70 110,60 100,40" stroke="url(#wb-brk)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M110,78 C102,64 96,52 92,38" stroke="url(#wb-brk)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M90,70 C80,80 70,86 55,90" stroke="url(#wb-brk)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M70,64 C58,54 46,50 30,44" stroke="url(#wb-brk)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Twigs */}
        <path d="M132,68 C126,60 122,54 118,46" stroke="url(#wb-brk)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M100,40 C96,32 92,26 84,18" stroke="url(#wb-brk)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Leaves — teardrop shapes, denser cluster near tips */}
        {[
          [150, 108, 20], [140, 96, -30], [134, 82, 15], [128, 74, -20],
          [120, 60, 25], [112, 60, 40], [104, 46, -10], [102, 42, 55],
          [96, 34, 20], [90, 30, -35], [84, 18, 10], [78, 24, 50],
          [70, 82, -25], [62, 74, 10], [55, 90, -40], [46, 82, 20],
          [42, 74, 35], [34, 68, -15], [155, 108, -20], [162, 118, 30],
          [110, 78, -50], [92, 38, 60], [70, 64, -30], [30, 44, 15],
        ].map(([x, y, rot], i) => (
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
      </svg>
    </div>
  );
}