# DON'T WAKE MOM 3D — Game Design Document v2.1
> Updated to reflect the live **3D first-person** implementation.
> Built with **React Three Fiber**, **Rapier physics**, **TypeScript** — runs in the browser.
> All assets are 100% code-generated (procedural textures, geometry). No external models/samples.

---

## ═══════════════════════════════
## SECTION 1 — CONCEPT & CORE LOOP
## ═══════════════════════════════

### Elevator Pitch
A **stealth horror-comedy** game where the only monster is your own mother.
No weapons. No combat. One jumpscare.
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
Player leaves their room and tries to locate the phone.
Mom is asleep (or is she?).
House is quiet. Player learns the layout, the sounds, the dangers.

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
- First-person perspective — you never see yourself
- Moves in four modes: Walk, Crouch, Sprint, Hide
- Has no way to fight back — can only **evade, wait, and hide** (except the tranquilizer gun)
- One catch = Game Over (jumpscare)

### The Mother (The Threat)
- AI-controlled. Never static.
- Carries a broom (for the sound — *tap tap tap*)
- Moves at **variable speeds** — slow and deliberate when patrolling, frighteningly fast when chasing
- Does NOT run in a straight line during chase. She *anticipates* where you'll go.
- Speaks in short, devastating phrases when she catches you
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
| Walk    | 2.2         | Low         | None        | Default (WASD)  |
| Crouch  | 1.32        | Very Low    | None        | Hold CTRL / C   |
| Sprint  | 3.96        | **HIGH**    | 10/sec      | Hold SHIFT      |
| Hide    | 0           | None        | None        | Press E at hiding spot |

### Stamina System *(Normal + Hard only)*
- Max: 100
- Running drains: 10/sec
- Recovery (stationary or walking): 15/sec
- **At 0 stamina**:
  - Player stumbles (2 s slowdown to 0.9 m/s)
  - Audible heavy breathing (intensity 0.7) for 4 s — **cannot be suppressed**
  - This breathing can wake Mom from across the house
  - Punishes reckless sprinting

### Noise Footprint System
Each surface type generates different footstep sound levels:

| Floor Type       | Walk Noise | Crouch Noise | Notes                          |
|------------------|------------|--------------|--------------------------------|
| Carpet           | 0.20       | 0.05         | Safe to walk on                |
| Tile (kitchen/bath) | 0.40    | 0.12         | Crouch recommended             |
| Wood (hallway)   | 0.45       | 0.15         | Every step audible             |
| Sprint (any)     | 0.80       | —            | Always dangerous               |

Noise is emitted per footstep (stride length 0.72 m). Mom's AI picks up these signals via a hearing range check with wall attenuation (×0.38 per wall).

---

## ══════════════════════════
## SECTION 5 — STRESS SYSTEM
## ══════════════════════════

### The Heartbeat Meter
An internal value from **0 to 100** that represents the player's anxiety.

### Triggers (Increases Stress)

| Event                           | Stress Added   |
|---------------------------------|----------------|
| Mom within ~9 m (near)          | +15/sec        |
| Mom in same room                | +30/sec        |
| Mom looks toward player         | +50 (instant)  |
| Chase begins                    | → 100 (instant)|
| Silence after sound (fake sleep)| +10/sec        |
| Phone buzzes (Act 2)            | +60 (instant)  |

### Triggers (Decreases Stress)

| Event                           | Stress Removed |
|---------------------------------|----------------|
| Mom far away / sleeping         | −5/sec         |
| Player hiding                   | −8/sec         |
| Player in own bedroom           | −12/sec        |
| Hold-breath mechanic            | −20 (manual)   |

### Visual / Audio Effects by Stress Level

| Level | Effect                                                        |
|-------|---------------------------------------------------------------|
| 0–20  | No effect                                                     |
| 21–40 | Faint heartbeat sound begins                                  |
| 41–60 | Heartbeat louder. Screen edges darken (vignette)              |
| 61–80 | Heavy breathing. Vignette deepens. UI elements tremble        |
| 81–99 | Screen blurs. Heartbeat overwhelming. Audio muffles           |
| 100   | **PANIC STATE** — Screen shakes. Vision nearly black          |

