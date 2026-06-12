/**
 * Mom.tsx — the Mother: primitive-built model + per-frame AI driver.
 * Lying in bed while asleep / fake-asleep; standing & walking otherwise.
 * Carries the broom (tap…tap…tap) while patrolling or returning.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MomAI, momAIRef } from '../../game/momAI';
import { runtime } from '../../game/runtime';
import { useGameStore } from '../../state/gameStore';
import { createFabricTexture } from '../../utils/proceduralTextures';

export default function Mom() {
  const group = useRef<THREE.Group>(null);
  const walkPhase = useRef(0);

  useEffect(() => {
    const ai = new MomAI();
    momAIRef.current = ai;
    return () => {
      ai.dispose();
      momAIRef.current = null;
    };
  }, []);

  const mats = useMemo(
    () => ({
      gown: new THREE.MeshStandardMaterial({
        map: createFabricTexture('#5a4a52', 'gown'),
        roughness: 1,
      }),
      skin: new THREE.MeshStandardMaterial({ color: '#9c7e6a', roughness: 0.8 }),
      hair: new THREE.MeshStandardMaterial({ color: '#3a3026', roughness: 1 }),
      broomStick: new THREE.MeshStandardMaterial({ color: '#6b5234', roughness: 0.9 }),
      broomHead: new THREE.MeshStandardMaterial({ color: '#8a7242', roughness: 1 }),
      blanket: new THREE.MeshStandardMaterial({
        map: createFabricTexture('#42282e', 'wine'),
        roughness: 1,
      }),
    }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const ai = momAIRef.current;
    const store = useGameStore.getState();
    if (ai && (store.gamePhase === 'playing' || store.gamePhase === 'phone')) {
      runtime.clock += dt;
      ai.update(dt);
    }
    const g = group.current;
    if (!g) return;
    const lying = runtime.momState === 'sleep' || runtime.momState === 'fakeSleep';
    if (lying) {
      // lying on her bed
      g.position.set(1.3, 0.78, 5.8);
      g.rotation.set(-Math.PI / 2, 0, 0);
    } else if (runtime.momState === 'tranq') {
      // knocked out cold, face down where the dart hit her
      g.position.set(runtime.momX, 0.18, runtime.momZ);
      g.rotation.set(Math.PI / 2, 0, runtime.momYaw + Math.PI);
    } else {
      walkPhase.current += dt * 7;
      const bob = Math.sin(walkPhase.current) * 0.02;
      g.position.set(runtime.momX, bob, runtime.momZ);
      g.rotation.set(0, runtime.momYaw + Math.PI, 0);
    }
  });

  const showBroom = true; // broom is part of her silhouette; tap sound only on patrol

  return (
    <group ref={group}>
      {/* nightgown body */}
      <mesh position={[0, 0.75, 0]} material={mats.gown}>
        <cylinderGeometry args={[0.22, 0.34, 1.5, 10]} />
      </mesh>
      {/* shoulders */}
      <mesh position={[0, 1.42, 0]} material={mats.gown}>
        <sphereGeometry args={[0.21, 10, 8]} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.62, 0]} material={mats.skin}>
        <sphereGeometry args={[0.14, 12, 10]} />
      </mesh>
      {/* hair bun */}
      <mesh position={[0, 1.74, 0.07]} material={mats.hair}>
        <sphereGeometry args={[0.11, 10, 8]} />
      </mesh>
      <mesh position={[0, 1.66, 0.02]} material={mats.hair}>
        <sphereGeometry args={[0.145, 10, 8]} />
      </mesh>
      {/* arms */}
      <mesh position={[-0.26, 1.05, 0]} rotation={[0, 0, 0.25]} material={mats.gown}>
        <cylinderGeometry args={[0.05, 0.06, 0.7, 8]} />
      </mesh>
      <mesh position={[0.26, 1.05, 0.05]} rotation={[0.15, 0, -0.25]} material={mats.gown}>
        <cylinderGeometry args={[0.05, 0.06, 0.7, 8]} />
      </mesh>
      {showBroom && (
        <group position={[0.34, 0, 0.12]} rotation={[0.06, 0, -0.06]}>
          <mesh position={[0, 0.85, 0]} material={mats.broomStick}>
            <cylinderGeometry args={[0.018, 0.018, 1.6, 8]} />
          </mesh>
          <mesh position={[0, 0.12, 0]} material={mats.broomHead}>
            <cylinderGeometry args={[0.05, 0.13, 0.28, 8]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
