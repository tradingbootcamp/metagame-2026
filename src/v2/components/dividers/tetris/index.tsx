"use client";

import { useState } from "react";
import DividerRow from "../DividerRow";
import { SHADOW } from "../sizing";
import { PIECES, render, rotate, type Cell } from "./icons";

const CHARCOAL = "#4d4d4d";

// Click a piece to turn it a quarter clockwise; the row re-flows around it.
function Piece({ cells: initial }: { cells: Cell[] }) {
  const [cells, setCells] = useState(initial);
  const { viewBox, width, height, paths } = render(cells);
  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      style={{ width, height }}
      className={`${SHADOW} transition-[width,height] duration-200`}
      onClick={() => setCells(rotate(cells))}
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
        <Piece key={p.name} cells={p.cells} />
      ))}
    </DividerRow>
  );
}
