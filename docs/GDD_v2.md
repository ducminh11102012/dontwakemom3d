# DON'T WAKE MOM — Game Design Document v2.0
> **For AI Use**: This is a complete, implementation-ready game design prompt.  
> Build this game in **Godot 4**, **GDScript**, **pixel art**, **top-down 2D**.  
> Follow every section carefully. Where system interactions overlap, prioritize **audio design** above all else.

---

## ═══════════════════════════════
## SECTION 1 — CONCEPT & CORE LOOP
## ═══════════════════════════════

### Elevator Pitch
A **stealth horror-comedy** game where the only monster is your own mother.  
No weapons. No combat. No jump scares.  
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
- Age: ~15-16
- No name (preserve universality)
- Wears pajamas
- Moves in four modes: Walk, Crouch, Run, Hide
- Has no way to fight back — can only **evade, wait, and hide**
- Health: Not tracked. One catch = Game Over.

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

| Mode    | Speed   | Noise Level | Stamina Use | Trigger         |
|---------|---------|-------------|-------------|-----------------|
| Walk    | 100     | Low         | None        | Default         |
| Crouch  | 60      | Very Low    | None        | Hold [Crouch]   |
| Run     | 180     | **HIGH**    | 10/sec      | Hold [Sprint]   |
| Hide    | 0       | None        | None        | Press [Interact] at hiding spot |

### Stamina System *(Normal + Hard only)*
- Max: 100
- Running drains: 10/sec
- Recovery (stationary or walking): 15/sec
- **At 0 stamina**:
  - Player stumbles (brief slowdown)
  - Audible heavy breathing that **cannot be suppressed**
  - This breathing can wake Mom from across the house
  - This is intentional — punishes reckless sprinting

### Noise Footprint System
Each surface type generates different footstep sound levels:

| Floor Type    | Noise Level | Notes                          |
|---------------|-------------|--------------------------------|
| Carpet        | Very Low    | Safe to walk on                |
| Tile / Kitchen| Medium      | Crouch recommended             |
| Wood hallway  | **High**    | Every step audible             |
| Bathroom tile | Medium-High | Echo makes it sound louder     |

> **Implementation**: Attach a `NoiseEmitter` component to player.  
> Every footstep fires a signal with intensity based on movement mode × floor type.  
> Mom's AI reacts to this signal via a hearing range check.

---

## ══════════════════════════
## SECTION 5 — STRESS SYSTEM
## ══════════════════════════

### The Heartbeat Meter
An internal value from **0 to 100** that represents the player's anxiety.

```
0 ──────────────────────────────────── 100
Calm                              Full Panic
```

### Triggers (Increases Stress)

| Event                         | Stress Added |
|-------------------------------|--------------|
| Mom within 3 rooms            | +15/sec      |
| Mom within same room          | +30/sec      |
| Mom looks toward player       | +50 (instant)|
| Chase begins                  | → 100 (instant)|
| Silence after sound (Mom quiet)| +10/sec     |
| Phone buzzes (Act 2)          | +60 (instant)|

### Triggers (Decreases Stress)

| Event                           | Stress Removed |
|---------------------------------|----------------|
| Mom far away / sleeping         | -5/sec         |
| Player hiding                   | -8/sec         |
| Player in own bedroom           | -12/sec        |
| Deep breath mechanic (see below)| -20 (manual)   |

### Visual / Audio Effects by Stress Level

| Level | Effect                                                        |
|-------|---------------------------------------------------------------|
| 0–20  | No effect                                                     |
| 21–40 | Faint heartbeat sound begins (low, distant)                   |
| 41–60 | Heartbeat louder. Screen edges pulse subtly (dark vignette)   |
| 61–80 | Heavy breathing. Vignette deepens. UI elements tremble        |
| 81–99 | Screen blurs. Heartbeat overwhelming. Audio muffles slightly  |
| 100   | **PANIC STATE** — Screen shakes. Vision nearly black. 3-second window to hide or it's Game Over |

### Hold-Breath Mechanic *(New)*
Press and hold **[Hold Breath]** to manually suppress stress by -20.  
- Can only be used when **hiding or stationary**  
- Takes 2 seconds to activate  
- Plays a deliberate exhale sound (very quiet)  
- Cooldown: 15 seconds  
- Represents the player mentally calming themselves down

---

## ═══════════════════════
## SECTION 6 — HOUSE DESIGN
## ═══════════════════════

