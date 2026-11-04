// What a notice's sticky note and poster are made of: text boxes and pen
// strokes on a fixed logical canvas, scaled to fit wherever it is drawn. Pure
// data, no React and no database, so the editor, the server actions and the
// seed all read the same rules. Everything from the client goes through
// parseNoticeDoc before it is stored.

/**
 * "banner" is a session poster's face: as wide as the board and as tall as
 * its session, so its height varies (see bannerSize); the size here is the
 * most it can be, which is what a stored one is clamped to.
 */
export const FACES = ["sticky", "poster", "banner"] as const;
export type Face = (typeof FACES)[number];

/** Logical size of each face; the board and the dialog scale these. */
export const FACE_SIZE: Record<Face, { w: number; h: number }> = {
  sticky: { w: 200, h: 200 },
  poster: { w: 480, h: 640 },
  banner: { w: 300, h: 1600 },
};

/** The narrowest the board's poster area gets on a desktop, in px. */
const BANNER_REF_W = 272;

/**
 * A session poster's logical canvas for a session this many minutes long:
 * 300 wide, with the board's shape at its narrowest, so a design made in
 * the editor fits the board without cropping.
 */
export function bannerSize(minutes: number): { w: number; h: number } {
  const px = Math.max(30, minutes) * 2 - 12;
  const h = Math.round((px * FACE_SIZE.banner.w) / BANNER_REF_W);
  return { w: FACE_SIZE.banner.w, h: Math.min(h, FACE_SIZE.banner.h) };
}

/** Faces that carry their own paper colour, rather than a sticky's. */
const hasPaper = (face: Face) => face !== "sticky";

/** The document with one text box's ink changed. */
export function recolourBox(doc: NoticeDoc, id: string, ink: Ink): NoticeDoc {
  return {
    ...doc,
    items: doc.items.map((it) =>
      it.id === id && it.kind === "text" ? { ...it, ink } : it,
    ),
  };
}

