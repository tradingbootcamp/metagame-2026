import "server-only";
import fontkit from "@pdf-lib/fontkit";
import {
  appendBezierCurve,
  closePath,
  fill,
  fillAndStroke,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  PDFOperator,
  PDFOperatorNames,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingColor,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  stroke,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import QRCode from "qrcode";
import {
  logoClearing,
  posterQrLogo,
  qrShapes,
  type PosterQrStyle,
  type QrLogo,
} from "@/lib/qr-styles";
import {
  apply,
  circle,
  multiply,
  parsePath,
  parseTransform,
  transform,
  type Cmd,
  type Matrix,
} from "@/lib/vector-path";
import {
  CUBE,
  LEFT_FACE,
  LETTER,
  PIP_R,
  PIPS,
  RIGHT_FACE,
  SEAMS,
} from "@/v2/components/nav/Mg2Die";
import {
  H,
  HEX,
  INSET_LEFT,
  INSET_RIGHT,
  INSET_TOP,
  LEFT_MATRIX,
  LETTER_PATHS,
  PIP_LAYOUTS,
  RIGHT_MATRIX,
  S,
  TOP_MATRIX,
} from "@/v2/components/nav/LogoDice";

type Layer = {
  cmds: Cmd[];
  fill?: RGB;
  evenOdd?: boolean;
  stroke?: { color: RGB; width: number };
};
type Logo = {
  /** Visible extent, including stroke overhang, in the logo's own units. */
  box: { x: number; y: number; width: number; height: number };
  layers: Layer[];
};

const hex = (value: string) =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );

// The nav rail's outline MG2 die; the M/G are outlined from Space Grotesk
// Bold so they don't depend on a PDF font, placed the way SVG's
// text-anchor=middle / dominant-baseline=central places them.
function mg2Logo(ink: RGB, fontBytes: Uint8Array): Logo {
  const font = fontkit.create(fontBytes);
  const em = LETTER.size / font.unitsPerEm;
  const baseline = LETTER.y + ((font.ascent + font.descent) / 2) * em;
  const letter = (face: string, char: string): Cmd[] => {
    const glyph = font.glyphForCodePoint(char.codePointAt(0)!);
    const x0 = LETTER.x - (glyph.advanceWidth * em) / 2;
    return transform(
      parsePath(glyph.path.toSVG()),
      multiply(parseTransform(face), [em, 0, 0, -em, x0, baseline]),
    );
  };
  return {
    box: { x: 3.3, y: 3.3, width: 17.4, height: 19.3 },
    layers: [
      {
        cmds: [...parsePath(CUBE), ...parsePath(SEAMS)],
        stroke: { color: ink, width: 2 },
      },
      {
        cmds: [
          ...PIPS.flatMap(([cx, cy]) => circle(cx, cy, PIP_R)),
          ...letter(LEFT_FACE, "M"),
          ...letter(RIGHT_FACE, "G"),
        ],
        fill: ink,
      },
    ],
  };
}

// The site's colored "MG" brand die (LogoDie with its default colors).
function dieLogo(): Logo {
  const face = (matrix: string, inset: string) =>
    parseTransform(`${matrix} ${inset}`);
  const top = face(TOP_MATRIX, INSET_TOP);
  const r = 48;
  const topFace = parsePath(
    `M0 ${r}Q0 0 ${r} 0L${S - r} 0Q${S} 0 ${S} ${r}L${S} ${S - r}Q${S} ${S} ${S - r} ${S}L${r} ${S}Q0 ${S} 0 ${S - r}Z`,
  );
  const ink = hex("#000000");
  return {
    box: { x: -H - 22, y: -S - 22, width: 2 * H + 44, height: 2 * S + 44 },
    layers: [
      { cmds: parsePath(HEX), fill: ink, stroke: { color: ink, width: 44 } },
      { cmds: transform(topFace, top), fill: hex("#232323") },
      {
        cmds: transform(
          PIP_LAYOUTS[2].flatMap(([x, y]) => circle(x, y, 42)),
          top,
        ),
        fill: hex("#ffffff"),
      },
      {
        cmds: transform(
          parsePath(LETTER_PATHS.m),
          face(LEFT_MATRIX, INSET_LEFT),
        ),
        fill: hex("#1ea1ff"),
        evenOdd: true,
      },
      {
        cmds: transform(
          parsePath(LETTER_PATHS.g),
          face(RIGHT_MATRIX, INSET_RIGHT),
        ),
        fill: hex("#ffab3f"),
        evenOdd: true,
      },
    ],
  };
}