```
┌─────────────────────────────────────────┐
│  [STORAGE]   │  [BATHROOM]              │
│              ├──────────────────────────┤
│  [MOTHER'S   │  [HALLWAY]  │ [KITCHEN]  │
│   BEDROOM]   │             │            │
│              ├─────────────┤            │
│  [LIVING ROOM]             │            │
│                            │            │
│  [PLAYER BEDROOM]          └────────────┤
│                                         │
└─────────────────────────────────────────┘
```

### Room Details

**Player Bedroom** *(Spawn + Safe Zone)*
- Bed (hiding spot + spawn point)
- Desk (key item: flashlight)
- Wardrobe (hiding spot)
- Window (ambient noise: crickets, distant cars)
- Door to hallway

**Mother's Bedroom** *(Danger Zone — Priority 1)*
- Mom sleeps here at game start
- Her broom leans against the wall (source of *tap tap tap* during patrol)
- Nightstand drawer (possible phone location)
- Under pillow (possible phone location — highest risk)
- Wardrobe (possible phone location — medium risk)
- **The door creaks** when opened. Always.

**Kitchen** *(Medium Danger)*
- Fridge (hums constantly — good audio cover, also a phone hiding spot)
- Rice container (most unexpected phone location)
- Cabinets + drawers
- Tile floor = loud footsteps, crouch always

**Living Room** *(Medium Danger)*
- TV stand (possible phone location)
- Bookshelf (possible phone location)
- Sofa (hiding spot — player lies behind it)
- Curtains (hiding spot)
- Soft carpet — safest floor for movement

**Bathroom** *(Occasional Danger)*
- Cabinet (possible phone location)
- Door has a lock (player can lock it from inside — buys 10 seconds if Mom is chasing)
- Sink drip creates constant ambient noise

**Hallway** *(Transition Zone — Most Dangerous)*
- Wood floor — every step audible
- No hiding spots
- If Mom enters hallway while player is in it: extremely dangerous
- The most tense 5 seconds in the game happen here

**Storage Room** *(Low Danger)*
- Boxes, baskets (possible phone locations)
- Very dark — requires flashlight
- Large box (player can hide inside)

---

## ═══════════════════════════════
## SECTION 7 — PHONE SPAWN SYSTEM
## ═══════════════════════════════

The phone is hidden in a **different location every run** (seeded randomly at game start).

### Spawn Location Tiers

**TIER 1 — High Risk, High Anxiety** *(20% chance)*
- Under Mom's pillow (she's lying on it)
- Mom's nightstand drawer (inches from her head)

**TIER 2 — Medium Risk** *(40% chance)*
- Mom's wardrobe
- Kitchen fridge
- Living room TV cabinet

**TIER 3 — Lower Risk** *(40% chance)*
- Kitchen rice container
- Living room bookshelf
- Storage box
- Bathroom cabinet

> **Important**: The phone can spawn in the same room Mom currently occupies.  
> The game should never guarantee a safe retrieval.

### Phone Not Found (Dead Ends)
Some searchable objects **look like** they could contain the phone but don't.  
This wastes time, creates noise, and builds dread.  
Ratio: For every real phone location, there are 4–5 fake search targets per room.

---

## ══════════════════════════
## SECTION 8 — INTERACTION SYSTEM
## ══════════════════════════

Press **[E]** / **[Interact]** near any highlighted object.

### Interaction Types

| Action       | Description                                                |
|--------------|------------------------------------------------------------|
| Open/Close   | Doors, drawers, cabinets                                   |
| Search       | Look through containers for the phone                      |
| Hide         | Player enters a hiding spot                                |
| Pick Up      | Grab the phone once found                                  |
| Return       | Place phone back in its original location                  |
| Hold Breath  | Available while hiding (see Stress System)                 |

### Search Duration by Object

| Object           | Easy  | Normal | Hard  | Noise Generated |
|------------------|-------|--------|-------|-----------------|
| Pillow           | 0.5s  | 1.5s   | 2.5s  | Very Low        |
| Small drawer     | 0.5s  | 1.5s   | 2.5s  | Low             |
| Large drawer     | 1s    | 2s     | 3s    | Medium          |
| Fridge           | 1s    | 2s     | 3s    | Low (hum covers)|
| Wardrobe         | 1.5s  | 2.5s   | 4s    | Medium-High     |
| Rice container   | 1s    | 2s     | 3s    | Medium (rustling)|
| Large box        | 1.5s  | 3s     | 5s    | Medium           |

