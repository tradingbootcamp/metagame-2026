import * as THREE from "three";
import type { RigidBody, World } from "@dimforge/rapier3d-compat";
import {
  ALIGN_JITTER,
  BOUNDS,
  START_X,
  START_Y,
  TAIL_S,
  sampleAlign,
  type IntroDriver,
  type RollInTake,
} from "./introDriver";

// Live rigid-body roll-in: the four dice are real Rapier bodies thrown from
// off-screen top-left at their slots, so mid-air crossings and floor tumbles
// resolve as genuine collisions — dice jostle instead of interpenetrating.
// The sim only has to get each die to rest *near* its slot in *some*
// orientation: once every body is still (or a hard timeout fires) the poses are
// captured, the world is torn down, and the shared beat + align tail carries
// each die to exactly (slotX, 0, 0, restQuat).
//
// In production this driver isn't used directly — it's the rig that throws the
// rolls kept in the dev panel, which are what rollInPlayback.ts ships (load any
// page with ?record=1). Rapier's ~2 MB wasm accordingly never loads on a normal
// visit: the import lives inside #load(), code-split behind constructing this
// class, which only happens under ?record (or if nothing has been kept).

// --- physics tuning -----------------------------------------------------------
// Real 9.81 reads floaty at die-sized scale; 14 matches the old kinematic arc's
// effective gravity, so the throw keeps its established weight.
const GRAVITY = 14;
const RESTITUTION = 0.45; // rebound apexes ~0.4 → decaying hops like the old path
const FRICTION = 0.8; // felt-table grip: slides convert to rolls and die quickly
const LIN_DAMPING = 0.08;
const ANG_DAMPING = 0.9; // tumble stays lively in flight...
const ANG_DAMPING_FLOOR = 2.5; // ...but dies fast once the die reaches the floor
const STEP = 1 / 120; // small fixed step keeps die-vs-die contacts crisp
// Launches go RIGHTMOST die first: every launch is slower than the one before
// it and aimed shorter, so a die's flight stays left of (behind) all earlier
// arrivals and never plows through a landed die at full throw speed. Contacts
// still happen — neighbors jostle where bounce tumbles overlap — but at bounce
// energy, not launch energy, which is what kept flinging dice across the row.
const LAUNCH_STAGGER = 0.17; // s between launches

