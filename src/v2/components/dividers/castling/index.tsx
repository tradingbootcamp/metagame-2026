"use client";

import { useState } from "react";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { trackClick, trackEgg } from "../track";
import { ICONS, PAWN } from "./icons";

// One square: a piece's width plus DividerRow's 22px gap.
const STEP = 46;
const LEG = 180;

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
}: {
  icon: (typeof ICONS)[number];
  move: Move;
  moved: boolean;
  shaking?: boolean;
  onClick: () => void;
  onShakeEnd?: () => void;
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
          transform: `translateY(${moved ? move.dy * STEP : 0}px)`,
          ...leg(knight && !moved),
        }}
      >
        <span
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
// the knight (f3), then the king castles; a blocked king shakes. Clicking the castled king
// resets the row.
export default function CastlingDivider() {
  const [bishop, setBishop] = useState(false);
  const [knight, setKnight] = useState(false);
  const [castled, setCastled] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [king, bishopIcon, knightIcon, rook] = ICONS;

  const onKing = () => {
    if (castled) {
      setCastled(false);
      setBishop(false);
      setKnight(false);
    } else if (bishop && knight) {
      setCastled(true);
      trackEgg({ egg: "chess", event: "castle" });
    } else setShaking(true);
  };

  return (
    <DividerRow game="chess">
      <span className="relative flex items-center gap-[22px]">
        {PAWNS.map(([file, rank]) => (
          <span
            key={file}
            className="pointer-events-none absolute bottom-0 transition-opacity duration-500"
            style={{
              left: file * STEP,
              transform: `translateY(${-rank * STEP}px)`,
              opacity: bishop || knight || castled ? 0.22 : 0,
            }}
          >
            <IconGlyph icon={PAWN} />
          </span>
        ))}
        <Piece
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
          icon={rook}
          move={{ dx: -2, dy: 0 }}
          moved={castled}
          onClick={onKing}
        />
      </span>
    </DividerRow>
  );
}
