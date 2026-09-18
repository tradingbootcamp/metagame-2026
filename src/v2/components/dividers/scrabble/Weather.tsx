"use client";

import type { Weather as Kind } from "./effects";

// SNOW / RAIN / DUST: a few seconds of weather over the whole viewport.
// Particles are rolled once per cast and released on a curve that builds
// quickly and thins out slowly, so there's no hard start and no trailing edge.
export type Shower = { kind: Kind; bits: Bit[] };
type Bit = {
  x: number; // vw (snow, rain) — where it starts along the top
  y: number; // vh (dust) — the height it crosses at
  delay: number;
  ms: number;
  size: number;
  dx: number;
  spin: number;
  flake: string;
  haze: boolean; // dust: a big soft cloud rather than a speck
  // dust specks: a vertical waver and an uneven, gusty pace across
  waver: number;
  waverMs: number;
  phase: number; // 0…1, where in its waver it starts
  gust: string;
};

const SHOWER = {
  snow: { count: 110, release: 10000, travel: [4200, 9000], size: [9, 24] },
  rain: { count: 190, release: 7500, travel: [550, 850], size: [14, 26] },
  dust: { count: 1000, release: 5000, travel: [4500, 10000], size: [0.8, 2.2] },
};
const HAZE = 10; // of dust's count

// Busiest a quarter of the way in, then a long taper (a triangular
// distribution, by its inverse CDF).
const PEAK = 0.25;
const release = () => {
  const u = Math.random();
  return u < PEAK ? Math.sqrt(u * PEAK) : 1 - Math.sqrt((1 - u) * (1 - PEAK));
};

// No two alike: one arm is rolled — how many side branches, where they sit,
// how long and how steep, whether the tip forks, whether there's a hexagon at
// the heart — then repeated six times round. Drawn in a -12…12 box.
function rollFlake(): string {
  const R = 11;
  const arm: [number, number, number, number][] = [[0, 0, R, 0]];
  const branches = 1 + Math.floor(Math.random() * 3);
  for (let b = 0; b < branches; b++) {
    const at = R * (0.3 + (0.6 * (b + Math.random() * 0.6)) / branches);
    const len = R * (0.18 + Math.random() * 0.28) * (1 - at / (R * 1.6));
    const lean = ((40 + Math.random() * 30) * Math.PI) / 180;
    for (const side of [1, -1])
      arm.push([at, 0, at + len * Math.cos(lean), side * len * Math.sin(lean)]);
  }
  const hex = Math.random() < 0.5 ? R * (0.22 + Math.random() * 0.2) : 0;
  if (hex) {
    const c = Math.cos(Math.PI / 3);
    const sn = Math.sin(Math.PI / 3);
    arm.push([hex, 0, hex * c, hex * sn]);
  }
  const f = (n: number) => n.toFixed(1);
  return Array.from({ length: 6 }, (_, k) => {
    const c = Math.cos((k * Math.PI) / 3);
    const sn = Math.sin((k * Math.PI) / 3);
    return arm
      .map(
        ([x1, y1, x2, y2]) =>
          `M${f(x1 * c - y1 * sn)} ${f(x1 * sn + y1 * c)}L${f(x2 * c - y2 * sn)} ${f(x2 * sn + y2 * c)}`,
      )
      .join("");
  }).join("");
}

const between = ([lo, hi]: number[]) => lo + Math.random() * (hi - lo);

export const rollShower = (kind: Kind): Shower => ({
  kind,
  bits: Array.from({ length: SHOWER[kind].count }, (_, i) => {
    const size = between(SHOWER[kind].size);
    const [fast, slow] = SHOWER[kind].travel;
    const [small, big] = SHOWER[kind].size;
    return {
      x: Math.random() * 110 - 5,
      y: Math.random() * 100,
      delay: release() * SHOWER[kind].release,
      // Small means far away, and far away looks slow: that spread is what
      // keeps a shower from ending in a line.
      ms:
        slow -
        ((size - small) / (big - small)) *
          (slow - fast) *
          (0.6 + Math.random() * 0.4),
      size,
      dx: (Math.random() - 0.5) * 16,
      spin: (Math.random() - 0.5) * 540,
      flake: kind === "snow" ? rollFlake() : "",
      haze: kind === "dust" && i < HAZE,
      waver: 6 + Math.random() * 26,
      waverMs: 700 + Math.random() * 1600,
      phase: Math.random(),
      gust: `cubic-bezier(${(0.15 + Math.random() * 0.5).toFixed(2)},${(Math.random() * 0.7).toFixed(2)},${(0.45 + Math.random() * 0.45).toFixed(2)},${(0.4 + Math.random() * 0.6).toFixed(2)})`,
    };
  }),
});

export const showerMs = (kind: Kind) =>
  SHOWER[kind].release + SHOWER[kind].travel[1];

export default function Weather({
  shower,
  color,
}: {
  shower: Shower;
  color: string;
}) {
  const snow = shower.kind === "snow";
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {shower.bits.map((b, i) => {
        const style = {
          left: `${b.x}vw`,
          "--dx": snow ? `${b.dx}vw` : "-15vh",
          // Rain holds its slant: the keyframes end on --spin.
          "--spin": snow ? `${b.spin}deg` : "8deg",
          animation: `scrabble-fall ${b.ms}ms ${b.delay}ms ${snow ? "linear" : "cubic-bezier(.4,0,1,.8)"} both`,
        } as React.CSSProperties;
        if (shower.kind === "dust") {
          const shape: React.CSSProperties = b.haze
            ? {
                width: "90vw",
                height: `${30 + b.size * 10}vh`,
                marginTop: "-25vh",
                background: `radial-gradient(closest-side, color-mix(in srgb, ${color} 22%, transparent), transparent)`,
              }
            : {
                width: b.size,
                height: b.size,
                background: `color-mix(in srgb, ${color} 55%, transparent)`,
              };
          return (
            <span
              key={i}
              className="absolute left-0 rounded-full"
              style={
                {
                  ...shape,
                  top: `${b.y}vh`,
                  "--dy": `${b.dx}vh`,
                  "--waver": `${b.waver}px`,
                  animation: b.haze
                    ? `scrabble-drift ${b.ms * 1.3}ms ${b.delay}ms linear both`
                    : `scrabble-drift ${b.ms}ms ${b.delay}ms ${b.gust} both, scrabble-waver ${b.waverMs}ms ${-Math.round(b.waverMs * 2 * b.phase)}ms ease-in-out infinite alternate`,
                } as React.CSSProperties
              }
            />
          );
        }
        return snow ? (
          <svg
            key={i}
            viewBox="-12 -12 24 24"
            width={b.size}
            height={b.size}
            className="absolute -top-8"
            style={style}
          >
            <path
              d={b.flake}
              fill="none"
              stroke={color}
              strokeLinecap="round"
              // Smaller flakes read as further away: thinner and fainter.
              strokeWidth={b.size < 15 ? 1.5 : 1.9}
              strokeOpacity={0.45 + (b.size / 24) * 0.5}
            />
          </svg>
        ) : (
          <span
            key={i}
            className="absolute -top-8 w-px rotate-[8deg]"
            style={{
              ...style,
              height: b.size, // Thinned here, as the keyframes own `opacity`.
              background: `color-mix(in srgb, ${color} 60%, transparent)`,
            }}
          />
        );
      })}
    </div>
  );
}
