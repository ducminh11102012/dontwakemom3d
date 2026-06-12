/**
 * House.tsx — renders the entire house: floors, ceiling, walls (with door
 * holes + lintels), animated door panels, furniture, fixtures and lights.
 * All static geometry carries fixed rapier colliders.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import {
  DOORS,
  LEVEL_Y,
  ROOMS,
  STAIR_HOLE_Z0,
  STAIR_HOLE_Z1,
  STAIR_X0,
  STAIR_X1,
  STAIR_Z_BOTTOM,
  STAIR_Z_TOP,
  WALLS,
  type DoorDef,
  type WallDef,
} from '../../game/house';
import { FURNITURE, type MaterialKey, type Part } from '../../game/furnitureData';
import { DOOR_HEIGHT, SAFE_POS, WALL_HEIGHT, WALL_THICKNESS } from '../../constants';
import { runtime } from '../../game/runtime';
import { Containers } from './Containers';
import { useGameStore } from '../../state/gameStore';
import {
  createCarpetTexture,
  createCeilingTexture,
  createFabricTexture,
  createTileTexture,
  createWallTexture,
  createWoodTexture,
} from '../../utils/proceduralTextures';

// ── materials ───────────────────────────────────────────────────────────────

function useMaterials() {
  return useMemo(() => {
    const make = (opts: THREE.MeshStandardMaterialParameters) =>
      new THREE.MeshStandardMaterial(opts);
    const mats: Record<MaterialKey, THREE.MeshStandardMaterial> = {
      wood: make({ color: '#4a3826', roughness: 0.8 }),
      woodDark: make({ color: '#2e2218', roughness: 0.85 }),
      fabricBlue: make({ map: createFabricTexture('#2a3450', 'blue'), roughness: 1 }),
      fabricWine: make({ map: createFabricTexture('#42282e', 'wine'), roughness: 1 }),
      sheet: make({ map: createFabricTexture('#8d8d96', 'sheet'), roughness: 1 }),
      metal: make({ color: '#6a6f76', roughness: 0.35, metalness: 0.7 }),
      porcelain: make({ color: '#aeb4b6', roughness: 0.25 }),
      black: make({ color: '#101013', roughness: 0.5 }),
      screen: make({ color: '#0c0f16', roughness: 0.2, metalness: 0.3 }),
      cardboard: make({ color: '#6b5234', roughness: 0.95 }),
      plastic: make({ color: '#46505a', roughness: 0.6 }),
      curtain: make({
        map: createFabricTexture('#3a3f55', 'curtain'),
        roughness: 1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      }),
      mirror: make({ color: '#2a3340', roughness: 0.08, metalness: 0.9 }),
      books1: make({ map: createFabricTexture('#4a3340', 'books1'), roughness: 0.9 }),
      books2: make({ map: createFabricTexture('#33424a', 'books2'), roughness: 0.9 }),
    };
    return mats;
  }, []);
}

// ── walls ───────────────────────────────────────────────────────────────────

interface WallPiece {
  cx: number;
  cz: number;
  w: number; // along wall axis
  h: number;
  y: number;
  axis: 'x' | 'z';
}

function wallPieces(w: WallDef): WallPiece[] {
  const pieces: WallPiece[] = [];
  // level 0: wall spans 0→2.6; level 1: spans 2.6→5.45 (covers the slab band)
  const base = w.level === 0 ? 0 : WALL_HEIGHT;
  const top = w.level === 0 ? WALL_HEIGHT : WALL_HEIGHT + LEVEL_Y;
  const doorBase = w.level * LEVEL_Y; // door holes start at the walking floor
  const holes = w.doors
    .map((id) => DOORS.find((d) => d.id === id))
    .filter((d): d is DoorDef => !!d)
    .map((d) => ({ a: d.at - d.width / 2, b: d.at + d.width / 2 }))
    .sort((a, b) => a.a - b.a);
  let cursor = w.from;
  const push = (from: number, to: number, y: number, h: number) => {
    if (to - from < 0.01 || h < 0.01) return;
    const mid = (from + to) / 2;
    pieces.push({
      cx: w.axis === 'x' ? w.fixed : mid,
      cz: w.axis === 'x' ? mid : w.fixed,
      w: to - from,
      h,
      y,
      axis: w.axis,
    });
  };
  for (const hole of holes) {
    push(cursor, hole.a, (base + top) / 2, top - base);
    // sill below the door hole (level 1: the slab band)
    push(hole.a, hole.b, (base + doorBase) / 2, doorBase - base);
    // lintel above the door
    const lintelFrom = doorBase + DOOR_HEIGHT;
    push(hole.a, hole.b, (lintelFrom + top) / 2, top - lintelFrom);
    cursor = hole.b;
  }
  push(cursor, w.to, (base + top) / 2, top - base);
  return pieces;
}

function Walls() {
  const wallTex = useMemo(() => createWallTexture(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }),
    [wallTex],
  );
  const pieces = useMemo(() => WALLS.flatMap(wallPieces), []);
  return (
    <RigidBody type="fixed" colliders={false}>
      {pieces.map((p, i) => (
        <group key={i}>
          <mesh
            position={[p.cx, p.y, p.cz]}
            material={mat}
            castShadow={false}
            receiveShadow={false}
          >
            <boxGeometry
              args={
                p.axis === 'x'
                  ? [WALL_THICKNESS, p.h, p.w]
                  : [p.w, p.h, WALL_THICKNESS]
              }
            />
          </mesh>
          <CuboidCollider
            position={[p.cx, p.y, p.cz]}
            args={
              p.axis === 'x'
                ? [WALL_THICKNESS / 2, p.h / 2, p.w / 2]
                : [p.w / 2, p.h / 2, WALL_THICKNESS / 2]
            }
          />
        </group>
      ))}
    </RigidBody>
  );
}

// ── door panels ─────────────────────────────────────────────────────────────

function DoorPanel({ door }: { door: DoorDef }) {
  const pivot = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3b2c1d', roughness: 0.8 }),
    [],
  );
  // hinge at one end of the hole
  const hinge: [number, number] =
    door.axis === 'x'
      ? [door.fixed, door.at - door.width / 2]
      : [door.at - door.width / 2, door.fixed];

  useFrame((_, dt) => {
    const target = runtime.doorOpen[door.id] ?? (door.startsOpen ? 1 : 0);
    const g = pivot.current;
    if (!g) return;
    const targetAngle = target * (Math.PI / 2) * 0.94;
    const cur = g.rotation.y;
    g.rotation.y = cur + (targetAngle - cur) * Math.min(1, 6 * dt);
  });

  const open = runtime.doorOpen[door.id] ?? (door.startsOpen ? 1 : 0);

  return (
    <group position={[hinge[0], door.level * LEVEL_Y, hinge[1]]}>
      <group ref={pivot} rotation={[0, open > 0.5 ? Math.PI / 2 : 0, 0]}>
        <mesh
          position={
            door.axis === 'x'
              ? [0, DOOR_HEIGHT / 2, door.width / 2]
              : [door.width / 2, DOOR_HEIGHT / 2, 0]
          }
          material={mat}
        >
          <boxGeometry
            args={
              door.axis === 'x'
                ? [0.06, DOOR_HEIGHT, door.width]
                : [door.width, DOOR_HEIGHT, 0.06]
            }
          />
        </mesh>
        {/* knob */}
        <mesh
          position={
            door.axis === 'x'
              ? [0.06, 1.0, door.width * 0.85]
              : [door.width * 0.85, 1.0, 0.06]
          }
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#8a8576" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** physics blocker for closed panel doors (re-rendered on a slow tick) */
function DoorBlockers() {
  // poll door state at ~5 Hz via store-free local state
  const [, force] = useReducerTick();
  return (
    <>
      {DOORS.filter((d) => d.kind === 'door').map((d) => {
        const open = runtime.doorOpen[d.id] ?? (d.startsOpen ? 1 : 0);
        if (open >= 0.5) return null;
        const cx = d.axis === 'x' ? d.fixed : d.at;
        const cz = d.axis === 'x' ? d.at : d.fixed;
        return (
          <RigidBody key={`${d.id}_${force}`} type="fixed" colliders={false}>
            <CuboidCollider
              position={[cx, d.level * LEVEL_Y + DOOR_HEIGHT / 2, cz]}
              args={
                d.axis === 'x'
                  ? [0.05, DOOR_HEIGHT / 2, d.width / 2]
                  : [d.width / 2, DOOR_HEIGHT / 2, 0.05]
              }
            />
          </RigidBody>
        );
      })}
    </>
  );
}