> **Note**: Searching is an animation + sound event. Mom's AI processes this sound **before** the search ends, meaning she can start moving toward the player **before** they've finished searching.

---

## ══════════════════════
## SECTION 9 — MOTHER AI
## ══════════════════════

Mom has **6 behavioral states** that transition based on stimuli.

```
[SLEEP] ←──────────────────────────────────┐
   ↓ (noise / random light sleep)           │
[PATROL] ──→ (noise heard) ──→ [INVESTIGATE]│
                                     ↓      │
                           (player spotted) │
                                     ↓      │
                                 [CHASE]    │
                                     ↓      │
                          (player escaped)  │
                                     ↓      │
                                 [SEARCH]   │
                                     ↓      │
                       (search timeout)─────┘
                                 [RETURN]
```

### State Definitions

**SLEEP**
- Mom is in bed, producing soft snoring
- Snoring rhythm is audible across the house
- Can be woken by:
  - Any medium+ noise in her room
  - Any high noise anywhere in house
  - Phone vibration (Act 2)
  - Random light-sleep event (every 45–90 seconds, she stirs but may not wake)
- **FAKE SLEEP MECHANIC**: 20% of returns to bedroom result in fake sleep.  
  Mom lies down, snoring stops... and she waits, motionless, for up to 30 seconds.  
  If the player moves, she rises silently.

**PATROL**
- Mom walks a semi-random route through the house
- Carries broom → *tap...tap...tap...* (1 tap per step, distinct rhythm)
- Patrol speed: 70% of player walk speed
- Route changes every patrol cycle
- She may stop and stand still in doorways for 5–10 seconds (extremely unnerving)
- Her broom tap **always reveals her location** — until it stops

**INVESTIGATE**
- Triggered: mom hears a noise above her threshold
- She walks directly to the noise source
- Examines the area: 10–20 seconds
- If she finds nothing: returns to patrol
- If she finds an open drawer or moved object: transitions to **SEARCH**
- Audio during investigate: no broom taps. She moves silently.

**SEARCH**
- Triggered: player lost during chase, OR suspicious evidence found
- Checks all hiding spots within 2 rooms methodically
- Duration: 20–40 seconds
- **She calls out softly** during this phase ("I can hear you breathing...")
- If she finds the player: **CHASE**
- If timer expires: **RETURN**

**CHASE**
- Triggered: direct line of sight to player for 0.5 seconds
- Mom moves at 160% of player walk speed (faster than walk, slower than sprint)
- She does NOT give up for 15 seconds of losing sight
- She **anticipates doorways** — does not always follow exact path player took
- Player stress → 100 instantly
- Music starts
- Mom speaks: *"I knew it!"* / *"Where do you think you're going?"* / *"Get back here!"*

**RETURN**
- Mom walks back to bedroom
- Broom taps resume
- She may mutter to herself (ambient flavor)
- Entering bedroom triggers potential FAKE SLEEP

### Mom's Memory System *(Hard Mode)*
In Hard Mode, Mom **remembers** where noises came from.  
- If she heard a sound in the kitchen once, she will **check the kitchen more frequently** on subsequent patrols
- If the player hid under the same bed twice, she may check that hiding spot first on SEARCH

---

## ══════════════════════
## SECTION 10 — AUDIO DESIGN
## ══════════════════════

> **This is the most important system in the game.**  
> Audio design is not decoration. It IS the gameplay.

### Ambient Soundscape (Always Present)
These create the baseline atmosphere and serve as noise masking:

| Sound           | Location       | Purpose                         |
|-----------------|----------------|---------------------------------|
| Clock ticking   | Living room    | Rhythmic grounding              |
| Fridge hum      | Kitchen        | Masks medium sounds in kitchen  |
| Fan whirring    | Hallway        | Continuous white noise          |
| Crickets        | Exterior       | Night atmosphere                |
| Distant traffic | Exterior       | Occasional (not constant)       |
| Dripping sink   | Bathroom       | Unsettling rhythm               |
| AC vent buzz    | Hallway ceiling| Subtle                          |

### Positional Audio (Critical Mechanic)

All sounds use **stereo positioning**:
- Left pan = Mom is to the left
- Right pan = Mom is to the right
- Volume = distance (closer = louder)
- Reverb changes based on wall count between player and Mom

