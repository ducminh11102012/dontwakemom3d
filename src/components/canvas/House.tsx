/**
 * House.tsx — renders the entire house: floors, ceiling, walls (with door
 * holes + lintels), animated door panels, furniture, fixtures and lights.
 * All static geometry carries fixed rapier colliders.
 *
 * v2: Granny-style polish — baseboards, door frames, crown molding,
 * wainscoting, better windows, atmospheric lighting.
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
  createBaseboardTexture,
  createCarpetTexture,
  createCeilingTexture,
  createDoorFrameTexture,
  createFabricTexture,
  createTileTexture,
  createWallTexture,
  createWoodTexture,
} from '../../utils/proceduralTextures';

// ── Trim dimensions ─────────────────────────────────────────────────────────
const BASEBOARD_H = 0.12;
const BASEBOARD_D = 0.03;
const CROWN_H = 0.06;
const CROWN_D = 0.04;
const DOOR_FRAME_W = 0.08; // width of frame trim

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
  const base = w.level === 0 ? 0 : WALL_HEIGHT;
  const top = w.level === 0 ? WALL_HEIGHT : WALL_HEIGHT + LEVEL_Y;
  const doorBase = w.level * LEVEL_Y;
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
    push(hole.a, hole.b, (base + doorBase) / 2, doorBase - base);
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
    () => new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 }),
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
            receiveShadow
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

// ── baseboards ──────────────────────────────────────────────────────────────

/** Dark wood baseboards along the bottom of every wall segment */
function Baseboards() {
  const bbTex = useMemo(() => createBaseboardTexture(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: bbTex, roughness: 0.85 }),
    [bbTex],
  );

  // generate baseboard strips from wall segments, skipping door openings
  const strips = useMemo(() => {
    const result: {
      pos: [number, number, number];
      size: [number, number, number];
    }[] = [];

    for (const w of WALLS) {
      const floorY = w.level * LEVEL_Y;
      const holes = w.doors
        .map((id) => DOORS.find((d) => d.id === id))
        .filter((d): d is DoorDef => !!d)
        .map((d) => ({ a: d.at - d.width / 2, b: d.at + d.width / 2 }))
        .sort((a, b) => a.a - b.a);

      let cursor = w.from;
      const addStrip = (from: number, to: number) => {
        if (to - from < 0.05) return;
        const mid = (from + to) / 2;
        const len = to - from;
        const offset = WALL_THICKNESS / 2 + BASEBOARD_D / 2;
        if (w.axis === 'x') {
          // wall runs along Z at fixed X — baseboards on both sides
          result.push({
            pos: [w.fixed + offset, floorY + BASEBOARD_H / 2, mid],
            size: [BASEBOARD_D, BASEBOARD_H, len],
          });
          result.push({
            pos: [w.fixed - offset, floorY + BASEBOARD_H / 2, mid],
            size: [BASEBOARD_D, BASEBOARD_H, len],
          });
        } else {
          // wall runs along X at fixed Z
          result.push({
            pos: [mid, floorY + BASEBOARD_H / 2, w.fixed + offset],
            size: [len, BASEBOARD_H, BASEBOARD_D],
          });
          result.push({
            pos: [mid, floorY + BASEBOARD_H / 2, w.fixed - offset],
            size: [len, BASEBOARD_H, BASEBOARD_D],
          });
        }
      };

      for (const hole of holes) {
        addStrip(cursor, hole.a);
        cursor = hole.b;
      }
      addStrip(cursor, w.to);
    }
    return result;
  }, []);

  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} position={s.pos} material={mat}>
          <boxGeometry args={s.size} />
        </mesh>
      ))}
    </group>
  );
}

// ── crown molding ───────────────────────────────────────────────────────────

