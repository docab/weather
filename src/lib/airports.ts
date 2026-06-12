/** A small curated list of major airports used by the trip planner to
 *  describe the road legs to/from the terminal. We deliberately keep it
 *  short — better to give a coarse nearest-airport hint than to lie with
 *  fake precision. */
export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const AIRPORTS: Airport[] = [
  // UK / Ireland
  { iata: "LHR", name: "Heathrow",          city: "London",      country: "GB", latitude: 51.4700, longitude: -0.4543 },
  { iata: "LGW", name: "Gatwick",           city: "London",      country: "GB", latitude: 51.1537, longitude: -0.1821 },
  { iata: "STN", name: "Stansted",          city: "London",      country: "GB", latitude: 51.8860, longitude:  0.2389 },
  { iata: "LTN", name: "Luton",             city: "London",      country: "GB", latitude: 51.8747, longitude: -0.3683 },
  { iata: "MAN", name: "Manchester",        city: "Manchester",  country: "GB", latitude: 53.3537, longitude: -2.2750 },
  { iata: "BHX", name: "Birmingham",        city: "Birmingham",  country: "GB", latitude: 52.4539, longitude: -1.7480 },
  { iata: "EDI", name: "Edinburgh",         city: "Edinburgh",   country: "GB", latitude: 55.9500, longitude: -3.3725 },
  { iata: "GLA", name: "Glasgow",           city: "Glasgow",     country: "GB", latitude: 55.8642, longitude: -4.4330 },
  { iata: "BRS", name: "Bristol",           city: "Bristol",     country: "GB", latitude: 51.3827, longitude: -2.7191 },
  { iata: "NCL", name: "Newcastle",         city: "Newcastle",   country: "GB", latitude: 55.0375, longitude: -1.6917 },
  { iata: "DUB", name: "Dublin",            city: "Dublin",      country: "IE", latitude: 53.4213, longitude: -6.2701 },
  // Europe
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris",       country: "FR", latitude: 49.0097, longitude:  2.5479 },
  { iata: "ORY", name: "Orly",              city: "Paris",       country: "FR", latitude: 48.7233, longitude:  2.3794 },
  { iata: "AMS", name: "Schiphol",          city: "Amsterdam",   country: "NL", latitude: 52.3105, longitude:  4.7683 },
  { iata: "FRA", name: "Frankfurt",         city: "Frankfurt",   country: "DE", latitude: 50.0379, longitude:  8.5622 },
  { iata: "MUC", name: "Munich",            city: "Munich",      country: "DE", latitude: 48.3538, longitude: 11.7861 },
  { iata: "BER", name: "Brandenburg",       city: "Berlin",      country: "DE", latitude: 52.3667, longitude: 13.5033 },
  { iata: "MAD", name: "Barajas",           city: "Madrid",      country: "ES", latitude: 40.4983, longitude: -3.5676 },
  { iata: "BCN", name: "El Prat",           city: "Barcelona",   country: "ES", latitude: 41.2974, longitude:  2.0833 },
  { iata: "FCO", name: "Fiumicino",         city: "Rome",        country: "IT", latitude: 41.8003, longitude: 12.2389 },
  { iata: "MXP", name: "Malpensa",          city: "Milan",       country: "IT", latitude: 45.6306, longitude:  8.7281 },
  { iata: "ZRH", name: "Zürich",            city: "Zürich",      country: "CH", latitude: 47.4647, longitude:  8.5492 },
  { iata: "VIE", name: "Vienna",            city: "Vienna",      country: "AT", latitude: 48.1103, longitude: 16.5697 },
  { iata: "CPH", name: "Copenhagen",        city: "Copenhagen",  country: "DK", latitude: 55.6180, longitude: 12.6561 },
  { iata: "ARN", name: "Arlanda",           city: "Stockholm",   country: "SE", latitude: 59.6519, longitude: 17.9186 },
  { iata: "OSL", name: "Gardermoen",        city: "Oslo",        country: "NO", latitude: 60.1939, longitude: 11.1004 },
  { iata: "HEL", name: "Helsinki",          city: "Helsinki",    country: "FI", latitude: 60.3172, longitude: 24.9633 },
  { iata: "LIS", name: "Humberto Delgado",  city: "Lisbon",      country: "PT", latitude: 38.7813, longitude: -9.1359 },
  { iata: "ATH", name: "Eleftherios",       city: "Athens",      country: "GR", latitude: 37.9364, longitude: 23.9445 },
  { iata: "IST", name: "Istanbul",          city: "Istanbul",    country: "TR", latitude: 41.2753, longitude: 28.7519 },
  // Middle East
  { iata: "DXB", name: "Dubai Intl",        city: "Dubai",       country: "AE", latitude: 25.2528, longitude: 55.3644 },
  { iata: "AUH", name: "Abu Dhabi",         city: "Abu Dhabi",   country: "AE", latitude: 24.4330, longitude: 54.6511 },
  { iata: "DOH", name: "Hamad",             city: "Doha",        country: "QA", latitude: 25.2731, longitude: 51.6086 },
  { iata: "MCT", name: "Muscat Intl",       city: "Muscat",      country: "OM", latitude: 23.5933, longitude: 58.2844 },
  { iata: "RUH", name: "King Khalid",       city: "Riyadh",      country: "SA", latitude: 24.9576, longitude: 46.6988 },
  { iata: "JED", name: "King Abdulaziz",    city: "Jeddah",      country: "SA", latitude: 21.6796, longitude: 39.1565 },
  { iata: "TLV", name: "Ben Gurion",        city: "Tel Aviv",    country: "IL", latitude: 32.0114, longitude: 34.8867 },
  { iata: "AMM", name: "Queen Alia",        city: "Amman",       country: "JO", latitude: 31.7226, longitude: 35.9933 },
  // South Asia
  { iata: "DEL", name: "Indira Gandhi",     city: "Delhi",       country: "IN", latitude: 28.5562, longitude: 77.1000 },
  { iata: "BOM", name: "Chhatrapati Shivaji", city: "Mumbai",    country: "IN", latitude: 19.0896, longitude: 72.8656 },
  { iata: "BLR", name: "Kempegowda",        city: "Bengaluru",   country: "IN", latitude: 13.1986, longitude: 77.7066 },
  { iata: "MAA", name: "Chennai Intl",      city: "Chennai",     country: "IN", latitude: 12.9941, longitude: 80.1709 },
  { iata: "HYD", name: "Rajiv Gandhi",      city: "Hyderabad",   country: "IN", latitude: 17.2403, longitude: 78.4294 },
  { iata: "CCU", name: "Netaji Subhas",     city: "Kolkata",     country: "IN", latitude: 22.6547, longitude: 88.4467 },
  { iata: "KHI", name: "Jinnah Intl",       city: "Karachi",     country: "PK", latitude: 24.9008, longitude: 67.1681 },
  { iata: "LHE", name: "Allama Iqbal",      city: "Lahore",      country: "PK", latitude: 31.5216, longitude: 74.4036 },
  { iata: "ISB", name: "Islamabad Intl",    city: "Islamabad",   country: "PK", latitude: 33.5491, longitude: 72.8258 },
  { iata: "LYP", name: "Faisalabad Intl",   city: "Faisalabad",  country: "PK", latitude: 31.3650, longitude: 72.9947 },
  { iata: "PEW", name: "Bacha Khan",        city: "Peshawar",    country: "PK", latitude: 33.9939, longitude: 71.5146 },
  { iata: "MUX", name: "Multan Intl",       city: "Multan",      country: "PK", latitude: 30.2031, longitude: 71.4191 },
  { iata: "DAC", name: "Hazrat Shahjalal",  city: "Dhaka",       country: "BD", latitude: 23.8431, longitude: 90.3978 },
  { iata: "CMB", name: "Bandaranaike",      city: "Colombo",     country: "LK", latitude:  7.1808, longitude: 79.8842 },
  { iata: "KTM", name: "Tribhuvan",         city: "Kathmandu",   country: "NP", latitude: 27.6966, longitude: 85.3591 },
  // East / SE Asia & Oceania
  { iata: "PEK", name: "Beijing Capital",   city: "Beijing",     country: "CN", latitude: 40.0801, longitude: 116.5846 },
  { iata: "PVG", name: "Pudong",            city: "Shanghai",    country: "CN", latitude: 31.1443, longitude: 121.8083 },
  { iata: "HKG", name: "Hong Kong Intl",    city: "Hong Kong",   country: "HK", latitude: 22.3080, longitude: 113.9185 },
  { iata: "SIN", name: "Changi",            city: "Singapore",   country: "SG", latitude:  1.3644, longitude: 103.9915 },
  { iata: "BKK", name: "Suvarnabhumi",      city: "Bangkok",     country: "TH", latitude: 13.6900, longitude: 100.7501 },
  { iata: "KUL", name: "Kuala Lumpur Intl", city: "Kuala Lumpur",country: "MY", latitude:  2.7456, longitude: 101.7099 },
  { iata: "CGK", name: "Soekarno-Hatta",    city: "Jakarta",     country: "ID", latitude: -6.1256, longitude: 106.6558 },
  { iata: "MNL", name: "Ninoy Aquino",      city: "Manila",      country: "PH", latitude: 14.5086, longitude: 121.0194 },
  { iata: "ICN", name: "Incheon",           city: "Seoul",       country: "KR", latitude: 37.4602, longitude: 126.4407 },
  { iata: "NRT", name: "Narita",            city: "Tokyo",       country: "JP", latitude: 35.7720, longitude: 140.3929 },
  { iata: "HND", name: "Haneda",            city: "Tokyo",       country: "JP", latitude: 35.5494, longitude: 139.7798 },
  { iata: "SYD", name: "Kingsford Smith",   city: "Sydney",      country: "AU", latitude: -33.9399, longitude: 151.1753 },
  { iata: "MEL", name: "Tullamarine",       city: "Melbourne",   country: "AU", latitude: -37.6733, longitude: 144.8433 },
  { iata: "AKL", name: "Auckland",          city: "Auckland",    country: "NZ", latitude: -37.0082, longitude: 174.7850 },
  // Africa
  { iata: "CAI", name: "Cairo Intl",        city: "Cairo",       country: "EG", latitude: 30.1219, longitude: 31.4056 },
  { iata: "JNB", name: "OR Tambo",          city: "Johannesburg",country: "ZA", latitude: -26.1392, longitude: 28.2460 },
  { iata: "CPT", name: "Cape Town Intl",    city: "Cape Town",   country: "ZA", latitude: -33.9648, longitude: 18.6017 },
  { iata: "NBO", name: "Jomo Kenyatta",     city: "Nairobi",     country: "KE", latitude: -1.3192, longitude: 36.9278 },
  { iata: "LOS", name: "Murtala Muhammed",  city: "Lagos",       country: "NG", latitude:  6.5774, longitude:  3.3211 },
  { iata: "CMN", name: "Mohammed V",        city: "Casablanca",  country: "MA", latitude: 33.3675, longitude: -7.5898 },
  // Americas
  { iata: "JFK", name: "JFK",               city: "New York",    country: "US", latitude: 40.6413, longitude: -73.7781 },
  { iata: "EWR", name: "Newark",            city: "New York",    country: "US", latitude: 40.6895, longitude: -74.1745 },
  { iata: "LAX", name: "Los Angeles Intl",  city: "Los Angeles", country: "US", latitude: 33.9416, longitude: -118.4085 },
  { iata: "SFO", name: "San Francisco Intl",city: "San Francisco",country:"US", latitude: 37.6213, longitude: -122.3790 },
  { iata: "ORD", name: "O'Hare",            city: "Chicago",     country: "US", latitude: 41.9742, longitude: -87.9073 },
  { iata: "DFW", name: "Dallas/Fort Worth", city: "Dallas",      country: "US", latitude: 32.8998, longitude: -97.0403 },
  { iata: "MIA", name: "Miami Intl",        city: "Miami",       country: "US", latitude: 25.7959, longitude: -80.2870 },
  { iata: "SEA", name: "Sea-Tac",           city: "Seattle",     country: "US", latitude: 47.4502, longitude: -122.3088 },
  { iata: "BOS", name: "Logan",             city: "Boston",      country: "US", latitude: 42.3656, longitude: -71.0096 },
  { iata: "YYZ", name: "Pearson",           city: "Toronto",     country: "CA", latitude: 43.6777, longitude: -79.6248 },
  { iata: "YVR", name: "Vancouver Intl",    city: "Vancouver",   country: "CA", latitude: 49.1967, longitude: -123.1815 },
  { iata: "MEX", name: "Benito Juárez",     city: "Mexico City", country: "MX", latitude: 19.4361, longitude: -99.0719 },
  { iata: "GRU", name: "Guarulhos",         city: "São Paulo",   country: "BR", latitude: -23.4356, longitude: -46.4731 },
  { iata: "EZE", name: "Ministro Pistarini",city: "Buenos Aires",country: "AR", latitude: -34.8222, longitude: -58.5358 },
];

export function nearestAirport(lat: number, lon: number, sameCountry?: string): Airport | null {
  let best: Airport | null = null;
  let bestKm = Infinity;
  const pool = sameCountry ? AIRPORTS.filter(a => a.country === sameCountry) : AIRPORTS;
  for (const a of (pool.length ? pool : AIRPORTS)) {
    const d = haversineKm(lat, lon, a.latitude, a.longitude);
    if (d < bestKm) { bestKm = d; best = a; }
  }
  return best;
}

export function distanceKmTo(lat: number, lon: number, a: Airport): number {
  return haversineKm(lat, lon, a.latitude, a.longitude);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const la1 = lat1 * Math.PI / 180;
  const la2 = lat2 * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}