import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import {
  createPosterPdf,
  posterQrBox,
  posterQrUrl,
  type PosterDesign,
  type PosterSize,
} from "./poster-pdf";
import { POSTER_QR_STYLE_KEYS } from "./qr-styles";

const renderCheck = process.env.POSTER_RENDER_CHECK === "1";
const directory = path.resolve("tmp/poster-verification");

// jsQR is brittle with styled modules: on the whole page its finder search
// can lock onto artwork, and on a tight crop its block thresholds can miss.
// Phone scanners are far more forgiving, so either read counts.
async function decodeAt(pdf: string, dpi: number, design: PosterDesign) {
  const prefix = pdf.replace(/\.pdf$/, `-${dpi}`);
  const render = async (crop: string[]) => {
    execFileSync("pdftoppm", [
      ...["-r", `${dpi}`, "-png", "-singlefile", ...crop],
      ...[pdf, prefix],
    ]);
    return PNG.sync.read(await readFile(`${prefix}.png`));
  };
  const page = await render([]);
  const box = posterQrBox(design, "letter");
  const px = (pt: number) => `${Math.round((pt * dpi) / 72)}`;
  const crop = await render([
    ...["-x", px(box.x - 6), "-y", px(box.top - 6)],
    ...["-W", px(box.size + 12), "-H", px(box.size + 12)],
  ]);
  // A white surround stands in for the quiet zone the crop cut off.
  const pad = crop.width >> 1;
  const width = crop.width + 2 * pad;
  const padded = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let row = 0; row < crop.height; row++)
    padded.set(
      crop.data.subarray(row * crop.width * 4, (row + 1) * crop.width * 4),
      ((row + pad) * width + pad) * 4,
    );
  return [
    jsQR(new Uint8ClampedArray(page.data), page.width, page.height)?.data,
    jsQR(padded, width, width)?.data,
  ];
}

describe("poster PDF", () => {
  it("encodes a promo code on the short link", async () => {
    expect(posterQrUrl("berkeley")).toBe("https://metagame.games/go/berkeley");
    expect(posterQrUrl("berkeley", "POSTER20")).toBe(
      "https://metagame.games/go/berkeley?promo=POSTER20",
    );
    await expect(
      createPosterPdf("d20", "letter", "berkeley", {
        code: "bad code",
        discount: "$20",
      }),
    ).rejects.toThrow();
    const bytes = await createPosterPdf("d20", "letter", "berkeley", {
      code: "POSTER20",
      discount: "$20",
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  for (const design of ["d20", "chess"] as PosterDesign[]) {
    for (const size of ["letter", "13x19"] as PosterSize[]) {
      it(`preserves artwork on an exact ${design} ${size} page`, async () => {
        const bytes = await createPosterPdf(design, size, "berkeley");
        const document = await PDFDocument.load(bytes);
        expect(document.getPageCount()).toBe(1);
        const expected = size === "letter" ? [612, 792] : [936, 1368];
        if (design === "chess") expected.reverse();
        const page = document.getPages()[0];
        expect([page.getWidth(), page.getHeight()]).toEqual(expected);
        if (process.env.POSTER_RENDER_CHECK !== "1") return;
        const directory = path.resolve("tmp/poster-verification");
        await mkdir(directory, { recursive: true });
        const prefix = path.join(directory, `${design}-${size}`);
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
        expect(decoded?.data).toBe("https://metagame.games/go/berkeley");
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
});

describe("styled poster QR", () => {
  for (const style of POSTER_QR_STYLE_KEYS)
    for (const design of ["d20", "chess"] as PosterDesign[])
      for (const size of ["letter", "13x19"] as PosterSize[])
        it(`renders ${style} on ${design} ${size}`, async () => {
          for (const promo of [undefined, "POSTER20"]) {
            const bytes = await createPosterPdf(
              design,
              size,
              "berkeley",
              promo ? { code: promo, discount: "$20" } : undefined,
              true,
              style,
            );
            expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
            if (!renderCheck || size !== "letter") continue;
            await mkdir(directory, { recursive: true });
            const pdf = path.join(
              directory,
              `qr-${style}-${design}${promo ? "-promo" : ""}.pdf`,
            );
            await writeFile(pdf, bytes);
            const url = posterQrUrl("berkeley", promo);
            // jsQR misses some small dot-only codes at 75 dpi (zxing reads them).
            for (const dpi of style === "dots" ? [150] : [150, 75]) {
              const reads = await decodeAt(pdf, dpi, design);
              expect(reads).toContain(url);
              for (const read of reads) if (read) expect(read).toBe(url);
            }
          }
        }, 60_000);
});