function useReducerTick(): [number, number] {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), 200);
    return () => clearInterval(id);
  }, []);
  return [t, t];
}

// ── floors / ceiling ────────────────────────────────────────────────────────

function Floors() {
  const carpet = useMemo(() => createCarpetTexture(), []);
  const tile = useMemo(() => createTileTexture(), []);
  const wood = useMemo(() => createWoodTexture(), []);
  const mats = useMemo(
    () => ({
      carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }),
      tile: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.4 }),
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }),
    }),
    [carpet, tile, wood],
  );
  const ceilMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: createCeilingTexture(), roughness: 1 }),
    [],
  );

  // visual floor rectangles; upstairs rooms skip the stairwell hole
  const floorRects: { x0: number; z0: number; x1: number; z1: number; y: number; floor: 'carpet' | 'tile' | 'wood' }[] = [];
  for (const r of ROOMS) {
    const y = r.level === 0 ? 0 : LEVEL_Y + 0.002;
    if (r.id === 'upHall') {
      // split around the stairwell hole (x 13.8–15, z 4.69–7.9)
      floorRects.push({ x0: r.x0, z0: r.z0, x1: STAIR_X0, z1: r.z1, y, floor: r.floor });
      floorRects.push({ x0: STAIR_X0, z0: STAIR_HOLE_Z1, x1: r.x1, z1: r.z1, y, floor: r.floor });
      floorRects.push({ x0: STAIR_X0, z0: r.z0, x1: r.x1, z1: STAIR_HOLE_Z0, y, floor: r.floor });
    } else {
      floorRects.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y, floor: r.floor });
    }
  }

  return (
    <RigidBody type="fixed" colliders={false}>
      {floorRects.map((r, i) => (
        <mesh
          key={i}
          position={[(r.x0 + r.x1) / 2, r.y, (r.z0 + r.z1) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={mats[r.floor]}
        >
          <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
        </mesh>
      ))}
      {/* ground collider */}
      <CuboidCollider position={[7.5, -0.25, 6.5]} args={[8, 0.25, 7]} />
      {/* upstairs slab colliders (leave the stairwell hole open) */}
      <CuboidCollider position={[7.5, LEVEL_Y - 0.125, STAIR_HOLE_Z0 / 2]} args={[7.5, 0.125, STAIR_HOLE_Z0 / 2]} />
      <CuboidCollider
        position={[STAIR_X0 / 2, LEVEL_Y - 0.125, (STAIR_HOLE_Z0 + STAIR_HOLE_Z1) / 2]}
        args={[STAIR_X0 / 2, 0.125, (STAIR_HOLE_Z1 - STAIR_HOLE_Z0) / 2]}
      />
      <CuboidCollider
        position={[7.5, LEVEL_Y - 0.125, (STAIR_HOLE_Z1 + 13) / 2]}
        args={[7.5, 0.125, (13 - STAIR_HOLE_Z1) / 2]}
      />
      {/* downstairs ceiling (underside of the slab), hole left open */}
      {[
        { x0: 0, z0: 0, x1: 15, z1: STAIR_HOLE_Z0 },
        { x0: 0, z0: STAIR_HOLE_Z0, x1: STAIR_X0, z1: STAIR_HOLE_Z1 },
        { x0: 0, z0: STAIR_HOLE_Z1, x1: 15, z1: 13 },
      ].map((c, i) => (
        <mesh
          key={`c${i}`}
          position={[(c.x0 + c.x1) / 2, WALL_HEIGHT - 0.001, (c.z0 + c.z1) / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          material={ceilMat}
        >
          <planeGeometry args={[c.x1 - c.x0, c.z1 - c.z0]} />
        </mesh>
      ))}
      {/* upstairs ceiling / roof */}
      <mesh
        position={[7.5, WALL_HEIGHT + LEVEL_Y, 6.5]}
        rotation={[Math.PI / 2, 0, 0]}
        material={ceilMat}
      >
        <planeGeometry args={[15.4, 13.4]} />
      </mesh>
    </RigidBody>
  );
}

// ── staircase ───────────────────────────────────────────────────────────────

function Stairs() {
  const wood = useMemo(() => createWoodTexture(), []);
  const stepMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }), [wood]);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e2218', roughness: 0.85 }), []);

  const run = STAIR_Z_BOTTOM - STAIR_Z_TOP; // 3.6 — stairs descend toward +z
  const STEPS = 14;
  const rise = LEVEL_Y / STEPS;
  const depth = run / STEPS;
  const width = STAIR_X1 - STAIR_X0;
  const cx = (STAIR_X0 + STAIR_X1) / 2;

  const steps = [];
  for (let i = 0; i < STEPS; i++) {
    // step i: top surface at (i+1)*rise, front at z = STAIR_Z_BOTTOM - i*depth
    const z = STAIR_Z_BOTTOM - (i + 0.5) * depth;
    const topY = (i + 1) * rise;
    steps.push({ z, y: topY - 0.04, h: 0.08 });
  }

  // under-stair stringer colliders (walkable ramp handled by PlayerController)
  const stringers = [
    { z0: 5.0, z1: 5.9, top: 2.02 },
    { z0: 5.9, z1: 6.8, top: 1.3 },
    { z0: 6.8, z1: 7.7, top: 0.59 },
  ];

  return (
    <group>
      {steps.map((st, i) => (
        <mesh key={i} position={[cx, st.y, st.z]} material={stepMat}>
          <boxGeometry args={[width, st.h, depth]} />
        </mesh>
      ))}
      {/* closed riser skirt under the steps */}
      <mesh
        position={[cx, LEVEL_Y / 2 - 0.3, (STAIR_Z_TOP + STAIR_Z_BOTTOM) / 2]}
        rotation={[Math.atan2(LEVEL_Y, run), 0, 0]}
        material={darkMat}
      >
        <boxGeometry args={[width, 0.12, Math.hypot(run, LEVEL_Y)]} />
      </mesh>
      {/* banister along the open (west) side of the stairs */}
      <mesh
        position={[STAIR_X0 + 0.04, LEVEL_Y / 2 + 0.62, (STAIR_Z_TOP + STAIR_Z_BOTTOM) / 2]}
        rotation={[Math.atan2(LEVEL_Y, run), 0, 0]}
        material={darkMat}
      >
        <boxGeometry args={[0.07, 0.1, Math.hypot(run, LEVEL_Y) + 0.4]} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {stringers.map((st, i) => (
          <CuboidCollider
            key={i}
            position={[cx, st.top / 2, (st.z0 + st.z1) / 2]}
            args={[width / 2, st.top / 2, (st.z1 - st.z0) / 2]}
          />
        ))}
        {/* banister collider keeps the player from strafing off the open side */}
        <CuboidCollider
          position={[STAIR_X0 + 0.04, LEVEL_Y / 2 + 0.5, (STAIR_Z_TOP + STAIR_Z_BOTTOM) / 2]}
          args={[0.05, LEVEL_Y / 2 + 0.7, run / 2 + 0.2]}
        />
      </RigidBody>
    </group>
  );
}

