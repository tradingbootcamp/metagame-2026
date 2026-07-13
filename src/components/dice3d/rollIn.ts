import * as THREE from "three";

// Kinematic "roll in": each die flies in from off-screen top-left, bounces at the
// row line, and tumbles around a random axis to a scattered rest — flat on a
// random face, random yaw, a little off its slot. After a beat it eases into the
// META pose. No physics sim — the tumble is an unwind of the landing pose
// (land × axisAngle(axis, θ), θ → 0), so the touchdown is exact by construction,
// and the align stage ends exactly at (slotX, 0, 0, restQuat) for a seamless
// phase-machine handoff.

export type RollInConfig = {
  delay: number; // s before this die launches
  duration: number; // s of flight + settle
  start: THREE.Vector3; // local-space launch position
  axis: THREE.Vector3; // world-space tumble axis
  spin: number; // total tumble angle to unwind (rad)
  bounce: number; // first rebound apex (local units)
  landQuat: THREE.Quaternion; // scattered rest: random face up-ish, yawed, tipped toward camera
  landOffset: THREE.Vector3; // (x, y, z) scatter around the slot — y is landing height
};

const STAGGER = 0.14; // launch spacing — dice land left to right like a spilled handful
const BASE_S = 1.15;
const BEAT = 0.9; // s at rest in the scattered pose before aligning
const ALIGN = 0.55; // s to ease into the META pose

// Upper bound on delay + duration + beat + align; Dice3D holds the phase cycle this long.
export const ROLL_IN_MS = 3500;

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);

export function makeRollIn(
  i: number,
  startX: number,
  startY: number,
): RollInConfig {
  const axis = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
  );
  if (axis.lengthSq() < 0.05) axis.set(0.3, 0.5, 0.8); // degenerate draw still spins
  axis.normalize();

  // Random axis-aligned orientation (some face up) with an arbitrary yaw,
  // then tipped toward the camera (top face peeking) with a hint of roll so
  // the resting dice don't sit as a flat grid of parallel edges.
  const quarter = () => (Math.PI / 2) * Math.floor(Math.random() * 4);
  const landQuat = new THREE.Quaternion()
    .setFromAxisAngle(RIGHT, 0.15 + Math.random() * 0.2) // ~9–20° toward viewer
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(
        FORWARD,
        (Math.random() - 0.5) * 0.25, // ±7° roll
      ),
    )
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2),
    )
    .multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(quarter(), quarter(), quarter()),
      ),
    );

  return {
    delay: i * STAGGER + Math.random() * 0.06,
    duration: BASE_S + Math.random() * 0.25,
    start: new THREE.Vector3(
      startX - Math.random() * 0.8,
      startY + Math.random() * 0.6,
      (Math.random() - 0.5) * 0.5,
    ),
    axis,
    spin: (2 + Math.random() * 1.5) * Math.PI * 2,
    bounce: 0.45 + Math.random() * 0.3,
    landQuat,
    landOffset: new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 0.4,
    ),
  };
}

const FLIGHT = 0.45; // fraction of duration airborne before first impact
const HOPS = 2;

// Pose the die `elapsed` seconds into the intro, writing position/quaternion in
// place. Returns true once settled; at that point the pose equals the rest pose
// (slotX, 0, 0, restQuat) exactly.
export function sampleRollIn(
  cfg: RollInConfig,
  elapsed: number,
  slotX: number,
  restQuat: THREE.Quaternion,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
): boolean {
  const t = elapsed - cfg.delay;
  const u = THREE.MathUtils.clamp(t / cfg.duration, 0, 1);

  const landX = slotX + cfg.landOffset.x;
  const landY = cfg.landOffset.y;
  const landZ = cfg.landOffset.z;

  // Horizontal travel: near-constant velocity, decelerating after impact.
  const ux = 1 - (1 - u) ** 2;
  outPos.x = THREE.MathUtils.lerp(cfg.start.x, landX, ux);
  outPos.z = THREE.MathUtils.lerp(cfg.start.z, landZ, ux);

  if (u < FLIGHT) {
    // Gravity-shaped descent to the landing height.
    const v = u / FLIGHT;
    outPos.y = landY + (cfg.start.y - landY) * (1 - v * v);
  } else {
    // Decaying hops after impact.
    const v = (u - FLIGHT) / (1 - FLIGHT);
    outPos.y =
      landY +
      cfg.bounce * Math.abs(Math.sin(Math.PI * HOPS * v)) * (1 - v) ** 2;
  }

  // Fast tumble in the air, slowing through the bounces, gone at u=1.
  const theta = cfg.spin * (1 - u) ** 1.6;
  outQuat.setFromAxisAngle(cfg.axis, theta).multiply(cfg.landQuat);

  if (u < 1) return false;

  // At rest in the scattered pose; after the beat, ease into the META lineup.
  const a = THREE.MathUtils.clamp((t - cfg.duration - BEAT) / ALIGN, 0, 1);
  const e = a * a * (3 - 2 * a);
  outPos.x = THREE.MathUtils.lerp(landX, slotX, e);
  outPos.y = THREE.MathUtils.lerp(landY, 0, e);
  outPos.z = THREE.MathUtils.lerp(landZ, 0, e);
  outQuat.copy(cfg.landQuat).slerp(restQuat, e);

  return a >= 1;
}
