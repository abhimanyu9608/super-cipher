# Super Cipher: Office Run PRD

Nov 10, 2026 · @Abhimanyu

## 1. Overview

Super Cipher: Office Run is a free, browser-based retro 2D platformer about Indian corporate life, built to grow the Instagram account @cipherboy.dev. v1 ships two playable levels; Level 2 unlocks only after the player posts a Level 1 story and follows the account.

**One-liner:** Mario-style platformer where a young Delhi developer races from a 1RK flat to the office, dodging dogs, buses, bugs, meeting invites and a manager who wants "ek quick call".

**Story:** It is 9:12 AM. The player has a 9:30 meeting. Level 1 is the commute (home to metro). Level 2 is the office (lobby to the biometric machine). Each level ends with a promotion (Intern, Junior Dev, and so on), building toward CTO in the final level.

**Audience:** Indian office-goers and students aged 18 to 35, especially developers in Delhi NCR. They play on phones (primary) and laptops. They read Hinglish; an English mode serves everyone else.

**Reference prototype:** a working single-file HTML prototype of Level 1 already exists (canvas, \~1,000 lines). It is the source of truth for feel, physics and layout. The owner will add it to the repo as `reference/office-run-prototype.html` with its `img/` folder. Port its behaviour; do not copy its single-file structure.

**Goals and success metrics (first 60 days after launch)**

| Goal | Metric | Target |
| --- | --- | --- |
| People finish Level 1 | Level 1 completion rate of started runs | 35% or more |
| Players share | Level 2 unlock requests (DMs with a Player ID) | 300 |
| Account growth | New followers on @cipherboy.dev attributed to the game | 1,000 |
| Replay | Players who play 2+ runs | 40% |
| Performance | Steady frame rate on a mid-range Android phone | 55 to 60 fps |

Metrics are tracked without collecting personal data (see section 13).

## 2. Scope

v1 is a static website with two levels, a Level 2 unlock gate, and no backend. Leaderboard and server-checked codes come in v1.1.

**In v1 (MVP)**

- Website shell: header with brand and Instagram link, language switch, toolbar (Pause, Sound, Fullscreen, Restart), game stage, level map panel, how-to-play panel, credits.
- Title screen with character select (Cipherboy, Ciphergirl).
- Level 1-1 "Ghar se Metro": full parity with the prototype (6 zones, chai checkpoint, monkey mini-boss, metro door timer).
- Level 2 "Office Floor": 6 zones, water-cooler checkpoint, Manager boss, biometric finish (section 7).
- Screens: Pause, Game Over ("Resignation Accepted" with Ctrl+Z continue), Level Clear (stars, stats, corporate title), Level 2 Unlock.
- Instagram story card generator (1080x1920 PNG shown on screen).
- Per-player unlock code (client-side check in v1).
- Owner tool on `#admin` that generates codes.
- Hinglish and English for every string.
- Sound effects with mute; touch controls on phones.
- Deploy to GitHub Pages.

**In v1.1**

- Supabase: global leaderboard (daily, weekly, friends) and server-side unlock code check.
- Daily challenge and streak.
- PWA install ("Add to home screen").

**Out of scope for now**

- Levels 3 to 8 (designed in section 15, built later).
- Accounts, login, payments, ads.
- Native app store builds (Capacitor later).
- Multiplayer.

## 3. Tech stack and project structure

Build with Phaser 3 + TypeScript + Vite, deploy the `dist/` folder to GitHub Pages. Everything is free and open source.

| Area | Choice | Notes |
| --- | --- | --- |
| Engine | Phaser 3 (latest stable 3.x, pinned) | Arcade Physics, fixed 60 Hz step |
| Language | TypeScript, `strict: true` | No `any` in game code |
| Build | Vite | `base: '/<repo-name>/'` for GitHub Pages |
| Level maps | Tiled (`.tmj` JSON) | One map per level; object layers for enemies, coins, triggers |
| Sprites | PNG/SVG now, texture atlases later | Asset keys stay stable so art can be swapped |
| Audio | Phaser Sound (Web Audio) | `.ogg` + `.mp3` pairs |
| UI overlays | HTML/CSS over the canvas | Crisp text, accessible buttons, i18n |
| Lint/format | ESLint + Prettier | Run in CI |
| Tests | Vitest for pure logic | Physics constants, scoring, code generator, i18n coverage |
| Deploy | GitHub Actions → GitHub Pages | On push to `main` |
| v1.1 backend | Supabase (free tier) | Leaderboard, unlock codes |

**Repository layout**

```
super-cipher/
  index.html              # page shell: header, toolbar, stage, info panels
  src/
    main.ts               # Phaser config, boot
    config/physics.ts     # all tuning constants (section 4)
    config/levels.ts      # level list, unlock rules
    scenes/               # Boot, Preload, Title, Level, UI(HUD), Pause, GameOver, LevelClear, Unlock
    entities/             # Player, Bug, Dog, MeetingInvite, Monkey, Manager, Bus, Brick, Banana, ...
    systems/              # Checkpoints, PowerUps, Score, Camera, Parallax, Particles, Popups, Banner
    ui/                   # DOM overlays, touch controls, toolbar
    i18n/strings.ts       # every string, keys x { hi, en }
    social/storyCard.ts   # 1080x1920 card renderer
    social/unlock.ts      # Player ID + code generator
    audio/sfx.ts          # event -> sound key map
    storage.ts            # safe localStorage wrapper
  public/assets/
    sprites/  tiles/  icons/  audio/  maps/
  reference/              # prototype HTML + img (read-only)
  CREDITS.md              # every third-party asset with source + license
  .github/workflows/deploy.yml
```

**Conventions**

- Game world units are pixels at a logical resolution of 960x540, scaled to fit with letterboxing (Phaser Scale Manager `FIT`, `autoCenter`).
- All tuning numbers live in `config/` files, never inline.
- All player-facing text comes from `i18n/strings.ts`.
- Entities are small classes with `update(dt)`; scenes compose them.

## 4. Core gameplay, controls and physics