Player should be able to close their eyes and know roughly where Mom is — until the sound stops.

### Mom's Audio Profile

| State       | Sound                               | What Player Learns       |
|-------------|-------------------------------------|--------------------------|
| Sleep       | Soft snoring (rhythmic)             | She's in her room        |
| Patrol      | *Tap...tap...tap...* (broom)        | Her exact position       |
| Investigate | Footsteps only (no broom)           | She heard something      |
| Search      | Slow footsteps + soft murmuring     | She's hunting            |
| Chase       | Rapid footsteps + voice line        | RUN                      |
| Fake Sleep  | **Absolute silence**                | Maximum uncertainty      |

### The Silence Mechanic *(The Most Terrifying Moment)*

When all Mom-related audio stops:
- No snoring
- No broom taps
- No footsteps
- No voice

This can mean:
1. She's standing completely still, listening
2. She's directly behind a door the player is about to open
3. She fell back into real sleep
4. She's in the same room, waiting

The player has **no way to know which one** without moving — and moving makes noise.

> This moment should feel worse than the chase.

### Dynamic Music System
- **No music during normal exploration** — ambient sounds only
- **Music Layer 1** (low, barely audible): activates when Mom is in INVESTIGATE
- **Music Layer 2** (building tension): activates when Mom is in SEARCH
- **Music Layer 3** (full intensity): activates on CHASE
- Music **cuts out** the moment the chase ends → silence → even more terrifying

---

## ══════════════════════════
## SECTION 11 — HIDING SYSTEM
## ══════════════════════════

### Available Hiding Spots

| Spot              | Room          | Safety Level | Notes                                      |
|-------------------|---------------|--------------|---------------------------------------------|
| Under player's bed| Player Room   | Very High    | Mom rarely checks here first                |
| Inside wardrobe   | Player Room   | High         | Visible on SEARCH                           |
| Behind living room sofa | Living  | Medium       | Only works if Mom doesn't enter fully       |
| Behind curtains   | Living Room   | Medium-Low   | Shadow visible if flashlight used           |
| Inside large box  | Storage       | High         | Hard to reach under pressure                |
| Bathroom stall    | Bathroom      | High if locked| Lockable — buys 10 seconds                 |
| Under Mom's bed   | Mom's Room    | **Extreme risk** | She may sleep again and discover you morning|

### While Hiding
- Player becomes invisible to Mom's sight-based detection
- But NOT immune to:
  - Making noise (coughing/breathing if stress is maxed)
  - Being found during SEARCH state (Mom checks each spot)
  - Moving too soon (Mom may still be nearby)

### Leaving a Hiding Spot
- Press [Interact] again to exit
- A **peek mechanic** lets player press [Peek] to hear if Mom is still nearby
- Peeking makes a tiny sound but gives partial audio info

---

## ═══════════════════════════
## SECTION 12 — DETECTION SYSTEM
## ═══════════════════════════

Mom detects the player via two channels: **Sound** and **Sight**.

### Sound Detection
```
Each noise event fires with an intensity value (0.0 – 1.0)
Mom receives this if within hearing range
Hearing range = base_range × (1 + (100 - stress) / 100)
(Mom hears better when calmer)
```

| Action               | Noise Intensity |
|----------------------|-----------------|
| Crouch walk (carpet) | 0.05            |
| Crouch walk (wood)   | 0.15            |
| Walk (carpet)        | 0.20            |
| Walk (tile/wood)     | 0.40            |
| Run (any surface)    | 0.80            |
| Open drawer          | 0.30            |
| Open wardrobe        | 0.50            |
| Stumble (0 stamina)  | 0.70            |
| Phone buzz (Act 2)   | **1.00**        |

### Sight Detection
- Mom has a **vision cone** (60° forward arc, adjustable)
- Vision cone range depends on light level:
  - Dark room: 1.5 tiles
  - Dim room: 3 tiles
  - Lit room: 6 tiles
- Player standing still in dim light: 30% detection chance per second
- Player moving in any light: full detection

### Detection Meter
Internal value 0–100.

| Source               | Fill Rate          |
|----------------------|--------------------|
| In Mom's hearing     | Based on intensity |
| In Mom's sight cone  | 20/sec             |
| Player running       | +5 bonus           |
| Using flashlight     | +3 bonus           |
| **At 100**           | → CHASE triggered  |

