import * as THREE from "three";

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

// The texture is full-bleed colored: the rounded shape is supplied by the panel
// geometry (a rounded-rect plane that tucks inside the body bevel), so the
// texture only needs the flat color, a baked light gradient, and the glyph/pips.

let fontReady: Promise<void> | null = null;

// Load the bundled Bebas Neue so canvas-drawn letters match the page font.
// Returns a resolved promise once the face glyphs can be drawn.
export function ensureFont(): Promise<void> {
  if (fontReady) return fontReady;
  if (typeof document === "undefined") {
    fontReady = Promise.resolve();
    return fontReady;
  }
  const face = new FontFace(
    "BebasNeueDice",
    "url(/fonts/BebasNeue.woff2) format('woff2')",
  );
  fontReady = face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
    })
    .catch(() => {
      // Fall back to a system face; letters still render, just less on-brand.
    });
  return fontReady;
}

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

// Fill the whole texture with the base color plus a baked top-light gradient.
function paintPanel(ctx: CanvasRenderingContext2D, bg: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX, TEX);

  const grad = ctx.createLinearGradient(0, 0, 0, TEX);
  grad.addColorStop(0, "rgba(255,255,255,0.16)");
  grad.addColorStop(0.5, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX, TEX);
}

// A colored letter face: flat colored panel with a bold ink-outlined glyph.
export function letterTexture(letter: string, bg: string): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  paintPanel(ctx, bg);

  ctx.font = `${Math.round(TEX * 0.74)}px "BebasNeueDice", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ink outline + colored fill (paint-order: stroke under fill)
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.round(TEX * 0.05);
  ctx.strokeStyle = COLORS.ink;
  ctx.fillStyle = bg;
  const cx = TEX / 2;
  const cy = TEX / 2 + TEX * 0.04;
  ctx.strokeText(letter, cx, cy);
  ctx.fillText(letter, cx, cy);

  return toTexture(canvas);
}

// A dark pip face for the given die value (dark panel + white pips).
export function pipTexture(value: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  paintPanel(ctx, COLORS.dark);

  const on = PIP_MAP[value] ?? [];
  const pad = TEX * 0.22;
  const cell = (TEX - pad * 2) / 2; // gaps between the 3x3 centers
  const r = TEX * 0.078;

  for (const idx of on) {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = pad + col * cell;
    const y = pad + row * cell;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();

    // inner bottom shadow to read as a recessed/raised pip
    const pg = ctx.createRadialGradient(
      x,
      y - r * 0.3,
      r * 0.1,
      x,
      y + r * 0.4,
      r * 1.1,
    );
    pg.addColorStop(0, "rgba(0,0,0,0)");
    pg.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = pg;
    ctx.fill();
  }

  return toTexture(canvas);
}