### Hold-Breath Mechanic
Press and hold **B** to manually suppress stress by −20.
- Can only be used when **hiding or stationary**
- Takes 2 seconds to activate
- Plays a deliberate exhale sound (very quiet)
- Cooldown: 15 seconds

---

## ═══════════════════════
## SECTION 6 — HOUSE DESIGN
## ═══════════════════════

Two-story house: 15 m × 13 m footprint, wall height 2.6 m per floor.

### Ground Floor (level 0)

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

### Upstairs (level 1, floor at y = 2.85 m)

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
- Bottom at z = 8.0, top at z = 5.0 (rising to y = 2.85)
- Stairwell hole in upstairs slab: x 13.8–15, z 4.69–7.9

### Room Details

**Player Bedroom** *(Spawn + Safe Zone)*
- Bed (hiding spot: "Get in bed" — counts as being in bed for Good Night ending)
- Desk (key item: flashlight spawns here)
- Wardrobe (hiding spot)
- Window (ambient noise: crickets)
- Door to hallway
- *Note: no "hide under bed" here — player's own bed only has "Get in bed"*

**Mother's Bedroom** *(Danger Zone — Priority 1)*
- Mom sleeps here at game start
- Nightstand drawer (Tier 1 phone location)
- Under pillow (Tier 1 phone location — highest risk)
- Wardrobe (Tier 2 phone location)
- Dresser drawers (fake targets)
- Hiding spot: under Mom's bed (extreme risk — used for secret ending)
- **The door creaks** when opened. Always. (intensity 0.45)

**Kitchen** *(Medium Danger)*
- Fridge (Tier 2 phone location, hum covers search noise)
- Rice container (Tier 3 phone location)
- Counter drawers (fake targets)
- Tile floor = loud footsteps, crouch recommended
- Staircase exit in southeast corner

**Living Room** *(Medium Danger)*
- TV cabinet (Tier 2 phone location)
- Bookshelf (Tier 3 phone location)
- Drawers / side tables (fake targets)
- Hiding spots: behind sofa, behind curtains
- Carpet floor — safest for movement

**Bathroom** *(Occasional Danger)*
- Cabinet (Tier 3 phone location)
- Door has a lock (player can lock from inside — buys 10 seconds during chase)
- Hiding spot: behind shower curtain
- Sink drip ambient noise

**Hallway** *(Transition Zone — Most Dangerous)*
- Wood floor — every step audible
- No hiding spots
- Connects all ground-floor rooms
- Mom's door is directly off this hallway

**Storage Room** *(Low Danger, locked)*
- Requires brass key to enter
- Boxes, shelving units (fake targets + Tier 3 locations)
- Safe (lockbox) at position (4.5, 0.42, 0.62) — holds tranquilizer gun
- Very dark — flashlight recommended
- Hiding spot: inside the big box

**Study** *(Upstairs)*
- Desk drawers, bookshelf (Tier 2–3 locations)
- Dark room

**Guest Bedroom** *(Upstairs)*
- Nightstand, wardrobe, dresser (search spots)
- Hiding spots: under guest bed, in guest wardrobe

**Sewing Room** *(Upstairs)*
- Sewing cabinet, basket (search spots)
- Dark, cramped

**Upstairs Hallway** *(Upstairs transition)*
- Connects all upstairs rooms to stairwell
- Console table (fake target)

**Junk Room** *(Upstairs)*
- Old boxes, toolbox, trunk (search spots)
- Hiding spot: under dust sheet

**Laundry Room** *(Upstairs)*
- Hamper, dryer, cabinet (search spots)
- Hiding spot: burrow into clothes pile

### Spot Summary
| | Ground Floor | Upstairs | Total |
|---|---|---|---|
| Searchable containers | 38 | 15 | **53** |
| Hiding spots | 7 | 4 | **11** |
| Rooms | 7 | 6 | **13** |

---

## ═══════════════════════════════
## SECTION 7 — PHONE SPAWN SYSTEM
## ═══════════════════════════════

The phone is hidden in a **different location every run** (seeded randomly at game start).

### Spawn Location Tiers

**TIER 1 — High Risk, High Anxiety** *(2 spots)*
- Under Mom's pillow (she's lying on it)
- Mom's nightstand drawer (inches from her head)

