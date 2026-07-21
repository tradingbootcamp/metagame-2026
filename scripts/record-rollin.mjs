// Recording harness for the dice roll-in: runs the live Rapier sim in a headless
// browser (?record=1) a bunch of times, scores the finished takes, keeps the
// best, and bakes them into src/components/dice3d/rollInTakes.ts for the
// playback driver to ship. Rerun after tuning physicsRollIn.ts.
//
//   node scripts/record-rollin.mjs [--runs 14] [--keep 5] [--port 4600] [--url http://...]
//
// Pass --url to use an already-running dev server; otherwise the script starts
// `next dev` on --port and kills it when done.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/components/dice3d/rollInTakes.ts");

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const RUNS = Number(arg("runs", 14));
const KEEP = Number(arg("keep", 5));
const PORT = Number(arg("port", 4600));
let url = arg("url", null);

// A take is usable only if the sim settled on its own with every die resting
// flat-ish near its slot, nothing ever strayed toward the z walls, and the
// rest positions stay in slot order with a safe gap — the align slide is a
// straight kinematic lerp to the slots, so an order inversion (or a too-tight
// pair) would sweep one die through another, the very artifact this replaces.
function usable(take, meta) {
  const restX = take.dice.map((d) => d.p[(take.n - 1) * 3]);
  const ordered = restX.every((x, i) => i === 0 || x - restX[i - 1] >= 1.0);
  return (
    ordered &&
    !meta.timedOut &&
    meta.nudges === 0 &&
    meta.duration <= 3.0 &&
    meta.finalErr.every((e) => e <= 0.9) &&
    meta.finalY.every((y) => y <= 0.35) &&
    meta.maxAbsZ <= 1.2
  );
}
// Among usable takes prefer tight landings, then quick settles.
const score = (meta) =>
  meta.finalErr.reduce((a, b) => a + b, 0) + 0.3 * meta.duration;

let server = null;
if (!url) {
  console.log(`starting next dev on :${PORT}...`);
  server = spawn("pnpm", ["exec", "next", "dev", "--port", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore",
    detached: true,
  });
  url = `http://localhost:${PORT}`;
  // Poll until the server answers.
  for (let i = 0; ; i++) {
    try {
      await fetch(url);
      break;
    } catch {
      if (i > 120) throw new Error("dev server never came up");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

const browser = await chromium.launch({
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

const takes = [];
try {
  for (let run = 0; run < RUNS; run++) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    try {
      await page.goto(`${url}/?record=1`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => window.__rollInTake !== undefined,
        null,
        {
          timeout: 30000,
        },
      );
      const { take, meta } = await page.evaluate(() => window.__rollInTake);
      const ok = usable(take, meta);
      console.log(
        `run ${run + 1}/${RUNS}: ${ok ? "keep?" : "reject"} ` +
          `dur=${meta.duration.toFixed(2)}s err=[${meta.finalErr.map((e) => e.toFixed(2)).join(",")}] ` +
          `y=[${meta.finalY.map((y) => y.toFixed(2)).join(",")}] nudges=${meta.nudges}${meta.timedOut ? " TIMEOUT" : ""}`,
      );
      if (ok) takes.push({ take, meta, score: score(meta) });
    } catch (e) {
      console.log(
        `run ${run + 1}/${RUNS}: failed (${e.message.split("\n")[0]})`,
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  if (server) process.kill(-server.pid, "SIGTERM");
}

if (takes.length < KEEP) {
  console.error(
    `only ${takes.length} usable takes (< ${KEEP}); not writing. ` +
      `Loosen criteria or add --runs.`,
  );
  process.exit(1);
}

takes.sort((a, b) => a.score - b.score);
const kept = takes.slice(0, KEEP);
const body = kept.map((t) => JSON.stringify(t.take)).join(",\n  ");
writeFileSync(
  OUT,
  `import type { RollInTake } from "./introDriver";

// Baked roll-in takes — GENERATED, do not hand-edit.
// Regenerate after tuning physicsRollIn.ts with: node scripts/record-rollin.mjs
// (runs the live sim under ?record=1 a bunch of times, keeps the takes that
// settle cleanly nearest their slots, and rewrites this file).
export const TAKES: RollInTake[] = [
  ${body},
];
`,
);
console.log(
  `wrote ${KEEP} takes to ${OUT} ` +
    `(settle times: ${kept.map((t) => t.meta.duration.toFixed(2) + "s").join(", ")})`,
);
