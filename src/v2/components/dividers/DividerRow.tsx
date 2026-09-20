"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import { Star } from "lucide-react";
import {
  getServerSnapshot,
  getSnapshot,
  guess,
  PUZZLE_ENABLED,
  subscribe,
  type Game,
} from "@/v2/puzzle/store";

// Wrap rows in this to take them out of the puzzle (the /dividers gallery):
// clicks neither guess nor shake, and no stars render.
const NoPuzzleContext = createContext(false);
export function NoPuzzle({ children }: { children: React.ReactNode }) {
  return (
    <NoPuzzleContext.Provider value={true}>{children}</NoPuzzleContext.Provider>
  );
}

// Layout shell every section divider shares: two hairlines flanking the icons.
// With `game` set the row is a puzzle target (src/v2/puzzle/store.ts): a star
// appears either side of the icons once the game is found. Rows with no
// `game` are decoys that earn no stars. Clicks are checked in the capture
// phase: when the puzzle claims one (a find, or any click while in game) it
// stops there, so the row's own interaction (Tetris spinning, …) only runs
// for clicks the puzzle passes on. A wrong pick shakes the row. Deliberately
// no pointer cursor or label — it's a secret. `overhang` is for a row whose
// icons have spread out past the stars (Set): the stars hide, and each hairline
// is clipped back that many px from its inner end.
// `left`/`right` hang a mark on the hairlines, centred and out of the flow.
export default function DividerRow({
  children,
  game,
  overhang,
  left,
  right,
}: {
  children: React.ReactNode;
  game?: Game;
  overhang?: number;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [shaking, setShaking] = useState(false);
  const off = useContext(NoPuzzleContext) || !PUZZLE_ENABLED;
  const found = Boolean(game && !off && state.stars[game]);

  const onClickCapture = (e: React.MouseEvent) => {
    if (off) return;
    const result = guess(game);
    if (result === "pass") return;
    e.stopPropagation();
    if (result === "wrong") setShaking(true);
  };

  // Stars always take up their space so earning one doesn't shift the icons.
  // The negative margin pulls a star in from the icons' wide gap, so its slot
  // doesn't push the hairline far out.
  const star = (side: "left" | "right") => (
    <Star
      aria-hidden
      size={22}
      strokeWidth={2}
      className={`pointer-events-none shrink-0 fill-meeple text-meeple transition-opacity duration-300 ${
        side === "left" ? "-mr-[22px] md:-mr-3" : "-ml-[22px] md:-ml-3"
      } ${found && overhang === undefined ? "opacity-100" : "opacity-0"}`}
    />
  );

  // The mark is the line's sibling, not its child: the clip would take it too.
  const line = (side: "left" | "right", mark?: React.ReactNode) => (
    <span className="pointer-events-none relative h-px max-w-40 flex-1">
      <span
        className="absolute inset-0 bg-line transition-[clip-path] duration-500"
        style={{
          clipPath: `inset(0 ${side === "left" ? (overhang ?? 0) : 0}px 0 ${side === "right" ? (overhang ?? 0) : 0}px)`,
        }}
      />
      {mark && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {mark}
        </span>
      )}
    </span>
  );

  return (
    <div className="flex scroll-mt-16 items-center justify-center gap-3 py-6 md:scroll-mt-24 md:gap-[22px] md:py-10">
      {line("left", left)}
      <div
        data-puzzle-game={game}
        onClickCapture={onClickCapture}
        onAnimationEnd={() => setShaking(false)}
        className={`flex items-center gap-[34px] ${shaking ? "animate-[shake_400ms_ease-in-out]" : ""}`}
      >
        {game && !off && star("left")}
        {children}
        {game && !off && star("right")}
      </div>
      {line("right", right)}
    </div>
  );
}
