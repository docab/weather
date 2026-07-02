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
        </defs>
        {/* Main branch */}
        <path d="M200,150 C160,110 130,90 90,70 C60,55 40,35 10,10" stroke="url(#wb-brk)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* Secondary limbs */}
        <path d="M130,88 C120,70 110,60 100,40" stroke="url(#wb-brk)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M90,70 C80,80 70,86 55,90" stroke="url(#wb-brk)" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Leaves */}
        {[
          [128, 74], [112, 60], [102, 42], [90, 30], [70, 82], [55, 90], [42, 74], [155, 108],
        ].map(([x, y], i) => (
          <ellipse
            key={i}
            cx={x} cy={y} rx="9" ry="4"
            fill="hsl(0 0% 100% / 0.55)"
            style={{ animation: `wb-leaf ${(dur * 0.75).toFixed(2)}s ease-in-out ${(i * 0.15).toFixed(2)}s infinite`, transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </svg>
    </div>
  );
}