"use client";

import { useState, useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import {
  getServerSnapshot,
  getSnapshot,
  guess,
  miss,
  subscribe,
  type Game,
} from "@/v2/puzzle/store";

// Layout shell every section divider shares: two hairlines flanking the icons.
// With `game` set the row is a puzzle target (src/v2/puzzle/store.ts): stars
// appear either side of the icons as the game is found, and a wrong pick
// shakes the row. `decoy` rows are in the puzzle but aren't any game: a click
// is always wrong, and they earn no stars. Deliberately no pointer cursor or
// label — it's a secret.
export default function DividerRow({
  children,
  game,
  decoy = false,
}: {
  children: React.ReactNode;
  game?: Game;
  decoy?: boolean;
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [shaking, setShaking] = useState(false);
  const stars = game ? state.stars[game] : 0;

  const onClick = () => {
    const result = game ? guess(game) : decoy ? miss() : null;
    if (result === "wrong") setShaking(true);
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
        {game && star}
        {children}
        {game && star}
      </div>
      <span className="h-px max-w-40 flex-1 bg-line" />
    </div>
  );
}
