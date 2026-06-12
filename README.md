# DON'T WAKE MOM (3D)

A first-person 3D stealth horror-comedy built with **three.js** (React Three Fiber + Rapier).

> 2:07 AM. Mom confiscated your phone at dinner. It's somewhere in the house.
> Find it. Reply to Mina. Put it back. Get to bed. **DON'T. WAKE. MOM.**

**▶ Play: https://ducminh11102012.github.io/dontwakemom3d/**

## Features

- Full house: 7 rooms, doors (Mom's door *always* creaks), lockable bathroom
- Mom AI: sleep / investigate / search / patrol / chase / return + **fake sleep** and hard-mode memory
- Sound propagation per floor type (carpet / tile / wood), wall attenuation
- Stress system: panic at 100, hold breath (B) to calm down
- Phone hunt with tiered hiding spots + fake buzz spots, search-and-leave-evidence
- Act 2 reply choice (or chicken out), Act 3 buzz finale with 10-second scramble
- 4 endings incl. a secret one, 3 difficulties, fully procedural positional audio
- 100 % code-generated assets — no downloads, no models, no samples

## Controls

| Key | Action |
| --- | --- |
| WASD / mouse | move / look |
| CTRL or C | crouch (quiet) |
| SHIFT | sprint (loud, stamina) |
| E | interact: search, doors, hide, put phone back |
| F | flashlight (after you find it) |
| B | hold breath (–stress, 15 s cooldown) |
| Q | listen while hiding |
| R | lock the bathroom door |
| M / Tab | floor map (Easy/Normal) |

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run lint
```

Design doc: [`docs/GDD_v2.md`](docs/GDD_v2.md)
