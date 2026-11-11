# Super Cipher: Office Run

A free, browser-based retro 2D platformer about Indian office life, by [@cipherboy.dev](https://www.instagram.com/cipherboy.dev/).
It's 9:12 AM, the meeting is at 9:30: run from your 1RK flat to the metro (Level 1), from the office lobby to the biometric machine (Level 2), then survive the lunch rush and the Canteen Aunty to get back to your desk by 1:30 (Level 3), then fight a bug swarm and the Giant Prod Bug to deploy before midnight (Level 4), then survive the client visit and get the deal signed before the 5 PM demo (Level 5).

Built with Phaser 3 + TypeScript + Vite. See [PRD.md](PRD.md) for the full spec.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173/super-cipher/
npm test           # unit tests (physics, stomp rule, unlock codes, i18n coverage, scoring, maps, audio)
npm run lint       # ESLint + Prettier check
npm run build      # type-check + production build into dist/
```

Pushing to `main` builds, lints, tests and deploys `dist/` to GitHub Pages (`.github/workflows/deploy.yml`).
In the repo settings, set **Pages → Source** to **GitHub Actions**. The workflow sets `BASE_PATH` to `/<repo-name>/`; for a custom domain, set `BASE_PATH=/`.

## Owner tool

Open the site with `#admin` at the end of the URL (e.g. `https://<user>.github.io/super-cipher/#admin`).
Paste the player's ID (`CB-XXXXXX`), pick the level, press **Generate**, then **Copy reply** and send it by DM.

## Where things live

| Path                            | What                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/config/`                   | Every tuning number (physics, enemies, timers, scoring, audio mix, level list)                 |
| `src/i18n/strings.ts`           | Every visible string, Hinglish + English                                                       |
| `public/assets/maps/level*.tmj` | Level layouts (Tiled JSON, object layers). Open in [Tiled](https://www.mapeditor.org/) to edit |
| `src/scenes/LevelScene.ts`      | Builds a level from its map and runs the fixed 60 Hz simulation                                |
| `src/entities/`                 | Player, enemies, bosses, hazards, items, platforms                                             |
| `src/systems/physics.ts`        | Pure platformer physics (unit tested)                                                          |
| `src/gfx/`                      | Procedural art for every sprite, tile and backdrop                                             |
| `src/audio/`                    | 8-bit synth + event → sound map and mixer                                                      |
| `src/social/`                   | Story card renderer, Player ID + unlock codes                                                  |
| `src/ui/`                       | HTML overlays, toolbar, touch controls, `#admin`                                               |

## Swapping in real art and audio

- **Sprites:** drop PNGs in `public/assets/sprites/` and list them in `public/assets/sprites/manifest.json`, e.g. `{ "bug": "bug.png" }`.
  A listed key replaces the generated texture with the same key (`player-boy` / `player-girl` are 13-frame sheets: idle0–1, run0–5, jump, fall, hurt, win0–1, each 128x164).
- **Audio:** see [CREDITS.md](CREDITS.md#audio). Anything without a file keeps its generated sound.

## Map object reference (Tiled)

Layers: `zones`, `decor`, `solids`, `platforms`, `items`, `enemies`. Object `type` + custom properties:

- `ground` (`tex`: wood, crate, grass, asphalt, dirt, roof, tile, marble, steel, carpet, pantry, server, boardroom), `cow`, `person` (`look`), `gate`, `turnstile`, `bossDoor`, `fridge`
- `cloth` (`cloth`), `mover` (`style` beam/auto/lift/liftFull, `axis`, `min`, `max`, `speed`, `pause`, `phase`), `beam`, `conveyor` (`speed`), `chair` (`min`, `max`), `desk`, `counter`, `shelf`, `table`
- `coin` (point), `block` (`kind` question/brick, `item` coin/chai/headphones/coffee/none), `pickup` (`item`), `appraisal`
- `bug`, `dog` (`chase`, `patrol`), `invite` (`speed`), `coworker`, `monkey`, `manager`
- `section` (`key`, `skyTop`, `skyBottom`, `difficulty`), `slow` (`label`), `wet`, `dark`, `updraft`, `laser` (`phase`), `printer`, `microwave`, `busRoad`, `brickRain`, `checkpoint` (`respawnX`, `respawnY`, `style`), `bossArena`, `metroTimer`, `finish`
