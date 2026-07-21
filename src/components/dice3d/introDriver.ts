import * as THREE from "three";

// Shared contract for the roll-in intro's pose source. Two drivers implement it:
//
//   - rollInPlayback.ts — the production path. Plays back a pre-recorded physics
//     take (baked keyframes, a few KB) picked at random per load.
//   - physicsRollIn.ts — a live Rapier rigid-body sim. It's the recording rig
//     that produced those takes (?record=1) and the fallback if none are baked.
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
// the baked file compact ([x,y,z,...] and [x,y,z,w,...]). The last keyframe is
// the captured rest pose; the beat + align tail is generated at playback time
// (with fresh per-load jitter), not recorded.
export type RollInTake = {
  hz: number;
  n: number; // keyframes per die
  dice: { p: number[]; q: number[] }[];
};

// Canonical launch geometry, in the dice group's local units (the group's
// responsive scale is applied outside, exactly like the old kinematic path).
// Deliberately viewport-independent so recorded takes replay correctly at any
// size: the row is width-fitted, so the local canvas width is effectively
// constant (~ROW_WIDTH / 0.95 ≈ 6.4 → edges at ±3.2) whenever the width
// constraint binds, which is every realistic viewport. START_Y sits above the
// tallest local canvas half-height (~1.4 on mobile aspect) plus a die.
export const START_X = -4.4; // launches draw from START_X - [0, 0.8]
export const START_Y = 2.4; // launches draw from START_Y + [0, 0.5]
export const BOUNDS = { left: -3.3, right: 3.3, halfDepth: 1.4 };

// Rest-to-META tail. The settle detector already holds ~0.25s of stillness
// before a take/sim ends, so the perceived beat matches the old 0.9s.
export const BEAT = 0.65; // s at rest in the scattered pose before aligning
export const ALIGN = 0.65; // s to ease into the META pose
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