The player runs right through a side-scrolling level, jumps on enemies, collects coins and power-ups, and reaches the finish before hearts or the clock run out. Movement must feel exactly like the prototype; the numbers below are copied from it.

**Core loop:** pick a character → play a 2 to 4 minute level → Level Clear with stars and a shareable result → retry for 3 stars or unlock the next level.

**Controls**

| Action | Keyboard | Touch (phones) |
| --- | --- | --- |
| Move | ← → or A D | Left and right round buttons, bottom-left |
| Jump (hold for higher) | ↑, W or Space | Big yellow JUMP button, bottom-right |
| Coffee dash (Level 2) | Shift | DASH button above JUMP, shown only when active |
| Pause | P or Esc | Toolbar Pause button |

Touch buttons use pointer events with pointer capture, block the context menu and scrolling, and appear only on coarse-pointer devices during play. Pause automatically when the tab is hidden or the window loses focus. Gamepad support is a nice-to-have.

**Player physics** (prototype ran at 60 fps per frame; per-second values are for Phaser)

| Constant | Per frame | Per second | Notes |
| --- | --- | --- | --- |
| Gravity | 0.62 px/f² | 2232 px/s² |  |
| Max fall speed | 14 px/f | 840 px/s |  |
| Ground acceleration | 0.70 px/f² | 2520 px/s² |  |
| Air acceleration | 0.42 px/f² | 1512 px/s² |  |
| Ground friction (no input) | vx × 0.76 each frame |  | Snap to 0 under 0.05 |
| Air friction (no input) | vx × 0.95 each frame |  |  |
| Cipherboy max run / jump | 4.4 / 13.4 px/f | 264 / 804 px/s | Perk: high jump |
| Ciphergirl max run / jump | 5.1 / 12.6 px/f | 306 / 756 px/s | Perk: fast run |
| Variable jump cut | upward speed capped at 4.5 px/f when jump released | 270 px/s |  |
| Coyote time | 7 frames | 117 ms | Jump just after leaving a ledge |
| Jump buffer | 8 frames | 133 ms | Jump pressed just before landing |
| Double jump (chai) | 0.9 × jump speed |  | Once per airtime |
| Stomp bounce | 9.5 px/f | 570 px/s | Boss stomp: 11 px/f, 660 px/s |
| Hurt knockback | up 7, back 4 px/f | 420 / 240 px/s |  |
| Invulnerability after hit | 100 frames | 1.67 s | Sprite blinks |
| Slow zones (puddle, scanner, coworker grab) | max speed × 0.5 |  |  |
| Conveyor (reverse escalator) | −1.8 px/f | −108 px/s | Pushes left while standing |

**Hitbox:** 30x60 px. The sprite draws 64x82 px, bottom-centred on the hitbox, flipped by facing direction.

**Stomp rule:** a contact counts as a stomp when the player is falling and the player's previous bottom edge was at or above the enemy's top + 12 px. Otherwise the player is hurt.

**Camera:** follows with lerp 0.12 toward `player.x − 0.4 × viewWidth`, clamped to the world. No vertical scroll (world height 540).

## 5. Characters, hearts, power-ups, enemies and scoring

Two playable characters share all rules except one perk each; everything else is driven by the tables below.

**Characters** (original art, big-head cartoon style, thick dark outline)

| Character | Look | Perk |
| --- | --- | --- |
| Cipherboy | Spiky black hair, orange hoodie, neon-cyan headphones round the neck, blue jeans, white sneakers with orange stripe | High jump |
| Ciphergirl | Long brown ponytail, yellow star hair clip, teal hoodie, purple jeans | Fast run |

Each needs: full-body sprite, head-only icon (HUD, progress bar, lives), and animation frames for idle, run (4 to 6 frames), jump up, fall, hurt, celebrate. Until frames exist, animate the single sprite procedurally (section 8).

**Hearts and lives**

- Start with 3 hearts; maximum 5.
- Every 100 coins = +1 heart (popup "+1 DIL!" / "+1 HEART!").
- Hit or fall into a pit = −1 heart. A pit fall respawns at the last safe ground spot (last static solid stood on, clamped 8 px from its edges, never a moving platform, cow or person).
- 0 hearts = Game Over. Continue ("CTRL+Z") = 3 hearts at the last checkpoint, score halved. Restart = new run.
- Checkpoint = save position + refill hearts to at least 3.

**Power-ups**

| Power-up | Source | Effect | Duration |
| --- | --- | --- | --- |
| Chai | ?-block, chai stall | Double jump, cyan sparkle trail | 15 s |
| Headphones | ?-block | Invincible; enemies touched are cleared ("MUTE!"); rainbow ring | 8 s |
| Coffee (Level 2) | Water cooler, pantry | Dash: short burst at 2× max speed, Shift or DASH button, 1 s cooldown | 12 s |
| Office ID | Monkey boss drop | Opens the metro gate; carried into Level 2 lobby | Permanent |

Power-up items that pop from a ?-block rise 32 px, then fall; chai slides sideways like a Mario mushroom, others stay put. HUD shows an icon and a draining bar for each active power-up.

**Enemies** (active only within 760 px of the player)

| Enemy | Behaviour | Stomp result | Score |
| --- | --- | --- | --- |
| Bug | Patrols between bounds at 1 px/f | "BUG FIXED +100", green burst | 100 |
| Street dog | Patrols at 1.2 px/f; chases at 2.2 to 2.7 px/f when player is within 320 px; barks "BHOW!" | "GOOD BOY +50", runs off screen (never hurt) | 50 |
| Meeting invite (email) | Flies left at 1.6 to 1.8 px/f on a sine wave (±40 px) | "MEETING DECLINED +200" | 200 |
| Monkey (Level 1 mini-boss) | See section 6 | 3 stomps | 300 per hit, 1,000 on defeat |
| Coworker (Level 2) | Stands in path; contact grabs and slows for 2 s ("Bhai ek help?"), no damage | Stomp frees you, "HELP LATER +50" | 50 |
| Manager (Level 2 boss) | See section 7 | 3 stomps on the laptop | 300 per hit, 1,500 on defeat |

**Hazards** (always hurt, cannot be stomped)

