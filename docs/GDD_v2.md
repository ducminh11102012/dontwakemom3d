# DON'T WAKE MOM — Game Design Document v2.1
> **Implementation-ready design document** for the 3D first-person version.  
> Built with **Three.js** (React Three Fiber + Rapier), **TypeScript**, **Vite**.  
> Follow every section carefully. Where system interactions overlap, prioritize **audio design** above all else.

---

## ═══════════════════════════════
## SECTION 1 — CONCEPT & CORE LOOP
## ═══════════════════════════════

### Elevator Pitch
A **stealth horror-comedy** game where the only monster is your own mother.  
No weapons (well, one tranquilizer gun). No jump scares (well, one).  
Only **sound, silence, and the crushing anxiety** of a teenager who just wants to check their phone at 2:00 AM.

### Core Emotional Loop
```
SNEAK → LISTEN → SEARCH → PANIC → HIDE → BREATHE → REPEAT
```

Every 30 seconds the player should feel:
- *"Where is she right now?"*
- *"Was that noise her?"*
- *"Why did she go quiet?"*

> **Design Rule #1**: Silence is scarier than any sound.  
> **Design Rule #2**: The fear of being caught must always feel worse than actually being caught.  
> **Design Rule #3**: The player should feel *guilty* — not just scared.

---

## ══════════════════
## SECTION 2 — STORY
## ══════════════════

### Setup
**Time**: 2:07 AM. The house is dark. Everyone should be asleep.

Earlier tonight, Mom discovered your phone on the kitchen table — unlocked, mid-conversation.  
She didn't say anything. She just *took it*.

You lay in bed staring at the ceiling.  
Your best friend sent you a string of messages and you never responded.  
By now they've probably seen that you've been ignoring them.

You can't sleep.

You decide: *one quick reply. That's all. Then back to bed.*

### Act Structure

**ACT 1 — The Search**  
Player leaves their room and searches both floors for the phone.  
Mom is asleep (or is she?).  
House is quiet. Player learns the two-story layout, the sounds, the dangers.  
Along the way: find a brass key, a safe code note, and maybe a tranquilizer gun.

**ACT 2 — The Reply**  
Phone found. A 5-second window to reply.  
The moment the message sends — the phone buzzes.  
Loud. The whole house shudders.

**ACT 3 — The Escape**  
Mom is awake. She *knows*.  
10 seconds to put the phone back, get to bed, and pretend nothing happened.  
This is the hardest stretch of the entire game.

### Tone
Think: *"Home Alone" + "Alien: Isolation"* — but the alien is a middle-aged woman with a broom and the patience of someone who has raised teenagers before.

---

## ═══════════════════════
## SECTION 3 — CHARACTERS
## ═══════════════════════

### The Player (The Kid)
- Age: ~15-16
- No name (preserve universality)
- Wears pajamas
- Moves in four modes: Walk, Crouch, Sprint, Hide
- Has no way to fight back — except one **tranquilizer gun** (Granny-style)
- Health: Not tracked. One catch = Game Over (with jumpscare).

### The Mother (The Threat)
- AI-controlled. Never static.
- Carries a broom (for the sound — *tap tap tap*)
- Moves at **variable speeds** — slow and deliberate when patrolling, frighteningly fast when chasing
- Does NOT run in a straight line during chase. She *anticipates* where you'll go.
- Speaks in short, devastating phrases when she catches you
- Patrols **both floors** — uses the staircase to move between levels
- Her greatest weapon: **unpredictability**

> **CRITICAL DESIGN NOTE**:  
> Mom should sometimes *fake* going back to sleep.  
> She may enter her bedroom, go silent, and wait — hoping the player relaxes and moves again.  
> This is the most terrifying thing she can do.

---

## ══════════════════════════
## SECTION 4 — PLAYER SYSTEMS
## ══════════════════════════

### Movement Modes

