# SignBridge — Text to Indian Sign Language

SignBridge converts typed English text into Indian Sign Language (ISL) and performs the signs with an animated 3D avatar, entirely in the browser. No API keys, database or server are required.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: translation + animation engine tests
npm run build      # production build in dist/
```

## Stack

React 19 + Vite · Three.js · React Three Fiber · @react-three/drei · plain CSS · Vitest.

## How it works

```
text ──▶ validate ──▶ sentences ──▶ normalise ──▶ phrase/word match (islVocabulary.json)
     ──▶ drop English fillers ──▶ WH-words to end ──▶ + QUESTION marker ──▶ gloss items
gloss items ──▶ clip resolver ──▶ THREE.AnimationClip per sign ──▶ SignPlayer (AnimationMixer)
```

| Area | File |
| --- | --- |
| Translation rules | `src/translation/translate.js` |
| ISL vocabulary (JSON) | `src/data/islVocabulary.json` |
| Keyframes → `AnimationClip` | `src/avatar/clipBuilder.js` |
| Clip lookup for a rig | `src/avatar/clipSource.js` |
| Sequence playback (mixer) | `src/avatar/SignPlayer.js` |
| React state bridge | `src/hooks/useSignPlayer.js` |
| 3D viewer, GLB loader, fallback | `src/avatar/AvatarViewer.jsx` |
| Placeholder mannequin | `src/avatar/mannequin.js` |

Playback controls (play / pause / resume / replay / stop / prev / next / speed / timeline jump) all act on real `AnimationAction`s. Progress is read from `action.time`; when every action is stopped the mixer restores the rest pose.

## Adding a real avatar

The app looks for **`public/models/avatar.glb`**. If it is missing or fails to load, a procedural mannequin is shown and clearly labelled as a placeholder.

Requirements for the GLB:

1. Rigged humanoid with articulated fingers. Mixamo-style bone names (`mixamorigRightArm`, `mixamorigLeftHandIndex1`, …) work best; with or without the `mixamorig` prefix, or with `mixamorig:`.
2. Y-up, facing +Z, feet at y = 0, roughly 1.7–1.8 m tall (camera targets y = 1.2).
3. Ideally, embedded animation clips **named after each gloss** (`HELLO`, `THANK_YOU`, `ME`, … see `clipName` in the vocabulary) plus `FS_A`…`FS_Z` for fingerspelling. These are played directly and take priority.

Clip resolution order per sign: embedded clip by name → clip generated from the JSON keyframes (if bone names match) → an empty timing-only clip flagged with "no clip on this rig" in the UI.

## Adding or editing signs

Most signs are generated from location + handshape templates by `scripts/generateVocabulary.py` (`python3 scripts/generateVocabulary.py` rewrites the JSON). Hand-authored entries can also be added directly to `src/data/islVocabulary.json`:

```json
{
  "gloss": "BOOK",
  "words": ["book", "books", "kitab"],
  "description": "Both flat hands open from palms-together like opening a book.",
  "expression": "neutral",
  "clipName": "BOOK",
  "keyframes": [
    { "t": 0.4, "pose": { "RightArm": [-60, 0, -15], "LeftArm": [-60, 0, 15], "RightForeArm": [-90, 0, 0], "LeftForeArm": [-90, 0, 0] } },
    { "t": 0.9, "pose": { "RightArm": [-60, 0, -35], "LeftArm": [-60, 0, 35], "RightForeArm": [-90, 0, 0], "LeftForeArm": [-90, 0, 0] } }
  ]
}
```

- `words` are matched case-insensitively; multi-word phrases are matched longest-first.
- `pose` values are `[x, y, z]` degrees relative to the bone's rest rotation. Unlisted bones stay at rest. `RightFingers` / `LeftFingers` curl all four fingers.
- A rest keyframe is added automatically at `t = 0` and 0.35 s after the last keyframe.
- Mannequin conventions: `Arm X-` raise forward · `Arm Z` (right −, left +) raise sideways · `ForeArm X-` bend elbow · `Hand X` flex wrist · `Finger X+` curl · `Head X+` nod · `Brows X-` raise eyebrows.

Entries with `"kind": "marker"` (e.g. `QUESTION`) are non-manual markers inserted by the grammar rules, never matched from words.

## Slang, abbreviations and Hinglish

`src/translation/slang.js` rewrites informal input before vocabulary matching and reports every rewrite in the result (shown as “Understood: wassup → how are you” chips):

- texting: `thx`, `pls`, `u`, `ur`, `r`, `idk`, `brb`, `gtg`, `omg`, `lol`, `tmrw`, `l8r`, `b4`, `nvm`, `asap`…
- speech: `gonna`, `wanna`, `gotta`, `lemme`, `gimme`, `kinda`, `ain't`, `cuz`…
- slang: `bro`/`dude`/`yaar` → friend, `lit`/`dope` → awesome, `chill` → relax, `fam` → family, `bae` → love…
- Hinglish: `mujhe`, `tum`, `kya`, `kyun`, `kahan`, `chahiye`, `paani`, `chai`, `bhai`, `theek hai`, `kya haal hai`…
- numbers: 0–10 are single signs (`NUM-0`…`NUM-10`); larger numbers are signed digit by digit.

Add a rule by appending `[regex, replacement]` to `RULES`; order matters (phrases before single words).

## Bad words

Nothing is censored or softened: swear words and insults have their own signs (FUCK, SHIT, BITCH, BASTARD, DAMN, IDIOT, SHUT-UP, BHENCHOD, MADARCHOD, CHUTIYA, GANDU/ASSHOLE, KAMINA, SAALA, …) with an angry expression. `src/translation/profanity.js` only normalises masked and variant spellings (`f*ck`, `sh1t`, `wtf`, `bc`, `bkl`, `bsdk`) onto the canonical word so the right sign is matched; each match is shown under the translation as “f*ck → FUCK”. Like every other sign on the placeholder mannequin, these gestures are approximations, not verified ISL.

## Translation rules (MVP)

- English fillers (`a, the, is, are, to, do, …`) are dropped.
- WH-words (`WHAT, WHERE, WHEN, WHO, WHY, HOW`) move to the end of the sentence.
- Sentences ending in `?` (or starting with a question word/auxiliary) get a `QUESTION` marker.
- Unknown words are fingerspelled letter by letter (toggle in the UI) and listed in a note.

These are deliberately small, readable rules; real ISL grammar (classifiers, spatial grammar, rich non-manual markers) is out of scope for this MVP.

## Honesty notes

- The **placeholder mannequin's poses are approximations** that put the hands in roughly the right place. They are not verified ISL and the UI says so. Replace them with a properly animated avatar before using SignBridge for communication or teaching.
- Placeholder fingerspelling only gives each letter a distinct handshape so the pipeline can be exercised; ISL fingerspelling is largely two-handed.

## Future work

- FastAPI backend + PostgreSQL for a larger, editable vocabulary and usage analytics.
- Motion-captured ISL clips for a production avatar; facial blendshape support for non-manual markers.
- Speech-to-text input; Hindi and other Indian-language input.
