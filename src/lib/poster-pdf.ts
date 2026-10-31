import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import { POSTER_ORIGIN } from "@/lib/poster-options";
import { drawStyledQr } from "@/lib/poster-qr";
import { DEFAULT_POSTER_QR, isPlainQr, type PosterQr } from "@/lib/qr-styles";
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

const NAVY = rgb(0x17 / 255, 0x30 / 255, 0x59 / 255);
const SIGN = rgb(0xe9 / 255, 0xa3 / 255, 0x5b / 255);
const CTA = rgb(0xd8 / 255, 0x50 / 255, 0x2b / 255);
const PUZZLE_MULTIPLIER = 5;
const DIE_FACE = 20;

/** A promo code to print, with its discount as shown ("$50", "20%"). */
export type PosterPromo = { code: string; discount: string };

// All boxes are in source-page points from the top-left. `roll` repaints the
// dice line as "… for 5×$ [d20] off your ticket", reusing the die cut from the
// artwork; `promo` is where the code line goes (over the tagline on d20).
type Roll = {
  mask: { left: number; right: number; top: number; bottom: number };
  baseline: number;
  size: number;
  /** The line shrinks below `size` to stay this wide. */
  maxWidth: number;
  die: { file: string; width: number; height: number; top: number };
  gaps: [number, number];
};
type PromoLine = {
  x: number;
  maxWidth: number;
  baseline: number;
  size: number;
  color: RGB;
  mask?: { right: number; top: number; bottom: number; color: RGB };
  prefix: string;
};

const templates: Record<
  `${PosterDesign}-${PosterSize}`,
  {
    file: string;
    sha256: string;
    width: number;
    height: number;
    qr: { x: number; top: number; size: number };
    sponsors: { x: number; top: number; width: number; height: number };
    roll?: Roll;
    promo: PromoLine;
  }
> = {
  "d20-letter": {
    file: "poster_d20_lettersize.pdf",
    sha256: "5329faed604084bc1d3fec0f4b5bce1e12ccb95169a92fa7ede2c204a7d16e63",
    width: 612,
    height: 792,
    qr: { x: 91, top: 578, size: 89.5 },
    sponsors: { x: 89, top: 688, width: 434, height: 84 },
    roll: {
      mask: { left: 42, right: 570, top: 506.5, bottom: 542.5 },
      baseline: 529.25,
      size: 15,
      maxWidth: 512,
      die: { file: "die-letter.png", width: 30.25, height: 34.25, top: 507.5 },
      gaps: [0.75, 6],
    },
    promo: {
      x: 201.5,
      maxWidth: 321,
      baseline: 666.25,
      size: 14.5,
      color: NAVY,
      mask: { right: 524, top: 652, bottom: 671, color: SIGN },
      prefix: "Or skip the puzzle and use",
    },
  },
  "d20-13x19": {
    file: "poster_d20_13x19.pdf",
    sha256: "57bd16d9ac4b689f2fccdb29bc9b9396377f23dab82c7697d0c19fc8d803ef80",
    width: 936,
    height: 1368,
    qr: { x: 138.5, top: 961, size: 138.5 },
    sponsors: { x: 136, top: 1144, width: 664, height: 186 },
    roll: {
      mask: { left: 72, right: 864, top: 847, bottom: 901 },
      baseline: 881,
      size: 22.85,
      maxWidth: 784,
      die: { file: "die-13x19.png", width: 45, height: 51.25, top: 848.25 },
      gaps: [2.5, 9.5],
    },
    promo: {
      x: 308,
      maxWidth: 491,
      baseline: 1096.75,
      size: 22.5,
      color: NAVY,
      mask: { right: 802, top: 1073, bottom: 1102, color: SIGN },
      prefix: "Or skip the puzzle and use",
    },
  },
  "chess-letter": {
    file: "poster_chess_letter.pdf",
    sha256: "ff9e0318d372638f36e24c9eb4e9c923835d3076c4be220747cd15caa5e984c0",
    width: 792,
    height: 612,
    qr: { x: 38.5, top: 364, size: 107.5 },
    sponsors: { x: 35, top: 511, width: 300, height: 78 },
    promo: {
      x: 166.5,
      maxWidth: 237,
      baseline: 470,
      size: 14,
      color: CTA,
      prefix: "Use",
    },
  },
  "chess-13x19": {
    file: "poster_chess_13x19.pdf",
    sha256: "aac6402162b42c1c10cae949d5c161adc493339d047e8e27ec06a2b9b0a196b7",
    width: 1368,
    height: 936,
    qr: { x: 58, top: 556, size: 166 },
    sponsors: { x: 55, top: 782, width: 465, height: 126 },
    promo: {
      x: 254.75,
      maxWidth: 362,
      baseline: 718,
      size: 21.5,
      color: CTA,
      prefix: "Use",
    },
  },
};

const ASSETS = path.join(process.cwd(), "assets/posters");

