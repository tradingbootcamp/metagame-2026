import type { Hat } from "@/v2/hat-trick/hats";

export type Point = [number, number];
export type Wear = Hat["wear"];

export const round1 = (n: number) => Math.round(n * 10) / 10;

// The `points` and `wear` fields as they appear in hats.ts (prettier keeps
// `14.0`, so points always carry one decimal to match the hand-traced ones).
export function formatPoints(points: Point[], indent = "    ") {
  const rows = points.map(
    ([x, y]) =>
      `${indent}  [${round1(x).toFixed(1)}, ${round1(y).toFixed(1)}],`,
  );
  return `[\n${rows.join("\n")}\n${indent}]`;
}

export function formatWear(wear: Wear) {
  const fields = [
    `width: ${round1(wear.width)}`,
    `bottom: ${round1(wear.bottom)}`,
  ];
  if (wear.rotate) fields.push(`rotate: ${round1(wear.rotate)}`);
  if (wear.shiftX) fields.push(`shiftX: ${round1(wear.shiftX)}`);
  if (wear.lift !== undefined) fields.push(`lift: ${round1(wear.lift)}`);
  return `{ ${fields.join(", ")} }`;
}

// What the editor's code block shows (top-level indent).
export function formatHatFields(points: Point[], wear: Wear) {
  return `points: ${formatPoints(points, "")},\nwear: ${formatWear(wear)},`;
}
