// Resolves a translation item ({ gloss, kind }) to an AnimationClip for a
// specific rig. Priority for GLB avatars:
//   1. an animation clip embedded in the GLB named after entry.clipName / gloss
//   2. a clip built from the JSON keyframes, if the rig has matching bone names
//   3. an empty (timing-only) clip, flagged so the UI can say the rig lacks it
// The mannequin only uses steps 2 and 3.

import { buildClip, emptyClip } from './clipBuilder.js';
import { getSignEntry } from '../translation/translate.js';
import { fingerspellKeyframes } from '../translation/fingerspelling.js';

export function createClipResolver(root, embeddedClips = []) {
  const cache = new Map();
  const byName = new Map(embeddedClips.map((c) => [c.name.toUpperCase(), c]));

  return function getClip(item) {
    const key = `${item.kind}:${item.gloss}`;
    if (cache.has(key)) return cache.get(key);

    let clip = null;
    if (item.kind === 'fingerspell') {
      clip = byName.get(`FS_${item.gloss}`) || byName.get(item.gloss.toUpperCase()) || null;
      if (!clip)
        clip = buildClip({
          name: `fs-${item.gloss}`,
          keyframes: fingerspellKeyframes(item.gloss),
          root,
        });
    } else {
      const entry = getSignEntry(item.gloss);
      if (entry) {
        clip =
          byName.get((entry.clipName || entry.gloss).toUpperCase()) ||
          byName.get(entry.gloss.toUpperCase()) ||
          null;
        if (!clip) clip = buildClip({ name: entry.gloss, keyframes: entry.keyframes, root });
      }
    }
    if (!clip) clip = emptyClip(item.gloss);
    cache.set(key, clip);
    return clip;
  };
}
