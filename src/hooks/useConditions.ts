import { useQueries } from "@tanstack/react-query";
import type { Location, LocationConditions } from "@/lib/types";
import { fetchPollenAndAqi, fetchWeather } from "@/lib/api";
import { buildNarrative, buildOutfit, buildUmbrella } from "@/lib/narrative";

async function fetchConditions(loc: Location): Promise<LocationConditions> {
  const [weather, air] = await Promise.all([
    fetchWeather(loc.latitude, loc.longitude),
    fetchPollenAndAqi(loc.latitude, loc.longitude),
  ]);
  return {
    location: loc,
    weather,
    pollen: air.pollen,
    aqi: air.aqi,
    narrative: buildNarrative(weather, air.pollen, air.aqi),
    outfit: buildOutfit(weather),
    umbrella: buildUmbrella(weather),
    fetchedAt: Date.now(),
  };
}

export function useConditionsForLocations(locations: Location[]) {
  return useQueries({
    queries: locations.map(loc => ({
      queryKey: ["conditions", loc.id, loc.latitude, loc.longitude],
      queryFn: () => fetchConditions(loc),
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
    })),
  });
}