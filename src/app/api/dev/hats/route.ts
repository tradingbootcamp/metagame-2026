import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isHatId } from "@/v2/hat-trick/hats";
import {
  formatPoints,
  formatWear,
  round1,
  type Point,
  type Wear,
} from "@/app/dev/hats/format";

// Dev-only save for the Hat Editor at /dev/hats. POST { id, points, wear }
// rewrites that hat's `points` and `wear` in src/v2/hat-trick/hats.ts in
// place and runs prettier on the file, so the result is ready to commit.
export const runtime = "nodejs";

const FILE = path.join(process.cwd(), "src", "v2", "hat-trick", "hats.ts");

const isPoint = (p: unknown): p is Point =>
  Array.isArray(p) &&
  p.length === 2 &&
  p.every((n) => typeof n === "number" && Number.isFinite(n));

const isWear = (w: unknown): w is Wear =>
  typeof w === "object" &&
  w !== null &&
  ["width", "bottom", "rotate", "shiftX", "lift"].every((k) => {
    const v = (w as Record<string, unknown>)[k];
    return v === undefined || (typeof v === "number" && Number.isFinite(v));
  }) &&
  typeof (w as Record<string, unknown>).width === "number" &&
  typeof (w as Record<string, unknown>).bottom === "number";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const body = (await req.json()) as {
    id?: unknown;
    points?: unknown;
    wear?: unknown;
  };
  const { id, points, wear } = body;
  if (!isHatId(id)) {
    return NextResponse.json({ error: "unknown hat id" }, { status: 400 });
  }
  if (!Array.isArray(points) || points.length < 3 || !points.every(isPoint)) {
    return NextResponse.json(
      { error: "points must be at least 3 [x, y] pairs" },
      { status: 400 },
    );
  }
  if (!isWear(wear)) {
    return NextResponse.json({ error: "malformed wear" }, { status: 400 });
  }

  const src = await fs.readFile(FILE, "utf8");
  const head = `\n  ${id}: {\n`;
  const start = src.indexOf(head);
  const end = start < 0 ? -1 : src.indexOf("\n  },", start);
  if (start < 0 || end < 0) {
    return NextResponse.json(
      { error: `could not find the "${id}" entry in hats.ts` },
      { status: 500 },
    );
  }

  const block = src.slice(start, end);
  const pointsRe = /points: \[[\s\S]*?\n {4}\],/;
  const wearRe = /wear: \{[^}]*\},/;
  if (!pointsRe.test(block) || !wearRe.test(block)) {
    return NextResponse.json(
      { error: `"${id}" entry is not in the shape the editor expects` },
      { status: 500 },
    );
  }
  const rounded = points.map(([x, y]) => [round1(x), round1(y)] as Point);
  const cleanWear: Wear = {
    width: round1(wear.width),
    bottom: round1(wear.bottom),
    ...(wear.rotate ? { rotate: round1(wear.rotate) } : {}),
    ...(wear.shiftX ? { shiftX: round1(wear.shiftX) } : {}),
    ...(wear.lift !== undefined ? { lift: round1(wear.lift) } : {}),
  };
  const next =
    src.slice(0, start) +
    block
      .replace(pointsRe, `points: ${formatPoints(rounded)},`)
      .replace(wearRe, `wear: ${formatWear(cleanWear)},`) +
    src.slice(end);

  // Prettier's config only adds the Tailwind class sorter, which has nothing
  // to sort here, so the default TypeScript formatting matches `pnpm format`.
  const prettier = await import("prettier");
  const formatted = await prettier.format(next, {
    parser: "typescript",
    filepath: FILE,
  });
  await fs.writeFile(FILE, formatted);
  return NextResponse.json({
    saved: id,
    points: rounded,
    wear: cleanWear,
    file: path.relative(process.cwd(), FILE),
  });
}