---

## ═════════════════════════
## SECTION 13 — FLASHLIGHT
## =========================

The player starts with a small flashlight (found on the desk in their bedroom).

- **Uses**: Illuminate dark rooms (Storage, parts of hallway)
- **Risk**: Flashlight beam is visible to Mom (increases detection while in her LOS)
- **Toggle**: Press [F] to turn on/off instantly
- **Battery**: Unlimited (this is not a survival game — the flashlight is a tool, not a resource)

> **Design Tip**: The flashlight forces a tradeoff — see better, but risk being seen.  
> In Storage Room (dark), it's almost necessary.  
> In the hallway near Mom's room, it's suicidal.

---

## ══════════════════════════
## SECTION 14 — THE REPLY PHASE
## ══════════════════════════

When the phone is found:

1. Player picks up phone
2. Screen dims slightly — phone screen glow appears
3. Messages load (typewriter effect, slightly delayed):

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

6. Option 4 lets the player chicken out — no reply sent, game continues without triggering Act 3.  
   But the victory message will read differently.

7. If any other option is selected → message sends → **phone vibrates at maximum intensity**

---

## ════════════════════════
## SECTION 15 — THE FINAL PHASE (ACT 3)
## ════════════════════════

### Trigger: Phone vibrates

Immediately on vibration:
- Mom wakes. **100% guaranteed. No exceptions.**
- Her position: locked in bedroom, but she's rising NOW
- Player stress → 100 instantly
- Screen flashes
- A 10-second countdown appears: **"PUT IT BACK. GET TO BED."**
- Music hits full intensity

### What the player must do in 10 seconds:
1. **Return the phone** to its original hiding spot (or somewhere close)
2. **Get back to their bedroom**
3. **Hide** (in bed, under bed, in wardrobe)

### Mom's behavior in Final Phase:
- Exits bedroom after 4 seconds (player has a 4-second window)
- Walks directly to the room where phone originally was
- Checks for the phone
- If phone is there → she picks it up, mutters, returns to sleep *(success path)*
- If phone is missing → SEARCH begins *(worst case)*

### The Tension Mechanic:
The phone must be placed **before** Mom reaches that room.  
The player must be hidden **before** Mom checks the bedroom.  
These two tasks often require the player to choose which to prioritize.

---

## ═══════════════════════
## SECTION 16 — ENDINGS
## ═══════════════════════

### ENDING 1 — "Good Night" *(Best Ending)*
Requirements: Phone returned, player in bed, Mom fooled, reply sent

```
[Screen fades to black]
[Phone notification sound — gentle]

MESSAGE DELIVERED ✓
Bestie: "omg finally. i knew you weren't ignoring me 💙"

...

"Good night."
[Achievement: One Last Reply]
```

### ENDING 2 — "Coward" *(Neutral Ending)*
Requirements: Phone returned, player in bed, reply NOT sent

```
[Screen fades to black]

Phone returned.
Mom asleep.
Mission accomplished.

...But you never replied.

"Maybe tomorrow."
```

### ENDING 3 — "Caught" *(Standard Failure)*
Mom catches player with phone in hand.

```
[Screen cuts to black]

Mom's voice: "We'll talk in the morning."

CAUGHT
[The longest three words you'll ever read at 2AM]
[Retry? / Quit]
```

### ENDING 4 — "The Waiting Kind" *(Secret Ending)*
Requirements: Player hides under **Mom's bed** during Final Phase and waits for her to go back to sleep.

```
[Mom enters room. Checks nightstand. Finds phone.]
[She sits on the edge of the bed for a long moment.]
[The mattress sags above you.]
[She sighs.]
[She lies down.]
[Silence.]

...

[Player must crawl out slowly without waking her.]

[If successful:]

"That was the longest five minutes of your life."
[Achievement: This Never Happened]
```

---

## ═══════════════════════════
## SECTION 17 — DIFFICULTY MODES
## ═══════════════════════════

### EASY MODE — "Practice Run"
- Mom doesn't wake (house exploration mode)
- Map always visible
- No stress effects
- No chase
- Purpose: Learn the house before committing to a real run

### NORMAL MODE — "Don't Wake Mom"
- Full gameplay
- Map enabled
- Status notifications:
  - "MOM IS AWAKE"
  - "MOM IS APPROACHING"
  - "MOM IS SEARCHING"