| Hazard | Where | Rule |
| --- | --- | --- |
| DTC bus | Level 1 road | Spawns off the right edge every 330 frames while player is on the road, 70-frame honk warning, moves left at 6.5 px/f, 140x95 hitbox. Standing on the auto roof avoids it. |
| Falling brick | Level 1 construction | Every 50 to 80 frames: red warning column for 40 frames, then falls with gravity 0.4. Breaks on any solid. |
| Banana | Monkey boss | Thrown in an arc toward the player, gravity 0.35 |
| Paper, popcorn, laser, ring wave | Level 2 | Section 7 |

**Scoring**

| Event | Points |
| --- | --- |
| Coin | 10 |
| Chai or headphones pickup | 200 |
| ID card pickup | 500 |
| Level clear bonus | 500 per remaining heart + 20 per second left on the final timer |

**Stars on Level Clear:** 1 star for finishing, +1 for collecting 60% or more of the level's coins, +1 for finishing under 4:00 (Level 2: collecting all 5 Appraisal Points instead of the time rule).

**Corporate title by stars:** 1 = Jugaadu Intern / Hustling Intern, 2 = Chai-Sutta Engineer / Chai-Powered Engineer, 3 = Tech Lead Material (Hinglish / English).

## 6. Level 1-1 "Ghar se Metro"

Level 1 is 7,400 px wide and 540 px tall, with ground top at y = 460 and the finish at x = 7,240; it takes 2 to 4 minutes. Build it in Tiled from the coordinates below, which match the prototype exactly (x, y = top-left; w x h).

| Zone | x range | Sky gradient (top → bottom) | Banner tip (Hinglish / English) | Difficulty |
| --- | --- | --- | --- | --- |
| 1 · 1RK Building | 0–1150 | #FF9A5A → #FFE0B8 | Seedhiyan utro, toota step dhyaan se! / Go down the stairs. Watch the broken step! | 1 |
| 2 · Gali (The Lane) | 1150–2300 | #4DABF7 → #D0EBFF | Kapdon ki rassi par kudo, kutte peeche! / Jump across the clotheslines. Dogs ahead! | 2 |
| 3 · Main Road | 2300–3500 | #228BE6 → #A5D8FF | Auto ki chhat pe chadho, DTC bus se bacho! / Ride the auto roof to dodge the city bus! | 3 |
| Checkpoint · Chai Tapri | 3500–3920 | #FF922B → #FFE8CC | Chai pi lo: double jump milega / Drink the chai to get a double jump | Rest |
| 4 · Construction | 3920–5000 | #E8A33D → #F8E7BE | Upar dekho, eentein gir rahi hain! / Look up: bricks are falling! | 4 |
| 5 · Chhatein (Rooftops) | 5000–6300 | #E64980 → #FFD8A8 | Bandar ne tumhara Office ID chheen liya! / A monkey stole your office ID! | 4 |
| 6 · Metro Station | 6300–7400 | #5F3DC4 → #C0A8FF | Darwaza band hone se pehle andar ghuso! / Get in before the doors close! | 5 |

The sky blends between zone colours over the last 300 px before each zone. A zone banner slides in for 170 frames when the player enters a new zone.

**Zone 1 · 1RK Building (0–1150)**

- Floor (wood): 0,460 560x80 and 660,460 490x80. Pit at 560–660 is the "broken step".
- Crate stairs: 200,420 60x40 · 260,380 60x80 · 320,340 60x120 · 380,340 60x120 · 440,380 60x80 · 500,420 60x40.
- Coins: (230,370) (290,330) (350,290) (410,290) (470,330) (530,370) (595,370) (630,380) (900,250) (940,250) (980,250).
- Blocks at y = 300, 40x40: ?-block 760 (coin), brick 800, ?-block 840 (chai), brick 880.
- Bug patrol 860–1110 at y = 432.
- Backdrop: warm wall with 4 windows, "1RK" plate, "GYM CODE CHAI SLEEP REPEAT" poster, potted tree, blue EXIT door at 1070.
- Player spawns at (80, 400).

**Zone 2 · Gali (1150–2300)**

- Ground (grass over brick): 1150,460 1150x80.
- Clothesline one-way platforms, 64x12, each with a coin 40 px above: shirt (1280,340), dress (1420,300), shirt (1560,340), dress (1700,300), shirt (1840,340), dress (1980,300). Poles at 1240 and 2056; the line sags through each platform.
- ?-block 2010,170 (coin), reachable from the dress at 1980.
- Dogs: 1300–1650 (chase 2.3 px/f) and 1760–2200 (chase 2.7 px/f).
- Meeting invite starting (2150, 240), 1.6 px/f.
- Coins at y = 400: 2120, 2160, 2200, 2240.
- Backdrop: six colourful houses with windows and balconies.

**Zone 3 · Main Road (2300–3500)**

- Road: 2300,460 1200x80, asphalt with yellow-black kerb and white lane dashes.
- Auto-rickshaw: moving solid platform 140x100 at y = 360, x oscillates 2450–2850 at 1.6 px/f; its roof is rideable.
- Cow: solid 3030,382 100x78, "MOO" bubble when near.
- Puddle slow zone: x 2690–2780.
- ?-block 2620,250 (chai).
- Bug patrol 3160–3460; meeting invite from (3420, 220) at 1.8 px/f.
- DTC bus hazard (section 5). Traffic signal at 2336 blinks red during the honk warning.
- Coins: (2470,320) (2510,300) (2550,320) (3050,330) (3090,310) (3130,330) (3260,400) (3300,400) (3340,400).

**Checkpoint · Chai Tapri (3500–3920)**

- Ground: 3500,460 420x80.
- "SHARMA JI CHAI" stall with red-white striped awning, chai cups; free floating chai pickup at (3655, 300).
- Flag pole at x = 3830: grey flag down until reached, then a green "SAVE" flag rises. Checkpoint respawn (3800, 400).

**Zone 4 · Construction (3920–5000)**

