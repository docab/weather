import type { WeatherData } from "@/lib/types";

/**
 * Picks the right outfit-ish icon for the day's feels-like temperature
 * and conditions. Pure inline SVG so it scales/colours with currentColor.
 */
export function ClothingIcon({ weather, size = 18 }: { weather: WeatherData; size?: number }) {
  const t = weather.feelsLike;
  const wet = weather.precipProb >= 40;
  const windy = weather.windSpeed >= 20;

  let kind: "puffer" | "coat" | "jacket" | "sweater" | "longsleeve" | "tshirt" | "tank" = "tshirt";
  if (t < 0) kind = "puffer";
  else if (t < 5) kind = "coat";
  else if (t < 10) kind = wet || windy ? "jacket" : "coat";
  else if (t < 15) kind = "sweater";
  else if (t < 19) kind = "longsleeve";
  else if (t < 25) kind = "tshirt";
  else kind = "tank";

  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {kind === "puffer" && (
        <>
          <path d="M9 7 L13 5 L19 5 L23 7 L28 11 L25 15 L25 27 L7 27 L7 15 L4 11 Z" />
          <path d="M13 5 Q16 9 19 5" />
          <path d="M7 17 H25 M7 21 H25" />
        </>
      )}
      {kind === "coat" && (
        <>
          <path d="M10 7 L13 5 L19 5 L22 7 L27 10 L24 15 L24 27 L8 27 L8 15 L5 10 Z" />
          <path d="M16 5 V20" />
          <circle cx="16" cy="11" r=".7" fill="currentColor" />
          <circle cx="16" cy="16" r=".7" fill="currentColor" />
          <circle cx="16" cy="21" r=".7" fill="currentColor" />
        </>
      )}
      {kind === "jacket" && (
        <>
          <path d="M10 7 L13 5 L19 5 L22 7 L27 11 L23 14 L23 27 L9 27 L9 14 L5 11 Z" />
          <path d="M14 5 L16 9 L18 5" />
          <path d="M16 9 V25" />
        </>
      )}
      {kind === "sweater" && (
        <>
          <path d="M9 8 L13 5 L19 5 L23 8 L28 12 L24 16 L24 27 L8 27 L8 16 L4 12 Z" />
          <path d="M14 5 Q16 8 18 5" />
          <path d="M10 18 H22 M10 22 H22" />
        </>
      )}
      {kind === "longsleeve" && (
        <>
          <path d="M11 6 L13 5 L19 5 L21 6 L27 10 L24 14 L24 27 L8 27 L8 14 L5 10 Z" />
          <path d="M13 5 Q16 8 19 5" />
        </>
      )}
      {kind === "tshirt" && (
        <>
          <path d="M11 6 L13 5 L19 5 L21 6 L27 11 L23 14 L23 27 L9 27 L9 14 L5 11 Z" />
          <path d="M13 5 Q16 9 19 5" />
        </>
      )}
      {kind === "tank" && (
        <>
          <path d="M12 6 L14 4 L18 4 L20 6 L22 10 L22 27 L10 27 L10 10 Z" />
          <path d="M14 4 Q16 8 18 4" />
        </>
      )}
    </svg>
  );
}