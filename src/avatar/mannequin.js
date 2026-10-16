// Procedural development mannequin — a PLACEHOLDER rig used when no avatar GLB
// is available. Styled as a chibi cartoon kid (big round head, small body,
// red tee, yellow shorts) with cel shading. Its joints are named with Mixamo
// conventions (mixamorigRightArm, mixamorigLeftHandIndex1..3, …) so that
// keyframes authored against it also bind to a Mixamo-rigged GLB.
//
// Rest pose: standing, facing +Z, arms hanging at the sides, palms facing back.
// Rotation conventions (degrees, applied relative to rest):
//   Arm X-    : raise arm forward      Arm Z (R- / L+) : raise arm sideways
//   ForeArm X-: bend elbow             Hand X          : flex wrist
//   Finger X+ : curl toward the palm   Head X+ / Y     : nod down / turn
//   Brows X-  : raise eyebrows

import { BoxGeometry, CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshToonMaterial, SphereGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const COLORS = {
  skin: 0xf7c9a3,
  skinDark: 0xe9b48c,
  shirt: 0xe5322b,
  shirtDark: 0xc9261f,
  shorts: 0xf9e13b,
  sock: 0xf7f7f7,
  shoe: 0xf2a72a,
  hair: 0x161616,
  eye: 0x111111,
  highlight: 0xffffff,
  mouth: 0x7d3a4a,
  nail: 0xfbe0cc,
}

// Finger segment lengths (proximal → distal), base width, rest splay (rad).
// Index sits next to the thumb on the medial side (palms face back at rest).
const FINGERS = {
  Index: { lengths: [0.034, 0.024, 0.019], width: 0.0165, x: 0.028, splay: -0.1 },
  Middle: { lengths: [0.037, 0.026, 0.02], width: 0.0165, x: 0.0095, splay: -0.02 },
  Ring: { lengths: [0.034, 0.024, 0.019], width: 0.0155, x: -0.0095, splay: 0.05 },
  Pinky: { lengths: [0.026, 0.018, 0.015], width: 0.0135, x: -0.028, splay: 0.14 },
}
const REST_CURL = [0.12, 0.16, 0.1] // relaxed hand: slight curl per segment

function mat(color) {
  return new MeshToonMaterial({ color })
}

function mesh(geometry, material, position = [0, 0, 0], scale = null) {
  const m = new Mesh(geometry, material)
  m.position.set(...position)
  if (scale) m.scale.set(...scale)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function joint(name, position = [0, 0, 0]) {
  const g = new Group()
  g.name = name
  g.position.set(...position)
  return g
}

/**
 * One finger as a chain of segment joints: <side>Hand<Finger>1 → 2 → 3.
 * Segments taper toward a rounded tip with a nail on the back of the hand
 * (the +Z side, since palms face back in the rest pose).
 */
function buildFinger(side, finger, { position, lengths, width, splay = 0, curl = REST_CURL, baseRotation = null }, skin, nail) {
  let parent = null
  let first = null
  lengths.forEach((len, i) => {
    const seg = joint(`mixamorig${side}Hand${finger}${i + 1}`, i === 0 ? position : [0, -lengths[i - 1], 0])
    const rTop = width * (0.5 - i * 0.06)
    const rBottom = width * (0.44 - i * 0.06)
    seg.add(mesh(new SphereGeometry(rTop * (i === 0 ? 1.15 : 1), 12, 10), skin)) // knuckle
    seg.add(mesh(new CylinderGeometry(rTop, rBottom, len, 12), skin, [0, -len / 2, 0]))
    if (i === lengths.length - 1) {
      seg.add(mesh(new SphereGeometry(rBottom * 1.05, 12, 10), skin, [0, -len, 0], [1, 1.1, 0.9])) // fingertip
      seg.add(mesh(new SphereGeometry(rBottom * 0.8, 10, 8), nail, [0, -len + rBottom * 0.5, rBottom * 0.55], [0.9, 1.1, 0.35]))
    }
    seg.rotation.x = curl[i] || 0
    if (i === 0) {
      seg.rotation.z = splay
      if (baseRotation) seg.rotation.set(...baseRotation)
    }
    if (parent) parent.add(seg)
    else first = seg
    parent = seg
  })
  return first
}

function buildHand(side, skin, skinDark, nail) {
  const sign = side === 'Left' ? 1 : -1 // +x is the lateral (outer) side of the left hand
  const hand = joint(`mixamorig${side}Hand`, [0, -0.22, 0])
  // Palm: rounded slab, slightly narrower at the wrist, with a heel and thumb pad
  const palm = mesh(new RoundedBoxGeometry(0.08, 0.092, 0.027, 3, 0.011), skin, [0, -0.046, 0])
  hand.add(palm)
  hand.add(mesh(new SphereGeometry(1, 16, 12), skin, [0, -0.012, 0], [0.034, 0.02, 0.014])) // heel/wrist blend
  hand.add(mesh(new SphereGeometry(1, 16, 12), skinDark, [-sign * 0.03, -0.038, -0.004], [0.026, 0.038, 0.014])) // thenar pad
  hand.add(mesh(new SphereGeometry(1, 16, 12), skin, [sign * 0.03, -0.066, -0.004], [0.02, 0.03, 0.013])) // hypothenar pad
  for (const [finger, spec] of Object.entries(FINGERS)) {
    hand.add(
      buildFinger(
        side,
        finger,
        { position: [-sign * spec.x, -0.09, 0], lengths: spec.lengths, width: spec.width, splay: -sign * spec.splay },
        skin,
        nail,
      ),
    )
  }
  // Thumb: metacarpal angled off the medial edge, slightly toward the palm side
  hand.add(
    buildFinger(
      side,
      'Thumb',
      { position: [-sign * 0.042, -0.022, -0.002], lengths: [0.034, 0.026], width: 0.019, curl: [0.1, 0.25], baseRotation: [0.45, -sign * 0.35, -sign * 0.95] },
      skin,
      nail,
    ),
  )
  hand.scale.setScalar(1.3) // slightly oversized so signing stays legible
  return hand
}

function buildArm(side, skin, skinDark, nail, shirt) {
  const sign = side === 'Left' ? 1 : -1
  const shoulder = joint(`mixamorig${side}Shoulder`, [sign * 0.12, 0.09, 0])
  const arm = joint(`mixamorig${side}Arm`, [sign * 0.075, 0, 0])
  arm.add(mesh(new SphereGeometry(0.058, 18, 14), shirt)) // shoulder
  arm.add(mesh(new CapsuleGeometry(0.048, 0.1, 4, 14), shirt, [0, -0.08, 0])) // sleeve
  arm.add(mesh(new CapsuleGeometry(0.04, 0.1, 4, 14), skin, [0, -0.19, 0]))

  const foreArm = joint(`mixamorig${side}ForeArm`, [0, -0.25, 0])
  foreArm.add(mesh(new SphereGeometry(0.042, 16, 12), skin)) // elbow
  foreArm.add(mesh(new CapsuleGeometry(0.037, 0.14, 4, 14), skin, [0, -0.11, 0]))
  foreArm.add(mesh(new SphereGeometry(0.032, 14, 10), skin, [0, -0.22, 0])) // wrist

  foreArm.add(buildHand(side, skin, skinDark, nail))
  arm.add(foreArm)
  shoulder.add(arm)
  return shoulder
}

function buildLeg(x, skin, shorts, sock, shoe) {
  const leg = new Group()
  leg.add(mesh(new CylinderGeometry(0.09, 0.095, 0.13, 20), shorts, [x, -0.1, 0])) // shorts leg
  leg.add(mesh(new CapsuleGeometry(0.052, 0.18, 4, 14), skin, [x, -0.25, 0]))
  leg.add(mesh(new CapsuleGeometry(0.056, 0.05, 4, 14), sock, [x, -0.38, 0]))
  leg.add(mesh(new SphereGeometry(1, 18, 14), shoe, [x, -0.455, 0.035], [0.072, 0.045, 0.12]))
  return leg
}

function buildHead(skin, skinDark) {
  const head = joint('mixamorigHead', [0, 0.05, 0])
  const hair = mat(COLORS.hair)
  const eyeMat = mat(COLORS.eye)
  const highlight = mat(COLORS.highlight)
  const R = 0.3

  head.add(mesh(new SphereGeometry(R, 40, 28), skin, [0, R, 0], [1.02, 0.97, 0.95])) // skull
  head.add(mesh(new SphereGeometry(1, 32, 20), skin, [0, 0.21, 0.02], [0.33, 0.2, 0.27])) // wide jaw
  for (const x of [-0.2, 0.2]) head.add(mesh(new SphereGeometry(0.14, 24, 18), skin, [x, 0.19, 0.1])) // cheeks
  // Hair: flat black cap with a soft fringe line
  head.add(mesh(new SphereGeometry(R + 0.012, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.27), hair, [0, R, -0.005], [1.02, 0.97, 0.95]))
  head.add(mesh(new SphereGeometry(1, 20, 12), hair, [0, 0.5, 0.2], [0.2, 0.03, 0.09]))
  // Ears
  for (const x of [-0.3, 0.3]) head.add(mesh(new SphereGeometry(0.04, 14, 10), skinDark, [x, 0.27, 0.02], [0.5, 1, 0.8]))
  // Eyes: big dark ovals with a white highlight (joints so the avatar can blink)
  for (const [i, x] of [-0.11, 0.11].entries()) {
    const eye = joint(i === 0 ? 'EyeRight' : 'EyeLeft', [x, 0.33, 0.265])
    eye.add(mesh(new SphereGeometry(0.062, 24, 18), eyeMat, [0, 0, 0], [0.85, 1, 0.45]))
    eye.add(mesh(new SphereGeometry(0.03, 14, 12), highlight, [0, 0.004, 0.02], [1, 1, 0.5]))
    head.add(eye)
  }
  // Thick brows (animated for expressions)
  const brows = joint('Brows', [0, 0.44, 0.235])
  for (const x of [-0.105, 0.105]) {
    const b = mesh(new BoxGeometry(0.125, 0.034, 0.03), hair, [x, 0, 0])
    b.rotation.z = x < 0 ? -0.18 : 0.18
    brows.add(b)
  }
  head.add(brows)
  // Small open mouth
  const mouth = mesh(new SphereGeometry(1, 16, 12), mat(COLORS.mouth), [0.02, 0.13, 0.25], [0.035, 0.05, 0.02])
  mouth.name = 'Mouth'
  head.add(mouth)
  return head
}

/** Builds the mannequin. Returns a Group whose descendants are the named joints. */
export function createMannequin() {
  const skin = mat(COLORS.skin)
  const skinDark = mat(COLORS.skinDark)
  const shirt = mat(COLORS.shirt)
  const shirtDark = mat(COLORS.shirtDark)
  const shorts = mat(COLORS.shorts)
  const sock = mat(COLORS.sock)
  const shoe = mat(COLORS.shoe)
  const nail = mat(COLORS.nail)

  const root = new Group()
  root.name = 'SignBridgeMannequin'

  const hips = joint('mixamorigHips', [0, 0.52, 0])
  hips.add(mesh(new SphereGeometry(1, 24, 16), shorts, [0, -0.02, 0], [0.21, 0.13, 0.14])) // shorts
  hips.add(buildLeg(-0.085, skin, shorts, sock, shoe))
  hips.add(buildLeg(0.085, skin, shorts, sock, shoe))

  const spine = joint('mixamorigSpine', [0, 0.06, 0])
  spine.add(mesh(new CapsuleGeometry(0.165, 0.1, 6, 24), shirt, [0, 0.16, 0], [1, 1, 0.72])) // tee
  const spine1 = joint('mixamorigSpine1', [0, 0.1, 0])
  const spine2 = joint('mixamorigSpine2', [0, 0.1, 0])
  spine2.add(mesh(new SphereGeometry(1, 24, 16), shirt, [0, 0.08, 0], [0.19, 0.055, 0.1])) // shoulder line
  spine2.add(mesh(new CylinderGeometry(0.06, 0.07, 0.03, 20), shirtDark, [0, 0.14, 0])) // collar

  const neck = joint('mixamorigNeck', [0, 0.13, 0])
  neck.add(mesh(new CylinderGeometry(0.045, 0.05, 0.07, 16), skin, [0, 0.03, 0]))

  neck.add(buildHead(skin, skinDark))
  spine2.add(neck)
  spine2.add(buildArm('Left', skin, skinDark, nail, shirt))
  spine2.add(buildArm('Right', skin, skinDark, nail, shirt))
  spine1.add(spine2)
  spine.add(spine1)
  hips.add(spine)
  root.add(hips)

  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true
      n.receiveShadow = true
    }
  })
  return root
}
