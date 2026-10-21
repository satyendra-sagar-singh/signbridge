# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-10-21

Initial release.

### Added

**Translation**

- Rule-based English → ISL gloss pipeline: validation, sentence and clause splitting, contraction expansion, longest-phrase vocabulary matching, filler-word removal, WH-word reordering and a `QUESTION` non-manual marker.
- 169-sign vocabulary generated from location and handshape templates, covering greetings, people and family, daily verbs, places and things, feelings, time, numbers 0–10 (larger numbers digit by digit), discourse words, and swear words and insults with their own signs.
- Slang, texting-abbreviation and Hinglish normaliser (`wassup`, `thx`, `gonna`, `bro`, `mujhe`, `kya haal hai`…) with every rewrite shown to the user.
- Profanity spelling normaliser so masked variants (`f*ck`, `sh1t`, `bc`, `bsdk`) reach the right sign. Nothing is censored.
- Optional fingerspelling of words outside the vocabulary.

**Avatar and animation**

- Keyframe poses compiled into real `THREE.AnimationClip`s and played through an `AnimationMixer`; play, pause, resume, replay, stop, previous/next sign, 0.5×–1.25× speed, progress and a clickable sequence timeline all act on the actual actions.
- Procedural placeholder mannequin in a chibi cartoon style with cel shading: articulated three-segment fingers, jointed legs with sneakers, a face with eyeballs, lids, nose, ears and lips that morph with each sign's expression, blinking and breathing. Joints use Mixamo names so a rigged GLB in `public/models/avatar.glb` is a drop-in replacement.
- 3D stage: free orbit with damping, pan, zoom, Front/Left/Back/Right presets, auto-rotate, fullscreen and a floor grid, with a text fallback when WebGL is unavailable.

**App**

- Single-screen React + Vite UI with examples, character counter, validation messages and a per-sign explanation of how each sign is made.