/** safety railings around the upstairs stairwell opening */
function Railings() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e2218', roughness: 0.85 }), []);
  const rails: { p: [number, number, number]; s: [number, number, number] }[] = [
    // west edge of the hole (gap at z 4.69–5.7 = stair exit)
    { p: [STAIR_X0, LEVEL_Y + 0.45, (5.7 + STAIR_HOLE_Z1) / 2], s: [0.08, 0.9, STAIR_HOLE_Z1 - 5.7] },
    // south edge of the hole
    { p: [(STAIR_X0 + STAIR_X1) / 2, LEVEL_Y + 0.45, STAIR_HOLE_Z1], s: [STAIR_X1 - STAIR_X0, 0.9, 0.08] },
  ];
  return (
    <group>
      {rails.map((r, i) => (
        <group key={i}>
          {/* top rail */}
          <mesh position={[r.p[0], LEVEL_Y + 0.88, r.p[2]]} material={mat}>
            <boxGeometry args={[Math.max(r.s[0], 0.1), 0.08, Math.max(r.s[2], 0.1)]} />
          </mesh>
          {/* balusters as a thin panel */}
          <mesh position={r.p} material={mat}>
            <boxGeometry args={r.s} />
          </mesh>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider position={[r.p[0], LEVEL_Y + 0.5, r.p[2]]} args={[Math.max(r.s[0] / 2, 0.04), 0.5, Math.max(r.s[2] / 2, 0.04)]} />
          </RigidBody>
        </group>
      ))}
    </group>
  );
}

