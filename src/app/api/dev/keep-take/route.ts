import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Dev-only store for the dice curation panel. POST saves a live roll as raw
// JSON under scripts/curated-takes/; GET lists what's saved (metadata only, so
// the dropdown stays cheap) or returns one take in full for replay. Curated
// takes are source material — they're only served to the dev panel, never
// bundled; the shipped set is the generated rollInTakes.ts.

const DIR = path.join(process.cwd(), "scripts", "curated-takes");
const isTakeFile = (f: string) => /^take-\d+\.json$/.test(f);

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }
  const body = (await req.json()) as {
    take?: { hz: number; n: number; dice: { p: number[]; q: number[] }[] };
    meta?: unknown;
  };
  if (!body.take || body.take.dice?.length !== 4) {
    return NextResponse.json({ error: "malformed take" }, { status: 400 });
  }
  await fs.mkdir(DIR, { recursive: true });
  const name = `take-${Date.now()}.json`;
  await fs.writeFile(path.join(DIR, name), JSON.stringify(body));
  const count = (await fs.readdir(DIR)).filter(isTakeFile).length;
  return NextResponse.json({ saved: name, count });
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }
  const file = new URL(req.url).searchParams.get("file");

  // ?file= returns one take in full. The name pattern is enforced (rather than
  // just joined) so the param can't walk out of the curated directory.
  if (file) {
    if (!isTakeFile(file)) {
      return NextResponse.json({ error: "bad file" }, { status: 400 });
    }
    try {
      const raw = await fs.readFile(path.join(DIR, file), "utf8");
      return new NextResponse(raw, {
        headers: { "content-type": "application/json" },
      });
    } catch {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  // Otherwise list saved takes, newest last (filenames are save timestamps),
  // with each one's meta so the panel can judge it without fetching keyframes.
  let names: string[];
  try {
    names = (await fs.readdir(DIR)).filter(isTakeFile).sort();
  } catch {
    return NextResponse.json({ takes: [] });
  }
  const takes = await Promise.all(
    names.map(async (name) => {
      const { take, meta } = JSON.parse(
        await fs.readFile(path.join(DIR, name), "utf8"),
      );
      // Rest x per die is all the panel needs from the keyframes to flag the
      // slot-order problem; sending the streams themselves would be ~15 KB each.
      const restX = take.dice.map(
        (d: { p: number[] }) => d.p[(take.n - 1) * 3],
      );
      return { name, meta, restX, n: take.n, hz: take.hz };
    }),
  );
  return NextResponse.json({ takes });
}