| Mode    | Speed (m/s) | Noise Level | Stamina Use | Trigger         |
|---------|-------------|-------------|-------------|-----------------|
| Walk    | 2.20        | Low         | None        | Default         |
| Crouch  | 1.32        | Very Low    | None        | Hold CTRL/C     |
| Sprint  | 3.96        | **HIGH**    | 10/sec      | Hold SHIFT      |
| Hide    | 0           | None        | None        | Press E at spot |

### Stamina System *(Normal + Hard only)*
- Max: 100
- Running drains: 10/sec
- Recovery (stationary or walking): 15/sec
- **At 0 stamina**:
  - Player stumbles (2 s slowdown at 0.9 m/s)
  - Audible heavy breathing (4 s) that **cannot be suppressed** (noise intensity 0.7)
  - This breathing can wake Mom from across the house
  - Punishes reckless sprinting

### Noise Footprint System
Each surface type generates different footstep sound levels:

| Floor Type    | Walk Noise | Crouch Noise | Notes                          |
|---------------|------------|--------------|--------------------------------|
| Carpet        | 0.20       | 0.05         | Safe to walk on                |
| Tile          | 0.40       | 0.12         | Crouch recommended             |
| Wood          | 0.45       | 0.15         | Every step audible             |
| Sprint (any)  | 0.80       | —            | Always loud                    |

> **Implementation**: Every footstep fires a noise event with intensity = movement mode × floor type.  
> Mom's AI reacts to this via hearing range check with wall attenuation.  
> Footstep stride: 0.72 m per step, interval scaled by speed.

---

## ══════════════════════════
## SECTION 5 — STRESS SYSTEM
## ══════════════════════════

### The Heartbeat Meter
An internal value from **0 to 100** representing the player's anxiety.

```
0 ──────────────────────────────────── 100
Calm                              Full Panic
```

### Triggers (Increases Stress)

| Event                         | Stress Added     |
|-------------------------------|------------------|
| Mom within ~9 m               | +15/sec          |
| Mom in same room              | +30/sec          |
| Mom looks toward player       | +50 (instant)    |
| Chase begins                  | → 100 (instant)  |
| Silence / fake sleep          | +10/sec          |
| Phone buzzes (Act 2)          | +60 (instant)    |

### Triggers (Decreases Stress)

| Event                           | Stress Removed |
|---------------------------------|----------------|
| Mom far away / sleeping         | -5/sec         |
| Player hiding                   | -8/sec         |
| Player in own bedroom           | -12/sec        |
| Hold-breath mechanic            | -20 (manual)   |

### Visual / Audio Effects by Stress Level

| Level | Effect                                                        |
|-------|---------------------------------------------------------------|
| 0–20  | No effect                                                     |
| 21–40 | Faint heartbeat sound begins (low, distant)                   |
| 41–60 | Heartbeat louder. Screen edges pulse subtly (dark vignette)   |
| 61–80 | Heavy breathing. Vignette deepens. UI elements tremble        |
| 81–99 | Screen blurs. Heartbeat overwhelming. Audio muffles slightly  |
| 100   | **PANIC STATE** — Screen shakes. Vision nearly black. Must hide or it's Game Over |

### Hold-Breath Mechanic
Press and hold **B** to manually suppress stress by -20.  
- Can only be used when **hiding or stationary**  
- Takes 2 seconds to activate  
- Plays a deliberate exhale sound (very quiet)  
- Cooldown: 15 seconds

---

## ═══════════════════════
## SECTION 6 — HOUSE DESIGN
## ═══════════════════════

The house is a **two-story** building (15 m × 13 m footprint, Y-up coordinate system).

### Ground Floor (Level 0)

```
┌──────────┬─────────────┬──────────┐ z=0
│ STORAGE  │  BATHROOM   │          │
├──────────┼─────────────┤ KITCHEN  │ z=4
│ MOM'S    │  HALLWAY    │ (stairs  │
│ BEDROOM  │   (wood)    │  in SE)  │
├──────────┴───────┬─────┴──────────┤ z=9
│   LIVING ROOM    │ PLAYER BEDROOM │
└──────────────────┴────────────────┘ z=13
x=0        x=5     x=9  x=10.5      x=15
```