// ── furniture // ── furniture ───────────────────────────────────────────────────────────────

function PartMesh({ part, mats }: { part: Part; mats: Record<MaterialKey, THREE.Material> }) {
  if (part.kind === 'cylinder') {
    return (
      <mesh position={part.p} material={mats[part.m]} rotation={[0, part.rotY ?? 0, 0]}>
        <cylinderGeometry args={[part.s[0], part.s[2] || part.s[0], part.s[1], 12]} />
      </mesh>
    );
  }
  return (
    <mesh position={part.p} material={mats[part.m]} rotation={[0, part.rotY ?? 0, 0]}>
      <boxGeometry args={part.s} />
    </mesh>
  );
}

function Furniture() {
  const mats = useMaterials();
  return (
    <>
      {FURNITURE.map((item) => (
        <group key={item.id}>
          {item.parts.map((p, i) => (
            <PartMesh key={i} part={p} mats={mats} />
          ))}
          {item.colliders.length > 0 && (
            <RigidBody type="fixed" colliders={false}>
              {item.colliders.map((c, i) => (
                <CuboidCollider
                  key={i}
                  position={c.p}
                  args={[c.s[0] / 2, c.s[1] / 2, c.s[2] / 2]}
                />
              ))}
            </RigidBody>
          )}
        </group>
      ))}
    </>
  );
}