// Launch profiles, selected per load with ?launch=low (default stays the
// original "high" lob, untouched).
//
// The two differ in *kind*, not just in numbers. "high" is a lob: the launch
// solves for the vy that lands the die on its slot after `flightS` of flight,
// which always throws the die UP first (it peaks around y 2.8 and drops in).
// "low" is a throw: vy is solved so the die reaches the FLOOR in `descentS`
// from a modest height, which comes out negative — the die is thrown downward
// into the table well short of its slot, then skips and tumbles the rest of
// the way like a real dice roll.
export type LaunchProfileName = "high" | "low";
type LaunchProfile = {
  startY: number; // launch height; draws + [0, startYJitter]
  startYJitter: number;
  // Lob timing: seconds of flight before arriving at the slot (high only).
  flightS: number;
  flightJitter: number;
  // Throw timing (low only): setting these switches the launch solve from lob
  // to downward throw (see #step). Descent time is derived per die from how
  // far it has to fly, at ~throwVx, then clamped — otherwise a fixed descent
  // makes the near die crawl and slings the far one in at 16 u/s, which
  // detonates the row. The clamp ceiling must stay under sqrt(2·startY/g)
  // (~0.45s here) or the solve turns the throw back into a lob.
  descentMinS?: number;
  descentMaxS?: number;
  throwVx?: number;
  // Aim this far short (left) of the slot — for "low" this is where the die
  // first hits the floor, so it's large: the skip and roll cover the rest.
  undershoot: number;
  undershootJitter: number;
  // Furthest left a die may touch down (low only). The leftmost slot sits only
  // ~2.5 units from the launch point, so an unclamped undershoot puts die 0's
  // touchdown behind the visible edge and asks it to cover ~1.7 units of floor
  // to reach its slot — which it can't: once the skip's momentum is spent,
  // static friction (μ·m·g ≈ 11) beats the steering force (clamped at 8) and
  // the die sticks wherever it stopped, resting half out of frame. Stiffening
  // the spring past friction would just make every die visibly glide, so cap
  // the ask instead: near dice get a shorter roll, which is honest — they have
  // less visible floor to roll across.
  minTouchX?: number;
  // Seconds of sim before capturing wherever things are. The thrown roll
  // spends real time travelling on the floor, so it needs a longer leash than
  // the lob or a quarter of the runs get cut off mid-roll.
  simTimeout?: number;
  spin: number; // rad/s launch tumble; draws + [0, spinJitter]
  spinJitter: number;
};
const PROFILES: Record<LaunchProfileName, LaunchProfile> = {
  high: {
    startY: START_Y,
    startYJitter: 0.5,
    flightS: 0.62,
    flightJitter: 0.18,
    undershoot: 0.4,
    undershootJitter: 0,
    spin: 9,
    spinJitter: 5,
  },
  // Low: a thrown roll. Enters from off-screen left at roughly head height
  // over the row, angled down hard enough to hit the floor in ~a third of a
  // second, landing 1.4–2.6 units short of the slot. Restitution then gives a
  // visible skip, and the ground steering reels the die the rest of the way —
  // travel it covers tumbling, not gliding, since floor friction converts the
  // leftover horizontal speed into roll.
  low: {
    startY: 1.45,
    startYJitter: 0.35,
    flightS: 0, // unused: descentS drives the low launch
    flightJitter: 0,
    descentMinS: 0.28,
    descentMaxS: 0.44,
    throwVx: 9,
    undershoot: 1.3,
    undershootJitter: 1.0,
    minTouchX: -2.3,
    simTimeout: 4.3,
    spin: 7,
    spinJitter: 6,
  },
};
function activeProfile(): LaunchProfile {
  const raw =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("launch")
      : null;
  return PROFILES[raw === "low" ? "low" : "high"];
}

// Steering: a horizontal spring toward each die's slot (and z toward 0) so
// collisions can't strand a die far from home — which matters because the align
// slide is kinematic again and a long slide could sweep through a neighbor.
// Airborne it's a whisper (no damping term — that would fight the throw); after
// first floor contact it gains a strong velocity term, which is what actually
// stops the skid: unlike the old closed-form path, physics has no built-in
// horizontal deceleration, and friction alone lets a die roll the row's width.
// At rest the spring is far below static friction: no visible creep.
const STEER_AIR = 0.8;
const STEER_GROUND = 4;
const STEER_DAMP = 4; // ≈ critical damping for K=4, m=1 — no overshoot wobble
const STEER_MAX = 8;
const TOUCH_Y = 0.55; // "has reached the floor" once the center first dips below

// Settle detection is ours, not Rapier sleep (the steering force never lets
// bodies sleep): a body is at rest after REST_HOLD s under both thresholds.
// Loose enough that a die still creeping imperceptibly counts as at-rest — the
// capture freeze at these speeds is invisible, and waiting for a true zero
// pushes past the intro's time budget.
const REST_LIN = 0.18;
const REST_ANG = 0.7;
const REST_HOLD = 0.25;
const SIM_TIMEOUT = 3.4; // hard cap (lob); low overrides via profile.simTimeout
const STACK_Y = 0.8; // resting this high = parked on another die → nudge it off
const MAX_NUDGES = 3;

const RECORD_EVERY = 4; // sample recorded takes every 4th step = 30 Hz

// True x-reach of the beveled die at pose q: support along x of the Minkowski
// sum of the 0.44-half-width cube and the r=0.06 bevel sphere — 0.5 face-on up
// to ~0.822 corner-on. (The panel's on-screen keep criterion uses the same
// formula; see DiceDevPanel.tsx.)
const REACH_V = new THREE.Vector3();
const REACH_Q = new THREE.Quaternion();
const REACH_AXES = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
];
function xReach(q: { x: number; y: number; z: number; w: number }): number {
  REACH_Q.set(q.x, q.y, q.z, q.w);
  let s = 0;
  for (const axis of REACH_AXES)
    s += Math.abs(REACH_V.copy(axis).applyQuaternion(REACH_Q).x);
  return 0.44 * s + 0.06;
}

