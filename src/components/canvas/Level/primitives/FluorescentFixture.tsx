/**
 * FluorescentFixture.tsx
 * ----------------------
 * Office fluorescent tube fixture (Phase 2 §2.3): emissive housing box +
 * one point light. Optional flicker driven entirely by refs inside useFrame —
 * NO React state, zero re-renders.
 *
 * Flicker behaviour: every 3–6 s (random) the light drops to ~10% for
 * 80–150 ms, then recovers.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface FluorescentFixtureProps {
  /** World position of the fixture housing (place just below the ceiling). */
  position: [number, number, number];
  length?: number;
  rotationY?: number;
  flicker?: boolean;
}

/**
 * NOTE: the brief says intensity 1.0, but three.js ≥ r155 uses physical light
 * units (candela) — 1.0 renders near-black. 12 with decay 2 / distance 9
 * matches the intended "dim office fluorescent" look (see PHASE_2_NOTES.md).
 */
const ON_LIGHT_INTENSITY = 9;
const ON_EMISSIVE_INTENSITY = 1.4;
const OFF_LIGHT_INTENSITY = 0.9; // ~10% of ON
const OFF_EMISSIVE_INTENSITY = 0.15;

const randomOnTime = () => 3 + Math.random() * 3; // 3–6 s
const randomOffTime = () => 0.08 + Math.random() * 0.07; // 80–150 ms

export default function FluorescentFixture({
  position,
  length = 1.2,
  rotationY = 0,
  flicker = false,
}: FluorescentFixtureProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  // Flicker timer state lives in a ref — never React state.
  const timerRef = useRef({ lit: true, remaining: randomOnTime() });

  useFrame((_, delta) => {
    if (!flicker) return;
    const timer = timerRef.current;
    timer.remaining -= delta;
    if (timer.remaining > 0) return;

    timer.lit = !timer.lit;
    timer.remaining = timer.lit ? randomOnTime() : randomOffTime();

    const light = lightRef.current;
    const material = materialRef.current;
    if (light) light.intensity = timer.lit ? ON_LIGHT_INTENSITY : OFF_LIGHT_INTENSITY;
    if (material) {
      material.emissiveIntensity = timer.lit
        ? ON_EMISSIVE_INTENSITY
        : OFF_EMISSIVE_INTENSITY;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[length, 0.05, 0.2]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#f5f8ff"
          emissive="#dceaff"
          emissiveIntensity={ON_EMISSIVE_INTENSITY}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, -0.5, 0]}
        color="#dceaff"
        intensity={ON_LIGHT_INTENSITY}
        distance={9}
        decay={2}
      />
    </group>
  );
}
