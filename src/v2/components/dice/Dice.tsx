"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Pencil } from "lucide-react";
import LogoDice from "@/v2/components/nav/LogoDice";

// True-3D dice (three.js + R3F). Client-only: the WebGL canvas can't render on the
// server, and ssr:false keeps three out of the initial HTML payload. (ssr:false is
// only allowed inside a Client Component — hence "use client" above.)
const Dice3D = dynamic(() => import("./dice3d/Dice3D"), { ssr: false });

// Software WebGL (Chrome with acceleration off → SwiftShader) can't afford the
// scene; `failIfMajorPerformanceCaveat` refuses such a context, so probe before
// fetching three at all and show the SVG wordmark instead.
function hasHardwareWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const attrs: WebGLContextAttributes = {
      failIfMajorPerformanceCaveat: true,
    };
    const gl =
      canvas.getContext("webgl2", attrs) ?? canvas.getContext("webgl", attrs);
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
// Probed once per page; null on the server and during hydration.
let probed: boolean | null = null;
const probeOnce = () => (probed ??= hasHardwareWebGL());
const noSubscribe = () => () => {};
const serverSnapshot = () => null;

// The kept rolls are final. Flip this to true to bring back the dev-only
// curation panel (edit button under the dice) for re-recording takes; the
// panel and /api/dev/keep-take are still in the tree.
const DICE_EDITOR = false;

// Dev-only curation panel; the conditional dynamic() keeps its chunk (which
// imports the full baked-takes file) out of production bundles entirely.
const DiceDevPanel =
  DICE_EDITOR && process.env.NODE_ENV === "development"
    ? dynamic(() => import("./dice3d/DiceDevPanel"), { ssr: false })
    : null;

// Owns its own stage box so the page drops <Dice /> in regardless of how the dice render.
export default function Dice() {
  // Bumping the key remounts Dice3D, which re-reads ?sim/?record at mount —
  // that's how the dev panel rerolls without a page reload.
  const [diceKey, remount] = useReducer((k: number) => k + 1, 0);
  // Dev-only: the die is the whole hero, so the curation panel + its per-die
  // controls are gated behind an edit toggle rather than sitting on the page
  // every dev load.
  const [editing, setEditing] = useState(false);

  // null until probed on the client; the stage stays empty meanwhile, exactly
  // as it does while the three chunk loads.
  const gpu = useSyncExternalStore(noSubscribe, probeOnce, serverSnapshot);

  // Distance from the stage box to the top of the page. The canvas overlay
  // extends by this much both up (so roll-in bounces stay in frame all the way
  // to the page top) and down (symmetric, so the canvas center — where the dice
  // rest — stays pinned to the stage box). Dice3D's width-based scale keeps the
  // dice the same on-screen size, so the extra height is pure runway.
  const stageRef = useRef<HTMLDivElement>(null);
  const [runwayPx, setRunwayPx] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      setRunwayPx(
        Math.max(
          0,
          Math.round(el.getBoundingClientRect().top + window.scrollY),
        ),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Full-bleed canvas so the roll-in cubes launch from the true screen edges;
  // the resting dice hold a capped size (Dice3D), so the extra width is just
  // transparent runway. No breakout offset needed: the hero centers this
  // over-wide box with align-items, which overflows it evenly, and every
  // ancestor's padding is symmetric — so 100vw lands on the viewport. SiteHero
  // drops its overflow-hidden so this isn't clipped, and the layout's
  // overflow-x-clip hides the off-screen runway. META-447.
  return (
    <div className="relative flex w-screen flex-col items-center">
      <div
        ref={stageRef}
        className="relative h-[clamp(160px,20vh,220px)] w-full md:h-[clamp(330px,38vh,440px)]"
      >
        {/* transparent + pointer-events-none, so the overrun neither hides nor
            blocks the content it overlaps */}
        {gpu && (
          <div
            className="pointer-events-none absolute inset-x-0"
            style={{ top: -runwayPx, bottom: -runwayPx }}
          >
            <Dice3D key={diceKey} />
          </div>
        )}
        {gpu === false && <LogoDice className="mx-auto h-full max-w-[92vw]" />}
      </div>
      {/* dev-only edit toggle + panel, BELOW the canvas so they never cover the dice */}
      {DiceDevPanel && (
        <div className="mt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-label={editing ? "Close dice editor" : "Edit dice"}
            aria-pressed={editing}
            className={`rounded-md p-1.5 transition ${
              editing
                ? "bg-ink text-cream"
                : "bg-ink/10 text-ink/45 hover:bg-ink/20 hover:text-ink/80"
            }`}
          >
            <Pencil size={15} />
          </button>
          {editing && <DiceDevPanel onRemount={remount} />}
        </div>
      )}
    </div>
  );
}
