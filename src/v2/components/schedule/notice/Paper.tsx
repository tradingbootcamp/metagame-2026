import type { CSSProperties, ReactNode } from "react";
import type { NoteColor } from "@/lib/unconference";
import { NOTE_STYLES } from "@/v2/lib/schedule-styles";

// Clipart paper, not a 3D render: flat fills, an ink outline, a hard offset
// shadow, and just enough curl and tape to read as a real thing.

const INK = "#1b1530";

/** A small tilt that stays put for a given id, so the board looks hand-pinned. */
export function tiltFor(id: string, spread = 3): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((((h % 1000) + 1000) % 1000) / 1000 - 0.5) * 2 * spread;
}

/**
 * A square sticky note with its bottom-right corner curling up off the board.
 * `size` is its rendered width in px; children are laid over the paper.
 */
export function StickyPaper({
  color,
  size,
  children,
  className = "",
  style,
  outline = 2.5,
}: {
  color: NoteColor;
  size: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Outline width in CSS px, whatever the size. */
  outline?: number;
}) {
  const { background, borderColor } = NOTE_STYLES[color];
  const gid = `curl-${color}`;
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        width={size}
        height={size}
        overflow="visible"
        className="pointer-events-none absolute inset-0"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={background} />
            <stop offset="1" stopColor={borderColor} />
          </linearGradient>
        </defs>
        {/* The shadow reaches further under the curled corner, where the
            paper has lifted off the board. */}
        <path
          d="M3 4 H101.5 V86 Q103 103 85 104 H4 Q2 103 3 98 Z"
          fill="rgba(27,21,48,0.28)"
        />
        <path
          d="M0 0 H100 V82 Q98.5 97 82 100 H1.5 Q0 100 0 98 Z"
          fill={background}
          stroke={INK}
          strokeWidth={outline}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* The glue strip: a touch darker, like the real thing. */}
        <path d="M0 0 H100 V13 H0 Z" fill="rgba(27,21,48,0.06)" />
        {/* The curl: the paper's underside, folded back up. */}
        <path
          d="M100 82 Q90 85 82 100 Q98.5 97 100 82 Z"
          fill={`url(#${gid})`}
          stroke={INK}
          strokeWidth={outline}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M97 86 Q91 89 87 96"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

function Tape({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: Record<typeof corner, CSSProperties> = {
    tl: { top: -10, left: -18, transform: "rotate(-38deg)" },
    tr: { top: -10, right: -18, transform: "rotate(38deg)" },
    bl: { bottom: -10, left: -18, transform: "rotate(38deg)" },
    br: { bottom: -10, right: -18, transform: "rotate(-38deg)" },
  };
  return (
    <div
      aria-hidden
      style={{
        ...pos[corner],
        // Torn ends: a zigzag on each short side.
        clipPath:
          "polygon(0 8%, 6% 0, 94% 0, 100% 10%, 96% 30%, 100% 50%, 96% 70%, 100% 90%, 94% 100%, 6% 100%, 0 92%, 4% 70%, 0 50%, 4% 30%)",
      }}
      className="pointer-events-none absolute z-10 h-[26px] w-[78px] bg-[#f3e6b8]/80 shadow-[inset_0_0_0_1.5px_rgba(27,21,48,0.25)] backdrop-blur-[1px]"
    />
  );
}

/** A poster sheet taped to the wall at all four corners. */
export function PosterPaper({
  paper,
  children,
  className = "",
}: {
  /** The sheet's fill, as a hex colour. */
  paper: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative border-[2.5px] border-[#1b1530] shadow-[5px_6px_0_rgba(27,21,48,0.28)] ${className}`}
      style={{ background: paper }}
    >
      <Tape corner="tl" />
      <Tape corner="tr" />
      <Tape corner="bl" />
      <Tape corner="br" />
      {children}
    </div>
  );
}
