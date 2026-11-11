# Credits

Every third-party asset used by Super Cipher: Office Run, with source and licence.
**Rule:** never add audio, images or fonts without an entry here.

## Art

| Asset                                                          | Source                                                                      | Licence                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| Cipherboy, Ciphergirl, all enemies, props, tiles and backdrops | Original, drawn procedurally in code (`src/gfx/`)                           | Owned by @cipherboy.dev |
| Story card, Open Graph image (`public/og-image.png`)           | Generated from the same code (`src/social/storyCard.ts`, `scripts/og.html`) | Owned by @cipherboy.dev |

Emoji characters in the HTML info panels are rendered by the visitor's system font; no emoji image files are shipped.
If Twemoji images are added later (e.g. from the prototype's `img/` folder), list them here: Twemoji by Twitter, CC-BY 4.0, https://github.com/twitter/twemoji.

## Fonts

| Font                       | Source       | Licence                   |
| -------------------------- | ------------ | ------------------------- |
| Press Start 2P (CodeMan38) | Google Fonts | SIL Open Font License 1.1 |
| Baloo 2 (Ek Type)          | Google Fonts | SIL Open Font License 1.1 |

## Audio

| Sound                                  | Source                                                                                                       | Licence       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| All sound effects and both music loops | Generated in code by `src/audio/synth.ts`                                                                    | Original      |
| Boss voice lines (speech)              | Spoken live by the player's own browser/device text-to-speech (`src/audio/voice.ts`); no audio files shipped | Original text |

Owner voice lines and Pixabay effects are not added yet. When you add one:

1. Put `name.ogg` and `name.mp3` in `public/assets/audio/`.
2. Map the game event to it in `public/assets/audio/manifest.json`, e.g. `{ "bark": "bark", "honk": "goofy-car-horn" }`.
   Event names are the `SfxEvent` keys in `src/audio/sfx.ts` (`music-commute` / `music-office` replace the music loops).
3. Add a row below with the title and Pixabay page URL.

**Recording your own boss lines:** map `voice-<stringKey>` to your file, e.g.
`{ "voice-quickCall": "manager-quick-call", "voice-ceoHi": "ceo-hi" }`. String keys are in
`src/i18n/strings.ts` (each boss's `greetKey`, `phaseLines`, `hitLine`, `byeLine` in `src/entities/bosses.ts`).
A recording replaces the speech for that line; every other line keeps the text-to-speech voice.

| Event      | File | Title | Source URL | Licence |
| ---------- | ---- | ----- | ---------- | ------- |
| _none yet_ |      |       |            |         |

## Code

| Library                                 | Licence              |
| --------------------------------------- | -------------------- |
| Phaser 3.90.0                           | MIT                  |
| cyrb53 hash (in `src/social/unlock.ts`) | Public domain (bryc) |