async function drawRoll(
  doc: PDFDocument,
  page: PDFPage,
  roll: Roll,
  font: PDFFont,
  bold: PDFFont,
) {
  const H = page.getHeight();
  const { mask, die } = roll;
  page.drawRectangle({
    x: mask.left,
    y: H - mask.bottom,
    width: mask.right - mask.left,
    height: mask.bottom - mask.top,
    color: NAVY,
  });
  // "… for 5×$[20] = **$100** off your ticket", with the die as an image.
  const parts: [string, PDFFont][] = [
    [
      `Enter the result of this roll at checkout for ${PUZZLE_MULTIPLIER}×$`,
      font,
    ],
    ["", font],
    ["= ", font],
    [`$${PUZZLE_MULTIPLIER * DIE_FACE}`, bold],
    [" off your ticket", font],
  ];
  const widthAt = (size: number) =>
    parts.reduce((sum, [text, f]) => sum + f.widthOfTextAtSize(text, size), 0);
  const fixed = roll.gaps[0] + die.width + roll.gaps[1];
  const size = Math.min(
    roll.size,
    (roll.size * (roll.maxWidth - fixed)) / widthAt(roll.size),
  );
  const scale = size / roll.size;
  const dieW = die.width * scale;
  const dieH = die.height * scale;
  let x = (page.getWidth() - (widthAt(size) + fixed * scale)) / 2;
  const dieImage = await doc.embedPng(
    await readFile(path.join(ASSETS, "overlays", die.file)),
  );
  for (const [i, [text, f]] of parts.entries()) {
    if (i === 1) {
      x += roll.gaps[0] * scale;
      // Keep the die centered on the line as it scales.
      const mid = die.top + die.height / 2;
      page.drawImage(dieImage, {
        x,
        y: H - mid - dieH / 2,
        width: dieW,
        height: dieH,
      });
      x += dieW + roll.gaps[1] * scale;
      continue;
    }
    page.drawText(text, {
      x,
      y: H - roll.baseline,
      size,
      font: f,
      color: rgb(1, 1, 1),
    });
    x += f.widthOfTextAtSize(text, size);
  }
}

function drawPromo(
  page: PDFPage,
  line: PromoLine,
  promo: PosterPromo,
  font: PDFFont,
) {
  const H = page.getHeight();
  const value = `${line.prefix} code ${promo.code.toUpperCase()} for ${promo.discount} off`;
  const size = Math.min(
    line.size,
    (line.size * line.maxWidth) / font.widthOfTextAtSize(value, line.size),
  );
  if (line.mask)
    page.drawRectangle({
      x: line.x - 2,
      y: H - line.mask.bottom,
      width: line.mask.right - line.x + 2,
      height: line.mask.bottom - line.mask.top,
      color: line.mask.color,
    });
  page.drawText(value, {
    x: line.x,
    y: H - line.baseline,
    size,
    font,
    color: line.color,
  });
}

function layout(design: PosterDesign, size: PosterSize) {
  const template = templates[`${design}-${size}`];
  const portrait = size === "letter" ? [612, 792] : [936, 1368];
  const [width, height] =
    design === "chess" ? [...portrait].reverse() : portrait;
  const scale = Math.min(
    (width - 2 * PRINT_MARGIN) / template.width,
    (height - 2 * PRINT_MARGIN) / template.height,
  );
  return {
    width,
    height,
    scale,
    x: (width - template.width * scale) / 2,
    y: (height - template.height * scale) / 2,
  };
}

/** The printed QR box in output-page points, from the top-left. */
export function posterQrBox(design: PosterDesign, size: PosterSize) {
  const { qr, height } = templates[`${design}-${size}`];
  const page = layout(design, size);
  return {
    x: page.x + qr.x * page.scale,
    top: page.height - page.y - height * page.scale + qr.top * page.scale,
    size: qr.size * page.scale,
  };
}

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
  promo?: PosterPromo,
  /** False when the link applies the code itself, so the QR stays plain. */
  promoOnQr = true,
  qrStyle: PosterQr = DEFAULT_POSTER_QR,
): Promise<Uint8Array> {
  if (validateSlug(slug) || (promo && promoCode(promo.code) !== promo.code))
    throw new Error("Invalid poster link");
  const template = templates[`${design}-${size}`];
  const bytes = await readFile(path.join(ASSETS, template.file));
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
  source.registerFontkit(fontkit);
  const fontFile = (weight: string) =>
    readFile(path.join(ASSETS, "fonts", `SpaceGrotesk-${weight}.ttf`));
  const font = async (weight: string) =>
    source.embedFont(await fontFile(weight), { subset: true });
  const bold = template.roll || promo ? await font("Bold") : null;
  if (template.roll && bold)
    await drawRoll(source, page, template.roll, await font("Medium"), bold);
  if (promo && bold) drawPromo(page, template.promo, promo, bold);
  const qr = template.qr;
  const sponsors = await source.embedPng(
    await readFile(path.join(ASSETS, "sponsors", `${design}-${size}.png`)),
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
  const qrUrl = posterQrUrl(slug, promoOnQr ? promo?.code : "");
  if (!isPlainQr(qrStyle))
    drawStyledQr(page, {
      url: qrUrl,
      qr: qrStyle,
      x: qr.x,
      top: qr.top,
      size: qr.size,
      quiet: QUIET_MODULES,
      ink: rgb(0, 0, 0),
      font: await fontFile("Bold"),
    });
  else {
    const matrix = QRCode.create(qrUrl, { errorCorrectionLevel: "M" }).modules;
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
  }
  const output = await PDFDocument.create();
  const { width, height, scale, x, y: bottom } = layout(design, size);
  const target = output.addPage([width, height]);
  await source.flush();
  const [artwork] = await output.embedPages([page]);
  target.drawPage(artwork, {
    x,
    y: bottom,
    width: template.width * scale,
    height: template.height * scale,
  });
  output.setTitle(`Metagame ${design === "d20" ? "D20" : "Chess"} poster`);
  output.setSubject(
    "Print at actual size (100%). Quarter-inch minimum margins.",
  );
  return output.save();
}
