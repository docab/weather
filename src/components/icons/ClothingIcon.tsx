import type { WeatherData } from "@/lib/types";

type Kind = "puffer" | "coat" | "jacket" | "sweater" | "longsleeve" | "tshirt" | "tank";

export function pickClothing(weather: WeatherData): Kind {
  const t = weather.feelsLike;
  const wet = weather.precipProb >= 40;
  const windy = weather.windSpeed >= 20;
  if (t < 0) return "puffer";
  if (t < 5) return "coat";
  if (t < 10) return wet || windy ? "jacket" : "coat";
  if (t < 15) return "sweater";
  if (t < 19) return "longsleeve";
  if (t < 25) return "tshirt";
  return "tank";
}

/**
 * Friendly outfit icon — clean filled silhouettes that read clearly at small sizes.
 * Colours via currentColor so the parent can tint by weather.
 */
export function ClothingIcon({ weather, size = 22 }: { weather: WeatherData; size?: number }) {
  const kind = pickClothing(weather);
  const c = "currentColor";

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      {kind === "puffer" && (
        <g>
          {/* hood */}
          <path d="M14 7 Q20 3 26 7 L26 11 Q20 9 14 11 Z" fill={c} opacity=".85"/>
          {/* body */}
          <path d="M8 14 L14 10 L26 10 L32 14 L34 18 L30 22 L30 34 Q30 36 28 36 L12 36 Q10 36 10 34 L10 22 L6 18 Z" fill={c}/>
          {/* horizontal puff seams */}
          <path d="M10 22 H30 M10 27 H30 M10 32 H30" stroke="hsl(220 30% 10%)" strokeWidth="1" opacity=".35" fill="none"/>
          {/* zip */}
          <line x1="20" y1="11" x2="20" y2="34" stroke="hsl(220 30% 10%)" strokeWidth="0.8" opacity=".5"/>
        </g>
      )}
      {kind === "coat" && (
        <g>
          {/* collar */}
          <path d="M14 9 L20 13 L26 9 L24 6 L16 6 Z" fill={c} opacity=".85"/>
          {/* body */}
          <path d="M10 14 L16 9 L20 13 L24 9 L30 14 L32 30 L28 34 L28 36 L12 36 L12 34 L8 30 Z" fill={c}/>
          {/* center line */}
          <line x1="20" y1="13" x2="20" y2="34" stroke="hsl(220 30% 10%)" strokeWidth="0.8" opacity=".45"/>
          {/* buttons */}
          <circle cx="20" cy="18" r="0.9" fill="hsl(220 30% 10%)" opacity=".7"/>
          <circle cx="20" cy="24" r="0.9" fill="hsl(220 30% 10%)" opacity=".7"/>
          <circle cx="20" cy="30" r="0.9" fill="hsl(220 30% 10%)" opacity=".7"/>
          {/* belt */}
          <rect x="9" y="26" width="22" height="1.6" fill="hsl(220 30% 10%)" opacity=".35"/>
        </g>
      )}
      {kind === "jacket" && (
        <g>
          {/* collar */}
          <path d="M14 9 L20 14 L26 9 L23 6 L17 6 Z" fill={c} opacity=".85"/>
          {/* body */}
          <path d="M10 14 L16 9 L20 14 L24 9 L30 14 L31 26 L29 28 L29 36 L11 36 L11 28 L9 26 Z" fill={c}/>
          {/* zipper */}
          <line x1="20" y1="14" x2="20" y2="35" stroke="hsl(220 30% 10%)" strokeWidth="1" opacity=".6" strokeDasharray="1.5 1.2"/>
          {/* pockets */}
          <path d="M14 26 L18 26 M22 26 L26 26" stroke="hsl(220 30% 10%)" strokeWidth="1" opacity=".4"/>
        </g>
      )}
      {kind === "sweater" && (
        <g>
          {/* knit body */}
          <path d="M11 13 L16 8 Q20 11 24 8 L29 13 L33 16 L29 20 L29 36 L11 36 L11 20 L7 16 Z" fill={c}/>
          {/* collar */}
          <path d="M16 8 Q20 12 24 8 L23 7 Q20 9 17 7 Z" fill="hsl(220 30% 10%)" opacity=".35"/>
          {/* knit ribbing at hem & cuffs */}
          <path d="M11 33 H29 M11 34.5 H29" stroke="hsl(220 30% 10%)" strokeWidth="0.6" opacity=".4"/>
          <path d="M7 19 L11 19 M29 19 L33 19" stroke="hsl(220 30% 10%)" strokeWidth="0.6" opacity=".4"/>
          {/* knit texture stripes */}
          <g stroke="hsl(220 30% 10%)" strokeWidth="0.4" opacity=".25">
            <line x1="13" y1="15" x2="13" y2="32"/>
            <line x1="17" y1="13" x2="17" y2="32"/>
            <line x1="23" y1="13" x2="23" y2="32"/>
            <line x1="27" y1="15" x2="27" y2="32"/>
          </g>
        </g>
      )}
      {kind === "longsleeve" && (
        <g>
          <path d="M12 12 L16 8 Q20 11 24 8 L28 12 L33 15 L30 19 L29 36 L11 36 L10 19 L7 15 Z" fill={c}/>
          <path d="M16 8 Q20 11 24 8 L23 7 Q20 9 17 7 Z" fill="hsl(220 30% 10%)" opacity=".4"/>
          {/* cuffs */}
          <path d="M7 18 L10 18 M30 18 L33 18" stroke="hsl(220 30% 10%)" strokeWidth="0.6" opacity=".4"/>
        </g>
      )}
      {kind === "tshirt" && (
        <g>
          <path d="M13 12 L16 8 Q20 12 24 8 L27 12 L32 15 L29 18 L29 36 L11 36 L11 18 L8 15 Z" fill={c}/>
          <path d="M16 8 Q20 12 24 8 L23 7 Q20 10 17 7 Z" fill="hsl(220 30% 10%)" opacity=".4"/>
        </g>
      )}
      {kind === "tank" && (
        <g>
          <path d="M14 10 L17 6 L23 6 L26 10 L25 13 L25 36 L15 36 L15 13 Z" fill={c}/>
          {/* shoulder straps */}
          <path d="M17 6 Q20 10 23 6" stroke="hsl(220 30% 10%)" strokeWidth="0.8" opacity=".4" fill="none"/>
          {/* neckline */}
          <path d="M16 11 Q20 14 24 11" stroke="hsl(220 30% 10%)" strokeWidth="0.8" opacity=".4" fill="none"/>
        </g>
      )}
    </svg>
  );
}
