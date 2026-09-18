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
// no pointer cursor or label — it's a secret. `bare` fades the hairlines and
// stars out, for a row whose icons have spread over them (Set).
export default function DividerRow({
  children,
  game,
  bare = false,
}: {
  children: React.ReactNode;
  game?: Game;
  bare?: boolean;
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [shaking, setShaking] = useState(false);
  const off = useContext(NoPuzzleContext);
  const found = Boolean(game && !off && state.stars[game]);

  const onClickCapture = (e: React.MouseEvent) => {
    if (off) return;
    const result = guess(game);
    if (result === "pass") return;
    e.stopPropagation();
    if (result === "wrong") setShaking(true);
  };

  // Stars always take up their space so earning one doesn't shift the icons.
  const star = (
    <Star
      aria-hidden
      size={22}
      strokeWidth={2}
      className={`pointer-events-none shrink-0 fill-meeple text-meeple transition-opacity duration-300 ${
        found && !bare ? "opacity-100" : "opacity-0"
      }`}
    />
  );

  const line = `pointer-events-none h-px max-w-40 flex-1 bg-line transition-opacity duration-300 ${bare ? "opacity-0" : ""}`;

  return (
    <div className="flex scroll-mt-16 items-center justify-center gap-[22px] py-6 md:scroll-mt-24 md:py-10">
      <span className={line} />
      <div
        data-puzzle-game={game}
        onClickCapture={onClickCapture}
        onAnimationEnd={() => setShaking(false)}
        className={`flex items-center gap-[22px] ${shaking ? "animate-[shake_400ms_ease-in-out]" : ""}`}
      >
        {game && !off && star}
        {children}
        {game && !off && star}
      </div>
      <span className={line} />
    </div>
  );
}
