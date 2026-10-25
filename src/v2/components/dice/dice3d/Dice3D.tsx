"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import Die, {
  DICE,
  QUAT,
  STAGGER,
  TURN_S,
  type Phase,
  type StaticLetters,
} from "./Die";
import { INTRO_CAP_MS, type IntroDriver, type RollInTake } from "./introDriver";
import { createPlayback } from "./rollInPlayback";
import { IntroController, type TakeMeta } from "./physicsRollIn";
import { RenderBudget } from "./renderBudget";

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

const SEQ: Phase[] = ["meta", "game", "year"];
const PHASE_MS = 2700; // hold each phase ~3.2s — deliberate but not sluggish
// The very first META hold is shorter: the roll-in already shows META through
// its oriented rest tableau (and the align into it), so a full hold reads as a
// pause. Only the first meta→game is shortened; every later phase uses PHASE_MS.
const FIRST_META_MS = 1200;

// flip to true to bring back the soft ground shadow under the dice (off for now)
const SHOW_CONTACT_SHADOW: boolean = false;

const GAP = 1.5; // default world-space spacing between dice centers (dev-tunable via ?gap)
const rowWidthFor = (gap: number) => (DICE.length - 1) * gap + 1.6;

// Resting on-screen dice size, decoupled from canvas width (META-447). 1 = the
// size the dice have today; bump to grow the resting row, drop to shrink it.
// The full-bleed canvas only adds runway around the dice — it no longer sets
// their size, so this is the single knob for that.
const RESTING_SIZE = 1.25;

// Dev-tunable dice spacing. The curation panel writes ?gap and remounts; a plain
// load uses GAP. NB the shipped resting layout is GAP — record/keep rolls at the
// spacing you intend to ship, since the align tail blends each take to these
// slots.
function readGap(): number {
  if (typeof window === "undefined") return GAP;
  const g = Number(new URLSearchParams(window.location.search).get("gap"));
  return Number.isFinite(g) && g > 0 ? g : GAP;
}

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