**TIER 2 — Medium Risk** *(7 spots)*
- Mom's wardrobe
- Kitchen fridge
- Living room TV cabinet
- Study desk drawer
- Guest bedroom nightstand
- Sewing room cabinet
- And more across both floors

**TIER 3 — Lower Risk** *(8 spots)*
- Kitchen rice container
- Living room bookshelf
- Storage box
- Bathroom cabinet
- Upstairs locations (junk room, laundry, etc.)

**TIER 0 — Fake Targets** *(~22 spots)*
- Look searchable but never contain the phone
- Waste time, create noise, build dread

> **Important**: The phone can spawn in the same room Mom currently occupies.
> The game should never guarantee a safe retrieval.

### Additional Key Items
| Item | Location | Purpose |
|---|---|---|
| Flashlight | Player's desk (always) | See in the dark; Mom can spot the beam |
| Brass key | Random Tier 2–3 spot | Unlocks the Storage Room |
| Safe code note | Random Tier 2–3 spot | 4-digit code for the lockbox |
| Tranquilizer gun | Inside the safe | Knock Mom out for 25 s (click to fire) |
| Spare dart | Random Tier 3 spot | One extra shot |

---

## ══════════════════════════
## SECTION 8 — INTERACTION SYSTEM
## ══════════════════════════

Press **E** near any highlighted object.

### Interaction Types

| Action       | Description                                                |
|--------------|------------------------------------------------------------|
| Open/Close   | Doors, drawers, cabinets — animated open/close             |
| Search       | Look through containers for the phone (physical animation) |
| Hide         | Player enters a hiding spot                                |
| Pick Up      | Grab the phone once found                                  |
| Return       | Place phone back in its original location                  |
| Hold Breath  | Available while hiding (see Stress System)                 |
| Lock Door    | Bathroom door — press R while inside                       |
| Keypad       | Enter 4-digit code on the safe                             |

### Search Duration & Noise by Container Class (Normal difficulty)

| Container Class | Time (s) | Noise Intensity | Notes               |
|-----------------|----------|-----------------|----------------------|
| Pillow          | 1.5      | 0.08            | Very quiet           |
| Small drawer    | 1.5      | 0.30            | Standard             |
| Large drawer    | 2.0      | 0.38            | Louder               |
| Fridge          | 2.0      | 0.22            | Hum covers some noise|
| Wardrobe        | 2.5      | 0.50            | Medium-High          |
| Rice container  | 2.0      | 0.40            | Rustling             |
| Large box       | 3.0      | 0.42            | Slow                 |
| Cabinet         | 1.8      | 0.32            | Standard             |

Difficulty multiplier: Easy ×0.5, Normal ×1.0, Hard ×1.6

> **Note**: Searching triggers a physical animation (drawers slide out, doors swing open).
> Mom's AI processes the noise **before** the search ends — she can start moving toward the player before they've finished searching.

---

## ══════════════════════
## SECTION 9 — MOTHER AI
## ══════════════════════

Mom has **9 behavioral states** that transition based on stimuli.

```
[SLEEP] ←──────────────────────────────────────┐
   ↓ (noise / random stir)                     │
[FAKE SLEEP] ──→ (player moves) ──→ [PATROL]   │
   ↓ (timeout)                          ↓      │
   └──→ [SLEEP]      (noise heard) ──→ [INVESTIGATE]
                                           ↓
                                  (player spotted)
                                           ↓
                                       [CHASE]
                                           ↓
                                  (player escaped)
                                           ↓
                                       [SEARCH]
                                           ↓
                                 (search timeout)──→ [RETURN] ──→ [SLEEP]

[TRANQUILIZED] ← (hit by dart, 25 s knockout)
[FINALE] ← (phone buzzes in Act 3)
```

### State Definitions

**SLEEP**
- Mom is in bed, producing soft snoring
- Can be woken by:
  - Any noise above threshold 0.38 reaching her position (attenuated by walls)
  - Random light-sleep stir (every 14–32 s, 65% chance to become patrol)
  - First guaranteed patrol after 16 s
  - Phone vibration (Act 2) — 100% wake
- 55% chance to keep roaming instead of going back to bed

**FAKE SLEEP** *(20% normal / 35% hard)*
- Mom lies down, snoring stops
- Completely motionless for up to 30 seconds
- If the player moves: she rises silently → PATROL
- If timeout: real SLEEP

