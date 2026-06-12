# THE NINTH FLOOR

First-person psychological horror in the browser. Stealth + exploration — no
combat, no weapons.

> You are a night-shift office cleaner. Your phone falls into the service
> elevator and the elevator takes it to **Floor 9** — a floor that does not
> exist on any directory. The doors won't open again until you find it. And
> something already lives up there.

## Tech Stack

- [Vite](https://vitejs.dev/) + React 19 + TypeScript (strict)
- [three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
- [@react-three/drei](https://github.com/pmndrs/drei), [@react-three/rapier](https://github.com/pmndrs/react-three-rapier) (physics), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing)
- [zustand](https://github.com/pmndrs/zustand) (global game state)
- [Howler.js](https://howlerjs.com/) + native Web Audio API (spatial audio)
- All geometry from primitives, all textures and audio generated procedurally
  at runtime — **zero external assets** by design.

## Getting Started

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
```

Requires Node.js 20+.

## Project Status

Built in numbered phases. Current: **Phase 0 — project setup** ✅

See `docs/PHASE_0_BRIEF.md` for the master design brief and the full phase
roadmap, and `PHASE_0_NOTES.md` for the latest implementation notes.

## Structure

```
src/
├── App.tsx               # Root component (placeholder until Phase 1)
├── constants.ts          # ALL gameplay tuning numbers live here
├── state/gameStore.ts    # zustand store — all cross-system game state
├── components/           # R3F scene components (from Phase 1)
├── systems/              # Audio manager, AI, noise events (from Phase 3+)
├── ui/                   # DOM overlays: HUD, menus (from Phase 1+)
└── utils/                # Procedural texture/audio generators (from Phase 2+)
```