// Draws a frame no more than ~60 times a second, and only while `budget` says
// something is worth drawing. Replaces R3F's own loop (frameloop="never").
const MIN_FRAME_MS = 1000 / 60;
function FrameDriver({ budget }: { budget: RenderBudget }) {
  const advance = useThree((s) => s.advance);
  const clock = useThree((s) => s.clock);
  const size = useThree((s) => s.size);

  // Mount and every resize need one frame: nothing else repaints an idle scene.
  useEffect(() => budget.wake(0), [budget, size]);

  useEffect(() => {
    let raf = 0;
    let last = -Infinity;
    let primed = false;
    const frame = (t: number) => {
      raf = 0;
      if (!budget.wants(t)) return; // sleep; the next wake/hold kicks us
      if (t - last >= MIN_FRAME_MS) {
        // Carry the remainder so a 144 Hz display averages 60, not 48.
        last = t - last < 2 * MIN_FRAME_MS ? last + MIN_FRAME_MS : t;
        budget.pending = false;
        // In never mode R3F derives dt from the timestamps we pass (seconds).
        // Seed the clock so the first dt is 0, not the time since page load.
        if (!primed) {
          clock.elapsedTime = t / 1000;
          primed = true;
        }
        advance(t / 1000);
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const detach = budget.attach(kick);
    return () => {
      detach();
      cancelAnimationFrame(raf);
    };
  }, [budget, advance, clock]);

  return null;
}

function Scene({
  phase,
  intro,
  introOver,
  record,
  onIntroDone,
  budget,
}: {
  phase: Phase;
  intro: boolean;
  introOver: boolean;
  record: boolean;
  onIntroDone: () => void;
  budget: RenderBudget;
}) {
  const [gap] = useState(readGap);
  const rowWidth = rowWidthFor(gap);
  const positions = useMemo(
    () => DICE.map((_, i) => (i - (DICE.length - 1) / 2) * gap),
    [gap],
  );

  const viewportWidth = useThree((s) => s.viewport.width); // world units at focus plane
  const canvasWidthPx = useThree((s) => s.size.width);
  const canvasHeightPx = useThree((s) => s.size.height);
  // Zoom that makes the STATIC ortho camera cover the same vertical world-height as
  // the perspective camera (2·dist·tan(fov/2), dist 17, fov 7°), so swapping to it
  // doesn't reframe the dice. Ortho visible height = canvasHeightPx / zoom.
  const orthoZoom =
    canvasHeightPx / (2 * 17 * Math.tan(THREE.MathUtils.degToRad(7) / 2));

  // Resting dice hold a capped on-screen size independent of the (now full-bleed)
  // canvas width, so the extra width reads as runway for the roll-in rather than
  // giant dice. We reproduce the size the dice had when they filled 95% of the old
  // stage box (min(1150px,74vw) desktop / 96vw mobile), converting that target
  // pixel width to a group scale via px-per-world-unit. Crucially the target is
  // sized against the row AT THE DEFAULT gap (refRow), NOT the current row width —
  // so tuning gap changes only the spacing between dice, never their size. Still
  // capped (2.4) and still shrink-to-fit on phones.
  const pxPerWorld = canvasWidthPx / viewportWidth;
  const oldStagePx =
    canvasWidthPx >= 768
      ? Math.min(1150, canvasWidthPx * 0.74)
      : canvasWidthPx * 0.96;
  const refRow = rowWidthFor(GAP);
  // Target on-screen width for the resting row, but never wider than 95% of the
  // actual canvas — so RESTING_SIZE can grow the dice on roomy screens without
  // letting the row overflow a narrow one (it shrinks to fit instead). A no-op
  // at RESTING_SIZE 1 (the row is already ~91% of width); only binds when scaled up.
  const targetRowPx = Math.min(
    oldStagePx * 0.95 * RESTING_SIZE,
    canvasWidthPx * 0.95,
  );
  const scale = Math.min(2.4, targetRowPx / (refRow * pxPerWorld));

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
  // dt is capped like Die's: after a scrolled-away or hidden stretch the
  // roll-in resumes where it paused instead of jumping to its end.
  useFrame((_, dt) => introDriver?.tick(Math.min(dt, 0.1)), -1);

  // Frames are drawn only while something moves: throughout the roll-in, and
  // for one turn (plus the row's stagger) after each phase change. Between
  // turns the dice sit still and nothing is drawn.
  useEffect(() => {
    if (!intro || introOver) return;
    return budget.hold();
  }, [intro, introOver, budget]);
  useEffect(() => {
    budget.wake((TURN_S + DICE.length * STAGGER) * 1000 + 100);
  }, [phase, budget]);

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
        shadow-mapSize={[1024, 1024]}
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
          scale={rowWidth * scale}
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

  // Frame budget (see renderBudget.ts): nothing draws while the hero is
  // scrolled out of view, and the phase cycle holds too, so a returning
  // visitor sees the dice where they left them rather than mid-turn.
  const [budget] = useState(() => new RenderBudget());
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      budget.setVisible(entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [budget]);

  useEffect(() => {
    // A pinned ?phase= or reduced-motion start holds still; only the default
    // META start auto-cycles through the phases, once the roll-in has landed.
    const pinned =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("phase");
    if (phase !== "meta" || pinned || !introOver) return;
    // Recursive timeout (not a fixed interval) so the first hold can differ: the
    // opening meta→game fires after FIRST_META_MS, every step after at PHASE_MS.
    let step = 0;
    let id: ReturnType<typeof setTimeout>;
    const advance = (delay: number) => {
      id = setTimeout(() => {
        // hidden tabs keep running timers but not frames — hold the cycle here
        // (and while scrolled away) rather than turning phases nobody is watching
        if (document.hidden || !budget.visible) return advance(500);
        step = (step + 1) % SEQ.length;
        setPhase(SEQ[step]);
        advance(PHASE_MS);
      }, delay);
    };
    advance(FIRST_META_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introOver]);

  // frameloop="never": FrameDriver draws instead (on demand, ≤60/s, on-screen
  // only). dpr caps at 1.5 and shadows drop from PCF-soft/2048 to PCF/1024:
  // the canvas is full-bleed, so both scale the cost of every frame drawn.
  return (
    <div ref={stageRef} style={{ width: "100%", height: "100%" }}>
      <Canvas
        frameloop="never"
        shadows
        dpr={[1, 1.5]}
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
          introOver={introOver}
          record={record}
          onIntroDone={() => setIntroOver(true)}
          budget={budget}
        />
        <FrameDriver budget={budget} />
      </Canvas>
    </div>
  );
}
