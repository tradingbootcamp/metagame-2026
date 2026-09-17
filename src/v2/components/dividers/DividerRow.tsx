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
  miss,
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
// With `game` set the row is a puzzle target (src/v2/puzzle/store.ts): stars
// appear either side of the icons as the game is found, and a wrong pick
// shakes the row. Rows with no `game` are decoys: a click is always wrong, and
// they earn no stars. Deliberately no pointer cursor or label — it's a secret.
export default function DividerRow({
  children,
  game,
}: {
  children: React.ReactNode;
  game?: Game;
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [shaking, setShaking] = useState(false);
  const off = useContext(NoPuzzleContext);
  const stars = game && !off ? state.stars[game] : 0;

  const onClick = () => {
    if (off) return;
    if ((game ? guess(game) : miss()) === "wrong") setShaking(true);
  };

  // Stars always take up their space so earning one doesn't shift the icons.
  const star = (
    <Star
      aria-hidden
      size={22}
      strokeWidth={2}
      className={`shrink-0 transition-opacity duration-300 ${
        stars === 0 ? "opacity-0" : "opacity-100"
      } ${stars === 2 ? "fill-meeple text-meeple" : "text-[#4d4d4d]"}`}
    />
  );

  return (
    <div className="flex scroll-mt-16 items-center justify-center gap-[22px] py-6 md:scroll-mt-24 md:py-10">
      <span className="h-px max-w-40 flex-1 bg-line" />
      <div
        data-puzzle-game={game}
        onClick={onClick}
        onAnimationEnd={() => setShaking(false)}
        className={`flex items-center gap-[22px] ${shaking ? "animate-[shake_400ms_ease-in-out]" : ""}`}
      >
        {game && !off && star}
        {children}
        {game && !off && star}
      </div>
      <span className="h-px max-w-40 flex-1 bg-line" />
    </div>
  );
}
