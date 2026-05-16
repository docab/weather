import type { CSSProperties } from "react";
import { describeWeather } from "@/lib/weatherCodes";
import type { WeatherData } from "@/lib/types";

/* -----------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------*/
function rand(min: number, max: number, seed: number) {
  // tiny deterministic pseudo-random so SSR/CSR match
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  const r = x - Math.floor(x);
  return min + r * (max - min);
}
function arr(n: number) { return Array.from({ length: n }); }

/* -----------------------------------------------------------------------
 * <WeatherFX>  – picks the right effect for a weather code.
 * Renders an absolutely-positioned layer; parent should be `relative`.
 * ---------------------------------------------------------------------*/
export function WeatherFX({ weather, intensity = 1 }: { weather: WeatherData; intensity?: number }) {
  const code = weather.weatherCode;
  const isDay = weather.isDay;
  const info = describeWeather(code, isDay);

  const isThunder = code >= 95;
  const isHail    = code === 96 || code === 99;
  const isSnow    = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const isRain    = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || isThunder;
  const isFog     = code === 45 || code === 48;
  const isWindy   = weather.windSpeed >= 18;
  const cloud     = weather.cloudCover;
  const visKm     = weather.visibility ? weather.visibility / 1000 : 99;
  const isMist    = !isFog && !isRain && !isSnow && weather.humidity >= 92;
  const isFrost   = !isRain && !isSnow && weather.feelsLike <= 0;
  const isDust    = !isRain && !isSnow && !isFog && weather.humidity < 35 && (visKm < 5 || weather.windSpeed >= 25);
  const isTornado = (weather.windGust ?? 0) >= 95 || weather.windSpeed >= 70;
  const isSmoke   = !isRain && !isFog && !isDust && visKm < 4 && weather.humidity < 60;
  const isHaze    = !isRain && !isFog && !isDust && !isSmoke && visKm < 8 && weather.humidity >= 60 && weather.humidity < 90;
  const isPartly  = !isRain && !isSnow && !isFog && cloud >= 25 && cloud < 70;

  return (
    <div className="fx-layer">
      {/* night stars */}
      {!isDay && cloud < 70 && <Stars count={26} />}
      {/* clear-sky atmospheric haze for empty days/nights */}
      {cloud < 25 && !isFog && !isRain && !isSnow && <ClearAir warm={weather.feelsLike >= 22} day={isDay} />}
      {/* clouds — always show some when cloudy. Multi-layered for depth. */}
      {(cloud > 18 || isFog || isRain || isSnow) && <Clouds density={cloud} day={isDay} />}
      {/* sun rays for clear day */}
      {isDay && info.sky === "clear" && <SunRays />}
      {/* sun peeking through gaps for partly-cloudy day */}
      {isDay && isPartly && <SunRays warm={weather.feelsLike >= 22} />}
      {/* fog */}
      {isFog && <Fog />}
      {/* mist — humid but not full fog */}
      {isMist && <Mist />}
      {/* haze — moderate humidity, soft veil */}
      {isHaze && <Haze />}
      {/* smoke — wildfire / industrial smoke */}
      {isSmoke && <Smoke intensity={intensity} />}
      {/* rain */}
      {isRain && !isSnow && <Rain heavy={code === 65 || code === 67 || code === 82 || isThunder} intensity={intensity} />}
      {/* hail */}
      {isHail && <Hail />}
      {/* snow */}
      {isSnow && <Snow heavy={code === 75 || code === 86} />}
      {/* dust / sand storm */}
      {isDust && <SandStorm intensity={intensity} />}
      {/* tornado / whirlwind */}
      {isTornado && <Tornado />}
      {/* wind streaks */}
      {isWindy && !isRain && !isSnow && !isDust && !isTornado && <Wind />}
      {/* freezing-cold frost crystals overlay */}
      {isFrost && <Frost />}
      {/* lightning */}
      {isThunder && <Lightning />}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Individual effect layers
 * ---------------------------------------------------------------------*/
export function Rain({ heavy, intensity = 1 }: { heavy?: boolean; intensity?: number }) {
  const drops = Math.round((heavy ? 70 : 40) * intensity);
  return (
    <div className="fx-layer">
      {arr(drops).map((_, i) => {
        const left = rand(0, 100, i + 1);
        const dur = rand(0.45, 0.9, i + 7);
        const delay = rand(0, 1.5, i + 13);
        const len = rand(8, heavy ? 22 : 16, i + 19);
        const op = rand(0.25, 0.6, i + 23);
        return (
          <span key={i} style={{
            position: "absolute",
            top: 0, left: `${left}%`,
            width: 1, height: `${len}px`,
            background: `linear-gradient(to bottom, transparent, hsl(200 70% 80% / ${op}))`,
            animation: `fx-rain ${dur}s linear ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

export function Snow({ heavy }: { heavy?: boolean }) {
  const flakes = heavy ? 50 : 30;
  return (
    <div className="fx-layer">
      {arr(flakes).map((_, i) => {
        const left = rand(0, 100, i + 2);
        const size = rand(2, heavy ? 6 : 4, i + 11);
        const dur = rand(6, 14, i + 17);
        const delay = rand(0, 8, i + 19);
        return (
          <span key={i} style={{
            position: "absolute", top: "-5%", left: `${left}%`,
            width: size, height: size, borderRadius: "50%",
            background: "hsl(210 40% 96% / .85)",
            boxShadow: "0 0 6px hsl(210 40% 96% / .5)",
            animation: `fx-snow ${dur}s linear ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

/* Soft, multi-layer cumulus clouds with parallax depth. Smaller blurry
 * clouds drift slowly in the background, larger sharper clouds drift
 * faster in front, creating a much more natural sky than a single row. */
export function Clouds({ density = 60, day = true }: { density?: number; day?: boolean }) {
  const layers = [
    { count: 3, top: [4, 22],  scale: 0.55, dur: [180, 240], blur: 6,   opacityMul: 0.65, z: 0 },
    { count: 3, top: [12, 42], scale: 0.85, dur: [110, 170], blur: 3,   opacityMul: 0.85, z: 1 },
    { count: density > 70 ? 3 : 2, top: [22, 60], scale: 1.15, dur: [70, 120], blur: 1.5, opacityMul: 1, z: 2 },
  ];
  // colour shifts with day/night and density (overcast = slightly darker)
  const lightness = density > 80 ? (day ? 78 : 38) : (day ? 88 : 50);
  const fill = `hsl(210 18% ${lightness}%)`;
  const baseOpacity = Math.min(0.78, 0.22 + density / 220);
  let key = 0;
  return (
    <div className="fx-layer" aria-hidden>
      {layers.flatMap((L, li) =>
        arr(L.count).map(() => {
          key++;
          const top = rand(L.top[0], L.top[1], key + 5);
          const dur = rand(L.dur[0], L.dur[1], key + 9);
          const delay = -rand(0, dur, key + 13);
          const scale = L.scale * rand(0.85, 1.15, key + 17);
          const opacity = baseOpacity * L.opacityMul * rand(0.85, 1, key + 19);
          const w = 200 * scale;
          return (
            <div key={`c-${li}-${key}`} style={{
              position: "absolute", top: `${top}%`, left: 0,
              width: `${w}px`, height: `${w * 0.45}px`,
              opacity,
              animation: `fx-drift ${dur}s linear ${delay}s infinite`,
              filter: `blur(${L.blur}px)`,
            } as CSSProperties}>
              <CloudPuff fill={fill} seed={key} />
            </div>
          );
        })
      )}
    </div>
  );
}

/* A single soft cumulus drawn from layered ellipses for a fluffy edge. */
function CloudPuff({ fill, seed }: { fill: string; seed: number }) {
  // slight pseudo-random variation per cloud
  const a = rand(0.9, 1.1, seed + 1);
  const b = rand(0.9, 1.1, seed + 2);
  return (
    <svg viewBox="0 0 200 90" preserveAspectRatio="none" width="100%" height="100%"
         style={{ animation: `fx-cloud-puff ${10 + (seed % 7)}s ease-in-out infinite` } as CSSProperties}>
      <g fill={fill}>
        <ellipse cx={50}  cy={62 * a} rx={36}     ry={22} opacity=".75"/>
        <ellipse cx={88}  cy={48 * b} rx={42}     ry={28} opacity=".90"/>
        <ellipse cx={132} cy={56}     rx={40 * a} ry={26} opacity=".85"/>
        <ellipse cx={162} cy={66}     rx={28}     ry={20} opacity=".70"/>
        <ellipse cx={108} cy={70}     rx={56}     ry={18} opacity=".55"/>
      </g>
    </svg>
  );
}

/* Empty-sky atmospheric gradient — a hint of warmth at the horizon and
 * a couple of slow-moving wisps so a "clear" sky doesn't look static. */
export function ClearAir({ warm, day }: { warm?: boolean; day?: boolean }) {
  const top = day ? (warm ? "hsl(28 80% 18% / 0)" : "hsl(210 70% 14% / 0)") : "hsl(232 50% 8% / 0)";
  const bot = day ? (warm ? "hsl(20 90% 30% / .55)" : "hsl(200 70% 28% / .55)") : "hsl(240 60% 14% / .55)";
  return (
    <div className="fx-layer">
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, ${top} 0%, ${bot} 100%)`,
        animation: "fx-haze 14s ease-in-out infinite",
      } as CSSProperties}/>
      {arr(2).map((_, i) => (
        <div key={i} style={{
          position: "absolute", top: `${20 + i * 25}%`, left: 0,
          width: "60%", height: "12%",
          background: "radial-gradient(ellipse at center, hsl(0 0% 100% / .08), transparent 70%)",
          filter: "blur(10px)",
          animation: `fx-drift ${220 + i * 60}s linear ${-i * 80}s infinite`,
        } as CSSProperties}/>
      ))}
    </div>
  );
}

/* Mist — humid, hazy, low contrast veil that breathes in and out. */
export function Mist() {
  return (
    <div className="fx-layer">
      {arr(4).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${10 + i * 22}%`, left: "-20%", right: "-20%", height: "28%",
          background: "linear-gradient(90deg, transparent, hsl(200 25% 80% / .35), transparent)",
          filter: "blur(14px)",
          animation: `fx-mist ${22 + i * 4}s ease-in-out ${-i * 5}s infinite`,
        } as CSSProperties}/>
      ))}
    </div>
  );
}

/* Frost — pale crystalline shimmer at the edges (sub-zero conditions). */
export function Frost() {
  return (
    <div className="fx-layer">
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(120% 60% at 50% 0%, hsl(200 60% 95% / .18), transparent 55%),\
           radial-gradient(120% 60% at 50% 100%, hsl(200 60% 95% / .18), transparent 55%)",
        animation: "fx-frost 8s ease-in-out infinite",
      } as CSSProperties}/>
      {/* corner frost crystals */}
      {[
        { t: "0%",   l: "0%",   r: 0   },
        { t: "0%",   l: "auto", r: 0, right: "0%" },
        { t: "auto", b: "0%",   l: "0%" },
        { t: "auto", b: "0%",   l: "auto", right: "0%" },
      ].map((p: any, i) => (
        <svg key={i} viewBox="0 0 100 100" width="120" height="120" style={{
          position: "absolute", top: p.t, bottom: p.b, left: p.l, right: p.right,
          opacity: 0.35, animation: `fx-frost ${6 + i}s ease-in-out ${-i}s infinite`,
        } as CSSProperties}>
          <g stroke="hsl(200 60% 95%)" strokeWidth="0.6" fill="none" opacity=".7">
            {arr(6).map((_, k) => {
              const a = (k * Math.PI) / 3;
              const x = 50 + Math.cos(a) * 35;
              const y = 50 + Math.sin(a) * 35;
              return <line key={k} x1="50" y1="50" x2={x} y2={y}/>;
            })}
          </g>
        </svg>
      ))}
    </div>
  );
}

/* Hail — small bouncing white pellets falling fast. */
export function Hail() {
  const n = 35;
  return (
    <div className="fx-layer">
      {arr(n).map((_, i) => {
        const left = rand(0, 100, i + 211);
        const dur = rand(0.6, 1.1, i + 217);
        const delay = rand(0, 1.5, i + 223);
        const size = rand(3, 6, i + 227);
        return (
          <span key={i} style={{
            position: "absolute", top: 0, left: `${left}%`,
            width: size, height: size, borderRadius: "50%",
            background: "radial-gradient(circle, hsl(210 30% 96%), hsl(210 20% 70%))",
            boxShadow: "0 0 4px hsl(210 50% 95% / .8)",
            animation: `fx-hail ${dur}s linear ${delay}s infinite`,
          } as CSSProperties}/>
        );
      })}
    </div>
  );
}

/* Sand / dust storm — orange-brown horizontal gusts. */
export function SandStorm({ intensity = 1 }: { intensity?: number }) {
  const gusts = Math.round(8 * intensity);
  return (
    <div className="fx-layer" style={{
      background: "linear-gradient(180deg, hsl(28 70% 35% / .25), hsl(20 60% 25% / .55))",
    } as CSSProperties}>
      {arr(gusts).map((_, i) => {
        const top = rand(0, 90, i + 301);
        const dur = rand(2.4, 5, i + 307);
        const delay = rand(0, 4, i + 311);
        const h = rand(40, 120, i + 313);
        return (
          <div key={i} style={{
            position: "absolute", top: `${top}%`, left: 0,
            width: "60%", height: `${h}px`,
            background: "radial-gradient(ellipse at center, hsl(28 80% 55% / .55), transparent 70%)",
            filter: "blur(10px)",
            animation: `fx-dust ${dur}s linear ${delay}s infinite`,
          } as CSSProperties}/>
        );
      })}
      {/* fast streaks */}
      {arr(20).map((_, i) => {
        const top = rand(5, 95, i + 331);
        const dur = rand(1.2, 2.4, i + 337);
        const delay = rand(0, 2.5, i + 341);
        const len = rand(80, 220, i + 343);
        return (
          <span key={`s${i}`} style={{
            position: "absolute", top: `${top}%`, left: 0,
            width: `${len}px`, height: 1,
            background: "linear-gradient(to right, transparent, hsl(28 80% 70% / .65), transparent)",
            animation: `fx-wind ${dur}s linear ${delay}s infinite`,
          } as CSSProperties}/>
        );
      })}
    </div>
  );
}


export function Fog() {
  return (
    <div className="fx-layer">
      {arr(3).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${20 + i * 25}%`, left: 0, right: 0, height: "30%",
          background: `radial-gradient(ellipse at center, hsl(210 18% 70% / .35), transparent 70%)`,
          animation: `fx-fog ${20 + i * 6}s ease-in-out ${-i * 4}s infinite alternate`,
          filter: "blur(8px)",
        } as CSSProperties} />
      ))}
    </div>
  );
}

export function Wind() {
  return (
    <div className="fx-layer">
      {arr(8).map((_, i) => {
        const top = rand(10, 90, i + 31);
        const dur = rand(2.4, 4.2, i + 37);
        const delay = rand(0, 4, i + 41);
        const len = rand(60, 160, i + 43);
        return (
          <span key={i} style={{
            position: "absolute", top: `${top}%`, left: 0,
            width: `${len}px`, height: 1,
            background: "linear-gradient(to right, transparent, hsl(0 0% 100% / .6), transparent)",
            animation: `fx-wind ${dur}s linear ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

export function Lightning() {
  return (
    <div className="fx-layer" style={{
      background: "radial-gradient(circle at 30% 0%, hsl(60 100% 90% / .9), transparent 40%)",
      mixBlendMode: "screen",
      animation: "fx-flicker 6s linear infinite",
    } as CSSProperties}>
      <svg viewBox="0 0 100 200" preserveAspectRatio="none" style={{
        position: "absolute", top: 0, left: "28%", width: 80, height: "80%",
        animation: "fx-bolt 6s linear infinite",
      } as CSSProperties}>
        <path d="M55 0 L40 80 L60 80 L30 200 L70 90 L48 90 L70 0 Z"
              fill="hsl(56 100% 80%)" stroke="hsl(56 100% 95%)" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function SunRays({ warm }: { warm?: boolean }) {
  const c = warm ? "28 95% 65%" : "48 95% 70%";
  return (
    <div className="fx-layer" style={{
      background: `radial-gradient(circle at 80% 10%, hsl(${c} / .55), transparent 45%)`,
    } as CSSProperties}>
      <div style={{
        position: "absolute", top: "-30%", right: "-20%",
        width: 240, height: 240, borderRadius: "50%",
        background: `radial-gradient(circle, hsl(${c} / .9), hsl(${c} / 0) 65%)`,
        animation: "fx-sun-pulse 6s ease-in-out infinite",
        filter: "blur(2px)",
      } as CSSProperties} />
    </div>
  );
}

export function Stars({ count = 30 }: { count?: number }) {
  return (
    <div className="fx-layer">
      {arr(count).map((_, i) => {
        const top = rand(0, 80, i + 51);
        const left = rand(0, 100, i + 53);
        const size = rand(1, 2.4, i + 57);
        const dur = rand(2, 5, i + 59);
        const delay = rand(0, 4, i + 61);
        return (
          <span key={i} style={{
            position: "absolute", top: `${top}%`, left: `${left}%`,
            width: size, height: size, borderRadius: "50%",
            background: "hsl(210 100% 95%)",
            boxShadow: "0 0 4px hsl(210 100% 95% / .8)",
            animation: `fx-twinkle ${dur}s ease-in-out ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Aurora & Meteor — used by Stars tab + as full-tab backgrounds
 * ---------------------------------------------------------------------*/
export function AuroraFX({ active = false }: { active?: boolean }) {
  const opacity = active ? 1 : 0.35;
  return (
    <div className="fx-layer" style={{ opacity } as CSSProperties}>
      {arr(3).map((_, i) => (
        <div key={i} style={{
          position: "absolute", left: "-10%", right: "-10%",
          top: `${10 + i * 18}%`,
          height: "40%",
          background: i === 0
            ? "linear-gradient(120deg, transparent 0%, hsl(140 80% 55% / .8) 30%, hsl(180 80% 60% / .7) 55%, hsl(280 70% 60% / .6) 80%, transparent 100%)"
            : i === 1
            ? "linear-gradient(120deg, transparent 5%, hsl(160 80% 55% / .55) 35%, hsl(200 80% 60% / .55) 70%, transparent 100%)"
            : "linear-gradient(120deg, transparent 10%, hsl(290 70% 60% / .45) 40%, hsl(320 70% 60% / .4) 70%, transparent 100%)",
          filter: "blur(28px)",
          mixBlendMode: "screen",
          animation: `fx-aurora ${14 + i * 4}s ease-in-out ${-i * 3}s infinite alternate`,
        } as CSSProperties} />
      ))}
    </div>
  );
}

export function MeteorFX({ active = false, count = 6 }: { active?: boolean; count?: number }) {
  const n = active ? count + 4 : count;
  return (
    <div className="fx-layer">
      <Stars count={active ? 60 : 40} />
      {arr(n).map((_, i) => {
        const top = rand(-5, 60, i + 71);
        const right = rand(-10, 90, i + 73);
        const dur = rand(1.6, 3.2, i + 79);
        const delay = rand(0, 8, i + 83);
        return (
          <span key={i} style={{
            position: "absolute", top: `${top}%`, right: `${right}%`,
            width: 140, height: 1,
            background: "linear-gradient(to right, hsl(40 100% 90% / .95), transparent)",
            boxShadow: "0 0 6px hsl(40 100% 90% / .9)",
            animation: `fx-meteor ${dur}s linear ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Pollen & AQI dust particles
 * ---------------------------------------------------------------------*/
export function PollenFX({ severity = 0 }: { severity?: number }) {
  const count = 14 + severity * 12;
  const colours = ["hsl(56 90% 70%)", "hsl(40 90% 65%)", "hsl(80 70% 65%)", "hsl(28 90% 70%)"];
  return (
    <div className="fx-layer">
      {arr(count).map((_, i) => {
        const left = rand(0, 100, i + 91);
        const size = rand(3, 7, i + 93);
        const dur = rand(8, 18, i + 97);
        const delay = rand(0, 8, i + 101);
        const x = rand(-30, 30, i + 103);
        const c = colours[i % colours.length];
        return (
          <span key={i} style={{
            position: "absolute", bottom: "-5%", left: `${left}%`,
            width: size, height: size, borderRadius: "50%",
            background: `radial-gradient(circle, ${c}, ${c.replace(")", " / 0)")} 70%)`,
            boxShadow: `0 0 6px ${c}`,
            "--fx-x": `${x}px`,
            animation: `fx-float-up ${dur}s linear ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

export function AqiFX({ severity = 0 }: { severity?: number }) {
  const count = 18 + severity * 14;
  return (
    <div className="fx-layer">
      {arr(count).map((_, i) => {
        const top = rand(0, 100, i + 111);
        const dur = rand(20, 50, i + 117);
        const delay = -rand(0, dur, i + 119);
        const size = rand(40, 110, i + 121);
        const op = 0.05 + severity * 0.08;
        return (
          <div key={i} style={{
            position: "absolute", top: `${top}%`, left: 0,
            width: size, height: size, borderRadius: "50%",
            background: `radial-gradient(circle, hsl(30 50% 50% / ${op}), transparent 70%)`,
            filter: "blur(6px)",
            animation: `fx-drift-slow ${dur}s linear ${delay}s infinite`,
          } as CSSProperties} />
        );
      })}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Perfume notes — floating little SVG icons matched to fragrance notes.
 * No text — just glyphs (leaf, droplet, citrus slice, wood ring, flower…).
 * ---------------------------------------------------------------------*/
type NoteGlyph = "citrus" | "leaf" | "wood" | "flower" | "drop" | "spice" | "amber" | "smoke";

const NOTE_MAP: Record<string, { glyph: NoteGlyph; color: string }> = {
  // citrus
  bergamot: { glyph: "citrus", color: "48 90% 65%" },
  lemon:    { glyph: "citrus", color: "55 95% 65%" },
  orange:   { glyph: "citrus", color: "28 95% 60%" },
  neroli:   { glyph: "flower", color: "48 80% 80%" },
  // greens / herbal
  "green tea":   { glyph: "leaf", color: "120 50% 60%" },
  sage:          { glyph: "leaf", color: "150 35% 55%" },
  rosemary:      { glyph: "leaf", color: "140 40% 55%" },
  lavender:      { glyph: "flower", color: "260 50% 70%" },
  mint:          { glyph: "leaf", color: "160 60% 60%" },
  "violet leaf": { glyph: "leaf", color: "270 35% 60%" },
  moss:          { glyph: "leaf", color: "100 35% 45%" },
  petrichor:     { glyph: "drop", color: "200 50% 65%" },
  rain:          { glyph: "drop", color: "210 70% 70%" },
  // florals / soft
  iris:    { glyph: "flower", color: "280 35% 75%" },
  fig:     { glyph: "leaf", color: "90 35% 55%" },
  cotton:  { glyph: "flower", color: "0 0% 95%" },
  musk:    { glyph: "amber", color: "30 40% 70%" },
  "white tea": { glyph: "leaf", color: "60 25% 80%" },
  // aquatic
  salt:       { glyph: "drop", color: "190 30% 80%" },
  cucumber:   { glyph: "drop", color: "100 50% 70%" },
  "sea breeze": { glyph: "drop", color: "200 60% 75%" },
  "sea salt":   { glyph: "drop", color: "190 30% 80%" },
  ozone:        { glyph: "drop", color: "210 50% 80%" },
  // woods
  cedar:       { glyph: "wood", color: "20 45% 45%" },
  sandalwood:  { glyph: "wood", color: "30 50% 55%" },
  vetiver:     { glyph: "wood", color: "60 30% 45%" },
  // smoke / amber / oud
  incense: { glyph: "smoke", color: "0 0% 70%" },
  smoke:   { glyph: "smoke", color: "0 0% 60%" },
  leather: { glyph: "amber", color: "25 60% 35%" },
  oud:     { glyph: "amber", color: "20 60% 30%" },
  amber:   { glyph: "amber", color: "35 80% 55%" },
  vanilla: { glyph: "amber", color: "40 60% 75%" },
  saffron: { glyph: "spice", color: "20 90% 55%" },
  tonka:   { glyph: "amber", color: "30 55% 50%" },
  benzoin: { glyph: "amber", color: "30 60% 60%" },
  animalic:{ glyph: "smoke", color: "20 30% 35%" },
  "soft amber": { glyph: "amber", color: "35 70% 65%" },
};

function noteFor(name: string): { glyph: NoteGlyph; color: string } {
  return NOTE_MAP[name.toLowerCase()] ?? { glyph: "drop", color: "30 50% 70%" };
}

function NoteGlyph({ glyph, color, size }: { glyph: NoteGlyph; color: string; size: number }) {
  const c = `hsl(${color})`;
  switch (glyph) {
    case "citrus":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <circle cx="12" cy="12" r="9" fill={c} opacity=".25" />
          <circle cx="12" cy="12" r="6.5" fill={c} opacity=".45" />
          <g stroke={c} strokeWidth="0.8" opacity=".7">
            {Array.from({length:8}).map((_,i)=>{
              const a=(i*Math.PI)/4;
              return <line key={i} x1="12" y1="12" x2={12+Math.cos(a)*6} y2={12+Math.sin(a)*6}/>;
            })}
          </g>
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d="M4 20 Q4 6 20 4 Q22 16 8 20 Z" fill={c} opacity=".55" />
          <path d="M6 18 Q12 12 18 6" stroke={c} strokeWidth="0.9" fill="none" />
        </svg>
      );
    case "wood":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <circle cx="12" cy="12" r="9" fill={c} opacity=".35" />
          <circle cx="12" cy="12" r="6" fill="none" stroke={c} strokeWidth="0.9" opacity=".7" />
          <circle cx="12" cy="12" r="3" fill="none" stroke={c} strokeWidth="0.9" opacity=".8" />
          <circle cx="12" cy="12" r="1" fill={c} />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          {Array.from({length:6}).map((_,i)=>{
            const a=(i*Math.PI)/3;
            return <ellipse key={i} cx={12+Math.cos(a)*4} cy={12+Math.sin(a)*4}
                            rx="3.5" ry="2" fill={c} opacity=".55"
                            transform={`rotate(${(i*60)} ${12+Math.cos(a)*4} ${12+Math.sin(a)*4})`} />;
          })}
          <circle cx="12" cy="12" r="2" fill={c} />
        </svg>
      );
    case "drop":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d="M12 3 Q19 13 12 21 Q5 13 12 3 Z" fill={c} opacity=".7" />
          <ellipse cx="10" cy="10" rx="1.5" ry="2.5" fill="white" opacity=".4" />
        </svg>
      );
    case "spice":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          {Array.from({length:5}).map((_,i)=>{
            const a=(i*Math.PI*2)/5;
            return <ellipse key={i} cx={12+Math.cos(a)*4} cy={12+Math.sin(a)*4} rx="1.4" ry="3.2"
                            fill={c} opacity=".7"
                            transform={`rotate(${i*72} ${12+Math.cos(a)*4} ${12+Math.sin(a)*4})`} />;
          })}
        </svg>
      );
    case "amber":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <ellipse cx="12" cy="13" rx="7" ry="8" fill={c} opacity=".75" />
          <ellipse cx="9" cy="9" rx="2" ry="2.5" fill="white" opacity=".35" />
        </svg>
      );
    case "smoke":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d="M6 18 Q3 14 6 12 Q3 8 8 7 Q10 3 14 5 Q19 4 18 9 Q22 11 19 14 Q21 18 16 18 Q14 21 10 19 Q7 21 6 18 Z"
                fill={c} opacity=".55" />
        </svg>
      );
  }
}

export function PerfumeFX({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  // duplicate notes a few times for density
  const items = notes.flatMap((n, idx) => [n, n].map((nn, k) => ({ name: nn, key: idx * 10 + k })));
  return (
    <div className="fx-layer">
      {items.map(({ name, key }, i) => {
        const left = rand(5, 88, key + 131);
        const dur = rand(12, 22, key + 137);
        const delay = rand(0, 12, key + 141);
        const x = rand(-25, 25, key + 143);
        const r = rand(-25, 25, key + 147);
        const size = rand(14, 22, key + 149);
        const { glyph, color } = noteFor(name);
        return (
          <span key={i} style={{
            position: "absolute", bottom: "-8%", left: `${left}%`,
            "--fx-x": `${x}px`,
            "--fx-r": `${r}deg`,
            animation: `fx-note-float ${dur}s ease-in ${delay}s infinite`,
            filter: "drop-shadow(0 2px 4px hsl(0 0% 0% / .35))",
          } as CSSProperties}>
            <span style={{
              display: "inline-block",
              animation: `fx-note-bob ${rand(3, 6, key + 151)}s ease-in-out infinite`,
            } as CSSProperties}>
              <NoteGlyph glyph={glyph} color={color} size={size} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Animated sun & moon icons
 * ---------------------------------------------------------------------*/
export function AnimatedSun({ size = 64, warm }: { size?: number; warm?: boolean }) {
  const colour = warm ? "hsl(28 95% 60%)" : "hsl(48 95% 60%)";
  return (
    <div style={{ position: "relative", width: size, height: size } as CSSProperties}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: `radial-gradient(circle, ${colour} 0%, ${colour.replace(")", " / 0)")} 70%)`,
        animation: "fx-sun-pulse 4s ease-in-out infinite",
        filter: "blur(4px)",
      } as CSSProperties} />
      <svg viewBox="0 0 64 64" width={size} height={size} style={{
        position: "absolute", inset: 0,
        animation: "fx-sun-spin 30s linear infinite",
      } as CSSProperties}>
        <g stroke={colour} strokeWidth="2.4" strokeLinecap="round">
          {arr(8).map((_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 32 + Math.cos(a) * 22, y1 = 32 + Math.sin(a) * 22;
            const x2 = 32 + Math.cos(a) * 30, y2 = 32 + Math.sin(a) * 30;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <circle cx="32" cy="32" r="14" fill={colour} />
      </svg>
    </div>
  );
}

export function AnimatedMoon({ size = 64, illumination = 0.5, phase = 0.25 }: { size?: number; illumination?: number; phase?: number }) {
  // phase 0..1: 0 new, .25 first qtr, .5 full, .75 last qtr
  const r = size / 2;
  const offset = (1 - illumination) * size * (phase < 0.5 ? -1 : 1);
  return (
    <div style={{ position: "relative", width: size, height: size } as CSSProperties}>
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        background: "radial-gradient(circle, hsl(220 80% 90% / .25), transparent 70%)",
        animation: "fx-sun-pulse 5s ease-in-out infinite",
      } as CSSProperties} />
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ position:"absolute", inset:0 }}>
        <defs>
          <radialGradient id="moonGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="hsl(48 30% 96%)" />
            <stop offset="100%" stopColor="hsl(220 25% 70%)" />
          </radialGradient>
          <mask id={`moonMask-${size}`}>
            <rect width={size} height={size} fill="white" />
            <ellipse cx={r + offset} cy={r} rx={r * 0.96} ry={r * 0.96} fill="black" />
          </mask>
        </defs>
        <circle cx={r} cy={r} r={r * 0.94} fill="hsl(220 30% 18%)" />
        <circle cx={r} cy={r} r={r * 0.94} fill="url(#moonGrad)" mask={`url(#moonMask-${size})`} />
      </svg>
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Animated umbrella – open if rain expected, closed otherwise
 * ---------------------------------------------------------------------*/
export function AnimatedUmbrella({ open, size = 28 }: { open: boolean; size?: number }) {
  if (open) {
    return (
      <svg viewBox="0 0 32 32" width={size} height={size}
           style={{ animation: "fx-sway 4s ease-in-out infinite", transformOrigin: "16px 22px" }}>
        <path d="M16 4 C8 4 3 11 3 16 L29 16 C29 11 24 4 16 4 Z" fill="currentColor" opacity=".95"/>
        <path d="M3 16 Q9 13 9 16 Q9 13 16 16 Q16 13 23 16 Q23 13 29 16" fill="none" stroke="hsl(220 30% 8%)" strokeWidth="0.8" opacity=".4"/>
        <line x1="16" y1="16" x2="16" y2="26" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M14 26 Q14 30 18 28" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <path d="M14 3 L18 3 L17 22 L15 22 Z" fill="currentColor" opacity=".95"/>
      <circle cx="16" cy="3" r="1.6" fill="currentColor"/>
      <path d="M14 22 Q14 27 18 25" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

/* -----------------------------------------------------------------------
 * Tab background — wraps a tab in a fixed weather-driven backdrop with
 * a transparent black overlay so content stays readable.
 * ---------------------------------------------------------------------*/
export function TabBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mx-4 px-4 pt-4 pb-12 overflow-hidden rounded-2xl">
      {children}
    </div>
  );
}