export const TEXT_SIZES = ["s", "m", "l", "xl"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

/** Logical px per size; the same on both faces so a pasted line matches. */
export const TEXT_PX: Record<TextSize, number> = {
  s: 13,
  m: 17,
  l: 24,
  xl: 36,
};

export const INKS = [
  "ink",
  "red",
  "blue",
  "green",
  "orange",
  "purple",
] as const;
export type Ink = (typeof INKS)[number];

export const INK_HEX: Record<Ink, string> = {
  ink: "#1b1530",
  red: "#d6405f",
  blue: "#3f6fd1",
  green: "#2f9a5a",
  orange: "#e07b25",
  purple: "#7c4cc2",
};

export const PEN_WIDTHS = [2, 5, 10] as const;
export type PenWidth = (typeof PEN_WIDTHS)[number];

export const PAPERS = ["white", "cream", "kraft", "pink", "sky"] as const;
export type Paper = (typeof PAPERS)[number];

export const PAPER_HEX: Record<Paper, string> = {
  white: "#fffdf8",
  cream: "#f7eccf",
  kraft: "#d9b98c",
  pink: "#fbdde6",
  sky: "#dcebfb",
};

export type Run = { t: string; b?: true };
export type Para = { size: TextSize; bullet?: true; runs: Run[] };

export type TextItem = {
  id: string;
  kind: "text";
  x: number;
  y: number;
  /** Width in logical px; the height follows the text. */
  w: number;
  ink: Ink;
  paras: Para[];
};

export type StrokeItem = {
  id: string;
  kind: "stroke";
  ink: Ink;
  width: PenWidth;
  /** Flat [x0, y0, x1, y1, …] in logical px, rounded to tenths. */
  points: number[];
};

export type NoticeItem = TextItem | StrokeItem;

export type NoticeDoc = {
  v: 1;
  /** Poster only; a sticky's paper is the note's colour column. */
  paper?: Paper;
  items: NoticeItem[];
};

export const EMPTY_DOC: NoticeDoc = { v: 1, items: [] };

// Ceilings that keep one notice from bloating the schedule payload, which
// carries every notice on the board.
const MAX_ITEMS = 400;
const MAX_TEXT_ITEMS = 40;
const MAX_POINTS = 4000; // numbers per stroke, so 2000 points
const MAX_TOTAL_POINTS = 40_000;
const MAX_CHARS = 4000; // across one face
const MIN_TEXT_W = 40;

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

const round1 = (v: number) => Math.round(v * 10) / 10;

const ID = /^[A-Za-z0-9_-]{1,40}$/;

/** A short random id for a new item; not security-bearing. */
export const itemId = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function parseParas(raw: unknown): Para[] | null {
  if (!Array.isArray(raw) || raw.length > 200) return null;
  const paras: Para[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") return null;
    const { size, bullet, runs } = p as Record<string, unknown>;
    if (!Array.isArray(runs) || runs.length > 200) return null;
    const clean: Run[] = [];
    for (const r of runs) {
      if (!r || typeof r !== "object") return null;
      const { t, b } = r as Record<string, unknown>;
      if (typeof t !== "string") return null;
      if (t.length === 0) continue;
      const prev = clean.at(-1);
      // Adjacent runs of the same weight are one run.
      if (prev && !!prev.b === (b === true)) prev.t += t;
      else clean.push(b === true ? { t, b: true } : { t });
    }
    paras.push({
      size: isOneOf(TEXT_SIZES, size) ? size : "m",
      ...(bullet === true && { bullet: true }),
      runs: clean,
    });
  }
  return paras;
}

/**
 * The document as it may be stored, or why it can't be. Positions are
 * clamped onto the face rather than refused: a box dragged half off the edge
 * is the editor's business, not an error.
 */
export function parseNoticeDoc(
  raw: unknown,
  face: Face,
): { doc: NoticeDoc } | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "That isn't a note." };
  const { items, paper } = raw as Record<string, unknown>;
  if (!Array.isArray(items)) return { error: "That isn't a note." };
  if (items.length > MAX_ITEMS) {
    return { error: "That's a lot on one page. Try fewer strokes." };
  }
  const { w: W, h: H } = FACE_SIZE[face];
  const out: NoticeItem[] = [];
  let texts = 0;
  let chars = 0;
  let points = 0;
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") return { error: "Bad item." };
    const it = item as Record<string, unknown>;
    const id = typeof it.id === "string" && ID.test(it.id) ? it.id : itemId();
    if (seen.has(id)) continue;
    seen.add(id);
    const ink = isOneOf(INKS, it.ink) ? it.ink : "ink";
    if (it.kind === "text") {
      const paras = parseParas(it.paras);
      if (!paras) return { error: "Bad text box." };
      const length = paras.reduce(
        (n, p) => n + p.runs.reduce((m, r) => m + r.t.length, 0),
        0,
      );
      // An empty box is the editor's leftover, not content.
      if (length === 0) continue;
      chars += length;
      if (++texts > MAX_TEXT_ITEMS) {
        return { error: `Keep it to ${MAX_TEXT_ITEMS} text boxes.` };
      }
      const num = (v: unknown) =>
        typeof v === "number" && isFinite(v) ? v : 0;
      const w = clamp(num(it.w) || W, MIN_TEXT_W, W);
      out.push({
        id,
        kind: "text",
        x: round1(clamp(num(it.x), 0, W - MIN_TEXT_W)),
        y: round1(clamp(num(it.y), 0, H - 10)),
        w: round1(w),
        ink,
        paras,
      });
    } else if (it.kind === "stroke") {
      const pts = it.points;
      if (!Array.isArray(pts) || pts.length < 2 || pts.length % 2 !== 0) {
        continue;
      }
      if (pts.length > MAX_POINTS) return { error: "That stroke is too long." };
      const clean: number[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i];
        const y = pts[i + 1];
        if (typeof x !== "number" || typeof y !== "number") {
          return { error: "Bad stroke." };
        }
        if (!isFinite(x) || !isFinite(y)) return { error: "Bad stroke." };
        clean.push(round1(clamp(x, 0, W)), round1(clamp(y, 0, H)));
      }
      points += clean.length;
      out.push({
        id,
        kind: "stroke",
        ink,
        width: (PEN_WIDTHS as readonly unknown[]).includes(it.width)
          ? (it.width as PenWidth)
          : 2,
        points: clean,
      });
    } else {
      return { error: "Bad item." };
    }
  }
  if (chars > MAX_CHARS) {
    return { error: `Keep it under ${MAX_CHARS} characters a page.` };
  }
  if (points > MAX_TOTAL_POINTS) {
    return { error: "That's a lot of drawing. Try simpler strokes." };
  }
  return {
    doc: {
      v: 1,
      ...(hasPaper(face) && {
        paper: isOneOf(PAPERS, paper) ? paper : "white",
      }),
      items: out,
    },
  };
}