### Upstairs (Level 1, floor at y = 2.85 m)

```
┌──────────┬─────────────┬──────────┐ z=0
│  STUDY   │ GUEST ROOM  │ SEWING   │
├──────────┴─────────────┴──────────┤ z=4.6
│  UPSTAIRS HALLWAY      [stairwell]│ z=9
├──────────────────┬────────────────┤
│   JUNK ROOM      │  LAUNDRY ROOM  │
└──────────────────┴────────────────┘ z=13
x=0                x=7.5            x=15
```

### Staircase
- Runs along the kitchen's east wall
- Bottom at (14.4, z=8.0, y=0); top at (14.4, z=5.0, y=2.85)
- Stairwell hole in upstairs slab: x 13.8–15, z 4.69–7.9

### Room Details

#### Ground Floor

**Player Bedroom** *(Spawn + Safe Zone, carpet)*
- Bed (get in bed — counts for endings)
- Hide under bed
- Wardrobe (hiding spot)
- Desk with drawer (fake search spot) + flashlight
- Door to hallway (starts open)
- Archway to Living Room

**Mom's Bedroom** *(Danger Zone — Priority 1, carpet)*
- Mom sleeps here at game start
- **The door creaks** when opened. Always.
- Nightstand drawer (Tier 1 phone spot)
- Under pillow (Tier 1 phone spot — highest risk)
- Wardrobe (Tier 2 phone spot)
- Dresser drawers (fake search spots)
- Under the bed (hiding spot — for the secret ending)

**Kitchen** *(Medium Danger, tile)*
- Fridge (Tier 2 phone spot, hum covers noise)
- Rice container (Tier 3 phone spot)
- Drawers + cabinets (fake spots)
- Staircase to upstairs in SE corner

**Hallway** *(Transition Zone — Most Dangerous, wood floor)*
- Every step audible
- No hiding spots
- Connects: Mom's Room, Bathroom, Kitchen, Living Room, Player Room

**Living Room** *(Medium Danger, carpet)*
- TV cabinet (Tier 2 phone spot)
- Bookshelf (Tier 3 phone spot)
- Coffee table drawer, sofa cushions, side cabinet (fakes)
- Behind the sofa (hiding spot)
- Behind the curtains (hiding spot)

**Bathroom** *(tile)*
- Cabinet (Tier 3 phone spot)
- Mirror cabinet, laundry basket (fakes)
- Door has a lock (buys 10 seconds in a chase)
- Shower curtain (hiding spot)

**Storage Room** *(Low Danger, wood, dark)*
- **Locked** — requires the brass key
- Storage box (Tier 3 phone spot)
- Wicker basket, old crate, shelf boxes (fakes)
- Big box (hiding spot)
- **Safe** (code-locked, holds the tranquilizer gun)

#### Upstairs

**Study** *(dark, carpet)*
- Desk drawer (Tier 3 phone spot)
- Bookshelf (Tier 3 phone spot)
- File cabinet (fake)

**Guest Bedroom** *(dim, carpet)*
- Guest nightstand (Tier 2 phone spot)
- Guest wardrobe (Tier 2 phone spot)
- Guest pillow (fake)
- Under the guest bed (hiding spot)
- Inside guest wardrobe (hiding spot)

**Sewing Room** *(dark, wood)*
- Door creaks when opened
- Sewing table drawer (fake)
- Sewing basket (Tier 3 phone spot)
- Fabric cabinet (Tier 2 phone spot)

**Upstairs Hallway** *(dim, wood)*
- Connects all upstairs rooms + stairwell
- Archway to Junk Room

**Junk Room** *(dark, wood)*
- Dusty box (Tier 3 phone spot)
- Old box, wooden crate (fakes)
- Dust sheet (hiding spot)

