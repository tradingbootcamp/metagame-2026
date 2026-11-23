import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  degrees,
  LineCapStyle,
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import QRCode from "qrcode";
import sharp from "sharp";
import {
  CLASS_LABELS,
  isMegagameClass,
  type MegagameClass,
} from "@/lib/megagame-levels";
import { cardBackground, stampList, stampsOf } from "@/lib/megagame-quests";
import type { Quest } from "@/lib/megagame-store";
import { POSTER_ORIGIN } from "@/lib/poster-options";
import { formatTicketCode } from "@/lib/ticket-code-format";

// The card as card.module.css lays it out, in points (1in = 72pt, 1px = 0.75pt).
const IN = 72;
const PAGE = { width: 8.5 * IN, height: 11 * IN };
const INK = rgb(0x23 / 255, 0x1f / 255, 0x20 / 255);
const RULE = { inset: 0.38 * IN, radius: 0.12 * IN };
const FRAME = { top: 0.6 * IN, side: 0.8 * IN, bottom: 0.6 * IN };
const FRAME_WIDTH = PAGE.width - 2 * FRAME.side;
const GAP = 0.1 * IN;
const WATERMARK = {
  size: 6.4 * IN,
  centerTop: 0.54 * PAGE.height,
  opacity: 0.09,
};
const TITLE = {
  height: 0.95 * IN,
  max: 44,
  min: 18,
  step: 2,
  lineHeight: 0.98,
};
const REQS = { icon: 0.45 * IN, size: 16, gap: 0.14 * IN, inner: 0.08 * IN };
const JOIN = { size: 20, opacity: 0.7 };
const BODY = {
  max: 18,
  maxWithImages: 13,
  min: 9,
  step: 0.5,
  lineHeight: 1.28,
  minHeight: 0.5 * IN,
};
const IMAGES = { minHeight: 3.6 * IN, gap: 0.2 * IN };
const FOOTER = { height: 0.8 * IN };
const REWARD = { icon: 0.42 * IN, size: 16, gap: 0.16 * IN, inner: 0.05 * IN };
const REWARD_LABEL = { size: 12, opacity: 0.75 };
const AUTHOR = {
  size: 11,
  min: 7,
  step: 0.5,
  maxLines: 2,
  lineHeight: 1.2,
  opacity: 0.75,
  padX: 0.2 * IN,
  padBottom: 0.1 * IN,
};
const CODE = {
  size: 16,
  tracking: 0.06,
  padX: 0.12 * IN,
  padY: 0.04 * IN,
  border: 1.5,
  radius: 0.1 * IN,
  gap: 0.12 * IN,
};
const QR = { size: 0.8 * IN, quiet: 1 };
const PEOPLE_ICON = {
  box: 24,
  stroke: 2.5,
  paths: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M16 3.128a4 4 0 0 1 0 7.744",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M13 7a4 4 0 1 1-8 0a4 4 0 1 1 8 0",
  ],
};
/** Long edge of an embedded picture; the uploads are ~2400px and several MB each. */
const IMAGE_MAX_PX = 1200;
const IMAGE_JPEG_QUALITY = 80;
const IMAGE_FETCH_MS = 15_000;
const IMAGE_CONCURRENCY = 6;

const FONTS = path.join(process.cwd(), "assets/posters/fonts");
const ART = path.join(process.cwd(), "public/megagame/quest-art");

export type QuestImage = { data: Uint8Array; kind: "jpeg" | "png" };

type Fonts = { title: PDFFont; body: PDFFont; bold: PDFFont; mono: PDFFont };
type QuestPdfAssets = {
  fonts: Fonts;
  paper: PDFImage;
  emblems: Record<MegagameClass | "star", PDFImage>;
  pictures: ReadonlyMap<string, PDFImage>;
};

