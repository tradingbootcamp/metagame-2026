"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, letterImageTexture, pipTexture } from "./faceTexture";
import { sampleRollIn, type RollInConfig } from "./rollIn";

export type DieData = {
  front: string; // blue letter (+Z)
  right: string; // orange letter (+X)
  top: number; // dark pip value (+Y)
};

export type Phase = "meta" | "game" | "year" | "static";

// Whole-die orientation per phase. META rests with the blue letter forward and a
// gentle tilt; GAME spins the orange face to the front; YEAR tips the pip top up
// toward the camera. STATIC rests edge-on between the two letters and renders
// orthographic (reduced-motion, also pinnable via ?phase=static); construction below.
const d = THREE.MathUtils.degToRad;
const quat = (x: number, y: number, z = 0) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler(d(x), d(y), d(z), "YXZ"));

// Camera sits on +Z looking toward -Z. Positive X rotation brings +Y (top) into
// view; negative Y rotation brings +X (right) into view — the classic 3-face die
// pose. META rests showing the blue +Z face; GAME swings the orange +X face to
// front; YEAR tips the pip top (+Y) up to the camera.
// STATIC pose, built as an explicit rotation sequence so each axis is a separate
// dial (tune the three angles): yaw to sit edge-on between the letters, an optional
// roll about the view axis, then a downward pitch.
const staticPose = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0, 0), d(20)) // pitch down
  .multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), d(0)),
  ) // roll about the view axis
  .multiply(
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d(-45)),
  ); // yaw: edge-on between the two letters

const QUAT: Record<Phase, THREE.Quaternion> = {
  static: staticPose,
  meta: quat(-10, -5), // CSS-matched resting tilt: blue META up front, slight underside
  game: quat(-0, -85, -5), // orange +X face turns to front
  year: quat(80, 3), // tips the pip top (+Y) nearly straight-on to read 2026
};

const TURN_S = 1.0; // seconds for a die to complete its turn
const STAGGER = 0.04; // tiny per-die delay — the row turns near-unison, not a wave

const SIZE = 1; // die edge length in world units
const RADIUS = SIZE * 0.06; // bevel radius of the rounded body

// The body's flat (un-beveled) face spans SIZE - 2*RADIUS. The printed panel is
// a rounded square sized to cover that flat region and reach up to where the
// bevel begins; its corner radius matches the bevel so the corners tuck into the
// rounded edge instead of poking past it. PANEL slightly exceeds the flat region
// so the colored area meets the bevel with no dark gap.
const FLAT = SIZE - 2 * RADIUS;
// Panel fills exactly the flat face region (corner radius = bevel radius) and sits
// coplanar with the face, so it reads as painted-on rather than a raised sticker.
// polygonOffset (below) avoids z-fighting with the body face.
const PANEL = FLAT;
const PANEL_R = RADIUS;
const LIFT = 0.004; // hair of separation so the panel never z-fights the body face

// A rounded-rectangle plane centered at the origin in the XY plane, with UVs
// normalized to 0..1 so a full-bleed face texture maps across it cleanly.
function roundedPanelGeometry(
  side: number,
  radius: number,
): THREE.ShapeGeometry {
  const h = side / 2;
  const r = Math.min(radius, h);
  const shape = new THREE.Shape();
  shape.moveTo(-h + r, -h);
  shape.lineTo(h - r, -h);
  shape.quadraticCurveTo(h, -h, h, -h + r);
  shape.lineTo(h, h - r);
  shape.quadraticCurveTo(h, h, h - r, h);
  shape.lineTo(-h + r, h);
  shape.quadraticCurveTo(-h, h, -h, h - r);
  shape.lineTo(-h, -h + r);
  shape.quadraticCurveTo(-h, -h, -h + r, -h);

  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + h) / side; // x -> u
    uv[i * 2 + 1] = (pos.getY(i) + h) / side; // y -> v
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Each printed face: panel center position + the rotation that lays the panel
// flat against that cube face (panel default normal is +Z).
const HALF = SIZE / 2 + LIFT;
const FACES: {
  pos: [number, number, number];
  rot: [number, number, number];
}[] = [
  { pos: [0, 0, HALF], rot: [0, 0, 0] }, // +Z front (blue letter)
  { pos: [0, 0, -HALF], rot: [0, Math.PI, 0] }, // -Z back (blue letter)
  { pos: [HALF, 0, 0], rot: [0, Math.PI / 2, 0] }, // +X right (orange letter)
  { pos: [-HALF, 0, 0], rot: [0, -Math.PI / 2, 0] }, // -X left (orange letter)
  { pos: [0, HALF, 0], rot: [-Math.PI / 2, 0, 0] }, // +Y top (dark pips)
  { pos: [0, -HALF, 0], rot: [Math.PI / 2, 0, 0] }, // -Y bottom (dark pips)
];

