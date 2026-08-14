import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// Matches the app's existing macro color coding (see macroTones / .tone-*
// custom properties in styles.css) so the 3D chart reads consistently with
// the 2D progress bars elsewhere on the page.
const TONE_COLORS = {
  light: { protein: '#047857', carbs: '#b45309', fat: '#b91c1c', empty: '#cbd5e1' },
  dark: { protein: '#34d399', carbs: '#fbbf24', fat: '#f87171', empty: '#475569' },
};

const TAU = Math.PI * 2;
const TOP_OFFSET = Math.PI / 2; // start segments at 12 o'clock instead of 3 o'clock
const GAP = 0.05; // radians of visual breathing room between segments
const TILT = 0.5; // fixed viewing tilt, in radians, applied once to the whole ring

function DonutSegment({ startAngle, arcLength, color }) {
  return (
    <mesh rotation={[0, 0, startAngle + TOP_OFFSET]}>
      <torusGeometry args={[1, 0.3, 24, 64, arcLength]} />
      {/* Unlit so the rendered color is the exact flat tone, matching the
          2D legend/progress-bar swatches instead of a lit/shaded version. */}
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// Spins the ring around its own face-normal (like a wheel), so the tilt
// toward the camera never changes — unlike orbiting the camera around a
// tilted flat ring, this never passes through a near-edge-on "invisible"
// phase, and it keeps reading as a donut chart at every frame.
function SpinningRing({ segments }) {
  const spinRef = useRef(null);
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.z += delta * 0.35;
  });

  return (
    <group rotation={[TILT, 0, 0]}>
      <group ref={spinRef}>
        {segments.map((seg, i) => (
          <DonutSegment key={i} startAngle={seg.start} arcLength={seg.arc} color={seg.color} />
        ))}
      </group>
    </group>
  );
}

export default function MacroDonut3D({ protein = 0, carbs = 0, fat = 0, theme = 'light' }) {
  const colors = theme === 'dark' ? TONE_COLORS.dark : TONE_COLORS.light;

  const segments = useMemo(() => {
    const proteinKcal = Math.max(0, protein) * 4;
    const carbsKcal = Math.max(0, carbs) * 4;
    const fatKcal = Math.max(0, fat) * 9;
    const total = proteinKcal + carbsKcal + fatKcal;

    if (total <= 0) {
      return [{ start: 0, arc: TAU, color: colors.empty }];
    }

    const parts = [
      { kcal: proteinKcal, color: colors.protein },
      { kcal: carbsKcal, color: colors.carbs },
      { kcal: fatKcal, color: colors.fat },
    ].filter((p) => p.kcal > 0);

    let angle = 0;
    return parts.map((p) => {
      const share = (p.kcal / total) * TAU;
      const seg = { start: angle, arc: Math.max(0, share - (parts.length > 1 ? GAP : 0)), color: p.color };
      angle += share;
      return seg;
    });
  }, [protein, carbs, fat, colors]);

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 40 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ touchAction: 'pan-y' }}
    >
      <SpinningRing segments={segments} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 2 - 0.35}
        maxPolarAngle={Math.PI / 2 + 0.35}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
      />
    </Canvas>
  );
}
