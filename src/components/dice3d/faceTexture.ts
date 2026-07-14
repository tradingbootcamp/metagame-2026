import * as THREE from "three";

import { LETTER_PATHS, LETTER_VIEWBOX } from "./letterPaths";

// Design tokens (mirror DiceHero / the CSS dice)
export const COLORS = {
  blue: "#2b9bf0",
  orange: "#eaa35a",
  dark: "#222227",
  ink: "#141417",
  white: "#ffffff",
} as const;

// 3x3 pip grid positions (0-8). Opposite faces sum to 7; 7 = a 6-layout plus
// a center pip (renders opposite the blank).
export const PIP_MAP: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
  7: [0, 2, 3, 4, 5, 6, 8],
};

const TEX = 512; // per-face texture resolution

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Letter face baked from the colorless glyph path (see letterPaths.ts): the tile
// is filled in the die color and everything outside stays transparent, so the
// panel material's alphaTest drops the counters and the ink body shows through.
export function letterTexture(
  letter: string,
  color: "blue" | "orange",
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  const d = LETTER_PATHS[letter.toLowerCase()];
  if (d) {
    const s = TEX / LETTER_VIEWBOX;
    ctx.scale(s, s);
    ctx.fillStyle = COLORS[color];
    ctx.fill(new Path2D(d), "evenodd");
  }
  return toTexture(canvas);
}

// A pip face for the given die value. Flat ink fill (no baked gradient, body color)
// so the panel reads as the same material as the cube — only the white pips stand out.
export function pipTexture(value: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, TEX, TEX);

  const on = PIP_MAP[value] ?? [];
  const pad = TEX * 0.22;
  const cell = (TEX - pad * 2) / 2; // gaps between the 3x3 centers
  const r = TEX * 0.095;

  for (const idx of on) {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = pad + col * cell;
    const y = pad + row * cell;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
  }

  return toTexture(canvas);
}
