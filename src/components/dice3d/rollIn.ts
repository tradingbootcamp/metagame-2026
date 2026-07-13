import * as THREE from "three";

// Kinematic "roll in": each die flies in from off-screen top-left, bounces at the
// row line, and tumbles around a random axis. No physics sim — the tumble is an
// unwind of the rest pose (rest × axisAngle(axis, θ), θ → 0), so every die lands
// exactly in its phase-machine pose and the handoff is seamless.

export type RollInConfig = {
  delay: number; // s before this die launches
  duration: number; // s of flight + settle
  start: THREE.Vector3; // local-space launch position
  axis: THREE.Vector3; // world-space tumble axis
  spin: number; // total tumble angle to unwind (rad)
  bounce: number; // first rebound apex (local units)
};

const STAGGER = 0.14; // launch spacing — dice land left to right like a spilled handful
const BASE_S = 1.15;

// Upper bound on delay + duration; Dice3D holds the phase cycle this long.
export const ROLL_IN_MS = 2100;

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
  const u = THREE.MathUtils.clamp((elapsed - cfg.delay) / cfg.duration, 0, 1);

  // Horizontal travel: near-constant velocity, decelerating after impact.
  const ux = 1 - (1 - u) ** 2;
  outPos.x = THREE.MathUtils.lerp(cfg.start.x, slotX, ux);
  outPos.z = cfg.start.z * (1 - ux);

  if (u < FLIGHT) {
    // Gravity-shaped descent to the row line.
    const v = u / FLIGHT;
    outPos.y = cfg.start.y * (1 - v * v);
  } else {
    // Decaying hops after impact.
    const v = (u - FLIGHT) / (1 - FLIGHT);
    outPos.y =
      cfg.bounce * Math.abs(Math.sin(Math.PI * HOPS * v)) * (1 - v) ** 2;
  }

  // Fast tumble in the air, slowing through the bounces, gone at u=1.
  const theta = cfg.spin * (1 - u) ** 1.6;
  outQuat.setFromAxisAngle(cfg.axis, theta).multiply(restQuat);

  return u >= 1;
}
