"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import Die, { DICE, QUAT, type Phase, type StaticLetters } from "./Die";
import { INTRO_CAP_MS, type IntroDriver, type RollInTake } from "./introDriver";
import { createPlayback } from "./rollInPlayback";
import { IntroController, type TakeMeta } from "./physicsRollIn";

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
    right: { letter: "A_CANTED", color: "blue" },
  },
  {
    front: { letter: "G", color: "orange" },
    right: { letter: "A_CANTED", color: "orange" },
  },
  {
    front: { letter: "M", color: "orange" },
    right: { letter: "E", color: "orange" },
  },
];

const SEQ: Phase[] = ["meta", "game", "year"];
const PHASE_MS = 2700; // hold each phase ~3.2s — deliberate but not sluggish

// flip to true to bring back the soft ground shadow under the dice (off for now)
const SHOW_CONTACT_SHADOW: boolean = false;

const GAP = 1.5; // world-space spacing between dice centers
// row spans the outer dice centers plus a die's worth of half-width each side
const ROW_WIDTH = (DICE.length - 1) * GAP + 1.6;

// ?record=1 publishes each finished live-sim take here for the dev curation
// panel to judge and keep.
declare global {
  interface Window {
    __rollInTake?: { take: RollInTake; meta: TakeMeta };
    // Set by the dev panel to replay a specific take on the next mount (the
    // roll the live sim just produced), then consumed here and cleared.
    __replayTake?: RollInTake;
  }
}
function publishTake(take: RollInTake, meta: TakeMeta) {
  window.__rollInTake = { take, meta };
  // lets the dev curation panel react to the take landing (harness just polls)
  window.dispatchEvent(new Event("roll-in-take"));
  console.info("[roll-in take]", JSON.stringify(meta));
}

function Scene({
  phase,
  intro,
  record,
  onIntroDone,
}: {
  phase: Phase;
  intro: boolean;
  record: boolean;
  onIntroDone: () => void;
}) {
  const positions = useMemo(
    () => DICE.map((_, i) => (i - (DICE.length - 1) / 2) * GAP),
    [],
  );

  // Fit the whole row to the canvas width: scale down on narrow viewports so
  // all four dice stay on-screen; cap so they don't balloon on wide ones.
  const viewportWidth = useThree((s) => s.viewport.width);
  const canvasHeightPx = useThree((s) => s.size.height);
  // Zoom that makes the STATIC ortho camera cover the same vertical world-height as
  // the perspective camera (2·dist·tan(fov/2), dist 17, fov 7°), so swapping to it
  // doesn't reframe the dice. Ortho visible height = canvasHeightPx / zoom.
  const orthoZoom =
    canvasHeightPx / (2 * 17 * Math.tan(THREE.MathUtils.degToRad(7) / 2));
  // fill ~95% of the canvas width so the dice have margin to sweep wider mid-turn
  // (a cube rotating 90° reaches ~1.4× its width at the diagonal) without clipping.
  const scale = Math.min(2.4, (viewportWidth * 0.95) / ROW_WIDTH);

  // Roll-in pose driver, built once at mount. Normal loads play back one of the
  // kept physics takes (createPlayback); ?record=1 — or a tree with nothing kept
  // yet — runs the live Rapier sim instead (which lazy-loads the wasm).
  const [introDriver] = useState<IntroDriver | null>(() => {
    if (!intro) return null;
    const opts = { slots: positions, restQuat: QUAT.meta, onDone: onIntroDone };
    // A queued dev-panel replay wins over both playback and the live sim.
    // Deliberately NOT consumed here: StrictMode runs this initializer twice,
    // so clearing it on read would leave the surviving mount playing a random
    // take instead of the one just selected. The panel clears it when the mode
    // changes, and a real page load starts with a fresh window anyway.
    const replay =
      typeof window !== "undefined" ? window.__replayTake : undefined;
    if (replay) {
      const driver = createPlayback(opts, replay);
      if (driver) return driver;
    }
    if (!record) {
      const playback = createPlayback(opts);
      if (playback) return playback;
    }
    return new IntroController({
      ...opts,
      record,
      onTake: record ? publishTake : undefined,
    });
  });
  useEffect(() => () => introDriver?.dispose(), [introDriver]);
  // Single owner ticks the driver each frame, at an earlier priority than the
  // dice's default-priority useFrames so every die reads the same instant.
  useFrame((_, dt) => introDriver?.tick(dt), -1);

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
            index={i}
            x={positions[i]}
            intro={introDriver ?? undefined}
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

  // ?record=1: run the live physics sim instead of baked playback and publish
  // the resulting take for the recording harness (dev/tuning tool).
  const [record] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("record"),
  );

  // The intro's actual length varies per take/sim, so the phase cycle waits for
  // the driver's done signal rather than a fixed constant, with a generous
  // hard cap as a backstop in case the signal never arrives.
  const [introOver, setIntroOver] = useState(!intro);
  useEffect(() => {
    if (!intro || introOver) return;
    const cap = setTimeout(() => setIntroOver(true), INTRO_CAP_MS);
    return () => clearTimeout(cap);
  }, [intro, introOver]);

  useEffect(() => {
    // A pinned ?phase= or reduced-motion start holds still; only the default
    // META start auto-cycles through the phases, once the roll-in has landed.
    const pinned =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("phase");
    if (phase !== "meta" || pinned || !introOver) return;
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % SEQ.length;
      setPhase(SEQ[step]);
    }, PHASE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introOver]);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.NeutralToneMapping,
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <Scene
        phase={phase}
        intro={intro}
        record={record}
        onIntroDone={() => setIntroOver(true)}
      />
    </Canvas>
  );
}
