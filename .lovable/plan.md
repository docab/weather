# Weatherer v2 — Full Redesign

This is large enough that I want to confirm ordering before I ship. Below is the complete scope grouped into phases. I'll build phase-by-phase in one continuous pass unless you tell me to reorder.

## Foundations (shared plumbing everything else needs)

1. **DetailModal component** — reusable blurred-backdrop sheet that opens when any card is tapped, dismisses on outside tap. Used by ~10 cards.
2. **Explainer library** (`lib/explainers.ts`) — plain-English descriptions for every metric (UV, humidity, pressure, dew point, precip %, cloud cover types cirrus/altocumulus/stratus, wind speeds, visibility, etc.) with "what it means for you" copy.
3. **Scroll-link anchors** — tapping `Rain`/`UV`/`Humidity` in the hero scrolls to the matching card on the Now tab.
4. **Provider switching** (`lib/providers.ts`) — abstract fetch layer supporting Open-Meteo, MET Norway (yr.no), and Foreca (public). Apple Weather requires a paid dev key so I'll list it as "coming soon" rather than fake it. Setting lives in Settings; a nudge banner asks "Is it raining?" and auto-swaps to the provider that agrees with reality.
5. **Official warnings feed** — UK Met Office DataHub for UK, US NWS for US, MeteoAlarm for EU (all free CAP feeds). Colour-coded amber/red badges on the hero warning strip.

## Now tab restructure (in this exact order)

6. **LiveBanner** (unchanged position)
7. **Next2HoursCard** — independent city selector, minute-level rain nowcast + micro-forecast, does NOT change the rest of the tab.
8. **Saved city selector** (existing LocationTabs, restyled smaller)
9. **WeatherHero** — tappable metrics scroll to cards; wind area gets a blurred frosted-glass tree-branch SVG that sways at real wind speed.
10. **Flashing warnings strip** — official + derived warnings, pulsing amber/red.
11. **HowItFeelsCard** (renamed from "How it'll feel") — focused on now + next 2h; tap opens modal with pattern-grouped day narrative ("5–7am drizzle, keep brolly", "8am–2pm partly cloudy, great outside") built from clustering hourly codes.
12. **SmartAlertsCard** — regrouped: `Now`, then pattern-clustered future windows (not fixed 8–12/1–5). Rolls forward as the day passes; when a card crosses midnight it prefixes the date ("Tomorrow 6am").
13. **SuggestionsCard** — new. Absorbs Wear + Umbrella + Fragrance. Adds water, antihistamines (if Me→hayfever), sweat estimate in wear, and AI-generated bespoke tips via Lovable AI gateway.
14. **RainCard** — persistent (no more 2h auto-hide, no blinking). Shows precip %, mm, descriptive amount, cloud cover with cirrus/altocumulus/stratus explainer, ceiling. Explains "75% chance = confidence × area coverage, your hyperlocal spot may fall outside".
15. **HourlyStrip → HourlySlider** — swipeable carousel with today/tomorrow date pills that slide as you scroll past midnight; tap an hour for a tooltip popover with full metrics; each cell tinted by weather+temp.
16. **PollenCard, AqiCard** (existing, minor polish)
17. **MoreCard** — new. Daily averages, wind detail with gust/direction/beaufort, pressure with trend + explainer ("falling pressure often means unsettled weather within 12h"), humidity, dew point, visibility, sun hours. Every metric has an inline explainer.
18. **WeatherRadarCard** (existing)

## Glance tab
- Rework each saved-location tile to show DAILY overview: high/low, feels-like range, rain-at-time, pollen, AQI. Not "current-now" style.
- Fix text/background merging (increase scrim contrast, add text-shadow, remove semi-transparent fg on light hero states).

## Forecast tab
- Each day is a collapsible accordion. Collapsed = today's current compact row.
- Expanded = Now-tab-style detail minus Wear/Fragrance/SmartAlerts/Map/Radar. Focused outlook (morning/afternoon/evening/night narrative) instead of full detail dump.
- Extend from 7 to 10 days (Open-Meteo supports up to 16).

## Sky tab
- **MoonCard** — merges every moon-related detail from other cards (phase, illumination, rise/set, age, distance, next full/new).
- **SunCard** — beautiful sunrise/sunset sections with golden-hour, blue-hour, day-length, solar noon.
- **LookUpCard** — merges "What's overhead" + "Tonight's outlook" + "Visible tonight" into one card with three sections: `Overhead now`, `Tonight`, `Visible tonight` (planets).
- Remove sun/moon duplication from other cards (hero, briefing).

## Me tab
- Deepen photography: sub-genre picker (Landscape / Street / Wildlife / Fashion / Astro / Aviation / Architecture), each with best-window suggestions, ideal conditions, sample camera settings (ISO/aperture/shutter). Storm = bad for aviation, great for dramatic street. Astro gets moon-phase + Bortle-approx + clear-window logic.
- Add health-specific advice for each flag (asthma → ozone+pollen combined risk; migraine → pressure-drop alerts; arthritis → cold+damp; heart → heat stress).
- Add hobby packs (cyclist, runner, angler, birder) with tailored windows.
- Wake/bed integration: alerts filtered to waking hours.

## Travel tab
- Replace "Going to" saved-only picker with worldwide address search (Nominatim) + quick-access chips for saved places.
- Add visibility, road spray, crosswind risk to RoadConditions.
- Add "clothes for arrival" that respects destination timezone weather at arrival hour.
- Multi-leg support: if flight, split into home→origin-airport (road), flight (cruise-alt weather noted), destination-airport→destination (road).

## Settings
- Weather provider selector (Open-Meteo default, MET Norway, Foreca, "Apple – coming soon").
- Auto-switch toggle: "If forecast disagrees with reality, ask me."

## Animations
- Frosted-glass swaying tree branch SVG for wind (WindFX component).
- Rain drop density strictly by mm/h (drizzle <0.5, light 0.5–2, mod 2–7, heavy >7).
- Detail modal: scale-fade-blur backdrop.
- Hourly slider snap + inertia.

## Deferred / not doing unless you insist
- **Apple Weather integration** — requires paid Apple Developer account + WeatherKit JWT signing.
- **Community observations** — needs auth + moderation, out of scope for a single pass.
- **True learning "Personal Weather Intelligence"** — would need persistent per-user store; will do local heuristics only.

## Order of build
Foundations (1–5) → Now tab (6–18) → Glance → Forecast → Sky → Me → Travel → Settings → Animations pass → polish.

Estimated: this is a very large single pass. If any phase should be dropped, cut now — otherwise I'll ship the whole thing.
