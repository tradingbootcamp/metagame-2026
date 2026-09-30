"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ICON_GAP } from "./sizing";
import {
  getServerSnapshot,
  getSnapshot,
  guess,
  subscribe,
  type Game,
} from "@/v2/puzzle/store";

// Wrap rows in this to take them out of the puzzle (the /dividers gallery):
// Enter neither guesses nor shakes, and nothing flies away.
const NoPuzzleContext = createContext(false);
export function NoPuzzle({ children }: { children: React.ReactNode }) {
  return (
    <NoPuzzleContext.Provider value={true}>{children}</NoPuzzleContext.Provider>
  );
}

// Layout shell every section divider shares: two hairlines flanking the icons.
// With `game` set the row is a puzzle target (src/v2/puzzle/store.ts): once the
// game is found the whole row flies up off the screen, back to the library,
// leaving its space behind. Rows with no `game` are decoys. A guess is Enter
// pressed while the pointer is over the row — never a click, so the rows' own
// minigames are untouched. A wrong pick shakes the row, and every row that had
// flown fades back in. Deliberately no pointer cursor or label — it's a secret.
// `overhang` is for a row whose icons have spread out over the hairlines
// (Set): each hairline is clipped back that many px from its inner end.
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
  const [hovered, setHovered] = useState(false);
  const off = useContext(NoPuzzleContext);
  const found = Boolean(game && !off && state.stars[game]);
  const flyer = useRef<HTMLDivElement>(null);

  // Far enough to clear the top of the viewport from wherever the row sits.
  useLayoutEffect(() => {
    const el = flyer.current;
    if (!found || !el) return;
    const bottom = Math.max(0, el.getBoundingClientRect().bottom);
    el.style.setProperty("--fly", `${-(bottom + 100)}px`);
  }, [found]);

  useEffect(() => {
    if (!hovered || off) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      if (guess(game) === "wrong") setShaking(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hovered, off, game]);

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

  // Only the inner row moves, so the outer one keeps its space and hover.
  // Flown, it hides once it's off screen: otherwise it would hang over
  // whatever is that far up the page. Coming back, the transform snaps home
  // unseen and only the opacity eases in.
  return (
    <div
      className="scroll-mt-16 py-6 md:scroll-mt-24 md:py-10"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        ref={flyer}
        inert={found}
        className={`flex items-center justify-center gap-3 md:gap-[22px] ${found ? FLOWN : "transition-opacity duration-500"}`}
      >
        {line("left", left)}
        <div
          data-puzzle-game={game}
          onAnimationEnd={() => setShaking(false)}
          className={`flex items-center ${ICON_GAP} ${shaking ? "animate-[shake_400ms_ease-in-out]" : ""}`}
        >
          {children}
        </div>
        {line("right", right)}
      </div>
    </div>
  );
}

const FLOWN =
  "pointer-events-none invisible opacity-0 [transform:translateY(var(--fly))] " +
  "[transition:transform_600ms_cubic-bezier(0.55,0.085,0.68,0.53),opacity_0s_600ms,visibility_0s_600ms] " +
  "motion-reduce:[transform:none] motion-reduce:[transition:opacity_400ms,visibility_0s_400ms]";