- Dirt ground: 3920,460 150x80 and 4850,460 150x80. Pit 4070–4850 with a "GADDA / PIT" label and barriers at both edges.
- Moving beams (100x18, yellow-black stripes): vertical at x 4110 (y 300–420, 1.1 px/f) · horizontal at y 360 (x 4260–4470, 1.4 px/f) · vertical at x 4580 (y 260–400, 1.2 px/f). Static beam 4720,330 110x18.
- ?-block 4430,200 (headphones).
- Falling bricks while player x is 3950–4850, spawn x = player.x − 40 to + 240.
- Large crane in the background.
- Coins: (4160,260) (4310,300) (4360,300) (4630,230) (4760,280) (4800,280).

**Zone 5 · Chhatein + Monkey mini-boss (5000–6300)**

- Roofs: 5000,400 300x140 · 5410,340 260x200 · 5780,380 520x160. Gaps 5300–5410 and 5670–5780 are pits.
- Dog on roof 2 (5420–5650, 2.4 px/f); meeting invite from (5560, 210).
- Coins: (5100,350) (5140,350) (5355,300) (5725,300) (5450,290).
- Locked gate: invisible wall at 6290 (20 px wide, up to y = 380), drawn as flashing red bars with "ID CHAHIYE / NEED ID".
- Monkey boss (70x74) on roof 3, x 5800–6215. Activates when player x > 5800 with a red banner "MINI-BOSS · BANDAR / MONKEY".
  - Keeps 150–300 px from the player; hops every 70–130 frames (vy −10).
  - Throws a banana every 110 / 85 / 65 frames at 3 / 2 / 1 HP.
  - Stomp = −1 HP, 60 frames of invulnerability, knockback. HUD shows 3 red health pills.
  - At 0 HP it spins off screen and drops the ID card. Picking it up opens the gate, sets the checkpoint to (6000, 320), +500.

**Zone 6 · Metro Station (6300–7400)**

- Tile floor: 6300,460 150x80 and 6720,460 680x80. Track pit 6450–6720 bridged by a conveyor 270x16 at y = 460 (reverse escalator, −1.8 px/f, animated chevrons).
- Scanner arch slow zone 6790–6850 with "BEEP!" popups; security guard decor.
- Queue of 3 people as solid obstacles: 6930,400 40x60 · 6990,390 40x70 · 7050,405 40x55.
- Coins: (6560,410) (6600,410) (6950,350) (7010,340) (7070,355).
- 25-second door timer starts when player x > 6320; doors at 7240 close visually as time runs out. At 0: −1 heart, respawn at (6330, 400), timer resets.
- Finish when player x > 7240: auto-walk into the doors, doors close, confetti, then Level Clear after 150 frames.

## 7. Level 2 "Office Floor"

Level 2 runs from the lobby to the biometric machine, which the player must punch before 9:30 after beating the Manager. It is about 7,400 px wide, adds six new mechanics, and replaces the time counter with an office clock. Exact coordinates are for the designer to set in Tiled; the rules and numbers below are fixed.

**Office clock:** starts at 9:12 and advances 1 minute every 10 real seconds (9:30 after 3:00 of play). The HUD clock turns red at 9:27. Reaching 9:30 = "LATE MARK!": −1 heart and the clock is set back to 9:28.

**Appraisal Points:** 5 hidden collectibles (bar-chart icon with a gold glow), one per hard-to-reach spot: top of the lift shaft, a high desk in Open Office, top of the pantry fridge, top of the server-room updraft, a ceiling ledge in the boss room. All 5 = third star. HUD shows "x/5".

| Zone | Approx. x range | Look | Mechanics | Difficulty |
| --- | --- | --- | --- | --- |
| 1 · Lobby | 0–1050 | Light grey marble, company sign "\[COMPANY NAME\]", plant, reception desk | Turnstile opens with the Level 1 ID (green "BEEP! ACCESS OK"); receptionist line "Visitor ho? Register karo!"; guard decor | 1 |
| 2 · Lift Shaft | 1050–2100 | Dark steel shaft, cables | 2 vertical lift cabins as moving platforms; a red "LIFT FULL!" cabin pushes the player out sideways (6 px/f impulse, "Dhakka!"); exit ledge on "FLOOR 7" | 2 |
| 3 · Open Office | 2100–3300 | Blue carpet, desks with monitors, city windows, ceiling lights | Desks as platforms; rolling chairs; coworker grab; printer shoots paper; meeting invites | 3 |
| Checkpoint · Water Cooler | 3300–3700 | Mint green, cooler, gossiping coworkers ("Suna? Appraisal late hai!") | Save + refill; Coffee power-up (dash) | Rest |
| 4 · Pantry | 3700–4800 | White-grey tiles, fridge, microwave, chai machine | Wet floor; popcorn bursts; fridge as tall platform | 4 |
| 5 · Server Room | 4800–6000 | Near-black, blinking server racks, cyan floor edge | Darkness with player light; firewall lasers; AC updrafts; bugs | 4 |
| Boss · Meeting Room | 6000–7000 | Dark red, whiteboard "Q4 DEADLINE!!!", screen "EK QUICK CALL?", long table | Manager boss, 3 phases | 5 |
| Finish · Biometric | 7000–7200 | Grey machine with clock display | Locked until boss is beaten |  |

**New mechanics (rules)**

- **Lift cabin:** moving platform 100x18 (cabin drawn around it), vertical range 200–420, 1.2 px/f, 45-frame pause at each end.
- **Rolling chair:** moving platform 70x20 that starts sliding in the player's facing direction at 3 px/f when stood on, slows by 2% per frame, stops at walls. Popup "CHAIR DRIFT x2!" when the player jumps from one moving chair to another.
- **Coworker grab:** contact (not a stomp) slows the player to 50% for 2 s with a speech bubble "Bhai ek help? 2 min!" / "Got a minute? Quick help!". No damage.
- **Printer:** every 120 frames fires a paper sheet left at 4 px/f with a small sine wobble; hurts on contact. "PAPER JAM!" label.
- **Wet floor:** inside the zone, ground acceleration × 0.35 and ground friction 0.98 (player slides). Yellow "GEELA FARSH / WET FLOOR" sign.
- **Popcorn microwave:** every 90 frames throws 3 kernels upward in random arcs (vy −8 to −11, vx −3 to 3, gravity 0.4); hurt on contact; "POP! POP!".
- **Darkness:** a full-screen dark overlay (alpha 0.88) with a soft radial light of radius 180 px around the player; server LEDs and lasers still glow. With reduced motion, use alpha 0.6.
- **Firewall laser:** vertical beam, 90 frames on, 90 off, with a 30-frame flicker warning; hurts while on.
- **AC updraft:** column zone where the player's vertical speed eases toward −6 px/f (rises), with drifting snowflake particles.
- **Coffee dash:** while active, Shift or DASH gives 0.25 s at 2× max speed, ignores slow zones, 1 s cooldown, speed-line trail.

