"use client";

import { useEffect, useRef, useState } from "react";
import DividerRow from "../DividerRow";
import { SHADOW } from "../sizing";
import { trackClick, trackEgg } from "../track";
import { CELL, PIECES, floorRow, render, turn, type Cell } from "./icons";

const CHARCOAL = "#4d4d4d";
const TURN_MS = 300;
const BLINK_MS = 90;
const BLINKS = 5;

// play → set (the winning turn finishes) → flash (the line blinks) → fall
// (the line is gone and what stood on it drops a row, for good).
type Phase = "play" | "set" | "flash" | "fall";

// Click a piece to spin it a quarter clockwise about its SRS box centre (the
// default transform-origin). The count only ever grows so consecutive clicks
// keep turning the same way instead of unwinding. Once the line is made the
// piece is redrawn as it lies, unrotated, so its cells can clear and fall
// straight down.
function Piece({
  box,
  lift = 0,
  cells,
  quarters,
  phase,
  onTurn,
}: {
  box: number;
  lift?: number;
  cells: Cell[];
  quarters: number;
  phase: Phase;
  onTurn: () => void;
}) {
  const line = useRef<SVGGElement>(null);
  const spinning = phase === "play" || phase === "set";
  const lying = spinning ? cells : turn(box, cells, quarters);
  const { viewBox, px, paths } = render(box, lying);
  const onLine = (i: number) =>
    !spinning && lying[i][1] === floorRow(box, lift);

  useEffect(() => {
    if (phase !== "flash") return;
    // An odd count of alternating runs ends dim, and holds there until the
    // fall takes the line away.
    line.current?.animate(
      { opacity: [1, 0.15] },
      {
        duration: BLINK_MS,
        iterations: BLINKS,
        direction: "alternate",
        fill: "forwards",
      },
    );
  }, [phase]);

  return (
    <svg
      viewBox={viewBox}
      aria-hidden
      style={{
        width: px,
        height: px,
        position: "relative",
        top: -lift * CELL,
        transform: spinning ? `rotate(${quarters * 90}deg)` : undefined,
      }}
      className={`${SHADOW} ${spinning ? "transition-transform duration-300 ease-out" : ""}`}
      onClick={phase === "play" ? onTurn : undefined}
    >
      {paths.map(
        (d, i) =>
          !onLine(i) && (
            <path
              key={i}
              d={d}
              fill={CHARCOAL}
              style={{
                transform:
                  phase === "fall" ? `translateY(${CELL}px)` : undefined,
                transition: "transform 250ms ease-in",
              }}
            />
          ),
      )}
      {phase === "flash" && (
        <g ref={line}>
          {paths.map(
            (d, i) => onLine(i) && <path key={i} d={d} fill={CHARCOAL} />,
          )}
        </g>
      )}
    </svg>
  );
}

// Every piece fills its width of the floor row and has nothing below it.
const madeLine = (quarters: number[]) =>
  PIECES.every((p, i) => {
    const floor = floorRow(p.box, p.lift);
    const lying = turn(p.box, p.cells, quarters[i]);
    return (
      lying.filter(([, r]) => r === floor).length === p.box &&
      !lying.some(([, r]) => r > floor)
    );
  });

// I · O · T · L tetrominoes, drawn in icons.ts. Not a puzzle row (no library image).
export default function TetrisDivider() {
  const [quarters, setQuarters] = useState(() => PIECES.map(() => 0));
  const [phase, setPhase] = useState<Phase>("play");

  useEffect(() => {
    if (phase === "play" || phase === "fall") return;
    const t = setTimeout(
      () => setPhase(phase === "set" ? "flash" : "fall"),
      phase === "set" ? TURN_MS : BLINK_MS * BLINKS,
    );
    return () => clearTimeout(t);
  }, [phase]);

  const onTurn = (i: number) => {
    const next = quarters.map((q, j) => (j === i ? q + 1 : q));
    setQuarters(next);
    trackClick("tetris");
    if (madeLine(next)) {
      setPhase("set");
      trackEgg({ egg: "tetris", event: "line" });
    }
  };

  return (
    <DividerRow>
      {PIECES.map((p, i) => (
        <Piece
          key={p.name}
          box={p.box}
          lift={p.lift}
          cells={p.cells}
          quarters={quarters[i]}
          phase={phase}
          onTurn={() => onTurn(i)}
        />
      ))}
    </DividerRow>
  );
}
