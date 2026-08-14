import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Two body profiles per sex (radius at each height, feet to head) — a lean
// build and a heavier build, sharing the same 15 height stops (ankle/calf/
// knee/thigh/hip/waist/chest/shoulder/neck/head). The torso+legs+head
// silhouette is a point-by-point radius interpolation between the lean and
// heavy profile for the selected sex, driven by where the BMI sits on the
// under/normal/over/obese scale — so the body gets visibly wider, not just
// recolored, as BMI rises. Male profiles taper shoulder-dominant (broader
// shoulders than hips, weight gain concentrated at the waist); female
// profiles taper hip-dominant (hips at or past shoulder width, a waist
// curve that persists even in the heavier build). A separate pair of
// tapered-cylinder arms is attached at the shoulders — a lathe revolve is
// rotationally symmetric and can never produce limbs sticking out to the
// sides, so arms have to be their own geometry to read as an actual body
// rather than an armless mannequin/dress form.
const HEIGHTS = [0.0, 0.0, 0.45, 1.25, 1.55, 1.95, 2.5, 3.05, 3.6, 3.85, 4.05, 4.15, 4.55, 4.75, 4.85];
const SHOULDER_INDEX = 9; // HEIGHTS[9] === 3.85

const PROFILES = {
  male: {
    lean: [0.0, 0.19, 0.16, 0.23, 0.18, 0.28, 0.3, 0.23, 0.32, 0.38, 0.17, 0.23, 0.23, 0.13, 0.0],
    heavy: [0.0, 0.36, 0.32, 0.52, 0.4, 0.6, 0.62, 0.76, 0.74, 0.7, 0.28, 0.34, 0.34, 0.19, 0.0],
    armLean: [0.1, 0.05],
    armHeavy: [0.19, 0.08],
  },
  female: {
    lean: [0.0, 0.17, 0.14, 0.21, 0.16, 0.29, 0.34, 0.22, 0.28, 0.3, 0.15, 0.21, 0.21, 0.13, 0.0],
    heavy: [0.0, 0.32, 0.28, 0.48, 0.36, 0.66, 0.72, 0.62, 0.66, 0.6, 0.24, 0.31, 0.31, 0.18, 0.0],
    armLean: [0.085, 0.043],
    armHeavy: [0.17, 0.075],
  },
};

const BODY_HEIGHT = HEIGHTS[HEIGHTS.length - 1];
const ARM_TOP_Y = 3.82; // just under the shoulder point, world (pre-centering) space
const ARM_BOTTOM_Y = 1.7; // roughly mid-thigh, matching natural arm length

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildTorsoProfile(sex, t) {
  const { lean, heavy } = PROFILES[sex] || PROFILES.female;
  const clamped = Math.min(1, Math.max(0, t));
  return HEIGHTS.map((y, i) => new THREE.Vector2(lerp(lean[i], heavy[i], clamped), y));
}

function BodyShape({ sex, bmiT, color }) {
  const p = PROFILES[sex] || PROFILES.female;
  const clamped = Math.min(1, Math.max(0, bmiT));

  const torsoGeometry = useMemo(() => {
    const geo = new THREE.LatheGeometry(buildTorsoProfile(sex, clamped), 48);
    geo.translate(0, -BODY_HEIGHT / 2, 0);
    return geo;
  }, [sex, clamped]);

  const shoulderR = lerp(p.lean[SHOULDER_INDEX], p.heavy[SHOULDER_INDEX], clamped);
  const armTopR = lerp(p.armLean[0], p.armHeavy[0], clamped);
  const armBottomR = lerp(p.armLean[1], p.armHeavy[1], clamped);
  const armHeight = ARM_TOP_Y - ARM_BOTTOM_Y;
  const armCenterY = (ARM_TOP_Y + ARM_BOTTOM_Y) / 2 - BODY_HEIGHT / 2;
  const armX = shoulderR - armTopR * 0.35; // tuck the arm's inner edge just under the shoulder cap

  // CylinderGeometry supports independent top/bottom radii directly, which
  // is what actually produces a shoulder-to-wrist taper (a scaled capsule
  // would just make the whole limb uniformly thicker, not tapered).
  const armGeometry = useMemo(
    () => new THREE.CylinderGeometry(armTopR, armBottomR, armHeight, 14, 1, false),
    [armTopR, armBottomR, armHeight],
  );

  return (
    <group>
      <mesh geometry={torsoGeometry}>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.06} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[armX, armCenterY, 0]} geometry={armGeometry}>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.06} />
      </mesh>
      <mesh position={[-armX, armCenterY, 0]} geometry={armGeometry}>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.06} />
      </mesh>
    </group>
  );
}

function Turntable({ children }) {
  const ref = useRef(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return <group ref={ref}>{children}</group>;
}

export default function BodyMeter3D({ sex = 'female', bmiT = 0.5, color = '#0d9488' }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9.2], fov: 32 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 5]} intensity={1} />
      <directionalLight position={[-4, -1, -3]} intensity={0.3} />
      <Turntable>
        <BodyShape sex={sex} bmiT={bmiT} color={color} />
      </Turntable>
    </Canvas>
  );
}