**Boss: Manager "Ek quick call?"**

- Manager sprite \~120x130 behind the meeting table; his laptop (60x30, glowing gold) on the table is the weak spot. Stomping the laptop = "MUTED! +300".
- 3 HP shown as 3 red pills plus a phase label in the HUD. After each hit he picks up the laptop and walks to the other end of the table for 3 s.
- Phase 1 (3 HP): throws calendar invites in arcs every 90 frames ("Sync-up 9:30").
- Phase 2 (2 HP, label "Camera on karo!"): adds a phone-ring shockwave every 120 frames, a 20 px tall ring travelling along the floor both ways at 4 px/f; the player must jump it.
- Phase 3 (1 HP): "deadline" papers rain from the ceiling every 40 frames; all his attacks are 30% faster.
- On defeat he leaves through the door saying "Chalo, kal baat karte hain" / "Let's take this offline"; the biometric machine unlocks (padlock → green).
- Finish: touch the machine → 1 s fingerprint scan → "PRESENT ✓ 9:29" → Level Clear. Promotion: Junior Dev → Developer.

## 8. Visual design and animation

The look is a bright retro arcade inside a dark night-sky website: chunky outlines, saturated zone colours, and constant small motion so every frame feels alive. Match the prototype and the design canvas boards.

**Page palette (single dark theme by choice)**

| Token | Hex | Use |
| --- | --- | --- |
| bg | #0E0B1F | Page background |
| panel / panel-2 | #1B1636 / #251E47 | Cards, overlays |
| ink / muted | #F4F1FF / #BDB5E0 | Text |
| line | #3A3166 | Borders |
| gold / gold-deep | #FFD43B / #B07A00 | Primary buttons, coins, highlights |
| pink, cyan, red | #F06595, #22D3EE, #FF5C5C | Accents, power-ups, danger |
| outline | #14121F | All game outlines and text stroke |

**Type:** "Press Start 2P" for logo, HUD numbers, banners and buttons; "Baloo 2" (500/700/800) for body text, tips and dialogue. Game text always has a 3 px+ dark stroke.

**Parallax layers (back to front)**

1. Sky gradient per zone (section 6), blended across zones.
2. Sun with soft pulsing glow, scroll factor 0.03, slow rotation.
3. Clouds, factor 0.15, also drifting left 0.25 px/f.
4. City skyline silhouettes with lit windows, factor 0.35, 38% opacity.
5. Rolling green hills, factor 0.6.
6. Zone backdrop art (walls, houses, stall, crane, station), factor 1.
7. Gameplay layer.
8. Particles, popups, HUD.

