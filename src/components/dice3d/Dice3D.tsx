"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import Die, { type DieData, type Phase, type StaticLetters } from "./Die";
import { makeRollIn, ROLL_IN_MS, type RollInConfig } from "./rollIn";

// blue front spells META, orange right spells GAME, dark tops show 2026 in pips
const DICE: DieData[] = [
  { front: "M", right: "G", top: 2 },
  { front: "E", right: "A", top: 0 },
  { front: "T", right: "M", top: 2 },
  { front: "A", right: "E", top: 6 },
];

// STATIC-mode letters: the two edge-on faces of each die read left→right as
// ME · TA · GA · ME, so the whole row spells METAGAME (META blue, GAME orange)
// for viewers who never see the animated META/GAME reveal.
const STATIC_LETTERS: StaticLetters[] = [
  {
    front: { letter: "M", color: "blue" },
    right: { letter: "E", color: "blue" },
  },
  {
    front: { letter: "T", color: "blue" },
    right: { letter: "A", color: "blue" },
  },
  {
    front: { letter: "G", color: "orange" },
    right: { letter: "A", color: "orange" },
  },
  {
    front: { letter: "M", color: "orange" },
    right: { letter: "E", color: "orange" },
  },
];

// Opposite faces sum to 7, so a die carries its 7-pip face on the bottom (-Y)
// exactly when its top face is blank — only the E/A die here. Return that face's
// local normal so its roll-in landing keeps the 7 turned away from the camera.
function sevenPipFaceNormal(d: DieData): THREE.Vector3 | undefined {
  return d.top === 0 ? new THREE.Vector3(0, -1, 0) : undefined;
}

const SEQ: Phase[] = ["meta", "game", "year"];
const PHASE_MS = 3200; // hold each phase ~3.2s — deliberate but not sluggish

// flip to true to bring back the soft ground shadow under the dice (off for now)
const SHOW_CONTACT_SHADOW: boolean = false;

const GAP = 1.5; // world-space spacing between dice centers
// row spans the outer dice centers plus a die's worth of half-width each side
const ROW_WIDTH = (DICE.length - 1) * GAP + 1.6;

function Scene({ phase, intro }: { phase: Phase; intro: boolean }) {
  const positions = useMemo(
    () => DICE.map((_, i) => (i - (DICE.length - 1) / 2) * GAP),
    [],
  );

  // Fit the whole row to the canvas width: scale down on narrow viewports so
  // all four dice stay on-screen; cap so they don't balloon on wide ones.
  const viewportWidth = useThree((s) => s.viewport.width);
  const viewportHeight = useThree((s) => s.viewport.height);
  const canvasHeightPx = useThree((s) => s.size.height);
  // Zoom that makes the STATIC ortho camera cover the same vertical world-height as
  // the perspective camera (2·dist·tan(fov/2), dist 17, fov 7°), so swapping to it
  // doesn't reframe the dice. Ortho visible height = canvasHeightPx / zoom.
  const orthoZoom =
    canvasHeightPx / (2 * 17 * Math.tan(THREE.MathUtils.degToRad(7) / 2));
  // fill ~95% of the canvas width so the dice have margin to sweep wider mid-turn
  // (a cube rotating 90° reaches ~1.4× its width at the diagonal) without clipping.
  const scale = Math.min(2.4, (viewportWidth * 0.95) / ROW_WIDTH);

  // Roll-in launch configs, drawn once at mount (fresh randomness per load) from
  // a point just past the canvas's top-left edge in the row's local units.
  const [rollIns] = useState<RollInConfig[] | null>(() => {
    if (!intro) return null;
    const startX = -viewportWidth / 2 / scale - 1.4;
    const startY = (viewportHeight / 2 - 0.1) / scale + 1;
    return DICE.map((d, i) =>
      makeRollIn(i, startX, startY, sevenPipFaceNormal(d)),
    );
  });

  return (
    <>
      {/* STATIC gets a true orthographic camera (no perspective at all); the other
          phases use a far + narrow-FOV perspective that only *approximates* ortho.
          Both bracket the dice tightly in near/far so depth precision stays high —
          without it the printed panels z-fight the body and flash black when dead-on.
          The responsive `scale` fits the row to the width under either camera, so the
          dice stay the same on-screen size across the swap. */}
      {phase === "static" ? (
        <OrthographicCamera
          makeDefault
          position={[0, 0.3, 17]}
          zoom={orthoZoom}
          near={12}
          far={26}
        />
      ) : (
        <PerspectiveCamera
          makeDefault
          position={[0, 0.3, 17]}
          fov={7}
          near={12}
          far={26}
        />
      )}

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
          <Die
            key={i}
            data={d}
            phase={phase}
            delay={i}
            x={positions[i]}
            rollIn={rollIns?.[i]}
            staticLetters={STATIC_LETTERS[i]}
          />
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
  if (pin === "meta" || pin === "game" || pin === "year" || pin === "static")
    return pin;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return "static";
  }
  return "meta";
}

export default function Dice3D() {
  const [phase, setPhase] = useState<Phase>(initialPhase);

  // Roll-in runs only on the default animated start — a pinned ?phase= or
  // reduced-motion load goes straight to its resting pose.
  const [intro] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      initialPhase() === "meta" &&
      !new URLSearchParams(window.location.search).has("phase")
    );
  });

  useEffect(() => {
    // A pinned ?phase= or reduced-motion start holds still; only the default
    // META start auto-cycles through the phases.
    const pinned =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("phase");
    if (phase !== "meta" || pinned) return;
    let step = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    // Hold META until the roll-in lands, then cycle as before.
    const start = setTimeout(
      () => {
        id = setInterval(() => {
          step = (step + 1) % SEQ.length;
          setPhase(SEQ[step]);
        }, PHASE_MS);
      },
      intro ? ROLL_IN_MS : 0,
    );
    return () => {
      clearTimeout(start);
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.NeutralToneMapping,
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <Scene phase={phase} intro={intro} />
    </Canvas>
  );
}
