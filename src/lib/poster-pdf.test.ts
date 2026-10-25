import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  createPosterPdf,
  type PosterDesign,
  type PosterSize,
} from "./poster-pdf";

describe("poster PDF", () => {
  for (const slug of ["berkeley", `pp-${"a".repeat(40)}`]) {
    for (const design of ["d20", "chess"] as PosterDesign[]) {
      for (const size of ["letter", "13x19"] as PosterSize[]) {
        it(`preserves artwork on an exact ${design} ${size} page for ${slug}`, async () => {
          const bytes = await createPosterPdf(design, size, slug);
          const document = await PDFDocument.load(bytes);
          expect(document.getPageCount()).toBe(1);
          const expected = size === "letter" ? [612, 792] : [936, 1368];
          if (design === "chess") expected.reverse();
          const page = document.getPages()[0];
          expect([page.getWidth(), page.getHeight()]).toEqual(expected);
          if (process.env.POSTER_RENDER_CHECK !== "1") return;
          const directory = path.resolve("tmp/poster-verification");
          await mkdir(directory, { recursive: true });
          const prefix = path.join(directory, `${design}-${size}-${slug}`);
          await writeFile(`${prefix}.pdf`, bytes);
          execFileSync("pdftoppm", [
            "-r",
            "150",
            "-png",
            "-singlefile",
            `${prefix}.pdf`,
            prefix,
          ]);
          const png = PNG.sync.read(await readFile(`${prefix}.png`));
          const pixels = new Uint8ClampedArray(png.data);
          const decoded = jsQR(pixels, png.width, png.height);
          expect(decoded?.data).toBe(`https://metagame.games/go/${slug}`);
          // Erase the new QR, then ensure no second code survives elsewhere.
          const points = Object.values(decoded!.location);
          const left = Math.floor(Math.min(...points.map((p) => p.x))) - 5;
          const right = Math.ceil(Math.max(...points.map((p) => p.x))) + 5;
          const top = Math.floor(Math.min(...points.map((p) => p.y))) - 5;
          const bottom = Math.ceil(Math.max(...points.map((p) => p.y))) + 5;
          for (let y = top; y <= bottom; y++)
            for (let x = left; x <= right; x++) {
              const i = (y * png.width + x) * 4;
              pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
            }
          expect(jsQR(pixels, png.width, png.height)).toBeNull();
          const margin = Math.floor((18 * 150) / 72) - 2;
          for (let y = 0; y < png.height; y++)
            for (let x = 0; x < png.width; x++) {
              if (
                x >= margin &&
                x < png.width - margin &&
                y >= margin &&
                y < png.height - margin
              )
                continue;
              const i = (y * png.width + x) * 4;
              if (
                png.data[i] < 250 ||
                png.data[i + 1] < 250 ||
                png.data[i + 2] < 250
              )
                throw new Error("Artwork outside print margin");
            }
        }, 30_000);
      }
    }
  }
});