**Laundry Room** *(dim, tile)*
- Washing machine (Tier 2 phone spot)
- Laundry shelf, pile of clothes (fakes)
- Clothes pile (hiding spot)

### Doors

| Door | Type | Special |
|------|------|---------|
| Storage | Panel, locked | Needs brass key |
| Bathroom | Panel, lockable | Player can lock from inside |
| Mom's Bedroom | Panel | **Always creaks** |
| Kitchen | Archway | Always open |
| Living Room | Archway | Always open |
| Player Room | Panel | Starts open |
| Living↔Player | Archway | Always open |
| Study | Panel | — |
| Guest Room | Panel | — |
| Sewing Room | Panel | **Creaks** |
| Junk Room | Archway | Always open |
| Laundry Room | Panel | — |

---

## ═══════════════════════════════
## SECTION 7 — PHONE SPAWN SYSTEM
## ═══════════════════════════════

The phone is hidden in a **different location every run** (randomized at game start).

### Spawn Location Tiers

**TIER 1 — High Risk, High Anxiety** *(20% chance)*
- Mom's pillow (she's lying on it)
- Mom's nightstand drawer (inches from her head)

**TIER 2 — Medium Risk** *(40% chance)*
- Mom's wardrobe
- Kitchen fridge
- Living room TV cabinet
- Guest nightstand (upstairs)
- Guest wardrobe (upstairs)
- Sewing room fabric cabinet (upstairs)
- Laundry washing machine (upstairs)

**TIER 3 — Lower Risk** *(40% chance)*
- Kitchen rice container
- Living room bookshelf
- Bathroom cabinet
- Storage box (requires key)
- Study desk drawer (upstairs)
- Study bookshelf (upstairs)
- Sewing basket (upstairs)
- Junk room dusty box (upstairs)

> **Important**: The phone can be on either floor. With ~40 searchable objects across 13 rooms,  
> the player must explore the full house. Fake objects waste time, create noise, and build dread.

---

## ══════════════════════════════════════
## SECTION 7.5 — GRANNY-STYLE ITEM LOOP
## ══════════════════════════════════════

Beyond the phone, three additional items are hidden each run (never overlapping):

### Brass Key
- Opens the **locked Storage Room** door
- Never spawns inside Storage (or you could never reach it)
- Hidden in a random search spot

### Safe Code Note
- A 4-digit code for the **safe** in the Storage Room
- Also never spawns inside Storage
- When found: "Read the note" → code stored in inventory HUD

### Tranquilizer Gun
- Locked inside the **safe** (in Storage Room)
- Player must: find key → unlock Storage → find note → enter code → get gun
- **CLICK to fire** — Mom is knocked out for **25 seconds** (state: `tranq`)
- Range: 12 m, aim tolerance: ~7°
- Comes with 1 dart loaded; a spare dart can be found elsewhere

### Wrong Safe Code
- Entering a wrong code makes the safe **buzz angrily** (noise intensity 0.45)
- Mom can hear it — risky to guess

---

## ══════════════════════════
## SECTION 8 — INTERACTION SYSTEM
## ══════════════════════════

Press **E** near any highlighted object.

### Interaction Types

| Action       | Description                                                |
|--------------|------------------------------------------------------------|
| Open/Close   | Doors (panel type only), drawers, cabinets                 |
| Search       | Look through containers for the phone / items              |
| Take         | Pick up phone, key, note, or dart from an opened container |
| Hide         | Enter a hiding spot                                        |
| Return       | Place phone back in its original location (Act 3)          |
| Lock/Unlock  | Bathroom door (from inside), Storage door (with key)       |
| Safe         | Enter the 4-digit code on the keypad                       |

### Search Duration (Normal mode) & Noise by Object

