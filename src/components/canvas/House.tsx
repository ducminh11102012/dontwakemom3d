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
  ROOMS,
  WALLS,
  type DoorDef,
  type WallDef,
} from '../../game/house';
import { FURNITURE, type MaterialKey, type Part } from '../../game/furnitureData';
import { DOOR_HEIGHT, WALL_HEIGHT, WALL_THICKNESS } from '../../constants';
import { runtime } from '../../game/runtime';
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
  const holes = w.doors
    .map((id) => DOORS.find((d) => d.id === id))
    .filter((d): d is DoorDef => !!d)
    .map((d) => ({ a: d.at - d.width / 2, b: d.at + d.width / 2 }))
    .sort((a, b) => a.a - b.a);
  let cursor = w.from;
  const push = (from: number, to: number, y: number, h: number) => {
    if (to - from < 0.01) return;
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
    push(cursor, hole.a, WALL_HEIGHT / 2, WALL_HEIGHT);
    // lintel above the door
    push(hole.a, hole.b, (WALL_HEIGHT + DOOR_HEIGHT) / 2, WALL_HEIGHT - DOOR_HEIGHT);
    cursor = hole.b;
  }
  push(cursor, w.to, WALL_HEIGHT / 2, WALL_HEIGHT);
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
    <group position={[hinge[0], 0, hinge[1]]}>
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
              position={[cx, DOOR_HEIGHT / 2, cz]}
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
  return (
    <RigidBody type="fixed" colliders={false}>
      {ROOMS.map((r) => {
        const w = r.x1 - r.x0;
        const d = r.z1 - r.z0;
        return (
          <mesh
            key={r.id}
            position={[(r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={mats[r.floor]}
          >
            <planeGeometry args={[w, d]} />
          </mesh>
        );
      })}
      <CuboidCollider position={[7.5, -0.25, 6.5]} args={[8, 0.25, 7]} />
      {/* ceiling */}
      <mesh
        position={[7.5, WALL_HEIGHT, 6.5]}
        rotation={[Math.PI / 2, 0, 0]}
        material={ceilMat}
      >
        <planeGeometry args={[15.4, 13.4]} />
      </mesh>
    </RigidBody>
  );
}

// ── furniture ───────────────────────────────────────────────────────────────

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
      <ambientLight intensity={0.32} color="#26304d" />
      {/* moonlight through windows */}
      <directionalLight position={[18, 6, 11]} intensity={0.35} color="#7e92bd" />
      <directionalLight position={[-6, 5, 11]} intensity={0.2} color="#7e92bd" />
      {/* faint per-room practicals (storage stays dark) */}
      <pointLight position={[12.5, 2.3, 11]} intensity={2.4} distance={7} color="#5a6890" />
      <pointLight position={[2.5, 2.3, 6.5]} intensity={1.6} distance={6.5} color="#564f6a" />
      <pointLight position={[4.5, 2.3, 11]} intensity={2.2} distance={8} color="#5d5a78" />
      <pointLight position={[7.75, 2.3, 6.5]} intensity={1.7} distance={6} color="#4d4a62" />
      <pointLight position={[12.75, 2.3, 4.5]} intensity={2.0} distance={7} color="#4f5a6e" />
      <pointLight position={[7.75, 2.3, 2]} intensity={1.2} distance={5} color="#48505e" />
      {/* fridge seam glow */}
      <pointLight position={[14.1, 0.9, 1.4]} intensity={0.5} distance={2} color="#aac6e8" />
    </>
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
      <WindowPane position={[14.98, 1.5, 11]} rotY={-Math.PI / 2} />
      <WindowPane position={[0.02, 1.5, 11]} rotY={Math.PI / 2} />
      <WindowPane position={[0.02, 1.6, 6.2]} rotY={Math.PI / 2} w={1.2} h={1.0} />
      <Lights />
    </group>
  );
}
