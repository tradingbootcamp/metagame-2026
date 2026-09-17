"use client";

import { useState } from "react";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { ICONS } from "./icons";

// One square: a piece's width plus DividerRow's 22px gap.
const STEP = 46;
const LEG = 180;

type Move = { dx: number; dy: number; knight?: boolean };

// A knight walks its L one leg at a time — up then across on the way out,
// across then down on the way back — so x and y sit on separate wrappers.
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
  const leg = (first: boolean) => ({
    transitionDuration: `${LEG}ms`,
    transitionDelay: move.knight && !first ? `${LEG}ms` : "0ms",
  });
  return (
    <span
      className="pointer-events-none transition-transform ease-out"
      style={{
        transform: `translateX(${moved ? move.dx * STEP : 0}px)`,
        ...leg(!moved),
      }}
    >
      <span
        className="block transition-transform ease-out"
        style={{
          transform: `translateY(${moved ? move.dy * STEP : 0}px)`,
          ...leg(moved),
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

// K · B · N · R, the kingside back rank. Click the bishop and knight out of the
// way, then the king castles; a blocked king shakes. Clicking the castled king
// resets the row. Not a puzzle row (the odd-pieces row is "chess").
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
    } else if (bishop && knight) setCastled(true);
    else setShaking(true);
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
        move={{ dx: -1, dy: -1 }}
        moved={bishop}
        onClick={() => !castled && setBishop(!bishop)}
      />
      <Piece
        icon={knightIcon}
        move={{ dx: 1, dy: -2, knight: true }}
        moved={knight}
        onClick={() => !castled && setKnight(!knight)}
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
