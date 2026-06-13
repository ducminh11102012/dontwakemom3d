/**
 * Containers.tsx — Granny-style physical search props. Every search spot gets
 * a real opening animation (drawers slide, doors swing, lids lift, pillows
 * tilt) driven by runtime.spotAnim. Loot is visible inside; E takes it.
 */

import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SEARCH_SPOTS, type SearchSpot } from '../../game/spots';
import { spotItem, type SpotItem } from '../../game/interactions';
import { runtime } from '../../game/runtime';
import { useGameStore } from '../../state/gameStore';

// shared materials (module-level: created once)
const M = {
  wood: new THREE.MeshStandardMaterial({ color: '#54402c', roughness: 0.8 }),
  woodDark: new THREE.MeshStandardMaterial({ color: '#241a10', roughness: 0.9 }),
  cavity: new THREE.MeshStandardMaterial({ color: '#0c0a08', roughness: 1 }),
  fridge: new THREE.MeshStandardMaterial({ color: '#9aa1a4', roughness: 0.4, metalness: 0.4 }),
  sheet: new THREE.MeshStandardMaterial({ color: '#8d8d96', roughness: 1 }),
  plastic: new THREE.MeshStandardMaterial({ color: '#46505a', roughness: 0.6 }),
  junk: new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 0.95 }),
  phone: new THREE.MeshStandardMaterial({ color: '#101013', roughness: 0.4 }),
  screen: new THREE.MeshStandardMaterial({
    color: '#16323a', emissive: '#3fd9ff', emissiveIntensity: 0.9, roughness: 0.3,
  }),
  key: new THREE.MeshStandardMaterial({
    color: '#b08a3e', emissive: '#7a5a1d', emissiveIntensity: 0.55, metalness: 0.8, roughness: 0.3,
  }),
  note: new THREE.MeshStandardMaterial({
    color: '#d8d2bc', emissive: '#8a8468', emissiveIntensity: 0.35, roughness: 0.9,
  }),
  dart: new THREE.MeshStandardMaterial({
    color: '#c75b2a', emissive: '#8a3a14', emissiveIntensity: 0.6, roughness: 0.5,
  }),
};

/** the loot prop itself, lying at the contents anchor */
function Loot({ item }: { item: SpotItem }) {
  switch (item) {
    case 'phone':
      return (
        <group>
          <mesh material={M.phone}>
            <boxGeometry args={[0.15, 0.035, 0.075]} />
          </mesh>
          <mesh position={[0, 0.019, 0]} material={M.screen}>
            <boxGeometry args={[0.13, 0.004, 0.06]} />
          </mesh>
        </group>
      );
    case 'key':
      return (
        <group rotation={[0, 0.6, 0]}>
          <mesh material={M.key}>
            <boxGeometry args={[0.1, 0.018, 0.04]} />
          </mesh>
          <mesh position={[0.055, 0, 0]} material={M.key}>
            <cylinderGeometry args={[0.026, 0.026, 0.014, 10]} />
          </mesh>
        </group>
      );
    case 'note':
      return (
        <mesh rotation={[0, -0.4, 0]} material={M.note}>
          <boxGeometry args={[0.13, 0.006, 0.1]} />
        </mesh>
      );
    case 'dart':
      return (
        <mesh rotation={[0, 0.3, 1.35]} material={M.dart}>
          <cylinderGeometry args={[0.014, 0.02, 0.17, 8]} />
        </mesh>
      );
    default:
      return null;
  }
}

/** a couple of junk boxes so opened containers don't look hollow */
function Junk() {
  return (
    <group>
      <mesh position={[-0.12, 0.03, 0.02]} rotation={[0, 0.5, 0]} material={M.junk}>
        <boxGeometry args={[0.12, 0.06, 0.09]} />
      </mesh>
      <mesh position={[0.13, 0.022, -0.04]} rotation={[0, -0.3, 0]} material={M.junk}>
        <boxGeometry args={[0.09, 0.045, 0.12]} />
      </mesh>
    </group>
  );
}

interface PropProps {
  spot: SearchSpot;
  item: SpotItem | null;
}

