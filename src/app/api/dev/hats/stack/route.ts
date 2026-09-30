import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { HATS, isHatId, type HatId } from "@/v2/hat-trick/hats";
import type { StackBase, StackTable } from "@/v2/hat-trick/HatPile";
import { round1 } from "@/app/dev/hats/format";

// Dev-only save for the Stack Editor at /dev/hats/stack. POST
// { bottom, top, offset: [dx, dy] | null } sets (or clears) that pair in
// src/v2/hat-trick/stacking.json and returns the whole table. `bottom` is a
// hat id, or "you" for the silhouette's head.
export const runtime = "nodejs";

const FILE = path.join(
  process.cwd(),
  "src",
  "v2",
  "hat-trick",
  "stacking.json",
);
const ORDER = Object.keys(HATS) as HatId[];
const BASES: StackBase[] = ["you", ...ORDER];

const isOffset = (o: unknown): o is [number, number] =>
  Array.isArray(o) &&
  o.length === 2 &&
  o.every((n) => typeof n === "number" && Number.isFinite(n));

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const { bottom, top, offset } = (await req.json()) as {
    bottom?: unknown;
    top?: unknown;
    offset?: unknown;
  };
  if (
    !(bottom === "you" || isHatId(bottom)) ||
    !isHatId(top) ||
    bottom === top
  ) {
    return NextResponse.json({ error: "bad hat pair" }, { status: 400 });
  }
  if (offset !== null && !isOffset(offset)) {
    return NextResponse.json({ error: "malformed offset" }, { status: 400 });
  }

  const table = JSON.parse(await fs.readFile(FILE, "utf8")) as StackTable;
  const row = { ...table[bottom] };
  if (offset) row[top] = [round1(offset[0]), round1(offset[1])];
  else delete row[top];
  table[bottom] = row;

  // Keep hats.ts order so diffs stay readable.
  const sorted: StackTable = {};
  for (const b of BASES) {
    const r = table[b];
    if (!r || !Object.keys(r).length) continue;
    sorted[b] = {};
    for (const t of ORDER) if (r[t]) sorted[b][t] = r[t];
  }

  const prettier = await import("prettier");
  const formatted = await prettier.format(JSON.stringify(sorted), {
    parser: "json",
    filepath: FILE,
  });
  await fs.writeFile(FILE, formatted);
  return NextResponse.json({ table: sorted });
}