**Tiles:** brick with grass top (#45B145 + #6FD36F highlight), wood planks, dirt, asphalt with kerb, roof tiles, station floor checks, caution-stripe beams, office carpet, pantry tiles, server floor. Gold ?-blocks glow and bob their "?"; used blocks turn brown.

**Animations (all required)**

| What | Detail |
| --- | --- |
| Run | Bob 0–5 px with |
| Jump / fall | Stretch (x 0.94, y 1.06) going up; lean = vx × 0.035 rad |
| Land | Squash 0.22 decaying × 0.82 per frame + white dust burst when landing above 6 px/f |
| Double jump | Cyan burst of 10 particles |
| Hurt | Blink every 4 frames during invulnerability, red burst, screen shake 12 |
| Coins | Spin by scaling x with |
| ?-block bump | Rises 10 px over 12 frames; item rises out of it |
| Enemies | Bug wiggle, dog bounce run, invite tilt + white motion lines, monkey red glow + blink when hit |
| Popups | Floating text rising 0.7 px/f, fading over the last 25 of 60 frames |
| Zone banner | Dark rounded panel with gold border, slides down 30 px and fades in over 20 frames, holds, fades out |
| Screen shake | Stomp 4, hit 12, boss hit 10; decays × 0.85 per frame |
| Combo text | "COMBO x3!" in big pixel text with red and dark offset shadows |
| Win | Player auto-walks into the doors, doors close, multi-colour confetti for 150 frames |
| Title screen | World auto-scrolls in the background; logo pulses; selected character bobs |

**Character art spec:** cartoon big-head proportions (head about 45% of height), 4 px dark outline, flat colours with one highlight. Draw at 2x (128x164) and scale down. Provide a sprite sheet with idle (2 frames), run (6), jump (1), fall (1), hurt (1), celebrate (2), plus the head icon.

**Reduced motion** (`prefers-reduced-motion`): no screen shake, no logo pulse, no bobbing UI, darkness overlay lighter; gameplay motion itself stays.

## 9. Screens, HUD and UI

The page is one scrolling website with the 16:9 game stage near the top; all menus are HTML overlays on the stage, sized in container units (`cqw`) so they scale with it.

**Page layout (top to bottom)**

1. Header: round head icon of the selected character, "SUPER CIPHER" in gold pixel font, "Office Run · by @cipherboy.dev" (link). Right side: language switch (Hinglish | English), Pause, Sound On/Off, Fullscreen, Restart.
2. Stage: 16:9, width = min(100%, (100dvh − 150px) × 16/9), rounded corners, purple glow. Fullscreen fills the screen with letterboxing.
3. Info panels (two columns, stack on phones): "Level 1-1 ka map / Level 1-1 map" with goal line and zone list (icon, name, short description, difficulty stars), and "Kaise khelein / How to play" with 8 icon rows.
4. Credits line (Twemoji CC-BY 4.0, sounds, original characters).
5. Hidden owner tool, shown only at `#admin` (section 11).

**Screens**

| Screen | Content | Buttons → next |
| --- | --- | --- |
| Title | Live world auto-scrolling behind; eyebrow "WORLD 1-1 · GHAR SE METRO"; logo "SUPER CIPHER / OFFICE RUN"; one-line story; two character cards with perk; controls hint | Character cards (toggle); "▶ NAUKRI SHURU / START WORK" → level; Enter also starts |
| Level select (new in v1) | Cards for Level 1 (open) and Level 2 (locked padlock or open), best score and stars per level | Card → level; locked card → Unlock |
| Pause | "PAUSED", "Chai break chal raha hai. Manager ko mat batana." | Resume, Restart |
| Game Over | Red "RESIGNATION ACCEPTED", short line, note about continue | "CTRL+Z · CONTINUE" (checkpoint, score halved), "Shuru se / Start over" |
| Level Clear | 3 stars popping in one by one, "METRO PAKAD LI! / YOU CAUGHT THE METRO!", corporate title + promotion, stats (Score, Coins x/total, Time, Best) | "LEVEL 2 UNLOCK KARO ▶" (or "LEVEL 2 ▶" if unlocked), "▶ PHIR SE / PLAY AGAIN", "Challenge copy karo / Copy challenge" |
| Unlock | Story card preview left; 4 steps right; code input | Section 11 |

Keyboard focus moves to the main button of every overlay that opens. All buttons are real `<button>` or `<a>` elements with visible focus rings and 44 px minimum height.

**HUD (drawn on the canvas, 58 px dark gradient band)**

- Left: head icon in a gold ring, hearts (3 to 5, lost ones at 20% opacity), active power-up icons with draining bars below.
- Centre: zone name, then a 300 px progress bar with the head icon moving along it and small markers for checkpoint, boss and finish.
- Right: coin icon + count, 6-digit score, time (Level 1) or office clock (Level 2), Appraisal Points (Level 2).
- Boss fights: boss name and 3 health pills under the band.
- Warnings: flashing "BUS AA RAHI! ←" card, metro door countdown pill that pulses red under 8 s, red "!" columns for falling bricks.

**Touch controls:** two round translucent arrow buttons bottom-left, a large gold JUMP button bottom-right, sized max(52px, 10.5cqw) and max(60px, 12.5cqw). A pink chip "Phone ghumao: landscape mein mazaa double" shows in portrait during play.

## 10. Audio

Audio mixes three sources: generated 8-bit effects for constant events, a few funny Pixabay effects, and the owner's own recorded meme-style voice lines. No clips from films, songs, games, apps or real people may be used.

**Sources and licensing rules**

- **Generated SFX:** create in code with ZzFX (MIT, tiny) or jsfxr presets, so they ship with zero licence risk. The prototype's beeps are the starting point.
- **Pixabay sound effects** ([licence](https://pixabay.com/en/service/license/)): free, no attribution required, may be edited and used inside the game. Not allowed: redistributing a sound on its own. Pixabay states third-party rights may still apply, so only pick generic sounds (thud, honk, laugh, "woah", click) and skip anything that recalls a film, game, app or celebrity (examples to skip: "Hello there", "sus", Discord call). The owner downloads the files; list every one in `CREDITS.md` with title and page URL.
- **Owner voice lines:** 1 to 3 s each, recorded on a phone, trimmed and normalised to −1 dBFS peak, exported as `.ogg` + `.mp3`.

**Sound map**

| Event | Sound | Source |
| --- | --- | --- |
| Jump / double jump | Rising square blip / higher sparkle blip | Generated |
| Coin | Two-note ding | Generated |
| ?-block bump | Low thunk | Generated |
| Power-up | 4-note arpeggio | Generated |
| Stomp | Cartoon "boing" | Pixabay or generated |
| Hurt | Short falling buzz + slide whistle | Generated + Pixabay |
| Dog bark / bite | "BHOW!" | Owner voice |
| Bus warning | Goofy car horn (two honks) | Pixabay ("goofy ahh car horn") |
| Cow | "MOO" | Owner voice |
| Brick lands | Thud | Pixabay ("Thud sound effect") |
| Checkpoint | 3-note chime + "Chai break!" | Generated + owner voice |
| Monkey hit / defeat | "Ook ook!" / "Bandar bhaag gaya!" | Owner voice |
| Coworker grab | "Bhai ek help?" | Owner voice |
| Manager phases | "Ek quick call?", "Camera on karo!", "Deadline kal hai!" | Owner voice |
| Metro timer under 5 s | Fast ticking | Generated |
| Pit fall | Descending "wah-wah-waaah" | Generated |
| Game Over | Dramatic "dhan-dhan-dhaaan" + "Resignation accepted!" | Generated + owner voice |
| Level Clear | Victory jingle + laugh | Generated + Pixabay ("Hahaha") |
| Music | Short chiptune loop per level (60–90 s) | Pixabay Music or commissioned |

**Mixing:** master 0.8, effects 0.7, voice 0.9, music 0.35; music ducks to 0.15 while a voice line plays. No more than 2 voice lines in 5 s. Audio starts only after the first click or tap (browser rule). Sound On/Off in the toolbar is remembered.

**Accessibility:** every voice line also shows as a popup text, so the game is fully playable muted.

## 11. Engagement: story card, Level 2 unlock, sharing

Every next level is unlocked by a personal code the owner sends by DM after checking the player's Instagram story, which turns each unlock into a story share plus a follow. A website cannot verify follows or stories by itself, so the owner's manual check is the proof.

**Unlock flow (Level Clear → "LEVEL 2 UNLOCK KARO ▶")**

1. **Story card:** show a generated 1080x1920 PNG (purple-to-pink gradient, confetti, "SUPER CIPHER / OFFICE RUN", big character art, "LEVEL 1-1 CLEAR!", earned stars, score and coins, "TU BEAT KARKE DIKHA! / CAN YOU BEAT ME?", "@cipherboy.dev"). Text: "Screenshot lo ya long-press karke save karo, story par lagao, @cipherboy.dev ko tag karo". Button "Instagram kholo" → https://www.instagram.com/.
2. **Follow:** button "Follow @cipherboy.dev" → https://www.instagram.com/cipherboy.dev/.
3. **DM:** show the Player ID (e.g. `CB-7K4QX2`). "DM message copy karo" copies a ready message in the chosen language; "DM kholo" → https://ig.me/m/cipherboy.dev.
4. **Code:** input + UNLOCK. Wrong code: "Ye code sahi nahi hai. DM mein mila code dobara check karo." Right code: victory sound, "LEVEL 2 UNLOCKED!", Level 2 card opens.

**Player ID and code (v1, client-side)**

- Player ID = `CB-` + 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, random, stored in localStorage.
- Code = 6 characters from the same alphabet, derived from a 53-bit hash (cyrb53) of `UPPERCASE(playerId) + '|super-cipher-office-run|L' + levelNumber`. Input is uppercased and stripped of non-alphanumerics before comparing. Reference vector from the prototype: `CB-7K4QX2` → `RQ8FTB` for Level 2; add this as a unit test.
- Codes differ per level, so the Level 3 code is separate.
- Limitation: anyone who reads the bundle can compute codes. Acceptable for v1; fixed in v1.1.

**Owner tool (`#admin` hash)**: a panel below the info panels with a Player ID input, "Code banao / Generate", the code in large cyan pixel text, and "Copy reply" ("Shukriya story ke liye! / Thanks for the story! Level 2 unlock code (CB-XXXXXX): XXXXXX"). Not linked anywhere on the page.

**v1.1 server check (Supabase)**

- Table `unlock_codes(player_id text, level int, code text, created_at, used_at)`; the owner tool inserts codes after signing in.
- Edge function `redeem(player_id, level, code)` returns ok and marks it used. Remove the client-side hash.
- Table `scores(player_id, display_name, character, level, score, coins, time_ms, created_at)` for the leaderboard; display name optional, max 16 characters, basic profanity filter; no email or phone stored.

**Other engagement hooks**

- "Challenge copy karo": copies "Maine Super Cipher: Office Run mein {score} score kiya aur {coins} coins uthaye! Tu beat karke dikha. @cipherboy.dev" (English version in section 12) with the site URL.
- Best score and stars per level shown on level cards.
- Every new level launch is announced with a reel; the Level select shows "Level 3 jaldi aa raha hai / coming soon" with an Instagram follow link.
- v1.1: daily challenge ("Aaj bina chai ke survive karo"), streak counter, Top Survivors leaderboard (Aaj / Is hafte / Dost).

## 12. Language and accessibility

Every visible string exists in Hinglish (default) and English, switchable instantly from the header and remembered; a unit test fails if any key is missing a language.

**Rules**

- One string table `i18n/strings.ts`: `key → { hi, en }`; functions for strings with values (score, coins, Player ID).
- Switching language updates DOM overlays, canvas HUD, banners, popups and the story card immediately.
- Some words stay the same in both for flavour: "SHARMA JI CHAI", "BUG FIXED", "CTRL+Z · CONTINUE", "COMBO".
- `<html lang>` is `hi-Latn` for Hinglish and `en` for English.

**Sample strings (port the full set from the prototype)**

| Key | Hinglish | English |
| --- | --- | --- |
| start | ▶ NAUKRI SHURU | ▶ START WORK |
| sub | 9:30 ki meeting hai. 1RK se nikal ke metro pakdo: kutton se bacho, bugs fix karo, chai pi ke double jump maaro! | Your meeting is at 9:30. Get from your 1RK flat to the metro: dodge dogs, fix bugs, and drink chai for a double jump! |
| pauseSub | Chai break chal raha hai. Manager ko mat batana. | Chai break in progress. Don't tell your manager. |
| overMsg | Saare dil khatam. Par HR ne ek mauka aur diya hai. | You ran out of hearts. HR is giving you one more chance. |
| clearBig | METRO PAKAD LI! | YOU CAUGHT THE METRO! |
| fell | GIR GAYE! | YOU FELL! |
| dogBite | KAAT LIYA! | DOG BITE! |
| meetingHit | MEETING ME PHAS GAYE! | STUCK IN A MEETING! |
| busWarn | BUS AA RAHI! ← | BUS COMING! ← |
| needId | ID CHAHIYE | NEED ID |
| missedMetro | METRO CHHOOT GAYI! PHIR SE | MISSED THE METRO! TRY AGAIN |
| challenge | Maine Super Cipher: Office Run mein {s} score kiya aur {c} coins uthaye! Tu beat karke dikha. @cipherboy.dev | I scored {s} and collected {c} coins in Super Cipher: Office Run! Can you beat me? @cipherboy.dev |

**Accessibility**

- Full keyboard play; every overlay button reachable with Tab, visible focus ring, focus moved to the main button when an overlay opens.
- Buttons and links are real elements with labels; icon-only buttons have `aria-label`.
- Text contrast at least 4.5:1 on the dark page; game text always outlined.
- Never rely on sound alone: every voice line and warning is also shown as text.
- Respect `prefers-reduced-motion` (section 8).
- Touch targets at least 44 px.

## 13. Storage, performance and deployment

The game must load fast on Indian mobile data, hold 60 fps on mid-range phones, and deploy automatically to GitHub Pages on every push to `main`.

**Local storage keys** (all reads and writes wrapped in try/catch; the game works without storage)

| Key | Value |
| --- | --- |
| `sc-lang` | `hi` or `en` |
| `sc-sound` | `on` or `off` |
| `sc-char` | `boy` or `girl` |
| `sc-pid` | Player ID |
| `sc-unlocked` | Highest unlocked level number |
| `sc-best-L{n}` | Best score per level |
| `sc-stars-L{n}` | Best stars per level |

**Performance budgets**

| Item | Budget |
| --- | --- |
| First load (HTML + JS + Level 1 assets) | Under 3 MB, under 4 s on 4G |
| JS bundle (gzipped, incl. Phaser) | Under 450 KB |
| Frame rate | 60 fps on a 2021 mid-range Android (e.g. Redmi Note 10 class) |
| Audio per level | Under 1.5 MB |
| Later levels | Lazy-loaded when selected |

Preload screen shows a pixel progress bar with "Chai garam ho rahi hai..." / "Heating the chai...". Pause the game loop when the tab is hidden.

**Browser support:** latest Chrome, Safari (iOS 15+), Firefox, Edge, Samsung Internet. Test portrait and landscape phones, 1366x768 laptops and 1920x1080 desktops.

**Privacy:** no personal data in v1. If analytics are added, use a cookie-free tool (e.g. Plausible or Umami) and track only: level\_start, level\_clear, game\_over, unlock\_opened, unlock\_success, story\_card\_viewed.

**Deployment**

- Public GitHub repo; GitHub Actions workflow builds with Vite and publishes `dist/` to GitHub Pages.
- `vite.config.ts` sets `base: '/<repo-name>/'` (or `/` with a custom domain).
- Site URL goes into the Instagram bio; add Open Graph tags (title, description, a 1200x630 preview image) so the link previews well in WhatsApp and Instagram DMs.
- `CREDITS.md` and an in-page credits line list Twemoji (CC-BY 4.0) and every Pixabay file.

## 14. Milestones and acceptance criteria

Build in seven milestones, in order; each ends with a deploy the owner can play on a phone.

1. **M0 · Setup**
   - Vite + Phaser + TypeScript project runs locally; ESLint, Prettier, Vitest configured.
   - GitHub Actions deploys a "Hello" scene to GitHub Pages.
   - Prototype placed in `reference/`; assets copied to `public/assets/`.
2. **M1 · Core engine**
   - Player moves and jumps with every constant from section 4; coyote time, jump buffer and variable jump work.
   - Solids, one-way platforms, moving platforms (carry the player), conveyors, slow zones.
   - Camera, parallax layers, keyboard and touch input.
   - Unit tests cover physics constants and the stomp rule.
3. **M2 · Level 1 parity**
   - Level 1 built in Tiled with every object from section 6.
   - All enemies, hazards, power-ups, checkpoint, monkey boss, metro timer and win sequence behave like the prototype.
   - Side-by-side check against the prototype: same layout, same feel; a full run takes 2 to 4 minutes.
4. **M3 · UI, language and audio**
   - Page shell, Title, Level select, Pause, Game Over, Level Clear exactly as section 9.
   - Hinglish and English complete; test fails on any missing key.
   - Sound map from section 10 wired with generated effects; placeholder files where owner audio is pending; mute remembered.
5. **M4 · Unlock and sharing**
   - Story card renders correctly in both languages with the chosen character.
   - Player ID, code generator (test vector `CB-7K4QX2` → `RQ8FTB`), unlock screen, `#admin` owner tool, challenge copy with clipboard fallback.
6. **M5 · Level 2**
   - All zones, mechanics, Appraisal Points, office clock and Manager boss from section 7.
   - Locked until the Level 2 code is entered.
7. **M6 · Polish and launch**
   - Performance budgets met (section 13); tested on the owner's phone and two friends' phones.
   - Open Graph preview, credits complete, no console errors.
   - Launch reel and bio link ready.

**v1.1 (after launch):** Supabase leaderboard and server-side codes, daily challenge and streak, PWA install.

## 15. Roadmap, open questions and kickoff

The full game is 8 levels that follow one workday and career from Intern to CTO; v1 builds the first two, and the engine must make each new level a Tiled map plus a few new entities.

**Level roadmap**

| # | Level | Setting and new mechanics | Boss | Promotion on clear |
| --- | --- | --- | --- | --- |
| 1 | Ghar se Metro (v1) | Gali, road, construction, rooftops, metro | Monkey | Intern → Junior Dev |
| 2 | Office Floor (v1) | Lobby, lifts, open office, pantry, server room | Manager | Junior Dev → Developer |
| 3 | Lunch Break | Food court queues, tray conveyor, spilled dal | Canteen aunty | Developer → Senior Dev |
| 4 | Deadline Night | Dark office, bug swarms, power cut, chai machine | Giant Prod Bug | Senior Dev → Team Lead |
| 5 | Client Visit | Conference hall, projector beams, slide clicker | Client "small change hai" | Team Lead → Tech Lead |
| 6 | Offsite Trip | Bus, resort, pool, team games | HR "fun activity" | Tech Lead → Engineering Manager |
| 7 | Appraisal Season | Climb performance graphs, file mountains | Appraisal committee | EM → Director |
| 8 | Resign ya CTO? | Remix of all zones, past bosses return | CEO | Director → CTO |

Bonus ideas: WFH Day, Diwali Party, Monday Morning; a "Notice Period" hard mode (1 heart, faster enemies).

**Open questions for the owner**

- [ ] Final game name: keep "Super Cipher: Office Run"?
- [ ] Characters: keep the original Cipherboy and Ciphergirl, or supply new sprite sheets? Final name for Ciphergirl?
- [ ] GitHub username and repo name; custom domain or `github.io`?
- [ ] Default language: Hinglish (current) or English?
- [ ] Record the voice lines listed in section 10.
- [ ] Pick and download Pixabay effects and music; add each to `CREDITS.md`.
- [ ] Company name for the Level 2 lobby sign (or keep fictional).
- [ ] How many unlock DMs a day can be answered by hand? Decides when v1.1 server codes are needed.

**Kickoff prompt for Claude Code**

```
Read PRD.md fully. Build "Super Cipher: Office Run" with Phaser 3 + TypeScript + Vite.
reference/office-run-prototype.html is the source of truth for feel, physics, layout and copy:
port its behaviour into the structure in PRD section 3, do not copy the single file.
Work milestone by milestone (section 14). Start with M0 and M1 only.
After each milestone: run lint and tests, list what you built, what you could not match,
and anything you need from me (assets, decisions). Keep every tuning number in src/config
and every visible string in src/i18n/strings.ts (Hinglish + English).
Never add audio, images or fonts without a licence entry in CREDITS.md.
```

Export this doc as Markdown, save it as `PRD.md` in the repo root, then give Claude Code the prompt above.