// Rest diagnostics for the recording harness to score takes with.
export type TakeMeta = {
  duration: number; // s from sim start to capture
  timedOut: boolean;
  crashed: boolean; // wasm panic mid-sim; poses are the last good pre-panic ones
  nudges: number;
  maxY: number; // highest center after first floor contact (bounce/stack height)
  maxAbsZ: number;
  finalErr: number[]; // per-die |restX - slotX|
  finalY: number[]; // per-die rest height (stacked dice show up here)
};

type Options = {
  slots: number[];
  restQuat: THREE.Quaternion;
  onDone?: () => void;
  record?: boolean;
  onTake?: (take: RollInTake, meta: TakeMeta) => void;
};

// One rapier load + init per page, shared by every controller. React dev
// StrictMode constructs the sim twice per mount; two concurrent RAPIER.init()
// calls instantiate the wasm module twice, and a World created against the
// first instance ends up reading the second's memory — the source of the
// intermittent "unsafe aliasing" / "memory access out of bounds" panics.
// (Dynamic import keeps the wasm chunk off normal visits, as before.)
let rapierReady: Promise<typeof import("@dimforge/rapier3d-compat")> | null =
  null;
function loadRapier() {
  rapierReady ??= import("@dimforge/rapier3d-compat").then(async (R) => {
    await R.init();
    return R;
  });
  return rapierReady;
}

type State = "loading" | "sim" | "post" | "done" | "failed";

export class IntroController implements IntroDriver {
  #opts: Options;
  #profile: LaunchProfile;
  #state: State = "loading";
  #disposed = false;
  #doneFired = false;

  // Per-die launch draws (fresh randomness per construction).
  #startPos: THREE.Vector3[] = [];
  #startQuat: THREE.Quaternion[] = [];
  #delay: number[] = [];
  #targetX: number[] = [];
  #targetZ: number[] = [];
  #flightT: number[] = [];
  #alignDelay: number[] = [];

  #world: World | null = null;
  #bodies: (RigidBody | null)[] = [];
  // Deferred creation hooks, bound in #load where the RAPIER module and world
  // are in scope. Dice bodies and the left wall are ADDED to the world at the
  // moment they're needed rather than created disabled and toggled on:
  // setEnabled() flips have a history of corrupting rapier.js's broad phase
  // (intermittent wasm "unreachable" panics — dimforge/rapier.js#345, never
  // fixed before the repo was archived), while mid-sim insertion is the
  // ordinary, well-tested path.
  #spawnDie: ((i: number) => RigidBody) | null = null;
  #raiseLeftWall: (() => void) | null = null;
  #leftWallRaised = false;
  #launched: boolean[] = [];
  #touched: boolean[] = [];
  #restT: number[] = [];
  #elapsed = 0;
  #acc = 0;
  #stepCount = 0;
  #nudges = 0;
  #postT = 0;
  #crashed = false;

  // Captured rest poses the beat + align tail blends from.
  #capturedPos: THREE.Vector3[] = [];
  #capturedQuat: THREE.Quaternion[] = [];
  // Last known-good poses, refreshed every step from plain JS numbers so a
  // wasm panic (which poisons every rapier object) can still capture
  // something sensible to align out from.
  #lastPos: THREE.Vector3[] = [];
  #lastQuat: THREE.Quaternion[] = [];

  // Recording buffers (flat, per die) + diagnostics.
  #recP: number[][] = [];
  #recQ: number[][] = [];
  #maxY = 0;
  #maxAbsZ = 0;
  #timedOut = false;

