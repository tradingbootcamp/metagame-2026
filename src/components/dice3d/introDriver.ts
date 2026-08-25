import * as THREE from "three";

// Shared contract for the roll-in intro's pose source. Two drivers implement it:
//
//   - rollInPlayback.ts — the production path. Plays back one of the kept
//     physics takes (a few KB of keyframes each) picked at random per load.
//   - physicsRollIn.ts — a live Rapier rigid-body sim. It's the rig that threw
//     those takes (?record=1) and the fallback if nothing has been kept.
//
// Both end the same way: once the dice are at rest scattered near their slots,
// a beat + align ease (sampleAlign below) carries each die to exactly
// (slotX, 0, 0, restQuat) so Die.tsx's phase machine takes over seamlessly —
// the same handoff contract the old closed-form kinematic roll-in honored.

export type IntroDriver = {
  // Advance the driver's clock. Called once per frame (before any poseOf) by a
  // single owner — Dice3D's Scene — so per-die pose reads stay consistent.
  tick(dt: number): void;
  // Write die i's current pose. Returns true once that die is fully aligned at
  // its rest pose; from then on the pose it writes is exactly the rest pose.
  poseOf(i: number, outPos: THREE.Vector3, outQuat: THREE.Quaternion): boolean;
  dispose(): void;
};

// A recorded take: per-die keyframe streams sampled at `hz`, flat arrays to keep
// the stored JSON compact ([x,y,z,...] and [x,y,z,w,...]). The last keyframe is
// the captured rest pose; the beat + align tail is generated at playback time
// (with fresh per-load jitter), not recorded.
export type RollInTake = {
  hz: number;
  n: number; // keyframes per die
  dice: { p: number[]; q: number[] }[];
  // Hand-picked scattered tableau: one cube symmetry per die as [x,y,z,w]
  // (cubeRetcon.ts). Takes kept before the picker existed have none and draw a
  // random symmetry per load instead.
  retcon?: number[][];
};

// Canonical launch geometry, in the dice group's local units (the group's
// display scale is applied outside). The RESTING frame is what BOUNDS describes:
// where the dice come to rest, dead-center of the window, with the settle walls
// just outside it so the resting cluster is contained on-camera regardless of
// how wide the full-bleed canvas is (META-447). Where the cubes SPAWN from — how
// far off the frame edge they start — is the tunable `reach` param
// (physicsRollIn.ts), not a fixed constant, so it can be dialed against the
// framing being recorded.
//
// The x settle-walls sit at ±(BOUNDS.x + 0.4) with 0.25 half-thickness
// (physicsRollIn.ts), so their inner faces land at ±3.10 — just outside the
// dice's rest slots (±2.25). A hard wall-impact can transiently penetrate
// ~0.05–0.1 before the solver pushes back, so the resting cluster stays inside
// ~±3.2. The recorder's keep criterion (DiceDevPanel.tsx) requires the landed
// portion and rest tableau to stay inside ±3.1.
export const BOUNDS = { left: -2.95, right: 2.95, halfDepth: 1.4 };

// Rest-to-META tail. The settle detector already holds ~0.25s of stillness
// before a take/sim ends, so the perceived beat matches the old 0.9s.
export const BEAT = 0.4; // s at rest in the scattered pose before aligning
export const ALIGN = 0.55; // s to ease into the META pose
export const ALIGN_JITTER = 0.12; // max extra per-die delay so the row doesn't move as one

// How long the whole tail takes once the dice are at rest.
export const TAIL_S = BEAT + ALIGN_JITTER + ALIGN;

// Hard ceiling on the intro for Dice3D's phase cycle: if the driver's done
// callback never fires (wasm failed to load mid-record, etc.) the cycle still
// starts. Generous: worst-case sim timeout + tail + load slack.
export const INTRO_CAP_MS = 6500;

// The shared tail: `tRest` seconds after the die came to rest, ease from its
// scattered pose to the slot/META rest pose. Smoothstep, position lerp + quat
// slerp — the same shape as the old kinematic align stage.
export function sampleAlign(
  tRest: number,
  delay: number, // this die's ALIGN_JITTER draw
  fromPos: THREE.Vector3,
  fromQuat: THREE.Quaternion,
  slotX: number,
  restQuat: THREE.Quaternion,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
): boolean {
  const a = THREE.MathUtils.clamp((tRest - BEAT - delay) / ALIGN, 0, 1);
  const e = a * a * (3 - 2 * a);
  outPos.set(
    THREE.MathUtils.lerp(fromPos.x, slotX, e),
    fromPos.y * (1 - e),
    fromPos.z * (1 - e),
  );
  outQuat.copy(fromQuat).slerp(restQuat, e);
  return a >= 1;
}
