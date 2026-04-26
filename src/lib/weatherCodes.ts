// WMO weather interpretation codes used by Open-Meteo
export interface WeatherInfo {
  label: string;
  short: string;
  sky: "clear" | "cloudy" | "rain" | "snow" | "night";
  icon: string; // emoji fallback for now
}

export function describeWeather(code: number, isDay: boolean): WeatherInfo {
  const night = !isDay;
  const map: Record<number, WeatherInfo> = {
    0: { label: "Clear sky", short: "Clear", sky: night ? "night" : "clear", icon: night ? "🌙" : "☀️" },
    1: { label: "Mainly clear", short: "Mainly clear", sky: night ? "night" : "clear", icon: night ? "🌙" : "🌤️" },
    2: { label: "Partly cloudy", short: "Partly cloudy", sky: "cloudy", icon: "⛅" },
    3: { label: "Overcast", short: "Overcast", sky: "cloudy", icon: "☁️" },
    45: { label: "Fog", short: "Foggy", sky: "cloudy", icon: "🌫️" },
    48: { label: "Depositing rime fog", short: "Freezing fog", sky: "cloudy", icon: "🌫️" },
    51: { label: "Light drizzle", short: "Drizzle", sky: "rain", icon: "🌦️" },
    53: { label: "Moderate drizzle", short: "Drizzle", sky: "rain", icon: "🌦️" },
    55: { label: "Dense drizzle", short: "Heavy drizzle", sky: "rain", icon: "🌧️" },
    61: { label: "Light rain", short: "Light rain", sky: "rain", icon: "🌦️" },
    63: { label: "Moderate rain", short: "Rain", sky: "rain", icon: "🌧️" },
    65: { label: "Heavy rain", short: "Heavy rain", sky: "rain", icon: "🌧️" },
    66: { label: "Light freezing rain", short: "Freezing rain", sky: "rain", icon: "🌧️" },
    67: { label: "Heavy freezing rain", short: "Freezing rain", sky: "rain", icon: "🌧️" },
    71: { label: "Light snow", short: "Light snow", sky: "snow", icon: "🌨️" },
    73: { label: "Moderate snow", short: "Snow", sky: "snow", icon: "❄️" },
    75: { label: "Heavy snow", short: "Heavy snow", sky: "snow", icon: "❄️" },
    77: { label: "Snow grains", short: "Snow grains", sky: "snow", icon: "❄️" },
    80: { label: "Light showers", short: "Showers", sky: "rain", icon: "🌦️" },
    81: { label: "Showers", short: "Showers", sky: "rain", icon: "🌧️" },
    82: { label: "Violent showers", short: "Heavy showers", sky: "rain", icon: "⛈️" },
    85: { label: "Light snow showers", short: "Snow showers", sky: "snow", icon: "🌨️" },
    86: { label: "Heavy snow showers", short: "Snow showers", sky: "snow", icon: "❄️" },
    95: { label: "Thunderstorm", short: "Storms", sky: "rain", icon: "⛈️" },
    96: { label: "Storm with hail", short: "Storms", sky: "rain", icon: "⛈️" },
    99: { label: "Severe storm with hail", short: "Severe storms", sky: "rain", icon: "⛈️" },
  };
  return map[code] ?? { label: "Unknown", short: "—", sky: "cloudy", icon: "🌡️" };
}

export function skyClass(sky: WeatherInfo["sky"]): string {
  switch (sky) {
    case "clear": return "sky-clear";
    case "cloudy": return "sky-cloudy";
    case "rain": return "sky-rain";
    case "snow": return "sky-snow";
    case "night": return "sky-night";
  }
}