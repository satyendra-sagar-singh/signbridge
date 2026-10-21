// Builds real THREE.AnimationClips from the JSON keyframe format used in
// src/data/islVocabulary.json, so the AnimationMixer drives the avatar.
//
// A pose is { boneName: [xDeg, yDeg, zDeg] } relative to the bone's rest
// rotation. Bone names are looked up with and without the "mixamorig" prefix,
// so the same keyframes drive the procedural mannequin and Mixamo-rigged GLBs.

import {
  AnimationClip,
  Euler,
  MathUtils,
  PropertyBinding,
  Quaternion,
  QuaternionKeyframeTrack,
} from 'three';

const FINGER_MACROS = {
  RightFingers: ['RightHandIndex1', 'RightHandMiddle1', 'RightHandRing1', 'RightHandPinky1'],
  LeftFingers: ['LeftHandIndex1', 'LeftHandMiddle1', 'LeftHandRing1', 'LeftHandPinky1'],
};

const DEFAULT_PREFIXES = ['', 'mixamorig', 'mixamorig:'];

// A finger's base joint ("…Index1") stands for the whole finger: the curl is
// propagated down the chain so multi-segment rigs bend naturally.
const SEGMENT_FALLOFF = {
  Index: [1, 0.85, 0.65],
  Middle: [1, 0.85, 0.65],
  Ring: [1, 0.85, 0.65],
  Pinky: [1, 0.85, 0.65],
  Thumb: [1, 0.7],
};
const FINGER_BASE_RE = /^(Right|Left)Hand(Index|Middle|Ring|Pinky|Thumb)1$/;

/** Expands RightFingers/LeftFingers macros and finger chains; explicit keys win. */
export function expandPose(pose = {}) {
  const out = {};
  for (const [key, value] of Object.entries(pose)) {
    if (FINGER_MACROS[key]) for (const bone of FINGER_MACROS[key]) out[bone] = value;
  }
  for (const [key, value] of Object.entries(pose)) {
    if (!FINGER_MACROS[key]) out[key] = value;
  }
  for (const [key, value] of Object.entries(out)) {
    const m = FINGER_BASE_RE.exec(key);
    if (!m) continue;
    const [, side, finger] = m;
    SEGMENT_FALLOFF[finger].forEach((factor, i) => {
      if (i === 0) return;
      const seg = `${side}Hand${finger}${i + 1}`;
      if (!(seg in pose)) out[seg] = [(value[0] || 0) * factor, 0, 0];
    });
  }
  return out;
}

export function resolveBone(root, name, prefixes = DEFAULT_PREFIXES) {
  for (const prefix of prefixes) {
    const node = root.getObjectByName(prefix + name);
    if (node) return node;
  }
  return null;
}

/** Records each node's rest rotation so clips can be built relative to it. */
export function captureRestPose(root) {
  root.traverse((node) => {
    if (!node.userData.restQuaternion) node.userData.restQuaternion = node.quaternion.clone();
  });
}

/**
 * @param {object} args
 * @param {string} args.name            clip name
 * @param {Array<{t:number, pose:object}>} args.keyframes
 * @param {import('three').Object3D} args.root  avatar root containing the bones
 * @param {number} [args.returnToRest]  seconds added at the end to blend back to rest
 * @returns {AnimationClip|null} null when none of the referenced bones exist on this rig
 */
export function buildClip({
  name,
  keyframes,
  root,
  returnToRest = 0.35,
  prefixes = DEFAULT_PREFIXES,
}) {
  if (!root || !Array.isArray(keyframes) || keyframes.length === 0) return null;

  const frames = keyframes
    .map((k) => ({ t: Number(k.t) || 0, pose: expandPose(k.pose) }))
    .sort((a, b) => a.t - b.t);
  if (frames[0].t > 0) frames.unshift({ t: 0, pose: {} });
  const last = frames[frames.length - 1];
  if (Object.keys(last.pose).length > 0) frames.push({ t: last.t + returnToRest, pose: {} });
  const duration = frames[frames.length - 1].t;

  const bones = new Set();
  for (const f of frames) for (const bone of Object.keys(f.pose)) bones.add(bone);

  const tracks = [];
  const missing = [];
  const q = new Quaternion();
  const euler = new Euler();
  for (const bone of bones) {
    const node = resolveBone(root, bone, prefixes);
    if (!node) {
      missing.push(bone);
      continue;
    }
    const rest = node.userData.restQuaternion || node.quaternion;
    const times = [];
    const values = [];
    for (const f of frames) {
      const [x = 0, y = 0, z = 0] = f.pose[bone] || [];
      euler.set(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), 'XYZ');
      q.setFromEuler(euler).premultiply(rest); // rest * delta
      times.push(f.t);
      values.push(q.x, q.y, q.z, q.w);
    }
    // Use the node name when the binding parser accepts it, otherwise the uuid.
    const target =
      PropertyBinding.sanitizeNodeName(node.name) === node.name && node.name
        ? node.name
        : node.uuid;
    tracks.push(new QuaternionKeyframeTrack(`${target}.quaternion`, times, values));
  }

  if (tracks.length === 0) return null;
  const clip = new AnimationClip(name, duration, tracks);
  clip.userData = { missingBones: missing };
  return clip;
}

/** A clip with no tracks: keeps timing real for signs the current rig cannot show. */
export function emptyClip(name, duration = 0.8) {
  const clip = new AnimationClip(name, duration, []);
  clip.userData = { empty: true };
  return clip;
}
