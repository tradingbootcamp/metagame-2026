"use client";

import { createPortal } from "react-dom";

// ACID: big soft blobs of saturated colour wandering over the page while the
// whole layer's hue turns. Multiplied onto the page, so it tints the cream
// like a background would and leaves the text readable on top.
export const ACID_MS = 14000;

const COLOURS = [
  "#ff2bd6",
  "#00e5ff",
  "#ffe600",
  "#7cff00",
  "#ff7a00",
  "#8a2bff",
];

export type Trip = {
  colour: string;
  size: number;
  from: [number, number];
  to: [number, number];
  swell: number;
  ms: number;
}[];

const spot = (): [number, number] => [
  Math.random() * 100 - 20,
  Math.random() * 100 - 20,
];

export const rollTrip = (): Trip =>
  Array.from({ length: 9 }, (_, i) => ({
    colour: COLOURS[i % COLOURS.length],
    size: 55 + Math.random() * 45,
    from: spot(),
    to: spot(),
    swell: 0.7 + Math.random() * 0.9,
    ms: 3500 + Math.random() * 3500,
  }));

export default function Acid({ trip }: { trip: Trip }) {
  // On <body>, not in place: ACID also filters <main>, and a filtered ancestor
  // would re-anchor a fixed layer to itself (and warp it).
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden mix-blend-multiply"
      style={{
        animation: `scrabble-acid ${ACID_MS}ms ease-in-out both, scrabble-hue 9000ms linear infinite`,
      }}
    >
      {trip.map((b, i) => (
        <span
          key={i}
          className="absolute top-0 left-0 rounded-full"
          style={
            {
              width: `${b.size}vmax`,
              height: `${b.size}vmax`,
              background: `radial-gradient(closest-side, ${b.colour}, transparent)`,
              "--from": `${b.from[0]}vw ${b.from[1]}vh`,
              "--to": `${b.to[0]}vw ${b.to[1]}vh`,
              "--swell": b.swell,
              animation: `scrabble-acid-blob ${b.ms}ms ease-in-out infinite alternate`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  );
}