// ── windows + lights ────────────────────────────────────────────────────────

function WindowPane({
  position,
  rotY,
  w = 1.5,
  h = 1.3,
}: {
  position: [number, number, number];
  rotY: number;
  w?: number;
  h?: number;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color="#16213e" />
      </mesh>
      {/* moon glow */}
      <mesh position={[0.25, 0.3, -0.001]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#9fb4d8" />
      </mesh>
      {/* frame cross */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[w, 0.05, 0.02]} />
        <meshStandardMaterial color="#241c12" />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.05, h, 0.02]} />
        <meshStandardMaterial color="#241c12" />
      </mesh>
    </group>
  );
}

function Lights() {
  const flashlightOn = useGameStore((s) => s.flashlightOn);
  void flashlightOn; // flashlight itself lives on the camera (PlayerController)
  return (
    <>
      <ambientLight intensity={0.85} color="#3a4565" />
      {/* moonlight through windows */}
      <directionalLight position={[18, 6, 11]} intensity={0.7} color="#8ea2cd" />
      <directionalLight position={[-6, 5, 11]} intensity={0.45} color="#8ea2cd" />
      {/* faint per-room practicals (storage stays dark) */}
      <pointLight position={[12.5, 2.3, 11]} intensity={5.2} distance={7} color="#5a6890" />
      <pointLight position={[2.5, 2.3, 6.5]} intensity={3.6} distance={6.5} color="#564f6a" />
      <pointLight position={[4.5, 2.3, 11]} intensity={4.8} distance={8} color="#5d5a78" />
      <pointLight position={[7.75, 2.3, 6.5]} intensity={3.8} distance={6} color="#4d4a62" />
      <pointLight position={[12.75, 2.3, 4.5]} intensity={4.4} distance={7} color="#4f5a6e" />
      <pointLight position={[7.75, 2.3, 2]} intensity={2.8} distance={5} color="#48505e" />
      {/* fridge seam glow */}
      <pointLight position={[14.1, 0.9, 1.4]} intensity={1.2} distance={2.4} color="#aac6e8" />
      {/* upstairs practicals (study / sewing / junk stay dark) */}
      <pointLight position={[7.75, 5.15, 2.3]} intensity={3.6} distance={6.5} color="#564f6a" />
      <pointLight position={[7.5, 5.15, 6.8]} intensity={4.6} distance={9} color="#5d5a78" />
      <pointLight position={[11.2, 5.15, 11]} intensity={3.4} distance={6} color="#4f5a6e" />
      {/* stairwell glow */}
      <pointLight position={[14.4, 3.4, 6.8]} intensity={2.6} distance={5} color="#5a6890" />
    </>
  );
}

