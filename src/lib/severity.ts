import type { Severity } from "./types";

export function pollenSeverity(total: number): Severity {
  if (total < 10) return "low";
  if (total < 30) return "moderate";
  if (total < 60) return "high";
  return "very-high";
}

// EU AQI bands (Open-Meteo european_aqi)
export function aqiSeverity(index: number): Severity {
  if (index <= 20) return "low";
  if (index <= 40) return "moderate";
  if (index <= 60) return "high";
  return "very-high";
}

export const severityLabel: Record<Severity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  "very-high": "Very High",
};

export const severityRank: Record<Severity, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  "very-high": 3,
};

export function severityClasses(s: Severity): { bg: string; text: string; ring: string; bar: string } {
  switch (s) {
    case "low":
      return {
        bg: "bg-severity-low/15",
        text: "text-severity-low",
        ring: "ring-severity-low/30",
        bar: "bg-severity-low",
      };
    case "moderate":
      return {
        bg: "bg-severity-mod/15",
        text: "text-severity-mod",
        ring: "ring-severity-mod/30",
        bar: "bg-severity-mod",
      };
    case "high":
      return {
        bg: "bg-severity-high/15",
        text: "text-severity-high",
        ring: "ring-severity-high/30",
        bar: "bg-severity-high",
      };
    case "very-high":
      return {
        bg: "bg-severity-very-high/15",
        text: "text-severity-very-high",
        ring: "ring-severity-very-high/30",
        bar: "bg-severity-very-high",
      };
  }
}

export function aqiLabel(index: number): string {
  if (index <= 20) return "Good";
  if (index <= 40) return "Fair";
  if (index <= 60) return "Moderate";
  if (index <= 80) return "Poor";
  return "Very Poor";
}