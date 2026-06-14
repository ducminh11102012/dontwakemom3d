# DON'T WAKE MOM (3D)

A first-person 3D stealth horror-comedy built with **Three.js** (React Three Fiber + Rapier).

> 2:07 AM. Mom confiscated your phone at dinner. It's somewhere in the house.
> Find it. Reply to Mina. Put it back. Get to bed. **DON'T. WAKE. MOM.**

**▶ Play: https://ducminh11102012.github.io/dontwakemom3d/**

## Features

### The House
- **Two-story house** (15 × 13 m) with 13 rooms across 2 floors
  - **Ground floor (7 rooms):** Player Bedroom, Living Room, Kitchen, Hallway, Mom's Bedroom, Bathroom, Storage Room
  - **Upstairs (6 rooms):** Security Room, Guest Bedroom, Sewing Room, Upstairs Hallway, Junk Room, Laundry Room
- Staircase connecting Kitchen ↔ Upstairs Hallway
- Doors (some lockable, Mom's door *always* creaks), archways, fully procedural textures
- Granny-style visual upgrade: baseboards, door frames, crown molding, wainscoting

### Mom AI
- **9 behavioral states:** Sleep → Fake Sleep → Patrol → Investigate → Search → Chase → Return → Tranquilized → Finale
- Roams both floors; patrols upstairs rooms too
- Fake sleep mechanic (20% normal / 35% hard): she lies down, goes silent, and waits
- Doorway pause: randomly stops in doorways for 5–10 seconds
- Memory system (Hard Mode): remembers where noises came from
- Positional audio: broom taps reveal her location — until they stop

### CCTV Security Cameras
- **Security Room upstairs** (former Study) with a 6-screen monitor bank
- **5 live camera feeds** — real render-to-texture views of the house (Hallway, Living Room, Kitchen/stairs, Mom's Room, Upstairs Hallway)
- Mom appears on a monitor whenever she walks into a camera's view — but coverage is **deliberately incomplete**: narrow corner-mounted lenses, blind corners (behind the sofa, under beds), and most rooms have no camera at all
- Chunky low-fps "security cam" refresh; the 6th screen reads **NO SIGNAL**
- Physical cameras with red LEDs are mounted in the watched rooms

### Gameplay Systems
- Sound propagation per floor type (carpet / tile / wood), wall attenuation
- Stress system (0–100): heartbeat, vignette, panic at 100; hold breath (B) to calm down
- Stamina system: sprinting drains, stumbling at 0 triggers loud breathing
- Flashlight: see in the dark, but Mom can spot the beam

### Granny-Style Item Loop
- **Phone hunt:** tiered hiding spots (Tier 1 high-risk near Mom, Tier 2–3 spread across both floors) + fake buzz spots
- **Brass key** → unlocks the Storage Room
- **Safe code note** → 4-digit code for the lockbox
- **Tranquilizer gun** (in the safe) + spare dart — knock Mom out for 25 seconds
- Items randomized every run

### Physical Container Search
- **53 searchable containers** across both floors (drawers, wardrobes, cabinets, boxes…)
- Drawers slide out, doors swing open — loot visible inside
- Each container class has its own search duration and noise level
- **11 hiding spots** across both floors (beds, wardrobes, behind furniture, dust sheets, clothes piles)

### Acts & Endings
- **Act 1 — The Search:** find the phone (Mom may be sleeping… or not)
- **Act 2 — The Reply:** 5-second window to reply; phone vibrates on send
- **Act 3 — The Escape:** 10-second scramble to return the phone and get to bed
- **4 endings:** Good Night, Coward, Caught (jumpscare), The Waiting Kind (secret — hide under Mom's bed)

### Map & UI
- **Dual floor map** always visible (Easy/Normal): both Floor 1 and Floor 2 displayed side by side — no switching needed
- Player dot + direction indicator; Mom dot (color-coded by state)
- No map on Hard — audio cues and memory only
- 3 difficulties: Easy (explore), Normal (full game), Hard (no HUD, enhanced AI)

### Technical
- 100% code-generated assets — no downloads, no models, no samples
- Physical container search: drawers slide out, doors swing open, loot visible inside
- Procedural textures (wood, carpet, tile, wall, ceiling)
- Rapier physics for collisions, React Three Fiber for rendering

## Controls

| Key | Action |
| --- | --- |
| WASD / mouse | move / look |
| CTRL or C | crouch (quiet) |
| SHIFT | sprint (loud, stamina) |
| E | interact: search, doors, hide, pick up items |
| F | flashlight (after you find it) |
| B | hold breath (–stress, 15 s cooldown) |
| Q | listen while hiding |
| R | lock the bathroom door |
| M / Tab | toggle map (Normal only; always visible on Easy) |
| Click | fire tranquilizer gun (when equipped) |

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run lint
```

### Tech Stack
- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 6
- [Three.js](https://threejs.org/) via [React Three Fiber](https://r3f.docs.pmnd.rs/)
- [Rapier](https://rapier.rs/) physics via [@react-three/rapier](https://github.com/pmndrs/react-three-rapier)
- [Zustand](https://zustand.docs.pmnd.rs/) state management
- [Vite](https://vite.dev/) build tool

### Project Structure
```
src/
├── components/
│   ├── canvas/     House.tsx, Mom.tsx, Containers.tsx
│   └── ui/         HUD.tsx, Overlays.tsx
├── game/           house.ts, momAI.ts, spots.ts, interactions.ts, furnitureData.ts, runtime.ts
├── state/          gameStore.ts (zustand)
├── systems/        audio.ts, playerLook.ts, useDirector.ts, useInput.ts
├── utils/          proceduralTextures.ts
└── constants.ts    all tuning values
```

Design doc: [`docs/GDD_v2.md`](docs/GDD_v2.md)
