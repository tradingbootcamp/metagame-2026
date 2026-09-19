"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { trackClick, trackEgg } from "../track";
import { ICONS, PAWN } from "./icons";

// One square across: a piece's width plus DividerRow's 34px gap. Ranks are
// shorter than files are wide, or the knight climbs well into the section above.
const STEP = 60;
const RANK = 46;
const LEG = 180;
// Castled: the pair hop, the move is written up, and the row resets itself.
// A beat after they've settled, then one small hop.
const HOP_AT = 2 * LEG + 500;
const HOP_MS = 520;
const CASTLED_MS = 3200;

type Move = { dx: number; dy: number; knight?: boolean };

// x and y sit on separate wrappers so a knight can walk its L: up first on
// the way out (clear of the king's square), retraced on the way back.
// Only the glyph takes clicks: the x wrapper's box stays on the rank, where
// it would cover a neighbour.
function Piece({
  icon,
  move,
  moved,
  shaking,
  onClick,
  onShakeEnd,
  glyphRef,
}: {
  icon: (typeof ICONS)[number];
  move: Move;
  moved: boolean;
  shaking?: boolean;
  onClick: () => void;
  onShakeEnd?: () => void;
  glyphRef?: Ref<HTMLSpanElement>;
}) {
  const leg = (second: boolean) => ({
    transitionDuration: `${LEG}ms`,
    transitionDelay: second ? `${LEG}ms` : "0ms",
  });
  const knight = Boolean(move.knight);
  return (
    <span
      className="pointer-events-none transition-transform ease-out"
      style={{
        transform: `translateX(${moved ? move.dx * STEP : 0}px)`,
        ...leg(knight && moved),
      }}
    >
      <span
        className="block transition-transform ease-out"
        style={{
          transform: `translateY(${moved ? move.dy * RANK : 0}px)`,
          ...leg(knight && !moved),
        }}
      >
        <span
          ref={glyphRef}
          onClick={() => {
            trackClick("chess");
            onClick();
          }}
          onAnimationEnd={onShakeEnd}
          className={`pointer-events-auto block ${shaking ? "animate-[shake_400ms_ease-in-out]" : ""}`}
        >
          <IconGlyph icon={icon} />
        </span>
      </span>
    </span>
  );
}

// The pawns the moves imply, as [file, rank] from the king's square: f2 and h2
// at home, and the g-pawn a step up to let the bishop in under it. (The
// e-pawn has gone up the board, out of frame, which is how the knight gets e2.)
// Ghosts, and only once something has moved: at rest the row is just a divider.
const PAWNS = [
  [1, 1],
  [3, 1],
  [2, 2],
];

// K · B · N · R, the kingside back rank. Fianchetto the bishop (g2) and develop
// the knight (f3), then the king castles; a blocked king shakes. Castled, the
// row resets itself after a beat, or at once on a click.
export default function CastlingDivider() {
  const [bishop, setBishop] = useState(false);
  const [knight, setKnight] = useState(false);
  const [castled, setCastled] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [king, bishopIcon, knightIcon, rook] = ICONS;
  const kingRef = useRef<HTMLSpanElement>(null);
  const rookRef = useRef<HTMLSpanElement>(null);

  const reset = () => {
    setCastled(false);
    setBishop(false);
    setKnight(false);
  };

  useEffect(() => {
    if (!castled) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hops = still
      ? []
      : [kingRef, rookRef].map((ref, i) =>
          ref.current?.animate(
            [
              { transform: "none", easing: "ease-out" },
              { transform: "translateY(-6.5px)", easing: "ease-in" },
              { transform: "none" },
            ],
            { delay: HOP_AT + i * 80, duration: HOP_MS },
          ),
        );
    const t = setTimeout(reset, CASTLED_MS);
    return () => {
      clearTimeout(t);
      hops.forEach((hop) => hop?.cancel());
    };
  }, [castled]);

  const onKing = () => {
    if (castled) reset();
    else if (bishop && knight) {
      setCastled(true);
      trackEgg({ egg: "chess", event: "castle" });
    } else setShaking(true);
  };

  return (
    <DividerRow game="chess">
      <span className="relative flex items-center gap-[34px]">
        {PAWNS.map(([file, rank]) => (
          <span
            key={file}
            className="pointer-events-none absolute bottom-0 transition-opacity duration-500"
            style={{
              left: file * STEP,
              transform: `translateY(${-rank * RANK}px)`,
              opacity: bishop || knight || castled ? 0.22 : 0,
            }}
          >
            <IconGlyph icon={PAWN} />
          </span>
        ))}
        {/* O-O!: kingside castling, annotated as a good move. Hangs in the
            row's own bottom padding. The O's are drawn: at this size every
            face on the site sets a capital O that reads as a zero. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-full left-1/2 mt-2 flex -translate-x-1/2 items-center gap-[3px] font-[family-name:var(--font-space-grotesk)] text-[14px] leading-none font-medium text-ink/60 transition-opacity duration-500"
          style={{
            opacity: castled ? 1 : 0,
            transitionDelay: castled ? `${HOP_AT}ms` : "0ms",
          }}
        >
          <span className="size-[11px] rounded-full border-[1.5px] border-current" />
          <span className="h-[1.5px] w-[6px] bg-current" />
          <span className="size-[11px] rounded-full border-[1.5px] border-current" />
          <span className="ml-px">!</span>
        </span>
        <Piece
          glyphRef={kingRef}
          icon={king}
          move={{ dx: 2, dy: 0 }}
          moved={castled}
          shaking={shaking}
          onClick={onKing}
          onShakeEnd={() => setShaking(false)}
        />
        <Piece
          icon={bishopIcon}
          move={{ dx: 1, dy: -1 }}
          moved={bishop}
          onClick={() => !castled && setBishop(!bishop)}
        />
        <Piece
          icon={knightIcon}
          move={{ dx: -2, dy: -1, knight: true }}
          moved={knight}
          onClick={() => !castled && setKnight(!knight)}
        />
        <Piece
          glyphRef={rookRef}
          icon={rook}
          move={{ dx: -2, dy: 0 }}
          moved={castled}
          onClick={onKing}
        />
      </span>
    </DividerRow>
  );
}