/** Subtle crown molding at ceiling-wall junction */
function CrownMolding() {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#352a20', roughness: 0.85 }),
    [],
  );

  const strips = useMemo(() => {
    const result: {
      pos: [number, number, number];
      size: [number, number, number];
    }[] = [];

    for (const w of WALLS) {
      const ceilY = w.level === 0 ? WALL_HEIGHT : WALL_HEIGHT + LEVEL_Y;
      // only add crown below the ceiling, not at door holes
      const holes = w.doors
        .map((id) => DOORS.find((d) => d.id === id))
        .filter((d): d is DoorDef => !!d)
        .map((d) => ({ a: d.at - d.width / 2, b: d.at + d.width / 2 }))
        .sort((a, b) => a.a - b.a);

      let cursor = w.from;
      const addStrip = (from: number, to: number) => {
        if (to - from < 0.05) return;
        const mid = (from + to) / 2;
        const len = to - from;
        const offset = WALL_THICKNESS / 2 + CROWN_D / 2;
        if (w.axis === 'x') {
          result.push({
            pos: [w.fixed + offset, ceilY - CROWN_H / 2, mid],
            size: [CROWN_D, CROWN_H, len],
          });
          result.push({
            pos: [w.fixed - offset, ceilY - CROWN_H / 2, mid],
            size: [CROWN_D, CROWN_H, len],
          });
        } else {
          result.push({
            pos: [mid, ceilY - CROWN_H / 2, w.fixed + offset],
            size: [len, CROWN_H, CROWN_D],
          });
          result.push({
            pos: [mid, ceilY - CROWN_H / 2, w.fixed - offset],
            size: [len, CROWN_H, CROWN_D],
          });
        }
      };

      for (const hole of holes) {
        addStrip(cursor, hole.a);
        cursor = hole.b;
      }
      addStrip(cursor, w.to);
    }
    return result;
  }, []);

  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} position={s.pos} material={mat}>
          <boxGeometry args={s.size} />
        </mesh>
      ))}
    </group>
  );
}

// ── door frames ─────────────────────────────────────────────────────────────

