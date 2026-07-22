"use client";

import dynamic from "next/dynamic";
import { useReducer } from "react";

// True-3D dice (three.js + R3F). Client-only: the WebGL canvas can't render on the
// server, and ssr:false keeps three out of the initial HTML payload. (ssr:false is
// only allowed inside a Client Component — hence "use client" above.)
const Dice3D = dynamic(() => import("./dice3d/Dice3D"), { ssr: false });

// Dev-only curation panel; the conditional dynamic() keeps its chunk (which
// imports the full baked-takes file) out of production bundles entirely.
const DiceDevPanel =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./dice3d/DiceDevPanel"), { ssr: false })
    : null;

// Owns its own stage box so the page drops <Dice /> in regardless of how the dice render.
export default function Dice() {
  // Bumping the key remounts Dice3D, which re-reads ?sim/?record at mount —
  // that's how the dev panel rerolls without a page reload.
  const [diceKey, remount] = useReducer((k: number) => k + 1, 0);
  return (
    <div className="flex h-[clamp(120px,17vh,185px)] w-[96vw] items-center justify-center md:h-[clamp(250px,36vh,380px)] md:w-[min(1150px,74vw)]">
      <Dice3D key={diceKey} />
      {DiceDevPanel && <DiceDevPanel onRemount={remount} />}
    </div>
  );
}