| Object           | Time  | Noise Intensity |
|------------------|-------|-----------------|
| Pillow           | 1.5s  | 0.08            |
| Small drawer     | 1.5s  | 0.30            |
| Large drawer     | 2.0s  | 0.38            |
| Fridge           | 2.0s  | 0.22 (hum covers) |
| Wardrobe         | 2.5s  | 0.50            |
| Rice container   | 2.0s  | 0.40            |
| Large box        | 3.0s  | 0.42            |
| Cabinet          | 1.8s  | 0.32            |

Duration multipliers: Easy ×0.5, Normal ×1.0, Hard ×1.6.

> **Note**: Searching is an animation + sound event. Mom's AI processes this sound **before** the search ends, meaning she can start moving toward the player **before** they've finished searching.

### Physical Container Animation
Containers open physically — drawers slide out, doors swing, lids lift. The opened state is visible; items inside are visible after opening.

---

## ══════════════════════
## SECTION 9 — MOTHER AI
## ══════════════════════

Mom has **9 behavioral states** that transition based on stimuli.

```
[SLEEP] ←──────────────────────────────────┐
   ↓ (noise / random stir)                 │
[PATROL] ──→ (noise heard) ──→ [INVESTIGATE]│
   ↑ (patrol again 55%)              ↓      │
   │                        (player spotted) │
   │                              ↓          │
   │                          [CHASE]        │
   │                              ↓          │
   │                   (player escaped)      │
   │                              ↓          │
   │                          [SEARCH]       │
   │                              ↓          │
   │                (search timeout)─────────┤
   │                          [RETURN]───────┤
   │                                         │
   │        [TRANQ] (shot by dart)───────────┘
   │                                         │
   └─── [FAKE SLEEP] (20%/35% on return)────┘
```

### State Definitions

**SLEEP**
- Mom is in bed, producing soft snoring
- Can be woken by:
  - Any noise above wake threshold (0.38 intensity after attenuation)
  - Random light-sleep stir (every 14–32 seconds)
  - 65% chance a stir becomes a full patrol
  - First guaranteed patrol after ~16 seconds
  - Phone vibration (Act 2): 100% guaranteed wake
- **FAKE SLEEP**: 20% normal / 35% hard — she lies down, goes silent, waits up to 30 s

**PATROL**
- Mom walks a semi-random route through **both floors** (uses staircase)
- Carries broom → *tap...tap...tap...* (reveals her exact position)
- Patrol speed: 1.54 m/s (70% of player walk)
- She may stop and stand still in doorways (35% chance, 5–10 seconds)
- 55% chance she keeps roaming instead of returning to bed
- Her broom tap **always reveals her location** — until it stops

**INVESTIGATE**
- Triggered: mom hears a noise above threshold
- She walks directly to the noise source at 1.98 m/s
- Examines the area: 10–20 seconds
- If she finds nothing: returns to patrol
- Audio during investigate: no broom taps. She moves silently.

**SEARCH**
- Triggered: player lost during chase, or suspicious evidence found
- Checks hiding spots methodically
- Duration: 20–40 seconds
- **She calls out softly** during this phase
- If she finds the player: **CHASE**

**CHASE**
- Triggered: direct line of sight for 0.5 seconds (detection meter fills at 20/sec)
- Mom moves at 3.52 m/s (160% of player walk, slower than sprint)
- She does NOT give up for 15 seconds after losing sight
- She **anticipates doorways**
- Player stress → 100 instantly
- Mom speaks: *"I knew it!"* / *"Where do you think you're going?"*

**RETURN**
- Mom walks back to bedroom at 1.43 m/s
- Broom taps resume
- Entering bedroom triggers potential FAKE SLEEP

**TRANQ** *(Granny-style)*
- Triggered: player shoots Mom with the tranquilizer gun
- Mom collapses and is out for **25 seconds**
- She then wakes and enters PATROL (angry)

**FINALE**
- Scripted Act 3 behavior: Mom exits bedroom after 4 seconds
- Walks to where the phone was hidden
- Checks for the phone; triggers SEARCH if it's missing

### Mom's Hearing

