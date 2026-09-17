"use client";

import { useState } from "react";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { ICONS } from "./icons";

// One square: a piece's width plus DividerRow's 22px gap.
const STEP = 46;
const LEG = 180;

// `xFirst` set = an L walked one leg at a time, in that order.
type Move = { dx: number; dy: number; xFirst?: boolean };

// x and y sit on separate wrappers so a knight can walk its L leg by leg.
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
  return (
    <span
      className="pointer-events-none transition-transform ease-out"
      style={{
        transform: `translateX(${moved ? move.dx * STEP : 0}px)`,
        ...leg(move.xFirst === false),
      }}
    >
      <span
        className="block transition-transform ease-out"
        style={{
          transform: `translateY(${moved ? move.dy * STEP : 0}px)`,
          ...leg(move.xFirst === true),
        }}
      >
        <span
          onClick={onClick}
          onAnimationEnd={onShakeEnd}
          className={`pointer-events-auto block ${shaking ? "animate-[shake_400ms_ease-in-out]" : ""}`}
        >
          <IconGlyph icon={icon} />
        </span>
      </span>
    </span>
  );
}

// K · B · N · R, the kingside back rank. Fianchetto the bishop (g2) and develop
// the knight (f3), then the king castles; a blocked king shakes. Clicking the castled king
// resets the row. Not a puzzle row (the odd-pieces row is "chess").
export default function CastlingDivider() {
  const [bishop, setBishop] = useState(false);
  const [knight, setKnight] = useState(false);
  const [knightXFirst, setKnightXFirst] = useState(false);
  const [castled, setCastled] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [king, bishopIcon, knightIcon, rook] = ICONS;

  const onKing = () => {
    if (castled) {
      setCastled(false);
      setBishop(false);
      setKnight(false);
    } else if (bishop && knight) setCastled(true);
    else setShaking(true);
  };

  // The knight's L runs along whichever file the bishop isn't on: the f-file
  // once the bishop is on g2, else the g-file.
  const onKnight = () => {
    if (castled) return;
    setKnightXFirst(knight ? !bishop : bishop);
    setKnight(!knight);
  };

  return (
    <DividerRow>
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
        move={{ dx: -1, dy: -2, xFirst: knightXFirst }}
        moved={knight}
        onClick={onKnight}
      />
      <Piece
        icon={rook}
        move={{ dx: -2, dy: 0 }}
        moved={castled}
        onClick={onKing}
      />
    </DividerRow>
  );
}