function pathOps(cmds: Cmd[], m: Matrix): PDFOperator[] {
  return cmds.map((cmd) => {
    switch (cmd[0]) {
      case "M":
        return moveTo(...apply(m, cmd[1], cmd[2]));
      case "L":
        return lineTo(...apply(m, cmd[1], cmd[2]));
      case "C":
        return appendBezierCurve(
          ...apply(m, cmd[1], cmd[2]),
          ...apply(m, cmd[3], cmd[4]),
          ...apply(m, cmd[5], cmd[6]),
        );
      default:
        return closePath();
    }
  });
}

function drawLayer(page: PDFPage, layer: Layer, m: Matrix) {
  // Uniform scale, so stroke widths scale by the matrix's x-length.
  const scale = Math.hypot(m[0], m[1]);
  page.pushOperators(
    pushGraphicsState(),
    ...(layer.fill ? [setFillingColor(layer.fill)] : []),
    ...(layer.stroke
      ? [
          setStrokingColor(layer.stroke.color),
          setLineWidth(layer.stroke.width * scale),
          setLineCap(LineCapStyle.Round),
          setLineJoin(LineJoinStyle.Round),
        ]
      : []),
    ...pathOps(layer.cmds, m),
    layer.fill && layer.stroke
      ? fillAndStroke()
      : layer.fill
        ? layer.evenOdd
          ? PDFOperator.of(PDFOperatorNames.FillEvenOdd)
          : fill()
        : stroke(),
    popGraphicsState(),
  );
}

// White kept between the cleared block's edge and the logo, in modules.
const LOGO_PAD = 0.6;

/**
 * Draws a styled QR (not `square`, which poster-pdf keeps as plain modules)
 * into a box whose top-left is (x, top) in top-down page points. `quiet` is
 * the module count of white inside the box on each side.
 */
export function drawStyledQr(
  page: PDFPage,
  options: {
    url: string;
    style: Exclude<PosterQrStyle, "square">;
    x: number;
    top: number;
    size: number;
    quiet: number;
    ink: RGB;
    font: Uint8Array;
  },
) {
  const logo = posterQrLogo(options.style);
  const matrix = QRCode.create(options.url, {
    errorCorrectionLevel: logo ? "H" : "M",
  }).modules;
  const count = matrix.size;
  const unit = options.size / (count + 2 * options.quiet);
  const pageH = page.getHeight();
  const origin = options.x + options.quiet * unit;
  const originTop = options.top + options.quiet * unit;
  // Module space (y down) → PDF space (y up).
  const toPdf: Matrix = [unit, 0, 0, -unit, origin, pageH - originTop];
  const clear = logo ? logoClearing(count) : 0;
  drawLayer(
    page,
    { cmds: qrShapes(matrix, options.style, clear), fill: options.ink },
    toPdf,
  );
  if (logo) drawLogo(page, logo, options, count, clear, toPdf);
}

function drawLogo(
  page: PDFPage,
  kind: QrLogo,
  options: { ink: RGB; font: Uint8Array },
  count: number,
  clear: number,
  toPdf: Matrix,
) {
  const logo = kind === "mg2" ? mg2Logo(options.ink, options.font) : dieLogo();
  const room = clear - 2 * LOGO_PAD;
  const k = room / Math.max(logo.box.width, logo.box.height);
  const cx = count / 2;
  const fit: Matrix = [
    k,
    0,
    0,
    k,
    cx - k * (logo.box.x + logo.box.width / 2),
    cx - k * (logo.box.y + logo.box.height / 2),
  ];
  const m = multiply(toPdf, fit);
  for (const layer of logo.layers) drawLayer(page, layer, m);
}