/** Wooden trim around each doorway */
function DoorFrames() {
  const frameTex = useMemo(() => createDoorFrameTexture(), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: frameTex, roughness: 0.8 }),
    [frameTex],
  );

  const frames = useMemo(() => {
    const result: {
      pos: [number, number, number];
      size: [number, number, number];
    }[] = [];

    for (const d of DOORS) {
      const floorY = d.level * LEVEL_Y;
      const halfW = d.width / 2;
      const offset = WALL_THICKNESS / 2 + 0.005; // just proud of the wall

      if (d.axis === 'x') {
        // wall at fixed X, door spans along Z
        // left jamb
        result.push({
          pos: [d.fixed + offset, floorY + DOOR_HEIGHT / 2, d.at - halfW - DOOR_FRAME_W / 2],
          size: [0.025, DOOR_HEIGHT, DOOR_FRAME_W],
        });
        result.push({
          pos: [d.fixed - offset, floorY + DOOR_HEIGHT / 2, d.at - halfW - DOOR_FRAME_W / 2],
          size: [0.025, DOOR_HEIGHT, DOOR_FRAME_W],
        });
        // right jamb
        result.push({
          pos: [d.fixed + offset, floorY + DOOR_HEIGHT / 2, d.at + halfW + DOOR_FRAME_W / 2],
          size: [0.025, DOOR_HEIGHT, DOOR_FRAME_W],
        });
        result.push({
          pos: [d.fixed - offset, floorY + DOOR_HEIGHT / 2, d.at + halfW + DOOR_FRAME_W / 2],
          size: [0.025, DOOR_HEIGHT, DOOR_FRAME_W],
        });
        // header
        result.push({
          pos: [d.fixed + offset, floorY + DOOR_HEIGHT + DOOR_FRAME_W / 2, d.at],
          size: [0.025, DOOR_FRAME_W, d.width + DOOR_FRAME_W * 2],
        });
        result.push({
          pos: [d.fixed - offset, floorY + DOOR_HEIGHT + DOOR_FRAME_W / 2, d.at],
          size: [0.025, DOOR_FRAME_W, d.width + DOOR_FRAME_W * 2],
        });
      } else {
        // wall at fixed Z, door spans along X
        // left jamb
        result.push({
          pos: [d.at - halfW - DOOR_FRAME_W / 2, floorY + DOOR_HEIGHT / 2, d.fixed + offset],
          size: [DOOR_FRAME_W, DOOR_HEIGHT, 0.025],
        });
        result.push({
          pos: [d.at - halfW - DOOR_FRAME_W / 2, floorY + DOOR_HEIGHT / 2, d.fixed - offset],
          size: [DOOR_FRAME_W, DOOR_HEIGHT, 0.025],
        });
        // right jamb
        result.push({
          pos: [d.at + halfW + DOOR_FRAME_W / 2, floorY + DOOR_HEIGHT / 2, d.fixed + offset],
          size: [DOOR_FRAME_W, DOOR_HEIGHT, 0.025],
        });
        result.push({
          pos: [d.at + halfW + DOOR_FRAME_W / 2, floorY + DOOR_HEIGHT / 2, d.fixed - offset],
          size: [DOOR_FRAME_W, DOOR_HEIGHT, 0.025],
        });
        // header
        result.push({
          pos: [d.at, floorY + DOOR_HEIGHT + DOOR_FRAME_W / 2, d.fixed + offset],
          size: [d.width + DOOR_FRAME_W * 2, DOOR_FRAME_W, 0.025],
        });
        result.push({
          pos: [d.at, floorY + DOOR_HEIGHT + DOOR_FRAME_W / 2, d.fixed - offset],
          size: [d.width + DOOR_FRAME_W * 2, DOOR_FRAME_W, 0.025],
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {frames.map((f, i) => (
        <mesh key={i} position={f.pos} material={mat}>
          <boxGeometry args={f.size} />
        </mesh>
      ))}
    </group>
  );
}

// ── door panels ─────────────────────────────────────────────────────────────

function DoorPanel({ door }: { door: DoorDef }) {
  const pivot = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3b2c1d', roughness: 0.8 }),
    [],
  );
  const panelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#33261a', roughness: 0.85 }),
    [],
  );
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
  const dw = door.width;
  const dh = DOOR_HEIGHT;
  // panel inset dimensions
  const pw = dw * 0.35;
  const topPanelH = dh * 0.28;
  const botPanelH = dh * 0.32;
  const panelD = 0.015;
  const panelOff = 0.032; // slightly proud of door face

  return (
    <group position={[hinge[0], door.level * LEVEL_Y, hinge[1]]}>
      <group ref={pivot} rotation={[0, open > 0.5 ? Math.PI / 2 : 0, 0]}>
        {/* main door slab */}
        <mesh
          position={
            door.axis === 'x'
              ? [0, dh / 2, dw / 2]
              : [dw / 2, dh / 2, 0]
          }
          material={mat}
        >
          <boxGeometry
            args={
              door.axis === 'x'
                ? [0.06, dh, dw]
                : [dw, dh, 0.06]
            }
          />
        </mesh>
        {/* raised panel details (both sides) */}
        {door.axis === 'x' ? (
          <>
            {/* front panels */}
            <mesh position={[panelOff, dh * 0.66, dw / 2]} material={panelMat}>
              <boxGeometry args={[panelD, topPanelH, pw]} />
            </mesh>
            <mesh position={[panelOff, dh * 0.28, dw / 2]} material={panelMat}>
              <boxGeometry args={[panelD, botPanelH, pw]} />
            </mesh>
            {/* back panels */}
            <mesh position={[-panelOff, dh * 0.66, dw / 2]} material={panelMat}>
              <boxGeometry args={[panelD, topPanelH, pw]} />
            </mesh>
            <mesh position={[-panelOff, dh * 0.28, dw / 2]} material={panelMat}>
              <boxGeometry args={[panelD, botPanelH, pw]} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[dw / 2, dh * 0.66, panelOff]} material={panelMat}>
              <boxGeometry args={[pw, topPanelH, panelD]} />
            </mesh>
            <mesh position={[dw / 2, dh * 0.28, panelOff]} material={panelMat}>
              <boxGeometry args={[pw, botPanelH, panelD]} />
            </mesh>
            <mesh position={[dw / 2, dh * 0.66, -panelOff]} material={panelMat}>
              <boxGeometry args={[pw, topPanelH, panelD]} />
            </mesh>
            <mesh position={[dw / 2, dh * 0.28, -panelOff]} material={panelMat}>
              <boxGeometry args={[pw, botPanelH, panelD]} />
            </mesh>
          </>
        )}
        {/* knob */}
        <mesh
          position={
            door.axis === 'x'
              ? [0.06, 1.0, dw * 0.85]
              : [dw * 0.85, 1.0, 0.06]
          }
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#8a8576" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* knob backplate */}
        <mesh
          position={
            door.axis === 'x'
              ? [0.04, 1.0, dw * 0.85]
              : [dw * 0.85, 1.0, 0.04]
          }
        >
          <cylinderGeometry args={[0.03, 0.03, 0.01, 12]} />
          <meshStandardMaterial color="#706858" metalness={0.7} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

/** physics blocker for closed panel doors */
function DoorBlockers() {
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

  const floorRects: { x0: number; z0: number; x1: number; z1: number; y: number; floor: 'carpet' | 'tile' | 'wood' }[] = [];
  for (const r of ROOMS) {
    const y = r.level === 0 ? 0 : LEVEL_Y + 0.002;
    if (r.id === 'upHall') {
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
          receiveShadow
        >
          <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
        </mesh>
      ))}
      {/* ground collider */}
      <CuboidCollider position={[7.5, -0.25, 6.5]} args={[8, 0.25, 7]} />
      {/* upstairs slab colliders */}
      <CuboidCollider position={[7.5, LEVEL_Y - 0.125, STAIR_HOLE_Z0 / 2]} args={[7.5, 0.125, STAIR_HOLE_Z0 / 2]} />
      <CuboidCollider
        position={[STAIR_X0 / 2, LEVEL_Y - 0.125, (STAIR_HOLE_Z0 + STAIR_HOLE_Z1) / 2]}
        args={[STAIR_X0 / 2, 0.125, (STAIR_HOLE_Z1 - STAIR_HOLE_Z0) / 2]}
      />
      <CuboidCollider
        position={[7.5, LEVEL_Y - 0.125, (STAIR_HOLE_Z1 + 13) / 2]}
        args={[7.5, 0.125, (13 - STAIR_HOLE_Z1) / 2]}
      />
      {/* downstairs ceiling */}
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
  const riserMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#261c12', roughness: 0.9 }), []);

  const run = STAIR_Z_BOTTOM - STAIR_Z_TOP;
  const STEPS = 14;
  const rise = LEVEL_Y / STEPS;
  const depth = run / STEPS;
  const width = STAIR_X1 - STAIR_X0;
  const cx = (STAIR_X0 + STAIR_X1) / 2;

  const steps = [];
  for (let i = 0; i < STEPS; i++) {
    const z = STAIR_Z_BOTTOM - (i + 0.5) * depth;
    const topY = (i + 1) * rise;
    steps.push({ z, y: topY - 0.04, h: 0.08, riserY: topY - rise / 2 });
  }

  const BAN_Z0 = 5.75;
  const BAN_Z1 = STAIR_Z_BOTTOM + 0.15;
  const banCz = (BAN_Z0 + BAN_Z1) / 2;
  const banLen = ((BAN_Z1 - BAN_Z0) / run) * Math.hypot(run, LEVEL_Y);
  const rampYAt = (z: number) => ((STAIR_Z_BOTTOM - z) / run) * LEVEL_Y;

  const stringers = [
    { z0: 5.0, z1: 6.0, top: 1.78 },
    { z0: 6.0, z1: 7.0, top: 0.83 },
    { z0: 7.0, z1: 7.6, top: 0.26 },
  ];

  return (
    <group>
      {steps.map((st, i) => (
        <group key={i}>
          {/* tread */}
          <mesh position={[cx, st.y, st.z]} material={stepMat}>
            <boxGeometry args={[width, st.h, depth]} />
          </mesh>
          {/* riser (vertical face) */}
          {i > 0 && (
            <mesh position={[cx, st.riserY, st.z + depth / 2]} material={riserMat}>
              <boxGeometry args={[width - 0.02, rise - st.h, 0.02]} />
            </mesh>
          )}
          {/* nosing (slight overhang) */}
          <mesh position={[cx, st.y + 0.04, st.z + depth / 2 + 0.015]} material={darkMat}>
            <boxGeometry args={[width, 0.02, 0.03]} />
          </mesh>
        </group>
      ))}
      {/* closed riser skirt */}
      <mesh
        position={[cx, LEVEL_Y / 2 - 0.3, (STAIR_Z_TOP + STAIR_Z_BOTTOM) / 2]}
        rotation={[Math.atan2(LEVEL_Y, run), 0, 0]}
        material={darkMat}
      >
        <boxGeometry args={[width, 0.12, Math.hypot(run, LEVEL_Y)]} />
      </mesh>
      {/* stringer along east wall */}
      <mesh
        position={[STAIR_X1 - 0.04, rampYAt(banCz) + 0.62, banCz]}
        rotation={[Math.atan2(LEVEL_Y, run), 0, 0]}
        material={darkMat}
      >
        <boxGeometry args={[0.06, 0.1, banLen]} />
      </mesh>
      {/* banister along the open (west) side */}
      <mesh
        position={[STAIR_X0 + 0.04, rampYAt(banCz) + 0.62, banCz]}
        rotation={[Math.atan2(LEVEL_Y, run), 0, 0]}
        material={darkMat}
      >
        <boxGeometry args={[0.07, 0.1, banLen]} />
      </mesh>
      {/* banister balusters (vertical posts) */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = (i + 0.5) / 6;
        const z = BAN_Z0 + t * (BAN_Z1 - BAN_Z0);
        const y = rampYAt(z);
        return (
          <mesh key={`bal${i}`} position={[STAIR_X0 + 0.04, y + 0.3, z]} material={darkMat}>
            <boxGeometry args={[0.04, 0.6, 0.04]} />
          </mesh>
        );
      })}
      <RigidBody type="fixed" colliders={false}>
        {stringers.map((st, i) => (
          <CuboidCollider
            key={i}
            position={[cx, st.top / 2, (st.z0 + st.z1) / 2]}
            args={[width / 2, st.top / 2, (st.z1 - st.z0) / 2]}
          />
        ))}
        <CuboidCollider
          position={[STAIR_X0 + 0.04, rampYAt(banCz) + 0.5, banCz]}
          args={[0.05, LEVEL_Y / 2 + 0.7, (BAN_Z1 - BAN_Z0) / 2]}
        />
      </RigidBody>
    </group>
  );
}