```
Effective noise = base_intensity × (wall_attenuation ^ wall_count)
Wall attenuation = 0.45 per wall crossed
Hearing range = 9 m (base)
Wake threshold = 0.38 (attenuated intensity reaching her)
```

### Mom's Vision
- 60° forward arc
- Range depends on light: 2.4 m (dark), 4.5 m (dim), 8.5 m (lit)
- Detection meter fills at 20/sec + 5 if running + 3 if flashlight on
- Standing still in dim light: 30% detection rate
- At 100 detection: CHASE triggered

### Mom's Memory *(Hard Mode)*
- Remembers where noises came from
- Checks frequently-heard areas more often on subsequent patrols

---

## ══════════════════════
## SECTION 10 — AUDIO DESIGN
## ══════════════════════

> **This is the most important system in the game.**  
> Audio design is not decoration. It IS the gameplay.

### Positional Audio
- All sounds use 3D positioning (Three.js positional audio)
- Volume = distance (closer = louder)
- Reverb/lowpass filter increases based on wall count between player and source
- Player should be able to close their eyes and know roughly where Mom is — until the sound stops

### Mom's Audio Profile

| State       | Sound                               | What Player Learns       |
|-------------|-------------------------------------|--------------------------|
| Sleep       | Soft snoring (rhythmic)             | She's in her room        |
| Patrol      | *Tap...tap...tap...* (broom)        | Her exact position       |
| Investigate | Footsteps only (no broom)           | She heard something      |
| Search      | Slow footsteps + soft murmuring     | She's hunting            |
| Chase       | Rapid footsteps + voice line        | RUN                      |
| Fake Sleep  | **Absolute silence**                | Maximum uncertainty      |
| Tranq       | Thud (collapse)                     | She's down — GO          |

### The Silence Mechanic
When all Mom-related audio stops, it can mean:
1. She's standing completely still, listening
2. She's directly behind a door the player is about to open
3. She fell back into real sleep
4. She's in the same room, waiting

The player has **no way to know which one** without moving — and moving makes noise.

---

## ══════════════════════════
## SECTION 11 — HIDING SYSTEM
## ══════════════════════════

### Available Hiding Spots

| Spot                    | Room            | Floor | Safety  | Notes                                |
|-------------------------|-----------------|-------|---------|--------------------------------------|
| Get in bed              | Player Bedroom  | 1F    | 0.95    | Counts as "in bed" for endings       |
| Under your bed          | Player Bedroom  | 1F    | 0.90    | —                                    |
| Inside wardrobe         | Player Bedroom  | 1F    | 0.70    | —                                    |
| Behind the sofa         | Living Room     | 1F    | 0.50    | Only safe if Mom doesn't enter fully |
| Behind the curtains     | Living Room     | 1F    | 0.35    | Shadow visible if flashlight used    |
| Inside the big box      | Storage         | 1F    | 0.75    | Hard to reach (room is locked)       |
| Behind shower curtain   | Bathroom        | 1F    | 0.70    | —                                    |
| Under Mom's bed         | Mom's Bedroom   | 1F    | 0.85    | **Extreme risk** — for secret ending |
| Under the guest bed     | Guest Bedroom   | 2F    | 0.80    | —                                    |
| In the guest wardrobe   | Guest Bedroom   | 2F    | 0.65    | —                                    |
| Under the dust sheet    | Junk Room       | 2F    | 0.60    | —                                    |
| In the clothes pile     | Laundry Room    | 2F    | 0.70    | —                                    |

Safety rating (0 = mom checks first, 1 = mom checks last during SEARCH).

### While Hiding
- Player becomes invisible to Mom's sight-based detection
- But NOT immune to noise-based detection or SEARCH state checks
- Press Q to listen (peek): tiny noise (0.08 intensity) but gives partial audio info

---

## ══════════════════════════
## SECTION 12 — FLASHLIGHT
## ══════════════════════════

Found on the desk in the Player Bedroom.

