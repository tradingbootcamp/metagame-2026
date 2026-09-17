"use client";

import { useState } from "react";
import DividerRow from "../DividerRow";
import { SHADOW } from "../sizing";
import { PIECES, render, type Cell } from "./icons";

const CHARCOAL = "#4d4d4d";

// Click a piece to spin it a quarter clockwise about its SRS box centre (the
// default transform-origin). The angle only ever grows so consecutive clicks
// keep turning the same way instead of unwinding.
function Piece({ box, cells }: { box: number; cells: Cell[] }) {
  const [deg, setDeg] = useState(0);
  const { viewBox, px, paths } = render(box, cells);
  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      style={{ width: px, height: px, transform: `rotate(${deg}deg)` }}
      className={`${SHADOW} transition-transform duration-300 ease-out`}
      onClick={() => setDeg(deg + 90)}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill={CHARCOAL} />
      ))}
    </svg>
  );
}

// I · O · T · L tetrominoes, drawn in icons.ts. Not a puzzle row (no library image).
export default function TetrisDivider() {
  return (
    <DividerRow>
      {PIECES.map((p) => (
        <Piece key={p.name} box={p.box} cells={p.cells} />
      ))}
    </DividerRow>
  );
}