/** The code-locked safe in the storage room — holds the tranquilizer gun. */
function Safe() {
  const safeOpen = useGameStore((s) => s.safeOpen);
  return (
    <group position={[SAFE_POS[0], 0, SAFE_POS[2]]} rotation={[0, Math.PI, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider position={[0, 0.42, 0]} args={[0.3, 0.42, 0.28]} />
      </RigidBody>
      {/* body */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.6, 0.84, 0.56]} />
        <meshStandardMaterial color="#2c3138" roughness={0.4} metalness={0.75} />
      </mesh>
      {/* door (swings open once cracked) */}
      <group position={[-0.28, 0.42, -0.29]} rotation={[0, safeOpen ? -1.9 : 0, 0]}>
        <mesh position={[0.27, 0, 0]}>
          <boxGeometry args={[0.52, 0.76, 0.05]} />
          <meshStandardMaterial color="#23272d" roughness={0.35} metalness={0.8} />
        </mesh>
        {/* keypad */}
        <mesh position={[0.4, 0.12, -0.03]}>
          <boxGeometry args={[0.14, 0.18, 0.02]} />
          <meshStandardMaterial color="#11141a" roughness={0.3} />
        </mesh>
        {/* status light */}
        <mesh position={[0.4, 0.26, -0.035]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color={safeOpen ? '#37d67a' : '#d63737'}
            emissive={safeOpen ? '#37d67a' : '#d63737'}
            emissiveIntensity={1.6}
          />
        </mesh>
        {/* handle */}
        <mesh position={[0.46, -0.08, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
          <meshStandardMaterial color="#8a8576" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
      <pointLight position={[0, 0.95, -0.3]} intensity={0.35} distance={1.6} color={safeOpen ? '#67e8a2' : '#e86767'} />
    </group>
  );
}

export default function House() {
  return (
    <group>
      <Floors />
      <Walls />
      {DOORS.filter((d) => d.kind === 'door').map((d) => (
        <DoorPanel key={d.id} door={d} />
      ))}
      <DoorBlockers />
      <Furniture />
      <Containers />
      <Safe />
      <Stairs />
      <Railings />
      <WindowPane position={[14.98, 1.5, 11]} rotY={-Math.PI / 2} />
      <WindowPane position={[0.02, 1.5, 11]} rotY={Math.PI / 2} />
      <WindowPane position={[0.02, 1.6, 6.2]} rotY={Math.PI / 2} w={1.2} h={1.0} />
      {/* upstairs windows */}
      <WindowPane position={[7.75, 4.35, 0.06]} rotY={0} />
      <WindowPane position={[0.02, 4.35, 11]} rotY={Math.PI / 2} />
      <WindowPane position={[14.98, 4.35, 11]} rotY={-Math.PI / 2} w={1.2} h={1.0} />
      <Lights />
    </group>
  );
}