export default function Die({
  data,
  phase,
  delay,
  x,
  rollIn,
}: {
  data: DieData;
  phase: Phase;
  delay: number;
  x: number;
  rollIn?: RollInConfig;
}) {
  const group = useRef<THREE.Group>(null);
  const mover = useRef<THREE.Group>(null); // outer group: position (roll-in flight path)

  // One rounded-panel geometry shared by all six faces.
  const panelGeo = useMemo(() => roundedPanelGeometry(PANEL, PANEL_R), []);
  useEffect(() => () => panelGeo.dispose(), [panelGeo]);

  // Per-face textures, built once.
  const textures = useMemo(() => {
    const blue = letterImageTexture(data.front, "blue");
    const blueBack = letterImageTexture(data.front, "blue");
    const orange = letterImageTexture(data.right, "orange");
    const orangeLeft = letterImageTexture(data.right, "orange");
    const top = pipTexture(data.top);
    const bottom = pipTexture(7 - data.top);
    return [blue, blueBack, orange, orangeLeft, top, bottom];
  }, [data]);

  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  // Start pose (imperative so re-renders don't snap it back): mid-air off-screen
  // when rolling in, otherwise the META rest pose. Position lives here too — the
  // outer group carries no position prop, so a mid-flight re-render can't
  // teleport the die to its slot.
  const started = useRef(false);
  const introT = useRef(0);
  const introDone = useRef(!rollIn);
  useEffect(() => {
    if (!group.current || !mover.current || started.current) return;
    started.current = true;
    if (rollIn) {
      sampleRollIn(
        rollIn,
        0,
        x,
        QUAT.meta,
        mover.current.position,
        group.current.quaternion,
      );
    } else {
      mover.current.position.set(x, 0, 0);
      group.current.quaternion.copy(QUAT.meta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each phase change eases the die from its current pose to the new one over a
  // fixed duration, after a small per-die delay so the row turns in a wave.
  const target = QUAT[phase];
  const fromQ = useRef(new THREE.Quaternion());
  const prog = useRef(1); // 0..1 along the current turn; 1 = settled
  const wait = useRef(0);
  useEffect(() => {
    if (group.current) fromQ.current.copy(group.current.quaternion);
    prog.current = 0;
    wait.current = delay * STAGGER;
  }, [phase, delay]);

  useFrame((_, dt) => {
    const g = group.current;
    const m = mover.current;
    if (!g || !m) return;

    // Roll-in owns the pose until it settles; the phase machine takes over from
    // the exact rest pose it lands in.
    if (!introDone.current && rollIn) {
      introT.current += dt;
      const settled = sampleRollIn(
        rollIn,
        introT.current,
        x,
        QUAT.meta,
        m.position,
        g.quaternion,
      );
      if (settled) {
        introDone.current = true;
        prog.current = 1;
      }
      return;
    }

    if (prog.current >= 1) return;
    if (wait.current > 0) {
      wait.current -= dt;
      return;
    }
    prog.current = Math.min(1, prog.current + dt / TURN_S);
    // smootherstep ease-in-out → gentle start and settle, no jerk at either end
    const u = prog.current;
    const e = u * u * u * (u * (6 * u - 15) + 10);
    g.quaternion.slerpQuaternions(fromQ.current, target, e);
  });

  return (
    <group ref={mover}>
      <group ref={group}>
        {/* ink body — its rounded bevel forms the dark edges/frame */}
        <RoundedBox
          args={[SIZE, SIZE, SIZE]}
          radius={RADIUS}
          smoothness={8}
          bevelSegments={8}
          creaseAngle={0.6}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={COLORS.ink}
            roughness={0.9}
            metalness={0}
          />
        </RoundedBox>

        {/* printed faces: rounded panels filling each flat face, lit like the body
            so they read as painted-on rather than stuck-on stickers. */}
        {FACES.map((f, i) => (
          <mesh key={i} geometry={panelGeo} position={f.pos} rotation={f.rot}>
            <meshStandardMaterial
              map={textures[i]}
              // pip faces (top/bottom) get a glossier finish so the white pips catch
              // specular highlights and read brighter; letter faces stay a touch matte
              roughness={i >= 4 ? 0.35 : 0.7}
              metalness={0}
              // letter tiles carry a keyed alpha: the black regions drop out so the
              // die body shows through instead of a flatter, deader pure black
              alphaTest={i < 4 ? 0.5 : 0}
              polygonOffset
              polygonOffsetFactor={-4}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