- **Uses**: Illuminate dark rooms (Storage, Study, Sewing Room, Junk Room)
- **Risk**: Flashlight beam increases detection (+3/sec) while in Mom's LOS
- **Toggle**: Press F to turn on/off
- **Battery**: Unlimited

> The flashlight forces a tradeoff — see better, but risk being seen.

---

## ═════════════════════════
## SECTION 13 — THE REPLY PHASE (ACT 2)
## ═════════════════════════

When the phone is found:

1. Player picks up phone
2. Messages load:
```
bestie (today)
─────────────────────────
11:23 PM  hello?
11:24 PM  bro you there
11:31 PM  ok you're probably asleep
11:32 PM  nvm
11:33 PM  answer pls
11:47 PM  ...
11:59 PM  fine
12:38 AM  whatever
```

3. **5-second countdown** begins
4. Reply options or chicken out (close without sending)
5. If reply sent → phone vibrates at maximum intensity (1.0)

---

## ════════════════════════
## SECTION 14 — THE FINAL PHASE (ACT 3)
## ════════════════════════

### Trigger: Phone vibrates

Immediately:
- Mom wakes. **100% guaranteed. No exceptions.**
- Player stress → 100
- A 10-second countdown: **"PUT IT BACK. GET TO BED."**
- Music hits full intensity

### What the player must do in 10 seconds:
1. **Return the phone** to its original hiding spot
2. **Get back to their bedroom** (possibly from another floor!)
3. **Get in bed**

### Mom's finale behavior:
- Exits bedroom after 4 seconds
- Walks directly to the room where phone was hidden
- If phone is there → she picks it up, returns to sleep *(success path)*
- If phone is missing → SEARCH begins *(worst case)*

---

## ═══════════════════════
## SECTION 15 — ENDINGS
## ═══════════════════════

### ENDING 1 — "Good Night" *(Best Ending)*
Requirements: Phone returned, player in bed, Mom fooled, reply sent

### ENDING 2 — "Coward" *(Neutral Ending)*
Requirements: Phone returned, player in bed, reply NOT sent

### ENDING 3 — "Caught" *(Standard Failure)*
Mom catches player → jumpscare sequence (3 s face + 5.5 s scream in darkness)

### ENDING 4 — "The Waiting Kind" *(Secret Ending)*
Requirements: Player hides under **Mom's bed** during Final Phase and waits for her to go back to sleep (~18 seconds). Then crawls out.

---

## ═══════════════════════════
## SECTION 16 — DIFFICULTY MODES
## ═══════════════════════════

### EASY MODE — "Practice Run"
- Mom doesn't wake (house exploration mode)
- **Dual floor map always visible** (both floors side by side)
- No stress effects, no chase
- Search durations: ×0.5

### NORMAL MODE — "Don't Wake Mom"
- Full gameplay
- **Dual floor map** toggle: M / Tab (both floors visible simultaneously)
- Status notifications + Mom dot on map
- Search durations: ×1.0

### HARD MODE — "She Already Knows"
- **No map, no notifications, no HUD hints**
- Mom's patrol routes longer and less predictable
- Fake sleep frequency: 35% (vs 20%)
- Mom memory system active
- Search durations: ×1.6
- The only information: audio cues + spatial memory

---

## ════════════════════════════════
## SECTION 17 — MAP SYSTEM
## ════════════════════════════════

The map displays **both floors simultaneously** (no toggle between floors):
- **Left panel**: Floor 2 (Upstairs) — labeled "▲ TẦNG 2"
- **Right panel**: Floor 1 (Ground) — labeled "▼ TẦNG 1"

Each panel shows:
- Room outlines with labels
- Staircase indicator (↑STAIRS / ↓STAIRS)
- **Player dot** (blue) with direction line — bright on current floor, faded on other
- **Mom dot** (red if awake, muted if asleep) — same brightness rules

Controls:
- **M / Tab**: toggle map (Normal mode)
- Always visible on Easy; hidden on Hard