/** Shrinks a picture for print and flattens it to JPEG unless it has real transparency. */
export async function prepareQuestImage(
  bytes: Uint8Array,
): Promise<QuestImage> {
  // rotate() bakes in EXIF orientation, which phone photos rely on.
  const image = sharp(bytes).rotate().resize({
    width: IMAGE_MAX_PX,
    height: IMAGE_MAX_PX,
    fit: "inside",
    withoutEnlargement: true,
  });
  const { hasAlpha } = await image.metadata();
  const opaque = !hasAlpha || (await image.stats()).isOpaque;
  return opaque
    ? {
        data: await image.jpeg({ quality: IMAGE_JPEG_QUALITY }).toBuffer(),
        kind: "jpeg",
      }
    : { data: await image.png().toBuffer(), kind: "png" };
}

/** Every picture the cards use, fetched once each, a few at a time. */
export async function loadQuestImages(
  quests: readonly Quest[],
): Promise<Map<string, QuestImage>> {
  const urls = [...new Set(quests.flatMap((q) => q.bodyImages))];
  const images = new Map<string, QuestImage>();
  const load = async (url: string) => {
    const quest = quests.find((q) => q.bodyImages.includes(url));
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(IMAGE_FETCH_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      images.set(
        url,
        await prepareQuestImage(new Uint8Array(await res.arrayBuffer())),
      );
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Picture on ${formatTicketCode(quest?.code ?? "")} (${url}): ${reason}`,
      );
    }
  };
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: IMAGE_CONCURRENCY }, async () => {
      for (let url = queue.shift(); url; url = queue.shift()) await load(url);
    }),
  );
  return images;
}

/** One US Letter page per quest; `overflow` lists the codes of cards drawn imperfectly. */
export async function createQuestPdf(
  quests: readonly Quest[],
  images: ReadonlyMap<string, QuestImage>,
): Promise<{ bytes: Uint8Array; overflow: string[] }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = async (file: string) =>
    doc.embedFont(await readFile(path.join(FONTS, file)), { subset: true });
  const png = async (file: string) =>
    doc.embedPng(await readFile(path.join(ART, file)));
  const pictures = new Map<string, PDFImage>();
  for (const [url, image] of images)
    pictures.set(
      url,
      image.kind === "jpeg"
        ? await doc.embedJpg(image.data)
        : await doc.embedPng(image.data),
    );
  const assets: QuestPdfAssets = {
    fonts: {
      title: await font("BebasNeue-Regular.ttf"),
      body: await font("SpaceGrotesk-Medium.ttf"),
      bold: await font("SpaceGrotesk-Bold.ttf"),
      mono: await font("SpaceMono-Bold.ttf"),
    },
    paper: await doc.embedJpg(await readFile(path.join(ART, "paper.jpg"))),
    emblems: {
      wizard: await png("emblem-wizard.png"),
      pirate: await png("emblem-pirate.png"),
      alien: await png("emblem-alien.png"),
      star: await png("emblem-star.png"),
    },
    pictures,
  };
  const overflow: string[] = [];
  for (const quest of quests) {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    if (!drawQuestCard(page, quest, assets))
      overflow.push(formatTicketCode(quest.code));
  }
  return { bytes: await doc.save(), overflow };
}

/**
 * Draws one card; false if the title, body or author did not fit even at the
 * smallest size, or uses characters the fonts cannot draw.
 */
function drawQuestCard(
  page: PDFPage,
  quest: Quest,
  assets: QuestPdfAssets,
): boolean {
  const { fonts } = assets;
  drawPaper(page, assets, cardBackground(quest));

  let top = FRAME.top;
  const titleFits = drawTitle(page, quest.title, fonts.title, top);
  top += TITLE.height + GAP;
  drawRequirements(page, quest, assets, top);
  top += REQS.icon + GAP;

  const pictures = quest.bodyImages.flatMap(
    (url) => assets.pictures.get(url) ?? [],
  );
  const footerTop = PAGE.height - FRAME.bottom - FOOTER.height;
  const available =
    footerTop -
    GAP -
    top -
    (pictures.length > 0 ? IMAGES.minHeight + GAP : GAP);
  const body = fitBody(
    quest.bodyText,
    fonts.body,
    pictures.length > 0,
    available,
  );
  drawLines(page, body.lines, fonts.body, body.size, BODY.lineHeight, top, {
    justify: true,
  });
  const bodyHeight = Math.max(
    BODY.minHeight,
    body.lines.length * body.size * BODY.lineHeight,
  );
  top += bodyHeight + GAP;
  if (pictures.length > 0)
    drawPictures(page, pictures, top, footerTop - GAP - top);

  const footerFits = drawFooter(page, quest, assets, footerTop);
  const drawable =
    canDraw(fonts.title, quest.title) &&
    canDraw(fonts.body, quest.bodyText) &&
    canDraw(fonts.body, quest.author ?? "");
  return titleFits && body.fits && footerFits && drawable;
}

/** pdf-lib draws a box for any code point the font lacks (emoji, ★, …). */
function canDraw(font: PDFFont, text: string) {
  const glyphs = new Set(font.getCharacterSet());
  return [...text].every(
    (ch) => /\s/.test(ch) || glyphs.has(ch.codePointAt(0) as number),
  );
}

function drawPaper(
  page: PDFPage,
  assets: QuestPdfAssets,
  background: MegagameClass | "star",
) {
  page.drawImage(assets.paper, {
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
  });
  const emblem = assets.emblems[background];
  const fit = contain(emblem, WATERMARK.size, WATERMARK.size);
  page.drawImage(emblem, {
    x: (PAGE.width - fit.width) / 2,
    y: PAGE.height - WATERMARK.centerTop - fit.height / 2,
    ...fit,
    opacity: WATERMARK.opacity,
  });
  // Double rule: a 2.5px border with a 1px outline 7px inside its edge.
  const rule = (inset: number, width: number, opacity: number) =>
    page.drawSvgPath(
      roundedRect(
        PAGE.width - 2 * inset,
        PAGE.height - 2 * inset,
        RULE.radius - (inset - RULE.inset),
      ),
      {
        x: inset,
        y: PAGE.height - inset,
        borderColor: INK,
        borderWidth: width,
        borderOpacity: opacity,
      },
    );
  rule(RULE.inset + 1.25 * 0.75, 2.5 * 0.75, 0.8);
  rule(RULE.inset + 7.5 * 0.75, 0.75, 0.6);
}

function drawTitle(page: PDFPage, title: string, font: PDFFont, top: number) {
  let size = TITLE.max;
  let lines = wrap(title, font, size, FRAME_WIDTH);
  while (
    lines.length * size * TITLE.lineHeight > TITLE.height &&
    size > TITLE.min
  ) {
    size = Math.max(TITLE.min, size - TITLE.step);
    lines = wrap(title, font, size, FRAME_WIDTH);
  }
  // text-wrap: balance — the narrowest width that still gives this many lines.
  if (lines.length > 1) {
    let width = FRAME_WIDTH;
    for (let w = FRAME_WIDTH; w > FRAME_WIDTH / 2; w -= FRAME_WIDTH / 50) {
      if (wrap(title, font, size, w).length !== lines.length) break;
      width = w;
    }
    lines = wrap(title, font, size, width);
  }
  const height = lines.length * size * TITLE.lineHeight;
  drawLines(
    page,
    lines,
    font,
    size,
    TITLE.lineHeight,
    top + (TITLE.height - height) / 2,
    {
      center: true,
    },
  );
  return height <= TITLE.height;
}

function drawRequirements(
  page: PDFPage,
  quest: Quest,
  assets: QuestPdfAssets,
  top: number,
) {
  const { bold } = assets.fonts;
  const items: { icon: PDFImage | "people"; text: string }[] = [
    { icon: "people", text: `${quest.minPlayers}+` },
  ];
  if (quest.class !== null && isMegagameClass(quest.class)) {
    const level =
      quest.minLevel !== null && quest.maxLevel !== null
        ? `Lv.${quest.minLevel}–${quest.maxLevel}`
        : quest.minLevel !== null
          ? `Lv.${quest.minLevel}+`
          : quest.maxLevel !== null
            ? `Lv.≤${quest.maxLevel}`
            : CLASS_LABELS[quest.class];
    items.push({ icon: assets.emblems[quest.class], text: level });
  }
  const itemWidth = (item: (typeof items)[number]) =>
    REQS.icon + REQS.inner + bold.widthOfTextAtSize(item.text, REQS.size);
  const joinWidth = bold.widthOfTextAtSize("&", JOIN.size);
  const total =
    items.reduce((sum, item) => sum + itemWidth(item), 0) +
    (items.length > 1 ? 2 * REQS.gap + joinWidth : 0);
  let x = (PAGE.width - total) / 2;
  for (const [i, item] of items.entries()) {
    if (i > 0) {
      x += REQS.gap;
      drawText(
        page,
        "&",
        bold,
        JOIN.size,
        x,
        centeredBaseline(bold, JOIN.size, top, REQS.icon),
        {
          opacity: JOIN.opacity,
        },
      );
      x += joinWidth + REQS.gap;
    }
    if (item.icon === "people") drawPeopleIcon(page, x, top, REQS.icon);
    else drawContained(page, item.icon, x, top, REQS.icon);
    x += REQS.icon + REQS.inner;
    drawText(
      page,
      item.text,
      bold,
      REQS.size,
      x,
      centeredBaseline(bold, REQS.size, top, REQS.icon),
    );
    x += bold.widthOfTextAtSize(item.text, REQS.size);
  }
}

function drawPeopleIcon(page: PDFPage, x: number, top: number, size: number) {
  const scale = size / PEOPLE_ICON.box;
  for (const d of PEOPLE_ICON.paths)
    page.drawSvgPath(d, {
      x,
      y: PAGE.height - top,
      scale,
      borderColor: INK,
      // drawSvgPath scales the path before setting the line width.
      borderWidth: PEOPLE_ICON.stroke,
      borderLineCap: LineCapStyle.Round,
    });
}

type Line = { text: string; words: string[]; last: boolean };

function fitBody(
  text: string,
  font: PDFFont,
  hasPictures: boolean,
  maxHeight: number,
) {
  let size = hasPictures ? BODY.maxWithImages : BODY.max;
  let lines = wrapParagraphs(text, font, size, FRAME_WIDTH);
  const height = () => lines.length * size * BODY.lineHeight;
  while (height() > maxHeight && size > BODY.min) {
    size = Math.max(BODY.min, size - BODY.step);
    lines = wrapParagraphs(text, font, size, FRAME_WIDTH);
  }
  const fits = height() <= maxHeight;
  if (!fits)
    lines = lines.slice(0, Math.floor(maxHeight / (size * BODY.lineHeight)));
  return { size, lines, fits };
}

function drawPictures(
  page: PDFPage,
  pictures: PDFImage[],
  top: number,
  height: number,
) {
  const maxWidth =
    (FRAME_WIDTH - IMAGES.gap * (pictures.length - 1)) / pictures.length;
  const fits = pictures.map((p) => contain(p, maxWidth, height));
  const total =
    fits.reduce((sum, f) => sum + f.width, 0) +
    IMAGES.gap * (pictures.length - 1);
  let x = FRAME.side + (FRAME_WIDTH - total) / 2;
  for (const [i, picture] of pictures.entries()) {
    const fit = fits[i];
    page.drawImage(picture, {
      x,
      y: PAGE.height - top - (height - fit.height) / 2 - fit.height,
      ...fit,
    });
    x += fit.width + IMAGES.gap;
  }
}

function drawFooter(
  page: PDFPage,
  quest: Quest,
  assets: QuestPdfAssets,
  top: number,
) {
  const { bold, body, mono } = assets.fonts;
  const bottom = top + FOOTER.height;

  // Stamp rewards, bottom left.
  const stamps = stampList(stampsOf(quest));
  const rewardsTop = bottom - REWARD.icon;
  let x = FRAME.side;
  for (const [i, stamp] of stamps.entries()) {
    if (i > 0) x += REWARD.gap;
    drawContained(
      page,
      assets.emblems[stamp.class === "any" ? "star" : stamp.class],
      x,
      rewardsTop,
      REWARD.icon,
    );
    x += REWARD.icon + REWARD.inner;
    const count = `×${stamp.n}`;
    drawText(
      page,
      count,
      bold,
      REWARD.size,
      x,
      centeredBaseline(bold, REWARD.size, rewardsTop, REWARD.icon),
    );
    x += bold.widthOfTextAtSize(count, REWARD.size);
  }
  if (stamps.length > 0) {
    x += REWARD.gap;
    drawText(
      page,
      "stamps",
      body,
      REWARD_LABEL.size,
      x,
      centeredBaseline(body, REWARD_LABEL.size, rewardsTop, REWARD.icon),
      {
        opacity: REWARD_LABEL.opacity,
      },
    );
    x += body.widthOfTextAtSize("stamps", REWARD_LABEL.size);
  }
  const rewardsRight = x;

  // Code pill and QR, bottom right; the pill is centred on the QR.
  const qrLeft = PAGE.width - FRAME.side - QR.size;
  drawQr(page, quest.code, qrLeft, bottom - QR.size);
  const code = formatTicketCode(quest.code);
  const tracking = CODE.tracking * CODE.size;
  const codeWidth =
    [...code].reduce(
      (sum, ch) => sum + mono.widthOfTextAtSize(ch, CODE.size),
      0,
    ) +
    tracking * (code.length - 1);
  const pillWidth = codeWidth + 2 * CODE.padX + 2 * CODE.border;
  const pillHeight =
    mono.heightAtSize(CODE.size) + 2 * CODE.padY + 2 * CODE.border;
  const pillLeft = qrLeft - CODE.gap - pillWidth;
  const pillTop = bottom - QR.size / 2 - pillHeight / 2;
  page.drawSvgPath(
    roundedRect(pillWidth - CODE.border, pillHeight - CODE.border, CODE.radius),
    {
      x: pillLeft + CODE.border / 2,
      y: PAGE.height - pillTop - CODE.border / 2,
      borderColor: INK,
      borderWidth: CODE.border,
    },
  );
  let cx = pillLeft + CODE.border + CODE.padX;
  const codeBaseline = centeredBaseline(mono, CODE.size, pillTop, pillHeight);
  for (const ch of code) {
    drawText(page, ch, mono, CODE.size, cx, codeBaseline);
    cx += mono.widthOfTextAtSize(ch, CODE.size) + tracking;
  }

  // Author, centred in whatever is left between them, up from the footer's
  // baseline; wraps like the HTML flex item, then shrinks.
  if (!quest.author) return true;
  const left = rewardsRight + AUTHOR.padX;
  const width = pillLeft - AUTHOR.padX - left;
  if (width <= 0) return false;
  const text = `Quest by ${quest.author}`;
  let size = AUTHOR.size;
  let lines = wrap(text, body, size, width);
  while (lines.length > AUTHOR.maxLines && size > AUTHOR.min) {
    size = Math.max(AUTHOR.min, size - AUTHOR.step);
    lines = wrap(text, body, size, width);
  }
  const descent =
    body.heightAtSize(size) - body.heightAtSize(size, { descender: false });
  for (const [i, line] of [...lines].reverse().entries()) {
    const lineWidth = body.widthOfTextAtSize(line.text, size);
    drawText(
      page,
      line.text,
      body,
      size,
      left + (width - lineWidth) / 2,
      bottom - AUTHOR.padBottom - descent - i * size * AUTHOR.lineHeight,
      { opacity: AUTHOR.opacity, italic: true },
    );
  }
  return lines.length <= AUTHOR.maxLines;
}

/** The /q/<code> link as plain modules with a one-module white quiet zone, as the HTML card. */
function drawQr(page: PDFPage, code: string, left: number, top: number) {
  const { modules } = QRCode.create(`${POSTER_ORIGIN}/q/${code}`, {
    errorCorrectionLevel: "M",
  });
  const count = modules.size;
  const unit = QR.size / (count + 2 * QR.quiet);
  page.drawRectangle({
    x: left,
    y: PAGE.height - top - QR.size,
    width: QR.size,
    height: QR.size,
    color: rgb(1, 1, 1),
  });
  let d = "";
  for (let y = 0; y < count; y++)
    for (let x = 0; x < count; x++)
      if (modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
  page.drawSvgPath(d, {
    x: left + QR.quiet * unit,
    y: PAGE.height - top - QR.quiet * unit,
    scale: unit,
    color: INK,
    borderWidth: 0,
  });
}

// --- text layout -----------------------------------------------------------

/** Lines of `text` at most `width` wide; a word wider than that is broken by character. */
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): Line[] {
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= width;
  const lines: Line[] = [];
  let words: string[] = [];
  const flush = () => {
    if (words.length > 0)
      lines.push({ text: words.join(" "), words, last: false });
    words = [];
  };
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word && !fits([...words, word].join(" "))) {
      if (words.length > 0) {
        flush();
        continue;
      }
      const chars = [...word];
      let n = chars.length - 1;
      while (n > 1 && !fits(chars.slice(0, n).join(""))) n--;
      const head = chars.slice(0, n).join("");
      lines.push({ text: head, words: [head], last: false });
      word = chars.slice(n).join("");
    }
    if (word) words.push(word);
  }
  flush();
  if (lines.length > 0) lines[lines.length - 1].last = true;
  return lines;
}

/** `white-space: pre-line`: paragraphs on line breaks, each wrapped; blank lines kept. */
function wrapParagraphs(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): Line[] {
  return text.split("\n").flatMap((paragraph) => {
    const lines = wrap(paragraph, font, size, width);
    return lines.length > 0 ? lines : [{ text: "", words: [], last: true }];
  });
}

function drawLines(
  page: PDFPage,
  lines: Line[],
  font: PDFFont,
  size: number,
  lineHeight: number,
  top: number,
  options: { center?: boolean; justify?: boolean } = {},
) {
  const left = FRAME.side;
  for (const [i, line] of lines.entries()) {
    const baseline = centeredBaseline(
      font,
      size,
      top + i * size * lineHeight,
      size * lineHeight,
    );
    const width = font.widthOfTextAtSize(line.text, size);
    if (options.justify && !line.last && line.words.length > 1) {
      const space = (FRAME_WIDTH - width) / (line.words.length - 1);
      let x = left;
      for (const word of line.words) {
        drawText(page, word, font, size, x, baseline);
        x += font.widthOfTextAtSize(word + " ", size) + space;
      }
    } else {
      const x = options.center ? left + (FRAME_WIDTH - width) / 2 : left;
      drawText(page, line.text, font, size, x, baseline);
    }
  }
}

/** Baseline (from the top) that centres the font's ascent+descent box in a row. */
function centeredBaseline(
  font: PDFFont,
  size: number,
  top: number,
  height: number,
) {
  const ascent = font.heightAtSize(size, { descender: false });
  const descent = font.heightAtSize(size) - ascent;
  return top + (height - ascent - descent) / 2 + ascent;
}

function drawText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  baseline: number,
  options: { opacity?: number; italic?: boolean } = {},
) {
  page.drawText(text, {
    x,
    y: PAGE.height - baseline,
    font,
    size,
    color: INK,
    opacity: options.opacity,
    // No italic cut of Space Grotesk; a shear stands in.
    ...(options.italic && { ySkew: degrees(12) }),
  });
}

// --- shapes ----------------------------------------------------------------

function contain(image: PDFImage, width: number, height: number) {
  return image.scale(Math.min(width / image.width, height / image.height));
}

function drawContained(
  page: PDFPage,
  image: PDFImage,
  left: number,
  top: number,
  size: number,
) {
  const fit = contain(image, size, size);
  page.drawImage(image, {
    x: left + (size - fit.width) / 2,
    y: PAGE.height - top - (size - fit.height) / 2 - fit.height,
    ...fit,
  });
}

/** An SVG path for a rounded rectangle with its top-left corner at the origin. */
function roundedRect(width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const arc = (x: number, y: number) => `A${r} ${r} 0 0 1 ${x} ${y}`;
  return [
    `M${r} 0 H${width - r}`,
    arc(width, r),
    `V${height - r}`,
    arc(width - r, height),
    `H${r}`,
    arc(0, height - r),
    `V${r}`,
    arc(r, 0),
    "Z",
  ].join(" ");
}