/** safety railings around the upstairs stairwell opening */
function Railings() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e2218', roughness: 0.85 }), []);
  const rails: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [STAIR_X0, LEVEL_Y + 0.45, (5.7 + STAIR_HOLE_Z1) / 2], s: [0.08, 0.9, STAIR_HOLE_Z1 - 5.7] },
    { p: [(STAIR_X0 + STAIR_X1) / 2, LEVEL_Y + 0.45, STAIR_HOLE_Z1], s: [STAIR_X1 - STAIR_X0, 0.9, 0.08] },
  ];
  return (
    <group>
      {rails.map((r, i) => (
        <group key={i}>
          <mesh position={[r.p[0], LEVEL_Y + 0.88, r.p[2]]} material={mat}>
            <boxGeometry args={[Math.max(r.s[0], 0.1), 0.08, Math.max(r.s[2], 0.1)]} />
          </mesh>
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

// ── furniture ───────────────────────────────────────────────────────────────

function PartMesh({ part, mats }: { part: Part; mats: Record<MaterialKey, THREE.Material> }) {
  const ref = useRef<THREE.Mesh>(null);

  // hide the part when the associated search-spot is being opened
  useFrame(() => {
    if (part.hideForSpot && ref.current) {
      const a = runtime.spotAnim[part.hideForSpot] ?? 0;
      ref.current.visible = a < 0.01;
    }
  });

  if (part.kind === 'cylinder') {
    return (
      <mesh ref={ref} position={part.p} material={mats[part.m]} rotation={[0, part.rotY ?? 0, 0]}>
        <cylinderGeometry args={[part.s[0], part.s[2] || part.s[0], part.s[1], 12]} />
      </mesh>
    );
  }
  return (
    <mesh ref={ref} position={part.p} material={mats[part.m]} rotation={[0, part.rotY ?? 0, 0]}>
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
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c1408', roughness: 0.85 }), []);
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0a1528',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  }), []);
  const moonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#b0c8e8' }), []);

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* outer frame */}
      <mesh position={[0, 0, -0.01]} material={frameMat}>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.04]} />
      </mesh>
      {/* glass */}
      <mesh material={glassMat}>
        <planeGeometry args={[w - 0.06, h - 0.06]} />
      </mesh>
      {/* night sky background */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[w - 0.06, h - 0.06]} />
        <meshBasicMaterial color="#0a1225" />
      </mesh>
      {/* moon */}
      <mesh position={[0.25, 0.3, -0.003]}>
        <circleGeometry args={[0.14, 16]} />
        {moonMat && <primitive object={moonMat} attach="material" />}
      </mesh>
      {/* moon glow */}
      <mesh position={[0.25, 0.3, -0.004]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#2a3a5a" transparent opacity={0.3} />
      </mesh>
      {/* frame cross */}
      <mesh position={[0, 0, 0.01]} material={frameMat}>
        <boxGeometry args={[w, 0.04, 0.02]} />
      </mesh>
      <mesh position={[0, 0, 0.01]} material={frameMat}>
        <boxGeometry args={[0.04, h, 0.02]} />
      </mesh>
      {/* window sill */}
      <mesh position={[0, -h / 2 - 0.03, 0.04]} material={frameMat}>
        <boxGeometry args={[w + 0.14, 0.04, 0.1]} />
      </mesh>
      {/* moonlight spill (faint glow into the room) */}
      <pointLight
        position={[0, 0, 0.5]}
        intensity={1.2}
        distance={3.5}
        color="#6a82b0"
        decay={2}
      />
    </group>
  );
}

function Lights() {
  const flashlightOn = useGameStore((s) => s.flashlightOn);
  void flashlightOn;
  return (
    <>
      {/* very low ambient — the house should feel dark */}
      <ambientLight intensity={0.45} color="#2a3045" />

      {/* primary moonlight (cold, directional) */}
      <directionalLight position={[18, 8, 11]} intensity={0.5} color="#7a92c0" />
      <directionalLight position={[-6, 6, 11]} intensity={0.3} color="#7a92c0" />

      {/* ── Ground floor practicals ── */}
      {/* Kitchen — cold fluorescent feel */}
      <pointLight position={[12.5, 2.3, 4.5]} intensity={3.0} distance={6} color="#4a5a70" decay={2} />
      <pointLight position={[12.5, 2.3, 1.5]} intensity={2.5} distance={5} color="#4a5a70" decay={2} />

      {/* Hallway — dim warm */}
      <pointLight position={[7.75, 2.3, 6.5]} intensity={2.5} distance={5.5} color="#5a4a3a" decay={2} />

      {/* Living room — warm but dim */}
      <pointLight position={[4.5, 2.3, 11]} intensity={3.5} distance={7} color="#5a4840" decay={2} />

      {/* Mom's bedroom — barely any light */}
      <pointLight position={[2.5, 2.3, 6.5]} intensity={1.2} distance={4} color="#3a3548" decay={2} />

      {/* Bathroom — cold */}
      <pointLight position={[7.75, 2.3, 2]} intensity={1.8} distance={4.5} color="#4a5a68" decay={2} />

      {/* Player bedroom — faint blue */}
      <pointLight position={[12.5, 2.3, 11]} intensity={2.2} distance={5} color="#3a4a5a" decay={2} />

      {/* Storage — very dark, only crack of light */}
      <pointLight position={[2.5, 1.5, 2]} intensity={0.6} distance={3} color="#3a3530" decay={2} />

      {/* Fridge seam glow */}
      <pointLight position={[14.1, 0.9, 1.4]} intensity={1.5} distance={2.0} color="#90b4d8" decay={2} />

      {/* ── Upstairs practicals ── */}
      {/* Guest bedroom */}
      <pointLight position={[7.75, 5.15, 2.3]} intensity={2.2} distance={5.5} color="#4a4558" decay={2} />

      {/* Hallway */}
      <pointLight position={[7.5, 5.15, 6.8]} intensity={3.0} distance={7} color="#5a4a3a" decay={2} />

      {/* Laundry */}
      <pointLight position={[11.2, 5.15, 11]} intensity={2.0} distance={5} color="#4a5560" decay={2} />

      {/* Stairwell — eerie glow */}
      <pointLight position={[14.4, 3.4, 6.8]} intensity={1.8} distance={4.5} color="#4a5870" decay={2} />

      {/* CCTV Room — eerie green monitor glow */}
      <pointLight position={[2.5, 5.15, 1.2]} intensity={2.5} distance={4.5} color="#1a4a2a" decay={2} />
      <pointLight position={[2.5, 3.85, 0.5]} intensity={1.8} distance={3.0} color="#2a6a3a" decay={2} />

      {/* Sewing — dark */}
      <pointLight position={[12.75, 5.15, 2.3]} intensity={0.8} distance={3.5} color="#3a3530" decay={2} />

      {/* Junk — very dark */}
      <pointLight position={[3.5, 5.15, 11]} intensity={0.5} distance={3} color="#2a2520" decay={2} />
    </>
  );
}

/** The code-locked safe in the storage room */
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
      {/* door */}
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

// ── light switches ──────────────────────────────────────────────────────────

/** Small visual-only light switch plates on walls near doors */
function LightSwitches() {
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8c0b0', roughness: 0.6 }), []);
  const switchMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8b0a0', roughness: 0.5 }), []);

  // place a switch near certain doors
  const switches: { pos: [number, number, number]; rotY: number }[] = [
    // hallway near mom's door
    { pos: [5.12, 1.2, 5.6], rotY: 0 },
    // hallway near living room arch
    { pos: [6.2, 1.2, 8.88], rotY: Math.PI / 2 },
    // kitchen
    { pos: [10.38, 1.2, 5.8], rotY: Math.PI },
    // player room
    { pos: [10.2, 1.2, 9.12], rotY: -Math.PI / 2 },
    // bathroom
    { pos: [8.5, 1.2, 3.88], rotY: Math.PI / 2 },
    // upstairs hallway
    { pos: [3.2, 1.2 + LEVEL_Y, 4.48], rotY: Math.PI / 2 },
    { pos: [8.5, 1.2 + LEVEL_Y, 4.48], rotY: Math.PI / 2 },
  ];

  return (
    <group>
      {switches.map((sw, i) => (
        <group key={i} position={sw.pos} rotation={[0, sw.rotY, 0]}>
          {/* plate */}
          <mesh material={plateMat}>
            <boxGeometry args={[0.07, 0.11, 0.01]} />
          </mesh>
          {/* toggle */}
          <mesh position={[0, 0.01, 0.006]} material={switchMat}>
            <boxGeometry args={[0.025, 0.04, 0.012]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── electrical outlet plates ────────────────────────────────────────────────

function Outlets() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8c0b0', roughness: 0.6 }), []);

  const outlets: { pos: [number, number, number]; rotY: number }[] = [
    { pos: [0.12, 0.35, 5.5], rotY: 0 },
    { pos: [0.12, 0.35, 11.5], rotY: 0 },
    { pos: [14.88, 0.35, 3.0], rotY: Math.PI },
    { pos: [11.0, 0.35, 12.88], rotY: -Math.PI / 2 },
    { pos: [2.0, 0.35, 8.88], rotY: Math.PI / 2 },
    // upstairs
    { pos: [0.12, 0.35 + LEVEL_Y, 6.0], rotY: 0 },
    { pos: [14.88, 0.35 + LEVEL_Y, 11.5], rotY: Math.PI },
  ];

  return (
    <group>
      {outlets.map((o, i) => (
        <group key={i} position={o.pos} rotation={[0, o.rotY, 0]}>
          <mesh material={mat}>
            <boxGeometry args={[0.05, 0.07, 0.008]} />
          </mesh>
          {/* socket holes */}
          <mesh position={[0, 0.012, 0.005]}>
            <boxGeometry args={[0.008, 0.018, 0.004]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, -0.012, 0.005]}>
            <boxGeometry args={[0.008, 0.018, 0.004]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── CCTV monitor glow (emissive screens) ────────────────────────────────────

function CCTVMonitorGlow() {
  const ref = useRef<THREE.Group>(null);
  // Animate a subtle flicker
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const flicker = 0.7 + 0.3 * Math.sin(t * 2.3) * Math.sin(t * 5.7);
    ref.current.children.forEach((c) => {
      if (c instanceof THREE.Mesh && c.material) {
        (c.material as THREE.MeshStandardMaterial).emissiveIntensity = flicker;
      }
    });
  });

  const monitorScreens = [
    { p: [1.2, 4.1, 0.38] as [number, number, number], s: [0.88, 0.58] as [number, number] },   // left
    { p: [2.5, 4.15, 0.35] as [number, number, number], s: [1.02, 0.68] as [number, number] },  // center
    { p: [3.8, 4.1, 0.38] as [number, number, number], s: [0.88, 0.58] as [number, number] },   // right
  ];

  return (
    <group ref={ref}>
      {monitorScreens.map((m, i) => (
        <mesh key={i} position={m.p}>
          <planeGeometry args={m.s} />
          <meshStandardMaterial
            color="#0a2a12"
            emissive="#1a5a2a"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>
      ))}
      {/* server rack LEDs */}
      <mesh position={[0.87, 4.35, 2.2]}>
        <boxGeometry args={[0.01, 0.06, 0.5]} />
        <meshStandardMaterial color="#0a3a0a" emissive="#2aaa3a" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.87, 4.05, 2.2]}>
        <boxGeometry args={[0.01, 0.06, 0.5]} />
        <meshStandardMaterial color="#3a0a0a" emissive="#aa2a2a" emissiveIntensity={1.2} />
      </mesh>
      {/* DVR recording LED */}
      <mesh position={[4.57, 3.9, 3.23]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff2020" emissiveIntensity={2.0} />
      </mesh>
    </group>
  );
}

// ── main export ─────────────────────────────────────────────────────────────

export default function House() {
  return (
    <group>
      <Floors />
      <Walls />
      <Baseboards />
      <CrownMolding />
      <DoorFrames />
      {DOORS.filter((d) => d.kind === 'door').map((d) => (
        <DoorPanel key={d.id} door={d} />
      ))}
      <DoorBlockers />
      <Furniture />
      <Containers />
      <Safe />
      <Stairs />
      <Railings />
      <LightSwitches />
      <Outlets />
      {/* Downstairs windows */}
      <WindowPane position={[14.98, 1.5, 11]} rotY={-Math.PI / 2} />
      <WindowPane position={[0.02, 1.5, 11]} rotY={Math.PI / 2} />
      <WindowPane position={[0.02, 1.6, 6.2]} rotY={Math.PI / 2} w={1.2} h={1.0} />
      {/* Upstairs windows */}
      <WindowPane position={[7.75, 4.35, 0.06]} rotY={0} />
      <WindowPane position={[0.02, 4.35, 11]} rotY={Math.PI / 2} />
      <WindowPane position={[14.98, 4.35, 11]} rotY={-Math.PI / 2} w={1.2} h={1.0} />
      <Lights />
      <CCTVMonitorGlow />
    </group>
  );
}