**PATROL**
- Semi-random route through **both floors** (she uses the stairs)
- Carries broom → *tap...tap...tap...* (distinct rhythm)
- Speed: 1.54 m/s (70% of player walk)
- May stop in doorways for 5–10 s (35% chance) — extremely unnerving
- Broom tap **always reveals her location** — until it stops

**INVESTIGATE**
- Triggered: Mom hears a noise above her threshold
- Walks directly to the noise source at 1.98 m/s (90% of player walk)
- Examines the area: 10–20 seconds
- If she finds nothing: returns to patrol
- If she spots the player: → CHASE
- Audio: no broom taps. She moves silently.

**SEARCH**
- Triggered: player lost during chase, or suspicious evidence found
- Checks hiding spots methodically
- Duration: 20–40 seconds
- If she finds the player: → CHASE
- If timer expires: → RETURN

**CHASE**
- Triggered: direct line of sight to player for 0.5 seconds
- Speed: 3.52 m/s (160% of player walk — faster than walk, slower than sprint)
- Does NOT give up for 15 seconds after losing sight
- Anticipates doorways — doesn't always follow the exact path player took
- Player stress → 100 instantly
- Catch distance: 0.95 m → Game Over (jumpscare)

**RETURN**
- Mom walks back to bedroom at 1.43 m/s (65% of player walk)
- Broom taps resume
- Entering bedroom triggers potential FAKE SLEEP

**TRANQUILIZED**
- Hit by tranquilizer dart
- Collapses for 25 seconds
- Completely unresponsive
- After waking: → PATROL (angry)

**FINALE**
- Triggered by phone vibration in Act 3
- Mom exits bedroom after 4 seconds
- Walks directly to the room where phone originally was
- If phone is there → picks it up, returns to sleep (success path)
- If phone is missing → SEARCH

### Mom's Memory System *(Hard Mode)*
Mom **remembers** where noises came from:
- Checks rooms where she previously heard sounds more frequently
- If the player hid in the same spot twice, she may check it first on SEARCH

### Mom's Hearing
- Base hearing range: 9 m
- Scaled by noise intensity and wall count
- Wall attenuation: ×0.38 per wall between source and Mom
- Hearing sensitivity multiplier varies by state

---

## ══════════════════════
## SECTION 10 — AUDIO DESIGN
## ══════════════════════

> **This is the most important system in the game.**
> Audio design is not decoration. It IS the gameplay.

### Ambient Soundscape (Always Present)

| Sound           | Location       | Purpose                         |
|-----------------|----------------|---------------------------------|
| Clock ticking   | Living room    | Rhythmic grounding              |
| Fridge hum      | Kitchen        | Masks medium sounds in kitchen  |
| Fan whirring    | Hallway        | White noise                     |
| Crickets        | Exterior       | Night atmosphere                |
| Dripping sink   | Bathroom       | Unsettling rhythm               |

### Mom's Audio Profile

| State         | Sound                               | What Player Learns       |
|---------------|-------------------------------------|--------------------------| 
| Sleep         | Soft snoring (rhythmic)             | She's in her room        |
| Patrol        | *Tap...tap...tap...* (broom)        | Her exact position       |
| Investigate   | Footsteps only (no broom)           | She heard something      |
| Search        | Slow footsteps + soft murmuring     | She's hunting            |
| Chase         | Rapid footsteps + voice line        | RUN                      |
| Fake Sleep    | **Absolute silence**                | Maximum uncertainty      |
| Tranquilized  | Nothing                             | She's down (for now)     |

### The Silence Mechanic
When all Mom-related audio stops:
- No snoring, no broom taps, no footsteps, no voice

This can mean:
1. She's standing still, listening
2. She's directly behind a door the player is about to open
3. She fell back into real sleep
4. She's in the same room, waiting
5. She's faking sleep

The player has **no way to know which one** without moving — and moving makes noise.

> This moment should feel worse than the chase.

---

## ══════════════════════════
## SECTION 11 — HIDING SYSTEM
## ══════════════════════════

### Available Hiding Spots (11 total)

