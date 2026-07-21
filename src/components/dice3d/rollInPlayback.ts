import * as THREE from "three";
import {
  ALIGN_JITTER,
  TAIL_S,
  sampleAlign,
  type IntroDriver,
} from "./introDriver";
import { TAKES } from "./rollInTakes";

// Production roll-in: play back one of the pre-recorded physics takes. The dice
// genuinely collided when the take was simulated (see physicsRollIn.ts), so
// playback shows real jostling with none of rapier's ~2 MB wasm in the client —
// the baked keyframes are a few KB — and no risk of a pathological live-sim
// outcome, since only takes that settled cleanly get baked.
//
// Apparent per-load randomness comes from picking a random take, a slight
// global playback-rate jitter, and fresh per-die align-stagger draws; the beat +
// align tail is generated live from the take's final keyframe, ending exactly
// at (slotX, 0, 0, restQuat) for the phase-machine handoff.

// Reusable sampling temps — poseOf runs per die per frame.
const QA = new THREE.Quaternion();
const QB = new THREE.Quaternion();
const PA = new THREE.Vector3();

export function createPlayback(opts: {
  slots: number[];
  restQuat: THREE.Quaternion;
  onDone?: () => void;
}): IntroDriver | null {
  if (TAKES.length === 0) return null; // no baked takes — caller falls back to the live sim

  const takeIndex = Math.floor(Math.random() * TAKES.length);
  const take = TAKES[takeIndex];
  const rate = 0.94 + Math.random() * 0.12; // subtle per-load tempo variation
  const flightEnd = (take.n - 1) / take.hz / rate; // wall-clock end of the take
  const alignDelay = opts.slots.map(() => Math.random() * ALIGN_JITTER);

  // Log what this load played (take + the per-load jitter draws) so a roll that
  // looks especially good or bad can be identified and pinned later.
  console.log(
    "[dice roll-in]",
    JSON.stringify({
      takeIndex,
      rate: Math.round(rate * 1e3) / 1e3,
      alignDelay: alignDelay.map((d) => Math.round(d * 1e3) / 1e3),
    }),
  );

  // The take's final keyframe is the captured rest pose the tail blends from.
  const endPos = take.dice.map((d) =>
    new THREE.Vector3().fromArray(d.p, (take.n - 1) * 3),
  );
  const endQuat = take.dice.map((d) =>
    new THREE.Quaternion().fromArray(d.q, (take.n - 1) * 4),
  );

  let clock = 0;
  let doneFired = false;

  return {
    tick(dt) {
      clock += Math.min(dt, 0.1);
      if (!doneFired && clock >= flightEnd + TAIL_S + 0.05) {
        doneFired = true;
        opts.onDone?.();
      }
    },
    poseOf(i, outPos, outQuat) {
      if (clock < flightEnd) {
        // Lerp/slerp between the two neighboring keyframes.
        const f = Math.min(clock * rate * take.hz, take.n - 1);
        const i0 = Math.floor(f);
        const i1 = Math.min(i0 + 1, take.n - 1);
        const u = f - i0;
        const d = take.dice[i];
        outPos.fromArray(d.p, i0 * 3).lerp(PA.fromArray(d.p, i1 * 3), u);
        outQuat
          .copy(QA.fromArray(d.q, i0 * 4))
          .slerp(QB.fromArray(d.q, i1 * 4), u);
        return false;
      }
      return sampleAlign(
        clock - flightEnd,
        alignDelay[i],
        endPos[i],
        endQuat[i],
        opts.slots[i],
        opts.restQuat,
        outPos,
        outQuat,
      );
    },
    dispose() {},
  };
}