---

## ════════════════════════════════
## SECTION 18 — TECHNICAL IMPLEMENTATION
## ════════════════════════════════

### Engine & Stack
- **Three.js** via React Three Fiber (R3F)
- **Rapier** physics (via @react-three/rapier)
- **React 19** + **TypeScript 6** + **Vite 8**
- **Zustand** for state management
- Deployed to **GitHub Pages** (gh-pages branch)

### Architecture

```
src/
├── components/
│   ├── canvas/
│   │   ├── House.tsx          # Walls, floors, ceiling, doors, furniture, colliders
│   │   ├── Mom.tsx            # Mom mesh + AI tick integration
│   │   └── Containers.tsx     # Physical container open/close animations
│   ├── ui/
│   │   ├── HUD.tsx            # Objective, prompt, map, keypad, inventory, stress overlay
│   │   └── Overlays.tsx       # Menu, intro, phone UI, caught screen, ending screen
│   ├── Experience.tsx         # Scene composition, lighting, post-processing
│   ├── PlayerCamera.tsx       # First-person camera rig
│   └── PlayerController.tsx   # Movement, stamina, interactions, hiding, shooting
├── game/
│   ├── house.ts               # Room, wall, door definitions + nav graph + pathfinding
│   ├── momAI.ts               # Full AI state machine (9 states)
│   ├── spots.ts               # Search spots, hide spots, phone spawn, item spawn
│   ├── interactions.ts        # What can the player interact with right now?
│   ├── furnitureData.ts       # Every furniture piece as primitive boxes/cylinders
│   └── runtime.ts             # Per-frame mutable state (positions, door states, noise bus)
├── state/
│   └── gameStore.ts           # Zustand store: phase, acts, stress, inventory, endings
├── systems/
│   ├── audio.ts               # Positional audio engine, spatial sound
│   ├── playerLook.ts          # Mouse look (yaw/pitch)
│   ├── useDirector.ts         # Act progression, finale trigger, ending conditions
│   └── useInput.ts            # Keyboard input binding
├── utils/
│   └── proceduralTextures.ts  # Canvas-generated textures (wood, carpet, tile, wall)
├── constants.ts               # All tuning values in one place
├── App.tsx
└── main.tsx
```

### Navigation System
- **Dijkstra pathfinding** on a hand-placed nav graph (nodes + edges)
- Covers both floors + staircase nodes
- Mom uses this for all movement (patrol, investigate, chase, return)
- `nearestNode()` snaps world positions to graph; height-aware to prevent cross-floor snapping

### Key Design Decisions
- **100% procedural assets**: no external models, textures, or audio files
- **No downloads**: everything generated at runtime via canvas textures + procedural geometry
- **Rapier physics**: real capsule colliders for player + Mom, cuboid colliders for walls/furniture
- **Wall attenuation**: noise intensity drops by 0.45× per wall crossed — encourages spatial reasoning

---

## ══════════════════════════
## SECTION 19 — CONTROLS REFERENCE
## ══════════════════════════

| Key | Action |
| --- | --- |
| WASD / mouse | Move / look |
| CTRL or C | Crouch (quiet movement) |
| SHIFT | Sprint (loud, drains stamina) |
| E | Interact: search, doors, hide, pick up, return phone |
| F | Flashlight toggle |
| B | Hold breath (−20 stress, 15 s cooldown) |
| Q | Listen (peek) while hiding |
| R | Lock bathroom door (from inside) |
| M / Tab | Toggle floor map (Normal mode) |
| Click | Fire tranquilizer gun (when equipped) |
| 0–9 | Type safe code (when keypad open) |
| ESC | Pause / close keypad |

---

*Document version: 2.1*  
*Game: Don't Wake Mom 3D*  
*Engine: Three.js (React Three Fiber) | Genre: Stealth Horror-Comedy | Platform: Web*  
*Version: 1.4.0 — Two-story house, Granny-style item loop, dual floor map*
