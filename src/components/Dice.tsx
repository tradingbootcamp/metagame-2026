"use client";

import dynamic from "next/dynamic";

// True-3D dice (three.js + R3F). Client-only: the WebGL canvas can't render on the
// server, and ssr:false keeps three out of the initial HTML payload. (ssr:false is
// only allowed inside a Client Component — hence "use client" above.)
const Dice3D = dynamic(() => import("./dice3d/Dice3D"), { ssr: false });

// Owns its own stage box so the page drops <Dice /> in regardless of how the dice render.
export default function Dice() {
  return (
    <div className="flex h-[clamp(120px,17vh,185px)] w-[96vw] items-center justify-center md:h-[clamp(250px,36vh,380px)] md:w-[min(1150px,74vw)]">
      <Dice3D />
    </div>
  );
}
