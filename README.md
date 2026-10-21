# signbridge

[![CI](https://github.com/satyendra-sagar-singh/signbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/satyendra-sagar-singh/signbridge/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/satyendra-sagar-singh/signbridge/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](.nvmrc)

Text to Indian Sign Language in the browser. Type a sentence and a 3D avatar performs it in ISL — the text is turned into an ordered sequence of sign glosses by a small, readable rule engine, each gloss becomes a real `THREE.AnimationClip`, and an `AnimationMixer` plays them back with proper transport controls. No API keys, no server, no accounts: a static build runs anywhere.

- 🧏 **Text → ISL glosses** — validation, clause splitting, longest-phrase matching, filler removal, WH-word reordering and a `QUESTION` non-manual marker
- 📚 **169 signs** — greetings, people, daily verbs, places, feelings, time, numbers and discourse words, generated from location + handshape templates
- 💬 **Understands how people type** — texting abbreviations, slang and Hinglish (`wassup bro`, `thx`, `mujhe paani chahiye`), with every rewrite shown to the user
- 🎬 **Real playback** — play, pause, resume, replay, stop, previous/next sign, 0.5×–1.25× speed, progress and a clickable sequence timeline, all acting on the actual animation actions
- 🧍 **Placeholder avatar included** — a procedural cartoon mannequin with articulated fingers, jointed legs and a face that smiles, frowns and blinks; drop a rigged GLB into `public/models/` to replace it
- 🎥 **3D stage** — free orbit, pan, zoom, view presets, auto-rotate, fullscreen, and a text fallback when WebGL is unavailable
- ⚛️ **React 19 + Vite + Three.js**, tested with Vitest, zero runtime services

## Install

```bash
npm install
npm run dev        # http://localhost:5173
```

Node 20+ (`.nvmrc` pins 24). `npm run build` writes a static site to `dist/`; `npm run preview` serves it locally. Python 3 is only needed to regenerate the vocabulary.

## Quickstart

Type a sentence, or click an example, and press **Translate**. The avatar starts signing immediately.

| You type                          | Signed as                                  |
| --------------------------------- | ------------------------------------------ |
| `How are you?`                    | YOU HOW ❓                                 |
| `I need water.`                   | ME NEED WATER                              |
| `What is your name?`              | YOU NAME WHAT ❓                           |
| `wassup bro, gonna grab chai brb` | YOU FRIEND HOW ❓ GO TAKE TEA WAIT ME COME |
| `mujhe paani chahiye`             | ME WATER NEED                              |
| `call 108`                        | PHONE 1 0 8                                |

Under the translation you get the gloss string, which slang was rewritten ("Understood: wassup → how are you"), and a collapsible description of how each sign is made.

## How it works

```
text ──▶ validate ──▶ clauses ──▶ contractions ──▶ profanity spellings ──▶ slang
     ──▶ phrase/word match (islVocabulary.json) ──▶ drop fillers ──▶ WH-words last
     ──▶ + QUESTION marker ──▶ gloss items ──▶ AnimationClip per sign ──▶ SignPlayer
```

| Layer            | Responsibility                                                                                                                                                   | Where                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Translation**  | Turns a sentence into ordered gloss items. Rule-based and deterministic; every decision it makes is reported back to the UI.                                     | `src/translation/translate.js`                                 |
| **Slang**        | Rewrites abbreviations, slang and Hinglish to the English the matcher knows, in order, phrases before single words.                                              | `src/translation/slang.js`                                     |
| **Profanity**    | Maps masked and variant spellings (`f*ck`, `sh1t`, `bc`) onto the canonical word so the right sign is found. Nothing is censored.                                | `src/translation/profanity.js`                                 |
| **Vocabulary**   | One entry per gloss: the words that trigger it, a description of the ISL form, an expression, and keyframe poses. Generated, then committed.                     | `src/data/islVocabulary.json`                                  |
| **Clip builder** | Compiles keyframe poses (degrees relative to each bone's rest) into `QuaternionKeyframeTrack`s and `AnimationClip`s for whatever rig is loaded.                  | `src/avatar/clipBuilder.js`                                    |
| **Player**       | Sequences clips on an `AnimationMixer`: crossfades between signs, advances on the mixer's `finished` event, reports progress from `action.time`.                 | `src/avatar/SignPlayer.js`                                     |
| **Avatar**       | Loads `public/models/avatar.glb` if present, else the procedural mannequin; resolves each gloss to an embedded clip, a built clip, or a timing-only placeholder. | `src/avatar/AvatarViewer.jsx`, `mannequin.js`, `clipSource.js` |

Bones are addressed by Mixamo names (`mixamorigRightArm`, `mixamorigLeftHandIndex1`, …), with or without the prefix, so the same keyframes drive the mannequin and a Mixamo-rigged GLB.

## Using your own avatar

Place a rigged humanoid at **`public/models/avatar.glb`**. If it is missing or fails to load, the mannequin is shown and labelled as a placeholder.

1. Rigged humanoid with articulated fingers and Mixamo-style bone names.
2. Y-up, facing +Z, feet at y = 0.
3. Ideally, embedded animation clips **named after each gloss** (`HELLO`, `THANK_YOU`, `ME`, … see `clipName` in the vocabulary) plus `FS_A`…`FS_Z` for fingerspelling. Embedded clips are played directly and take priority over generated ones.

Clip resolution per sign: embedded clip by name → clip built from the JSON keyframes (if bone names match) → a timing-only clip flagged "no clip on this rig" in the UI.

## Adding or editing signs

Most signs are composed from location and handshape templates in `scripts/generateVocabulary.py`:

```python
E("BOOK", ["book", "books", "kitab"], "Palms together open outward like the pages of a book.", "neutral",
  frames((0.4, both("FRONT", d=(0, 0, -25))), (0.9, both("FRONT", wrist=[0, 0, -40], d=(0, -10, -25))))),
```

```bash
npm run vocab:generate   # rewrites src/data/islVocabulary.json; CI checks it is up to date
```

Entries can also be hand-written straight into the JSON:

- `words` are matched case-insensitively; multi-word phrases match longest-first, so `"thank you"` wins over `"you"`.
- `pose` values are `[x, y, z]` degrees relative to the bone's rest rotation. Unlisted bones stay at rest. `RightFingers` / `LeftFingers` curl all four fingers; a finger's base joint (`RightHandIndex1`) curls the whole finger.
- A rest keyframe is added automatically at `t = 0` and 0.35 s after the last keyframe, so consecutive signs blend.
- Mannequin conventions: `Arm X-` raise forward · `Arm Z` (right −, left +) raise sideways · `ForeArm X-` bend elbow · `Hand X` flex wrist · `Finger X+` curl · `Head X+` nod · `Brows X-` raise eyebrows.
- `expression` (`neutral`, `smile`, `frown`, `question`) drives the mannequin's lips while the sign plays.
- Entries with `"kind": "marker"` (`QUESTION`) are inserted by the grammar, never matched from words.

## Slang, abbreviations and Hinglish

`src/translation/slang.js` rewrites informal input before matching and reports every rewrite:

- texting: `thx`, `pls`, `u`, `ur`, `r`, `idk`, `brb`, `gtg`, `omg`, `lol`, `tmrw`, `l8r`, `b4`, `nvm`, `asap`…
- speech: `gonna`, `wanna`, `gotta`, `lemme`, `gimme`, `kinda`, `ain't`, `cuz`…
- slang: `bro`/`dude`/`yaar` → friend, `lit`/`dope` → awesome, `chill` → relax, `fam` → family, `bae` → love…
- Hinglish: `mujhe`, `tum`, `kya`, `kyun`, `kahan`, `chahiye`, `paani`, `chai`, `bhai`, `theek hai`, `kya haal hai`…
- numbers: 0–10 are single signs; larger numbers are signed digit by digit.

Add a rule by appending `[regex, replacement]` to `RULES`; order matters.

## Translation rules

- English fillers (`a, the, is, are, to, do, …`) are dropped.
- WH-words (`WHAT, WHERE, WHEN, WHO, WHY, HOW, WHICH, HOW-MANY`) move to the end of their clause.
- A clause ending in `?`, or starting with a question word or auxiliary, gets a `QUESTION` marker.
- Clauses separated by `, ; . ! ?` are ordered independently.
- Immediate repeats collapse (`omg … lit` → one WOW).
- Words outside the vocabulary are fingerspelled letter by letter (toggle in the UI) and listed in a note.

## Limitations

- **The placeholder mannequin's poses are approximations.** They put the hands roughly where the documented sign does; they are not verified ISL, and the UI says so. Use a properly animated avatar before relying on SignBridge for communication or teaching.
- **The grammar is deliberately small.** Real ISL uses classifiers, spatial grammar and rich non-manual markers that a handful of ordering rules cannot express.
- **Placeholder fingerspelling** only gives each letter a distinct handshape; ISL fingerspelling is largely two-handed.
- **Slang rewriting is heuristic.** A bare `k` becomes "ok" and `main` becomes "me"; the rewrite chips exist so this is visible, not silent.
- **Regional variation** exists in ISL; descriptions follow commonly documented forms.

## Contributing

```bash
npm install
npm test          # hermetic — no browser or WebGL required
npm run check     # lint, format check, tests, build (what CI runs)
```

The suite builds the mannequin in Node, compiles clips from the vocabulary and drives the player frame by frame, asserting that bones actually move and return to rest. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
