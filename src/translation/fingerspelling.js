// PLACEHOLDER fingerspelling poses for the development mannequin.
//
// Real ISL fingerspelling is largely two-handed and each letter has a specific
// handshape. The poses generated here only give each letter a *distinct*,
// clearly labelled placeholder handshape so the playback pipeline can be
// exercised end to end. They are not genuine ISL letters.

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const FINGERS = ['RightHandIndex1', 'RightHandMiddle1', 'RightHandRing1', 'RightHandPinky1', 'RightHandThumb1']

/** Returns keyframes (same format as the vocabulary JSON) for one letter. */
export function fingerspellKeyframes(letter) {
  const index = LETTERS.indexOf(String(letter).toUpperCase())
  if (index < 0) return null
  const bits = index + 1 // 1..26 → 5-bit finger pattern, every letter differs
  const pose = { RightArm: [-75, 0, -15], RightForeArm: [-100, 0, 0], RightHand: [-20, 0, 0] }
  FINGERS.forEach((bone, i) => {
    pose[bone] = [(bits >> i) & 1 ? 0 : 85, 0, 0]
  })
  return [
    { t: 0.2, pose },
    { t: 0.55, pose },
  ]
}
