# Contributing

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # vitest, no browser required
```

Node 20+ (`.nvmrc` pins 24). Python 3 is needed only to regenerate the vocabulary.

## Commands

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run dev`            | Vite dev server with hot reload.                                 |
| `npm run build`          | Production build into `dist/`.                                   |
| `npm run preview`        | Serve the production build locally.                              |
| `npm test`               | Run the suite (translation engine, clip builder, player).        |
| `npm run test:watch`     | Watch mode.                                                      |
| `npm run test:coverage`  | Coverage report.                                                 |
| `npm run lint`           | ESLint with the React Hooks rules.                               |
| `npm run format`         | Prettier.                                                        |
| `npm run vocab:generate` | Rebuild `src/data/islVocabulary.json` from the Python templates. |
| `npm run check`          | Everything CI runs: lint, format check, tests, build.            |

## How the code is organised

| Area                                  | Path                            |
| ------------------------------------- | ------------------------------- |
| Text → gloss pipeline                 | `src/translation/translate.js`  |
| Slang, abbreviations, Hinglish        | `src/translation/slang.js`      |
| Profanity spelling normaliser         | `src/translation/profanity.js`  |
| Vocabulary (generated JSON)           | `src/data/islVocabulary.json`   |
| Vocabulary generator and templates    | `scripts/generateVocabulary.py` |
| Keyframe poses → `AnimationClip`      | `src/avatar/clipBuilder.js`     |
| Sequence playback on `AnimationMixer` | `src/avatar/SignPlayer.js`      |
| Placeholder mannequin                 | `src/avatar/mannequin.js`       |
| 3D viewer, GLB loading, fallback      | `src/avatar/AvatarViewer.jsx`   |
| UI components                         | `src/components/`               |

## How the tests are structured

The suite runs entirely in Node — no browser, no WebGL. The translation tests exercise the rule engine against real sentences; the animation tests build the procedural mannequin, generate clips from the vocabulary and drive a `SignPlayer` frame by frame, asserting that bones actually rotate during playback and return to rest on stop.

```js
const player = new SignPlayer(root);
player.setSequence(items);
player.play();
for (let i = 0; i < 30; i++) player.update(1 / 60);
expect(arm.quaternion.angleTo(rest)).toBeGreaterThan(0.5);
```

## Adding or changing signs

Most signs are composed from location and handshape templates in `scripts/generateVocabulary.py`. Add an entry there, run `npm run vocab:generate`, and commit the regenerated JSON — CI checks that the JSON matches the generator. Hand-authored entries can also be written directly into the JSON; see the README for the pose format.

A good sign entry has:

1. A `description` that summarises the documented ISL form in words.
2. `words` covering plural, tense and common Hinglish forms, without colliding with English function words.
3. Keyframes that start and end near rest, so consecutive signs blend cleanly.
4. An `expression` where the sign carries one (`smile`, `frown`, `question`).

## Writing tests

**Test behaviour, not implementation.** Assert the gloss sequence a sentence produces, or that a bone moved, not the internal structure of the matcher.

**Keep translation tests readable.** `expect(glosses(translate('How are you?'))).toEqual(['YOU', 'HOW', 'QUESTION'])` documents the grammar rule it checks.

## Code conventions

- **Comments explain _why_.** The code already says what it does. Comment the decision, the alternative rejected, and the failure mode avoided.
- **No fake playback.** Every playback control must act on real `AnimationAction`s; never simulate progress with timers.
- **Honest labelling.** Anything the placeholder mannequin performs is an approximation. Keep the on-screen label and never present generated poses as verified ISL.
- **Prettier and ESLint are the style guide.** `npm run format && npm run lint` before pushing.

## Pull requests

1. A test that fails before your change and passes after, where the change is testable.
2. `npm run check` clean.
3. Documentation updated when behaviour, vocabulary or configuration changes.
4. A changelog entry.

Commit messages follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## Releasing

1. Update `CHANGELOG.md`.
2. `npm version <patch|minor|major>`.
3. `git push --follow-tags`.

SignBridge is an application, not a package, so there is no npm publish step; a release is a tagged commit whose `dist/` can be deployed to any static host.
