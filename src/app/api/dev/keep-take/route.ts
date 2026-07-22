import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Dev-only sink for the dice curation panel: each kept live roll lands here as
// raw JSON under scripts/curated-takes/, to be retconned + folded into
// rollInTakes.ts by the bake step (they are NOT served until baked).

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
  const dir = path.join(process.cwd(), "scripts", "curated-takes");
  await fs.mkdir(dir, { recursive: true });
  const name = `take-${Date.now()}.json`;
  await fs.writeFile(path.join(dir, name), JSON.stringify(body));
  const count = (await fs.readdir(dir)).filter((f) =>
    f.endsWith(".json"),
  ).length;
  return NextResponse.json({ saved: name, count });
}
