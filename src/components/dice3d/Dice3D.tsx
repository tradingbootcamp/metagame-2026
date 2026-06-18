"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import Die, { type DieData, type Phase } from "./Die";
import { ensureFont } from "./faceTexture";

// blue front spells META, orange right spells GAME, dark tops show 2026 in pips
const DICE: DieData[] = [
  { front: "M", right: "G", top: 2 },
  { front: "E", right: "A", top: 0 },
  { front: "T", right: "M", top: 2 },
  { front: "A", right: "E", top: 6 },
];

const SEQ: Phase[] = ["meta", "game", "year"];
const PHASE_MS = 3200; // hold each phase ~3.2s — deliberate but not sluggish

// flip to true to bring back the soft ground shadow under the dice (off for now)
const SHOW_CONTACT_SHADOW: boolean = false;

const GAP = 1.6; // world-space spacing between dice centers
// row spans the outer dice centers plus a die's worth of half-width each side
const ROW_WIDTH = (DICE.length - 1) * GAP + 1.6;

function Scene({ phase }: { phase: Phase }) {
  const positions = useMemo(
    () => DICE.map((_, i) => (i - (DICE.length - 1) / 2) * GAP),
    [],
  );

  // Fit the whole row to the canvas width: scale down on narrow viewports so
  // all four dice stay on-screen; cap so they don't balloon on wide ones.
  const viewportWidth = useThree((s) => s.viewport.width);
  // fill ~85% of the canvas width so the dice have margin to sweep wider mid-turn
  // (a cube rotating 90° reaches ~1.4× its width at the diagonal) without clipping.
  const scale = Math.min(2.4, (viewportWidth * 0.85) / ROW_WIDTH);

  return (
    <>
      {/* far + narrow FOV ≈ orthographic: no fisheye, every die reads identically.
          tight near/far brackets the dice so depth precision stays high — without it
          the printed panels z-fight the body and faces flash black when dead-on. */}
      <PerspectiveCamera
        makeDefault
        position={[0, 0.3, 18]}
        fov={12}
        near={12}
        far={26}
      />

      <ambientLight intensity={1.15} />
      <hemisphereLight
        intensity={0.9}
        color={"#fff6e0"}
        groundColor={"#caa97a"}
      />
      <directionalLight
        position={[3.5, 6, 5]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-6, 6, 6, -6, 0.1, 30]}
        />
      </directionalLight>
      <directionalLight
        position={[-5, 2, 2]}
        intensity={0.35}
        color="#bcdcff"
      />

      <group position={[0, 0.1, 0]} scale={scale}>
        {DICE.map((d, i) => (
          <Die key={i} data={d} phase={phase} delay={i} x={positions[i]} />
        ))}
      </group>

      {/* soft contact shadow under the row — hidden by default (SHOW_CONTACT_SHADOW).
          In WORLD space (not inside the scaled group, which double-scaled it into
          phantom blobs between dice); sized/placed from `scale` so it tracks the dice,
          and dropped well below them so rotations don't clip through the plane. */}
      {SHOW_CONTACT_SHADOW && (
        <ContactShadows
          position={[0, 0.1 - 0.95 * scale, 0]}
          scale={ROW_WIDTH * scale}
          resolution={1024}
          blur={2.5}
          far={2 * scale}
          opacity={0.42}
          color="#141417"
        />
      )}
    </>
  );
}

// Resolve the starting phase synchronously: a pinned ?phase= override (dev/QA),
// the reduced-motion resting pose, or the default META.
function initialPhase(): Phase {
  if (typeof window === "undefined") return "meta";
  const pin = new URLSearchParams(window.location.search).get("phase");
  if (pin === "meta" || pin === "game" || pin === "year") return pin;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "static";
  }
  return "meta";
}

export default function Dice3D() {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    ensureFont().then(() => setFontLoaded(true));
  }, []);

  useEffect(() => {
    // A pinned ?phase= or reduced-motion start holds still; only the default
    // META start auto-cycles through the phases.
    const pinned =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("phase");
    if (phase !== "meta" || pinned) return;
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % SEQ.length;
      setPhase(SEQ[step]);
    }, PHASE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-key the scene once the font resolves so canvas textures redraw with Bebas.
  return (
    <Canvas
      key={fontLoaded ? "font" : "nofont"}
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.NeutralToneMapping,
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <Scene phase={phase} />
    </Canvas>
  );
}