  constructor(opts: Options) {
    this.#opts = opts;
    const prof = (this.#profile = activeProfile());
    const n = opts.slots.length;
    for (let i = 0; i < n; i++) {
      this.#startPos.push(
        new THREE.Vector3(
          START_X - Math.random() * 0.8,
          prof.startY + Math.random() * prof.startYJitter,
          (Math.random() - 0.5) * 0.5,
        ),
      );
      this.#startQuat.push(new THREE.Quaternion().random());
      this.#delay.push((n - 1 - i) * LAUNCH_STAGGER + Math.random() * 0.06);
      // Floor on where this die may touch down. Die 0 gets the absolute bound
      // (it has no left neighbour, only the frame edge); every other die may
      // not land left of its left neighbour's slot, which keeps the four
      // landing zones ordered and stops two dice from being clamped onto the
      // same patch of floor — that pileup is what stalls the settle.
      const touchFloor =
        i === 0 ? (prof.minTouchX ?? -Infinity) : opts.slots[i - 1] + 0.2;
      this.#targetX.push(
        Math.max(
          opts.slots[i] -
            prof.undershoot -
            Math.random() * prof.undershootJitter +
            (Math.random() - 0.5) * 0.5,
          touchFloor,
        ),
      );
      this.#targetZ.push((Math.random() - 0.5) * 0.5);
      this.#flightT.push(
        prof.throwVx !== undefined
          ? THREE.MathUtils.clamp(
              Math.abs(this.#targetX[i] - this.#startPos[i].x) / prof.throwVx,
              prof.descentMinS ?? 0.28,
              prof.descentMaxS ?? 0.44,
            )
          : prof.flightS + Math.random() * prof.flightJitter,
      );
      this.#alignDelay.push(Math.random() * ALIGN_JITTER);
      this.#bodies.push(null);
      this.#launched.push(false);
      this.#touched.push(false);
      this.#restT.push(0);
      this.#capturedPos.push(new THREE.Vector3());
      this.#capturedQuat.push(new THREE.Quaternion());
      this.#lastPos.push(this.#startPos[i].clone());
      this.#lastQuat.push(this.#startQuat[i].clone());
      this.#recP.push([]);
      this.#recQ.push([]);
    }
    void this.#load();
  }

  async #load() {
    try {
      const RAPIER = await loadRapier();
      if (this.#disposed) return;

      const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
      world.timestep = STEP;
      this.#world = world;

      // Floor with its top at y = -0.5 so dice rest with centers on the row
      // line (y = 0), matching where the phase machine expects them. Wide
      // enough to catch short landings back near the launch point.
      const ground = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0),
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(40, 0.5, BOUNDS.halfDepth + 3)
          .setRestitution(RESTITUTION)
          .setFriction(FRICTION),
        ground,
      );

      // Invisible containment with x-wall inner faces *inside* the visible
      // edge (±3.10 vs ~±3.2 — see the BOUNDS comment for why the margin is
      // this wide) so an unlucky bounce can't send a die out of view. The
      // right and z walls are always up; the left wall doesn't exist yet (the
      // dice fly in across its line) and is added in #step once every die has
      // cleared it — added, not enable-toggled, per the setEnabled
      // broad-phase bug noted on #spawnDie.
      const wall = (x: number, y: number, z: number, hx: number, hz: number) =>
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(hx, 3, hz)
            .setTranslation(x, y, z)
            .setRestitution(0.2)
            .setFriction(FRICTION),
          world.createRigidBody(RAPIER.RigidBodyDesc.fixed()),
        );
      wall(BOUNDS.right + 0.4, 2.5, 0, 0.25, BOUNDS.halfDepth + 3);
      wall(0, 2.5, BOUNDS.halfDepth + 0.25, 40, 0.25);
      wall(0, 2.5, -(BOUNDS.halfDepth + 0.25), 40, 0.25);
      this.#raiseLeftWall = () => {
        wall(BOUNDS.left - 0.4, 2.5, 0, 0.25, BOUNDS.halfDepth + 3);
      };

      // Dice: each body is created at its staggered launch moment (see
      // #spawnDie note above), thrown ballistically at its slot. Rounded
      // colliders match the visual bevel and tumble more naturally than
      // sharp cuboids (no edge-catching).
      this.#spawnDie = (i: number) => {
        const s = this.#startPos[i];
        const q = this.#startQuat[i];
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(s.x, s.y, s.z)
            .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
            .setLinearDamping(LIN_DAMPING)
            .setAngularDamping(ANG_DAMPING)
            .setCcdEnabled(true),
        );
        world.createCollider(
          RAPIER.ColliderDesc.roundCuboid(0.44, 0.44, 0.44, 0.06)
            .setRestitution(RESTITUTION)
            .setFriction(FRICTION),
          body,
        );
        return body;
      };

      this.#state = "sim";
    } catch (e) {
      // Rapier failed to load — degrade to snapping straight to the rest pose
      // (poseOf handles it) and let the phase cycle start.
      console.warn("[roll-in] rapier failed to load; skipping intro sim", e);
      this.#state = "failed";
    }
  }

  tick(dt: number) {
    if (this.#disposed) return;
    if (this.#state === "failed") {
      this.#fireDone();
      return;
    }
    if (this.#state === "sim") {
      // Fixed-step accumulator; clamp so a background tab doesn't spiral.
      this.#acc += Math.min(dt, 0.1);
      while (this.#acc >= STEP && this.#state === "sim") {
        this.#acc -= STEP;
        try {
          this.#step();
        } catch (e) {
          // A wasm panic poisons every rapier object irrecoverably (and
          // upstream rapier.js is archived) — degrade to aligning out from
          // the last good poses instead of freezing the dice mid-air.
          this.#crash(e);
        }
      }
      return;
    }
    if (this.#state === "post") {
      this.#postT += dt;
      if (this.#postT >= TAIL_S + 0.05) {
        this.#state = "done";
        this.#fireDone();
      }
    }
  }

  #step() {
    const world = this.#world!;
    this.#elapsed += STEP;
    this.#stepCount++;

    for (let i = 0; i < this.#bodies.length; i++) {
      // Staggered launch: create the body and throw it at its target x/z in T
      // seconds, solving vy for the height it should be at when it gets there.
      // The lob profile aims for bounce height (0.55), which needs an upward
      // vy; the thrown profile aims for the floor (0), which comes out
      // negative — the die is driven down into the table and skips onward.
      if (!this.#launched[i]) {
        if (this.#elapsed < this.#delay[i]) continue;
        this.#launched[i] = true;
        const body = (this.#bodies[i] = this.#spawnDie!(i));
        const s = this.#startPos[i];
        const T = this.#flightT[i];
        const arriveY = this.#profile.throwVx !== undefined ? 0 : 0.55;
        body.setLinvel(
          {
            x: (this.#targetX[i] - s.x) / T,
            y: (arriveY - s.y + 0.5 * GRAVITY * T * T) / T,
            z: (this.#targetZ[i] - s.z) / T,
          },
          true,
        );
        const axis = new THREE.Vector3().randomDirection();
        const w = this.#profile.spin + Math.random() * this.#profile.spinJitter;
        body.setAngvel({ x: axis.x * w, y: axis.y * w, z: axis.z * w }, true);
        continue;
      }

      const body = this.#bodies[i]!;
      const p = body.translation();
      const v = body.linvel();
      // Refresh the crash-capture cache while we're already reading state.
      const rq = body.rotation();
      this.#lastPos[i].set(p.x, p.y, p.z);
      this.#lastQuat[i].set(rq.x, rq.y, rq.z, rq.w);
      if (!this.#touched[i] && p.y < TOUCH_Y) {
        this.#touched[i] = true;
        body.setAngularDamping(ANG_DAMPING_FLOOR);
      }
      if (this.#touched[i]) {
        this.#maxY = Math.max(this.#maxY, p.y);
      }
      this.#maxAbsZ = Math.max(this.#maxAbsZ, Math.abs(p.z));

      // Slot steering (see constants above).
      const kx = this.#touched[i] ? STEER_GROUND : STEER_AIR;
      const cd = this.#touched[i] ? STEER_DAMP : 0;
      const clampF = (f: number) =>
        THREE.MathUtils.clamp(f, -STEER_MAX, STEER_MAX);
      body.resetForces(true);
      body.addForce(
        {
          x: clampF(kx * (this.#opts.slots[i] - p.x) - cd * v.x),
          y: 0,
          z: clampF(kx * (0 - p.z) - cd * v.z),
        },
        true,
      );
    }

    // Raise the left wall once every die has fully cleared it, sealing the
    // box. "Cleared" uses the die's true rotated reach (not a worst-case
    // center threshold) so the wall goes up as early as geometry allows —
    // waiting on worst-case corner reach let a die that settled just left of
    // its slot keep the wall down for the whole take, leaving the left edge
    // open to rest poses that hang off-screen. 0.03 spawn margin past the
    // wall's inner face at BOUNDS.left - 0.15.
    if (
      !this.#leftWallRaised &&
      this.#launched.every(Boolean) &&
      this.#bodies.every((b) => {
        const p = b!.translation();
        return p.x - xReach(b!.rotation()) > BOUNDS.left - 0.12;
      })
    ) {
      this.#raiseLeftWall?.();
      this.#leftWallRaised = true;
    }

    world.step();

    if (this.#opts.record && this.#stepCount % RECORD_EVERY === 0) {
      this.#recordFrame();
    }

    // Settle bookkeeping: time under both velocity thresholds, per body.
    let allResting = this.#launched.every(Boolean);
    for (let i = 0; i < this.#bodies.length; i++) {
      if (!this.#launched[i]) continue;
      const body = this.#bodies[i]!;
      const v = body.linvel();
      const w = body.angvel();
      const lin = Math.hypot(v.x, v.y, v.z);
      const ang = Math.hypot(w.x, w.y, w.z);
      this.#restT[i] =
        lin < REST_LIN && ang < REST_ANG ? this.#restT[i] + STEP : 0;
      if (this.#restT[i] < REST_HOLD) allResting = false;
    }

    if (this.#elapsed >= (this.#profile.simTimeout ?? SIM_TIMEOUT)) {
      this.#timedOut = true;
      this.#capture();
      return;
    }
    if (!allResting) return;

    // Everything is still — but a die parked on top of another would make the
    // align slide drag it down through its neighbor. Nudge it off and keep
    // simulating (bounded, so a pathological pile can't stall the intro).
    if (this.#nudges < MAX_NUDGES) {
      let nudged = false;
      for (let i = 0; i < this.#bodies.length; i++) {
        const body = this.#bodies[i]!;
        const p = body.translation();
        if (p.y > STACK_Y) {
          const dir = Math.sign(this.#opts.slots[i] - p.x) || 1;
          body.applyImpulse(
            { x: dir * 1.6, y: 0.4, z: (Math.random() - 0.5) * 0.8 },
            true,
          );
          this.#restT[i] = 0;
          nudged = true;
        }
      }
      if (nudged) {
        this.#nudges++;
        return;
      }
    }
    this.#capture();
  }

  // Freeze: capture every pose, ditch the physics world (the tail is pure
  // math), and report the take if we're recording.
  #capture() {
    for (let i = 0; i < this.#bodies.length; i++) {
      const body = this.#bodies[i]!;
      const p = body.translation();
      const q = body.rotation();
      this.#capturedPos[i].set(p.x, p.y, p.z);
      this.#capturedQuat[i].set(q.x, q.y, q.z, q.w);
    }
    if (this.#opts.record) this.#recordFrame(); // exact rest pose as final keyframe
    this.#finish();
  }

  // Wasm panic mid-sim: every rapier object is poisoned (any call throws), so
  // capture from the JS-side pose cache and align out from there — the intro
  // completes instead of freezing. Recording still publishes (flagged
  // `crashed`) so the harness can reject the take immediately rather than
  // waiting out a page timeout.
  #crash(e: unknown) {
    if (this.#state !== "sim") return;
    // warn, not error: Next's dev overlay pops for console.error with an Error
    // attached, turning this handled degrade into a scary red screen.
    console.warn("[roll-in] physics sim crashed; aligning out early", e);
    this.#crashed = true;
    for (let i = 0; i < this.#bodies.length; i++) {
      this.#capturedPos[i].copy(this.#lastPos[i]);
      this.#capturedQuat[i].copy(this.#lastQuat[i]);
    }
    this.#finish();
  }

  #finish() {
    if (this.#opts.record) {
      this.#opts.onTake?.(this.#buildTake(), {
        duration: this.#elapsed,
        timedOut: this.#timedOut,
        crashed: this.#crashed,
        nudges: this.#nudges,
        maxY: this.#maxY,
        maxAbsZ: this.#maxAbsZ,
        finalErr: this.#capturedPos.map((p, i) =>
          Math.abs(p.x - this.#opts.slots[i]),
        ),
        finalY: this.#capturedPos.map((p) => p.y),
      });
    }
    try {
      this.#world?.free();
    } catch {
      // Poisoned world; the page is being left to GC what it can.
    }
    this.#world = null;
    this.#state = "post";
    this.#postT = 0;
  }

  #recordFrame() {
    const r = (v: number, dp: number) => Number(v.toFixed(dp));
    for (let i = 0; i < this.#bodies.length; i++) {
      const body = this.#bodies[i]!;
      // Unlaunched dice record their start pose so all streams stay in step.
      if (this.#launched[i]) {
        const p = body.translation();
        const q = body.rotation();
        this.#recP[i].push(r(p.x, 3), r(p.y, 3), r(p.z, 3));
        this.#recQ[i].push(r(q.x, 4), r(q.y, 4), r(q.z, 4), r(q.w, 4));
      } else {
        const s = this.#startPos[i];
        const q = this.#startQuat[i];
        this.#recP[i].push(r(s.x, 3), r(s.y, 3), r(s.z, 3));
        this.#recQ[i].push(r(q.x, 4), r(q.y, 4), r(q.z, 4), r(q.w, 4));
      }
    }
  }

  #buildTake(): RollInTake {
    return {
      hz: Math.round(1 / (STEP * RECORD_EVERY)),
      n: this.#recP[0].length / 3,
      dice: this.#recP.map((p, i) => ({ p, q: this.#recQ[i] })),
    };
  }

  #fireDone() {
    if (this.#doneFired) return;
    this.#doneFired = true;
    this.#opts.onDone?.();
  }

  poseOf(i: number, outPos: THREE.Vector3, outQuat: THREE.Quaternion): boolean {
    if (this.#state === "failed") {
      // No physics available: park at the rest pose and hand off immediately.
      outPos.set(this.#opts.slots[i], 0, 0);
      outQuat.copy(this.#opts.restQuat);
      return true;
    }
    if (
      this.#state === "loading" ||
      (this.#state === "sim" && !this.#launched[i])
    ) {
      outPos.copy(this.#startPos[i]);
      outQuat.copy(this.#startQuat[i]);
      return false;
    }
    if (this.#state === "sim") {
      try {
        const body = this.#bodies[i]!;
        const p = body.translation();
        const q = body.rotation();
        outPos.set(p.x, p.y, p.z);
        outQuat.set(q.x, q.y, q.z, q.w);
        return false;
      } catch (e) {
        // Same wasm-panic degrade as tick(); fall through to the tail below.
        this.#crash(e);
      }
    }
    // post / done: the shared beat + align tail from the captured rest pose.
    return sampleAlign(
      this.#postT,
      this.#alignDelay[i],
      this.#capturedPos[i],
      this.#capturedQuat[i],
      this.#opts.slots[i],
      this.#opts.restQuat,
      outPos,
      outQuat,
    );
  }

  dispose() {
    this.#disposed = true;
    try {
      this.#world?.free();
    } catch {
      // Poisoned world (wasm panic); nothing left to free safely.
    }
    this.#world = null;
  }
}
