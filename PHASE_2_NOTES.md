# PHASE_2_NOTES

## Direction & coordinate conventions

- **North = -Z, East = +X, South = +Z, West = -X.**
- Grid cell `[row][col]` spans `X ∈ [col*8, col*8+8]`, `Z ∈ [row*8, row*8+8]`
  (CELL_SIZE = 8). Room module `position` prop = the cell's **SW corner**
  `[minX, maxZ]`.
- Doors always open at the wall center (`doorOffset = CELL_SIZE/2 = 4`),
  1.2 m wide × 2.2 m high, with a collidable lintel above.
- **Wall ownership dedup**: every cell renders its own N and W border walls;
  S/E only where no neighbor cell exists. Prevents double walls/z-fighting on
  shared borders (`wallsFor()` in `FloorLayout.tsx`, passed as `walls` prop).

## Actual grid (5×5, ● = void)

```
        col0          col1          col2            col3          col4
row0    ●             breakroom s,e hallway w,e     server w      ●
row1    ●             hallway n,s   ●               ●             ●
row2    cubicle e,s   hallway n,w,e restroom w,s,e  hallway w,e   elevator w
        [SPAWN →E]    [LOOP-IN]
row3    hallway n,s   ●             hallway n,s     ●             ●
row4    cubicle n,e   hallway w,e   hallway n,w,e   hallway w     ●
                                    [LOOP-EXIT]     (dead end)
```

Spawn: world `(4, 0.55, 20)` = center of cell [2][0], facing **East (+X)**
(`SPAWN_YAW = -π/2`).

## Deviations from the brief (spec inconsistencies fixed)

1. **[2][2] restroom: added EAST door** (brief said `w,s`). Without it,
   `[2][3].west` faced a solid wall AND the entire elevator wing
   ([2][3], [2][4]) was unreachable.
2. **[4][2] loop hallway: added NORTH door** (brief said `w,e`).
   `[3][2].south` pointed at a wall otherwise — and this makes [4][2] a
   `n,w,e` T-junction **identical to [2][1]**, exactly what §2.6.3 requires
   for the loop illusion.
3. **Hallway module is an 8×8 cell**, not a literal 3×8 box: the layout needs
   E/W corridors, T-junctions and dead ends, so the 3 m corridor
   (CORRIDOR_WIDTH) is shaped by full-height inner walls inside the standard
   cell. Geometry/texture/light placement is identical across instances
   (single cached texture set; light always dead center, flickering).
4. **Constants live in `src/constants.ts`** (project convention since
   Phase 0); `src/utils/constants.ts` exists as a re-export shim so the
   brief's import path also works.
5. **Light intensities**: three.js ≥ r155 uses physical light units, so the
   brief's `pointLight intensity 1.0` would be near-black. Fixtures use 9
   (flicker dips to 0.9), server-room green light 3.5 — visually matching the
   intended look. Emissive intensities kept as written.
6. Validation logs to the console (`console.error` per mismatch,
   `console.info` on pass) from a `useEffect` in `FloorLayout`, per brief.

## Non-Euclidean loop (§2.6) — exact numbers

- Cells: source **[4][2]** (x ∈ [16,24], z ∈ [32,40], corridor center z = 36),
  target **[2][1]** (x ∈ [8,16], z ∈ [16,24], corridor center z = 20).
- **East sensor** (teleporter): world `(23.4, 1.35, 36)`, half-extents
  `(0.12, 1.3, 1.5)` — spans the full corridor cross-section, 0.6 m before
  the east door. Wrapped in a fixed RigidBody with
  `userData.isLoopTrigger = true`.
- **West sensor** (landing anchor, no handler — also a hook for a future
  reverse loop): world `(8.6, 1.35, 20)`, same size, same userData.
- Trigger condition: intersection by the player body
  (`userData.isPlayer = true`) **while `linvel().x > 0`** (moving east). A
  ref lock suppresses retriggers for 400 ms.
- Sequence: flash starts (CSS animation, 250 ms, opacity 0 → 0.9 → 0 with
  the peak at 32% = **80 ms**); at 80 ms `setTranslation()` runs.
- **Teleport mapping**: `x → LOOP_TARGET_X = 9.2` (0.6 m past the west
  sensor), `z → z - 16` (row-4 corridor center → row-2 corridor center,
  preserving the player's lateral offset), `y` unchanged.
  Effective displacement vector at the sensor plane: **(-14.2, 0, -16)**.
- Yaw/pitch are untouched (they live in `playerLook`, not the body) and the
  camera follows the body — view direction survives the jump seamlessly.
- Visual continuity: [4][2] and [2][1] are identical T-junction hallway
  instances sharing cached textures; [4][3] (dead-end hallway) provides the
  fake "corridor continues east" view through the loop-exit door.

## Procedural textures (§2.1)

- `src/utils/proceduralTextures.ts`, all 256×256 CanvasTextures, cached in a
  module Map (every room shares the same instances), RepeatWrapping, sRGB.
- Walls/floors **clone** the cached texture to set per-surface `repeat`
  (clones share the image — cheap).
- Carpet `#3a3530` + 3000 dots + 6px diagonal weave (repeat 4,4); ceiling
  tiles `#e8e4da` + 64px grid + 2-3 water stains (repeat 1,1); wallpaper
  `#c9c2b4` + 24px vertical stripes + grain (repeat 2,1).

## Performance

- Textures: 3 canvases total for the whole floor.
- Server-room LEDs: one `THREE.InstancedMesh` (28 instances, 1 draw call);
  rack rows are single stretched boxes (4 meshes + 4 colliders).
- Furniture per room = one fixed RigidBody with auto cuboid colliders.
- ~17 point lights total (fixtures) — fine for now; if Phase 3+ profiling
  complains, cull lights by distance/room or bake more into emissives.
- Headless CI runs use SwiftShader (software GL) — FPS there is *not*
  representative; on any real GPU this scene is trivially 60+ FPS
  (≈90 meshes, 3 textures, 1 instanced mesh). PHASE_3_TODO: add an FPS
  counter (leva/stats) for an in-browser measurement.

## What Phase 3 should expect

- Replace-me hooks: `LAYOUT` in
  `src/components/canvas/Level/layoutData.ts` is the single source of truth
  for the floor; `validateLayout()` is exported for tests.
- The old Phase 1 test room lives in `src/components/_archive/` (unused).
- `useGameStore.loopFlashId` + `triggerLoopFlash()` drive the white-flash
  overlay in `App.tsx` (CSS `loop-flash` animation) — reusable for other
  teleport/scare effects.
- Player body carries `userData.isPlayer` — use it for any future sensor.