/** one animated search container */
function SpotProp({ spot, item }: PropProps) {
  // pillows are visible from the start — the prop IS the pillow you lift
  const always = spot.cls === 'pillow';
  const [active, setActive] = useState(always);
  const root = useRef<THREE.Group>(null);
  const moving = useRef<THREE.Group>(null);

  useFrame(() => {
    const a = runtime.spotAnim[spot.id] ?? 0;
    if (a > 0.001 && !active) setActive(true);
    if (!always && a <= 0.001 && active) setActive(false); // run restarted
    if (!active || !root.current || !moving.current) return;

    const dir = runtime.spotOpenDir[spot.id] ?? [0, 1];
    root.current.rotation.y = Math.atan2(dir[0], dir[1]);
    const e = 1 - (1 - a) ** 3; // cubic ease-out — smoother deceleration

    const m = moving.current;
    switch (spot.cls) {
      case 'smallDrawer':
        m.position.set(0, 0, -0.16 + e * 0.34);
        break;
      case 'largeDrawer':
        m.position.set(0, 0, -0.2 + e * 0.42);
        break;
      case 'pillow':
        m.rotation.x = -e * 0.95;
        break;
      case 'rice':
        m.position.set(e * 0.13, e * 0.2, e * 0.05);
        m.rotation.z = e * 0.55;
        break;
      case 'box':
        m.rotation.x = -e * 1.2;  // ~69° — natural box lid open
        break;
      default: // cabinet / wardrobe / fridge doors
        m.rotation.y = -e * 1.45; // ~83° — natural door swing
        break;
    }
  });

  // contents become visible once the container is half open
  const [revealed, setRevealed] = useState(false);
  useFrame(() => {
    const open = (runtime.spotAnim[spot.id] ?? 0) > 0.35;
    if (open !== revealed) setRevealed(open);
  });

  if (!active) return null;

  const cls = spot.cls;
  const y = spot.y;
  const loot = revealed && item ? <Loot item={item} /> : null;

  if (cls === 'smallDrawer' || cls === 'largeDrawer') {
    const w = cls === 'smallDrawer' ? 0.5 : 0.66;
    const d = cls === 'smallDrawer' ? 0.38 : 0.46;
    const h = cls === 'smallDrawer' ? 0.22 : 0.28;
    return (
      <group ref={root} position={[spot.x, y, spot.z]}>
        <group ref={moving}>
          {/* front panel */}
          <mesh position={[0, 0, d / 2]} material={M.wood}>
            <boxGeometry args={[w, h, 0.035]} />
          </mesh>
          {/* tray: bottom, sides, back */}
          <mesh position={[0, -h / 2 + 0.02, 0]} material={M.woodDark}>
            <boxGeometry args={[w - 0.04, 0.03, d]} />
          </mesh>
          <mesh position={[-w / 2 + 0.02, -h / 4, 0]} material={M.woodDark}>
            <boxGeometry args={[0.025, h / 2, d]} />
          </mesh>
          <mesh position={[w / 2 - 0.02, -h / 4, 0]} material={M.woodDark}>
            <boxGeometry args={[0.025, h / 2, d]} />
          </mesh>
          <mesh position={[0, -h / 4, -d / 2 + 0.02]} material={M.woodDark}>
            <boxGeometry args={[w - 0.04, h / 2, 0.025]} />
          </mesh>
          <group position={[0, -h / 2 + 0.06, 0]}>
            {revealed && <Junk />}
            <group position={[0, 0.005, 0.05]}>{loot}</group>
          </group>
        </group>
      </group>
    );
  }

  if (cls === 'pillow') {
    return (
      <group ref={root} position={[spot.x, y, spot.z]}>
        {/* hinge at the back edge */}
        <group ref={moving} position={[0, 0, -0.22]}>
          <mesh position={[0, 0.05, 0.22]} material={M.sheet}>
            <boxGeometry args={[0.64, 0.11, 0.44]} />
          </mesh>
        </group>
        <group position={[0, 0.015, 0.06]}>{loot}</group>
      </group>
    );
  }

  if (cls === 'rice') {
    return (
      <group ref={root} position={[spot.x, y, spot.z]}>
        <group ref={moving}>
          <mesh material={M.plastic}>
            <cylinderGeometry args={[0.17, 0.17, 0.045, 12]} />
          </mesh>
        </group>
        <group position={[0, -0.04, 0]}>{loot}</group>
      </group>
    );
  }

  if (cls === 'box') {
    return (
      <group ref={root} position={[spot.x, y, spot.z]}>
        {/* lid hinged at the back edge */}
        <group ref={moving} position={[0, 0.02, -0.22]}>
          <mesh position={[0, 0, 0.22]} material={M.woodDark}>
            <boxGeometry args={[0.54, 0.035, 0.44]} />
          </mesh>
        </group>
        <group position={[0, -0.06, 0]}>
          {revealed && <Junk />}
          <group position={[0, 0.01, 0.04]}>{loot}</group>
        </group>
      </group>
    );
  }

  // hinged doors: cabinet / wardrobe / fridge
  const dw = cls === 'wardrobe' ? 0.66 : cls === 'fridge' ? 0.62 : 0.55;
  const dh = cls === 'wardrobe' ? 1.5 : cls === 'fridge' ? 1.35 : 0.55;
  const mat = cls === 'fridge' ? M.fridge : M.wood;
  return (
    <group ref={root} position={[spot.x, y, spot.z]}>
      {/* dark cavity behind the door */}
      <mesh position={[0, 0, 0.012]} material={M.cavity}>
        <boxGeometry args={[dw - 0.02, dh - 0.02, 0.02]} />
      </mesh>
      {/* shelf with the loot, slightly proud so it reads in the dark */}
      <group position={[0, cls === 'cabinet' ? -0.16 : -0.3, 0.09]}>
        {revealed && (
          <mesh position={[0, -0.025, 0]} material={M.woodDark}>
            <boxGeometry args={[dw - 0.08, 0.025, 0.16]} />
          </mesh>
        )}
        {loot}
      </group>
      {/* door hinged on the left edge */}
      <group ref={moving} position={[-dw / 2, 0, 0.045]}>
        <mesh position={[dw / 2, 0, 0]} material={mat}>
          <boxGeometry args={[dw, dh, 0.035]} />
        </mesh>
        {/* handle */}
        <mesh position={[dw - 0.06, 0, 0.035]} material={M.woodDark}>
          <boxGeometry args={[0.03, cls === 'cabinet' ? 0.12 : 0.22, 0.03]} />
        </mesh>
      </group>
    </group>
  );
}

