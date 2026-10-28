import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { POSTER_ORIGIN } from "@/lib/poster-options";
import {
  PROMO_PARAM,
  promoCode,
  shortUrl,
  validateSlug,
} from "@/lib/tracking-links";

export type PosterDesign = "d20" | "chess";
export type PosterSize = "letter" | "13x19";
export const PRINT_MARGIN = 18;
// Modules of white kept inside the QR box. The box is the artwork's own white
// tile, so the tile edge adds to this; together they exceed the 4-module spec.
const QUIET_MODULES = 2;

const templates = {
  "d20-letter": {
    file: "poster_d20_lettersize.pdf",
    sha256: "5329faed604084bc1d3fec0f4b5bce1e12ccb95169a92fa7ede2c204a7d16e63",
    width: 612,
    height: 792,
    qr: { x: 91, top: 578, size: 89.5 },
    sponsors: { x: 89, top: 688, width: 434, height: 84 },
  },
  "d20-13x19": {
    file: "poster_d20_13x19.pdf",
    sha256: "57bd16d9ac4b689f2fccdb29bc9b9396377f23dab82c7697d0c19fc8d803ef80",
    width: 936,
    height: 1368,
    qr: { x: 138.5, top: 961, size: 138.5 },
    sponsors: { x: 136, top: 1144, width: 664, height: 186 },
  },
  "chess-letter": {
    file: "poster_chess_letter.pdf",
    sha256: "ff9e0318d372638f36e24c9eb4e9c923835d3076c4be220747cd15caa5e984c0",
    width: 792,
    height: 612,
    qr: { x: 38.5, top: 364, size: 107.5 },
    sponsors: { x: 35, top: 511, width: 300, height: 78 },
  },
  "chess-13x19": {
    file: "poster_chess_13x19.pdf",
    sha256: "aac6402162b42c1c10cae949d5c161adc493339d047e8e27ec06a2b9b0a196b7",
    width: 1368,
    height: 936,
    qr: { x: 58, top: 556, size: 166 },
    sponsors: { x: 55, top: 782, width: 465, height: 126 },
  },
};

/** The URL a poster's QR encodes: the short link, plus `?promo=` when a code is on it. */
export function posterQrUrl(slug: string, promo = ""): string {
  const url = new URL(shortUrl(POSTER_ORIGIN, slug));
  if (promo) url.searchParams.set(PROMO_PARAM, promo);
  return url.toString();
}

export async function createPosterPdf(
  design: PosterDesign,
  size: PosterSize,
  slug: string,
  promo = "",
): Promise<Uint8Array> {
  if (validateSlug(slug) || promoCode(promo) !== promo)
    throw new Error("Invalid poster link");
  const template = templates[`${design}-${size}`];
  const bytes = await readFile(
    path.join(process.cwd(), "assets/posters", template.file),
  );
  if (createHash("sha256").update(bytes).digest("hex") !== template.sha256) {
    throw new Error("Poster artwork changed; reverify QR placement");
  }
  const source = await PDFDocument.load(bytes);
  const page = source.getPages()[0];
  if (
    source.getPageCount() !== 1 ||
    Math.abs(page.getWidth() - template.width) > 0.01 ||
    Math.abs(page.getHeight() - template.height) > 0.01
  ) {
    throw new Error("Poster artwork geometry changed; reverify QR placement");
  }
  const qr = template.qr;
  const sponsors = await source.embedPng(
    await readFile(
      path.join(
        process.cwd(),
        "assets/posters/sponsors",
        `${design}-${size}.png`,
      ),
    ),
  );
  page.drawImage(sponsors, {
    x: template.sponsors.x,
    y: page.getHeight() - template.sponsors.top - template.sponsors.height,
    width: template.sponsors.width,
    height: template.sponsors.height,
  });
  const y = page.getHeight() - qr.top - qr.size;
  page.drawRectangle({
    x: qr.x,
    y,
    width: qr.size,
    height: qr.size,
    color: rgb(1, 1, 1),
  });
  const matrix = QRCode.create(posterQrUrl(slug, promo), {
    errorCorrectionLevel: "M",
  }).modules;
  const moduleSize = qr.size / (matrix.size + 2 * QUIET_MODULES);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.get(row, col))
        page.drawRectangle({
          x: qr.x + (col + QUIET_MODULES) * moduleSize,
          y: y + (matrix.size - 1 + QUIET_MODULES - row) * moduleSize,
          width: moduleSize,
          height: moduleSize,
          color: rgb(0, 0, 0),
        });
    }
  }
  const output = await PDFDocument.create();
  const portrait = size === "letter" ? [612, 792] : [936, 1368];
  const [width, height] =
    design === "chess" ? [...portrait].reverse() : portrait;
  const target = output.addPage([width, height]);
  await source.flush();
  const [artwork] = await output.embedPages([page]);
  const scale = Math.min(
    (width - 2 * PRINT_MARGIN) / template.width,
    (height - 2 * PRINT_MARGIN) / template.height,
  );
  target.drawPage(artwork, {
    x: (width - template.width * scale) / 2,
    y: (height - template.height * scale) / 2,
    width: template.width * scale,
    height: template.height * scale,
  });
  output.setTitle(`Metagame ${design === "d20" ? "D20" : "Chess"} poster`);
  output.setSubject(
    "Print at actual size (100%). Quarter-inch minimum margins.",
  );
  return output.save();
}