/** True when the face holds nothing at all. */
export const isBlank = (doc: NoticeDoc): boolean =>
  !doc.items.some(
    (i) =>
      i.kind === "stroke" ||
      i.paras.some((p) => p.runs.some((r) => r.t.trim().length > 0)),
  );

const textOf = (doc: NoticeDoc): string[] =>
  doc.items
    .filter((i): i is TextItem => i.kind === "text")
    // Read top to bottom, the way someone skimming the board would.
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .flatMap((i) => i.paras.map((p) => p.runs.map((r) => r.t).join("")))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

/**
 * One line of plain text standing in for the notice where only text fits:
 * the list view, a tile's title attribute, and the stored title column.
 * Null for a notice that is only drawings.
 */
export function noticeHeadline(
  sticky: NoticeDoc,
  poster: NoticeDoc,
  max = 120,
): string | null {
  const line = textOf(sticky)[0] ?? textOf(poster)[0];
  if (!line) return null;
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** Every line of text on a face, for the list view's second line. */
export const noticeText = (doc: NoticeDoc): string => textOf(doc).join(" · ");

/** A one-box document, for seeds and for a fresh face. */
export function textDoc(
  face: Face,
  lines: { text: string; size?: TextSize; bold?: boolean; bullet?: boolean }[],
  at: { x: number; y: number; w?: number } = { x: 14, y: 14 },
  paper?: Paper,
): NoticeDoc {
  const { w: W } = FACE_SIZE[face];
  return {
    v: 1,
    ...(hasPaper(face) && { paper: paper ?? "white" }),
    items: [
      {
        id: itemId(),
        kind: "text",
        x: at.x,
        y: at.y,
        w: at.w ?? W - at.x * 2,
        ink: "ink",
        paras: lines.map((l) => ({
          size: l.size ?? "m",
          ...(l.bullet && { bullet: true as const }),
          runs: l.text ? [l.bold ? { t: l.text, b: true } : { t: l.text }] : [],
        })),
      },
    ],
  };
}

/**
 * Ramer–Douglas–Peucker on a flat point list: drops the points a stroke
 * doesn't need, so a slow scribble isn't stored a pixel at a time.
 */
export function simplifyStroke(points: number[], epsilon = 0.8): number[] {
  const n = points.length / 2;
  if (n <= 2) return points;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = points[a * 2];
    const ay = points[a * 2 + 1];
    const bx = points[b * 2];
    const by = points[b * 2 + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let far = -1;
    let best = epsilon;
    for (let i = a + 1; i < b; i++) {
      const px = points[i * 2];
      const py = points[i * 2 + 1];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > best) {
        best = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(points[i * 2], points[i * 2 + 1]);
  }
  return out;
}

/** A smooth SVG path through the points, midpoint-quadratic style. */
export function strokePath(points: number[]): string {
  const n = points.length / 2;
  if (n === 0) return "";
  const p = (i: number) => `${points[i * 2]} ${points[i * 2 + 1]}`;
  // A dot: a zero-length line still draws a round cap.
  if (n === 1) return `M${p(0)}L${p(0)}`;
  if (n === 2) return `M${p(0)}L${p(1)}`;
  let d = `M${p(0)}`;
  for (let i = 1; i < n - 1; i++) {
    const mx = (points[i * 2] + points[i * 2 + 2]) / 2;
    const my = (points[i * 2 + 1] + points[i * 2 + 3]) / 2;
    d += `Q${p(i)} ${mx} ${my}`;
  }
  return `${d}L${p(n - 1)}`;
}

/** Whether a point lies within `reach` of the stroke, for the eraser. */
export function strokeHit(
  stroke: StrokeItem,
  x: number,
  y: number,
  reach: number,
): boolean {
  const pts = stroke.points;
  const r = reach + stroke.width / 2;
  if (pts.length === 2) return Math.hypot(pts[0] - x, pts[1] - y) <= r;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i];
    const ay = pts[i + 1];
    const bx = pts[i + 2];
    const by = pts[i + 3];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? clamp(((x - ax) * dx + (y - ay) * dy) / len2, 0, 1) : 0;
    if (Math.hypot(ax + t * dx - x, ay + t * dy - y) <= r) return true;
  }
  return false;
}