| Spot                     | Room            | Floor | Safety | Notes                                      |
|--------------------------|-----------------|-------|--------|---------------------------------------------|
| Get in bed               | Player Bedroom  | 1F    | 0.95   | Counts as "in bed" for endings; no under-bed option |
| Inside wardrobe          | Player Bedroom  | 1F    | 0.70   | Visible on SEARCH                           |
| Behind sofa              | Living Room     | 1F    | 0.50   | Only works if Mom doesn't enter fully       |
| Behind curtains          | Living Room     | 1F    | 0.35   | Shadow visible; lowest safety               |
| Inside big box           | Storage Room    | 1F    | 0.75   | Hard to reach under pressure                |
| Behind shower curtain    | Bathroom        | 1F    | 0.70   | Lockable door buys 10 s                     |
| Under Mom's bed          | Mom's Bedroom   | 1F    | 0.85   | Extreme risk — used for secret ending       |
| Under guest bed          | Guest Bedroom   | 2F    | 0.80   | Upstairs safe haven                         |
| In guest wardrobe        | Guest Bedroom   | 2F    | 0.65   | —                                           |
| Under dust sheet         | Junk Room       | 2F    | 0.60   | —                                           |
| In clothes pile          | Laundry Room    | 2F    | 0.70   | —                                           |

### While Hiding
- Player becomes invisible to Mom's sight-based detection
- But NOT immune to:
  - Making noise (heavy breathing if stress is maxed)
  - Being found during SEARCH state (Mom checks each spot)
  - Moving too soon