- Mom icon visible on map

### HARD MODE — "She Already Knows"
- No map
- No notifications
- No icons
- No hints
- Mom's patrol routes are longer and less predictable
- Mom memory system active
- Fake sleep frequency increased to 35%
- The only information player has:
  - Their own memory
  - Audio cues
  - Spatial reasoning
- **This is the intended experience for replay**

---

## ════════════════════════════════
## SECTION 18 — TECHNICAL IMPLEMENTATION GUIDE
## ════════════════════════════════

### Engine: Godot 4

### Suggested Node Structure
```
Main
├── World
│   ├── TileMap (floors, walls)
│   ├── Rooms (each room as Area2D)
│   └── Furniture + Interactables
├── Player (CharacterBody2D)
│   ├── Sprite2D (animated)
│   ├── CollisionShape2D
│   ├── NoiseEmitter (custom component)
│   ├── StressSystem (script)
│   └── StaminaSystem (script)
├── Mother (CharacterBody2D)
│   ├── Sprite2D (animated)
│   ├── CollisionShape2D
│   ├── AIStateMachine (script)
│   ├── HearingRange (Area2D)
│   └── VisionCone (custom RayCast2D array)
├── PhoneObject (Area2D)
│   └── Spawned at game start in random location
├── HUD
│   ├── StressOverlay
│   ├── HeartbeatAudio
│   └── ContextPrompts (interact hints)
└── AudioManager
    ├── AmbientLayer
    ├── MomAudio (positional)
    └── MusicLayerSystem
```

### Key Scripts Needed
- `PlayerController.gd` — movement, stamina, interaction
- `StressSystem.gd` — stress value management + visual effects
- `MotherAI.gd` — state machine with all 6 states
- `NoiseSystem.gd` — global noise event bus
- `PhoneSpawner.gd` — randomized spawn logic
- `AudioManager.gd` — layered audio, positional sound, music layers
- `HideSpot.gd` — manage player visibility while hiding
- `InteractableObject.gd` — base class for all searchable objects

### Positional Audio Implementation
Use Godot's `AudioStreamPlayer2D` for Mom's sounds.  
Set `max_distance` and `attenuation` to model hearing range.  
Use `bus` routing to process Mom's audio through a reverb/lowpass filter that increases based on wall count.

### Noise Event System
Use a **global Autoload** (`NoiseManager`) that emits a signal:
```gdscript
signal noise_event(position: Vector2, intensity: float)
```
All interactable objects and player movement emit this signal.  
Mom's AI subscribes to it and decides whether to INVESTIGATE.

---

## ════════════════════════════
## SECTION 19 — VISUAL STYLE GUIDE
## ════════════════════════════

### Art Style
- Pixel art, 16×16 or 32×32 tile grid
- Top-down, slightly angled perspective (not isometric)
- Dark interior palette — no bright colors
- Light sources: player flashlight, fridge light, phone screen glow

### Color Palette
```
Background (dark):   #0D0D14
Walls:               #1A1A2E
Floors (carpet):     #2C1F3D
Floors (tile):       #1C2C2C
Mom sprite:          Desaturated warm tones
Player sprite:       Slightly brighter (contrast with environment)
Phone screen:        #DDEEFF (cold blue-white glow)
Stress overlay:      #FF0000 (deep crimson vignette)
```

### UI Style
- Minimal HUD — no health bars, no meters visible on screen
- Stress effects are visual/audio only (no number shown)
- Context prompts appear near objects (floating text, fade in/out)
- Phone UI uses realistic chat interface aesthetic

---

## ══════════════════════════
## SECTION 20 — FEEL & POLISH TARGETS
## ══════════════════════════

The game should feel **good** in these moments:

- **Crouching under a desk** as Mom's footsteps pass 2 feet away
- **Holding your breath** at 98 stress, listening to broom taps get quieter
- **Opening the fridge slowly** and finding the phone — that one moment of relief
- **Sprinting back to your room** with 4 seconds left, knowing you're cutting it close
- **Lying in bed** as Mom opens your door, looks in, and leaves
- **Silence** after the chase ends

The game is finished when a player says:

> *"My heart was literally pounding."*

---

*Document version: 2.0*  
*Game: Don't Wake Mom*  
*Engine: Godot 4 | Genre: Stealth Horror-Comedy | Platform: PC*  
*Build this game exactly as described. No substitutions.*
