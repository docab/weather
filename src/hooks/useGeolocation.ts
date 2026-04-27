import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/api";
import type { Location } from "@/lib/types";
import { loadAutoLocation, saveAutoLocation } from "@/lib/storage";

export interface GeoState {
  loading: boolean;
  location: Location | null;
  error: string | null;
  request: () => void;
}

export function useGeolocation(): GeoState {
  const [location, setLocation] = useState<Location | null>(loadAutoLocation());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = () => {
    if (!("geolocation" in navigator)) {
      setError("Location not supported by this browser");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const g = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (g) {
            const loc: Location = {
              id: "auto",
              name: g.name,
              region: g.region,
              postcode: g.postcode,
              country: g.country,
              countryCode: g.countryCode,
              latitude: g.latitude,
              longitude: g.longitude,
              isAutoDetected: true,
            };
            setLocation(loc);
            saveAutoLocation(loc);
          }
        } catch (e) {
          setError("Couldn't resolve your location");
        } finally {
          setLoading(false);
        }
      },
      err => {
        setLoading(false);
        setError(err.message || "Permission denied");
      },
      { timeout: 8000, maximumAge: 1000 * 60 * 10 }
    );
  };

  // Auto-request on first mount if not yet set
  useEffect(() => {
    if (!location) request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, location, error, request };
}