export function Containers() {
  // narrow store subscriptions: contents only change on these
  const phoneSpotId = useGameStore((s) => s.phoneSpotId);
  const keySpotId = useGameStore((s) => s.keySpotId);
  const noteSpotId = useGameStore((s) => s.noteSpotId);
  const dartSpotId = useGameStore((s) => s.dartSpotId);
  const hasPhone = useGameStore((s) => s.hasPhone);
  const phoneReturned = useGameStore((s) => s.phoneReturned);
  const hasStorageKey = useGameStore((s) => s.hasStorageKey);
  const knowsCode = useGameStore((s) => s.knowsCode);
  const dartTaken = useGameStore((s) => s.dartTaken);

  const items = useMemo(() => {
    const store = useGameStore.getState();
    const map = new Map<string, SpotItem | null>();
    for (const s of SEARCH_SPOTS) {
      // the returned phone is visible in its spot again (you put it back)
      const back = phoneReturned && s.id === phoneSpotId ? ('phone' as SpotItem) : null;
      map.set(s.id, spotItem(s.id, store) ?? back);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneSpotId, keySpotId, noteSpotId, dartSpotId, hasPhone, phoneReturned, hasStorageKey, knowsCode, dartTaken]);

  return (
    <group>
      {SEARCH_SPOTS.map((s) => (
        <SpotProp key={s.id} spot={s} item={items.get(s.id) ?? null} />
      ))}
    </group>
  );
}