- Press **Q** to listen (hear ambient cues for Mom's position)
- Press **E** again to exit

---

## ═══════════════════════════
## SECTION 12 — DETECTION SYSTEM
## ═══════════════════════════

Mom detects the player via two channels: **Sound** and **Sight**.

### Sound Detection

| Action               | Noise Intensity |
|----------------------|-----------------|
| Crouch walk (carpet) | 0.05            |
| Crouch walk (tile)   | 0.12            |
| Crouch walk (wood)   | 0.15            |
| Walk (carpet)        | 0.20            |
| Walk (tile/wood)     | 0.40–0.45       |
| Sprint (any surface) | 0.80            |
| Open drawer          | 0.30            |
| Open wardrobe        | 0.50            |
| Stumble (0 stamina)  | 0.70            |
| Door creak (Mom's)   | 0.45            |
| Peek (from hiding)   | 0.08            |
| Phone buzz (Act 2)   | **1.00**        |

### Sight Detection
- Mom has a **60° forward vision cone**
- Vision cone range depends on light level:
  - Dark room: 2.4 m
  - Dim room: 4.5 m
  - Lit room: 8.5 m
- Player standing still in dim light: 30% detection rate
- Player moving in any light: full detection

### Detection Meter
Internal value 0–100. Decays at 14/sec when not in view.

| Source               | Fill Rate          |
|----------------------|--------------------|
| In Mom's sight cone  | 20/sec             |
| Player sprinting     | +5 bonus           |
| Using flashlight     | +3 bonus           |
| **At 100**           | → CHASE triggered  |

---

## ═════════════════════════
## SECTION 13 — FLASHLIGHT
## ═════════════════════════

Found on the player's desk at game start.

- **Uses**: Illuminate dark rooms (Storage, Study, parts of hallway)
- **Risk**: Flashlight beam is visible to Mom (+3 detection bonus while in her LOS)
- **Toggle**: Press **F** to turn on/off instantly
- **Battery**: Unlimited (this is not a survival game — the flashlight is a tool, not a resource)

> The flashlight forces a tradeoff — see better, but risk being seen.
> In Storage Room (dark), it's almost necessary. Near Mom's room, it's suicidal.

---

## ══════════════════════════
## SECTION 14 — THE REPLY PHASE (ACT 2)
## ══════════════════════════

When the phone is found:

1. Player picks up phone
2. Screen dims slightly — phone screen glow appears
3. Messages load:

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

4. **5-second countdown** begins to select a reply
5. Reply options:
   - [1] "Sorry, mom took my phone"
   - [2] "I'm here, what's wrong?"
   - [3] "still here sorry"
   - [4] *[Say nothing — just close app]*

6. Option 4 lets the player chicken out — no reply, game continues without triggering Act 3. Victory message reads differently.
7. If any other option is selected → message sends → **phone vibrates at maximum intensity (1.0)**

---

## ════════════════════════
## SECTION 15 — THE FINAL PHASE (ACT 3)
## ════════════════════════

### Trigger: Phone vibrates

Immediately on vibration:
- Mom wakes. **100% guaranteed.**
- Player stress → 100 instantly
- Screen flashes
- A 10-second countdown appears: **"PUT IT BACK. GET TO BED."**

### What the player must do in 10 seconds:
1. **Return the phone** to its original hiding spot
2. **Get back to their bedroom**
3. **Get in bed**

### Mom's behavior in Final Phase:
- Exits bedroom after 4 seconds (player has a 4-second window)
- Walks directly to the room where phone originally was
- If phone is there → picks it up, mutters, returns to sleep *(success path)*
- If phone is missing → SEARCH

### The Tension Mechanic:
The phone must be placed **before** Mom reaches that room.
The player must be in bed **before** Mom checks the bedroom.
These two tasks often require choosing which to prioritize.

---

## ═══════════════════════
## SECTION 16 — ENDINGS
## ═══════════════════════

### ENDING 1 — "Good Night" *(Best Ending)*
Requirements: Phone returned, player in bed, Mom fooled, reply sent

```
MESSAGE DELIVERED ✓
Bestie: "omg finally. i knew you weren't ignoring me 💙"

"Good night."
```

### ENDING 2 — "Coward" *(Neutral Ending)*
Requirements: Phone returned, player in bed, reply NOT sent

```
Phone returned. Mom asleep.
Mission accomplished.
...But you never replied.
"Maybe tomorrow."
```

### ENDING 3 — "Caught" *(Standard Failure)*
Mom catches player (catch distance ≤ 0.95 m).

```
[Jumpscare: Mom's face on black screen for 3 s, then scream for 5.5 s]
Mom's voice: "We'll talk in the morning."
CAUGHT
[Retry? / Quit]
```

### ENDING 4 — "The Waiting Kind" *(Secret Ending)*
Requirements: Player hides under **Mom's bed** during Final Phase and waits 18 seconds for her to go back to sleep.

```
[Mom enters room. Checks nightstand. Finds phone.]
[She sits on the edge of the bed.]
[The mattress sags above you.]
[She sighs.]
[She lies down.]
[Silence.]

[Player must crawl out slowly without waking her.]

"That was the longest five minutes of your life."
```

---

## ═══════════════════════════
## SECTION 17 — DIFFICULTY MODES
## ═══════════════════════════

### EASY MODE — "Practice Run"
- Mom wakes but with reduced aggression (explore mode)
- Dual floor map always visible on screen
- No stress effects
- Shorter search times (×0.5)
- Purpose: Learn the house before committing to a real run

### NORMAL MODE — "Don't Wake Mom"
- Full gameplay
- Dual floor map visible (toggle with M/Tab)
- Mom dot on map (color-coded by state)
- Status notifications: "MOM IS AWAKE" / "MOM IS APPROACHING" / "MOM IS SEARCHING"
- Standard search times

### HARD MODE — "She Already Knows"
- No map
- No notifications
- No icons / HUD hints
- Mom's patrol routes are longer and less predictable
- Mom memory system active
- Fake sleep frequency: 35% (vs 20% normal)
- Search times ×1.6
- The only info the player has: their own memory + audio cues + spatial reasoning
- **This is the intended experience for replay**

---

## ════════════════════════════════
## SECTION 18 — TECHNICAL IMPLEMENTATION
## ════════════════════════════════

### Engine & Stack
- **React 19** + **TypeScript 6**
- **Three.js** via **React Three Fiber**
- **Rapier** physics via `@react-three/rapier`
- **Zustand** state management
- **Vite** build tool
- Deployed to **GitHub Pages** (branch `gh-pages`)

### Project Structure
```
src/
├── App.tsx                         # Root — Canvas + HUD wrapper
├── main.tsx                        # Entry point
├── constants.ts                    # ALL tuning values (GDD numbers live here)
├── components/
│   ├── Experience.tsx              # Scene composition (lights, physics, house, mom, player)
│   ├── PlayerController.tsx        # First-person controller (movement, stamina, crouch)
│   ├── PlayerCamera.tsx            # Mouse look (pointer lock)
│   ├── PostFX.tsx                  # Post-processing (vignette, blur, stress effects)
│   ├── canvas/
│   │   ├── House.tsx               # Procedural house geometry (walls, floors, doors, furniture)
│   │   ├── Mom.tsx                 # Mom mesh + animation
│   │   └── Containers.tsx          # Physical container search (drawers slide, doors swing)
│   └── ui/
│       ├── HUD.tsx                 # Map, objective, notifications, keypad, safe code
│       └── Overlays.tsx            # Title screen, phone UI, endings, jumpscare
├── game/
│   ├── house.ts                    # Room definitions, floor types, wall segments, staircase
│   ├── momAI.ts                    # 9-state AI state machine
│   ├── spots.ts                    # 53 search spots + 11 hide spots (positions, tiers, classes)
│   ├── interactions.ts             # Player↔object interaction logic
│   ├── furnitureData.ts            # Furniture geometry (procedural meshes, sizes, textures)
│   └── runtime.ts                  # Tick-level game state (positions, timers, noise events)
├── state/
│   └── gameStore.ts                # Zustand store (persistent game state, UI flags)
├── systems/
│   ├── audio.ts                    # Positional audio engine (Web Audio API)
│   ├── playerLook.ts               # Mouse look state
│   ├── useDirector.ts              # Game director (act progression, pacing)
│   └── useInput.ts                 # Input bindings (keyboard + mouse)
└── utils/
    └── proceduralTextures.ts       # Canvas-based texture generation (wood, carpet, tile, wall)
```

### Key Architectural Decisions
- **100% procedural assets** — no external models, textures, or audio samples
- **Procedural textures** generated on canvas at startup (wood grain, carpet, tile patterns, ceiling, wall)
- **Granny-style visual upgrade**: baseboards, door frames, crown molding, wainscoting — all geometry in `House.tsx`
- **Physical containers**: `Containers.tsx` renders animated drawer/door meshes; furniture data tags which parts to hide when a container is open (`hideForSpot`)
- **All tuning numbers** in `constants.ts` with GDD section references in comments
- **Noise event bus** via `runtime.ts` — emitNoise() fires events that Mom AI subscribes to

### Map Implementation
- Both floors rendered as side-by-side canvases in `HUD.tsx`
- Player position dot + direction triangle
- Mom dot color-coded by AI state
- Room labels, door indicators, stair markers (↑STAIRS / ↓STAIRS)
- No toggle/switch — both maps always visible simultaneously

---

## ════════════════════════════
## SECTION 19 — VISUAL STYLE
## ════════════════════════════

### Art Style
- First-person 3D (not top-down, not pixel art)
- Procedurally generated textures — no external assets
- Dark interior, realistic proportions
- Light sources: player flashlight, fridge glow, phone screen
- Granny-style house details (baseboards, crown molding, wainscoting, door frames)

### Procedural Textures
| Surface | Style |
|---|---|
| Wood floor | Warm brown grain pattern |
| Carpet | Soft fabric texture |
| Tile | Kitchen/bathroom ceramic pattern |
| Walls | Painted drywall |
| Ceiling | White textured |

### UI Style
- Minimal HUD — no health bars, no visible stress number
- Stress effects are visual/audio only (vignette, heartbeat, blur)
- Context prompts appear near objects (floating text)
- Phone UI uses realistic chat interface aesthetic
- Dual floor map: simple floor-plan style with colored dots

---

## ══════════════════════════
## SECTION 20 — FEEL & POLISH TARGETS
## ══════════════════════════

The game should feel **good** in these moments:

- **Crouching past a doorway** as Mom's broom taps echo from the next room
- **Holding your breath** at 98 stress, listening to broom taps get quieter
- **Opening the fridge slowly** and finding the phone — that one moment of relief
- **Sprinting back to your room** with 4 seconds left, knowing you're cutting it close
- **Lying in bed** as Mom opens your door, looks in, and leaves
- **Silence** after the chase ends — is she gone? Or waiting?
- **The staircase** — hearing Mom's footsteps above you, or below you, and not knowing which way she's going

The game is finished when a player says:

> *"My heart was literally pounding."*

---

*Document version: 2.1*
*Game: Don't Wake Mom 3D*
*Engine: React Three Fiber + Rapier | Genre: Stealth Horror-Comedy | Platform: Browser (GitHub Pages)*
