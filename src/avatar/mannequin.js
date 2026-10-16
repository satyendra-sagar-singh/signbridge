// Procedural development mannequin — a PLACEHOLDER rig used when no avatar GLB
// is available. Its joints are named with Mixamo conventions
// (mixamorigRightArm, mixamorigLeftHandIndex1..3, …) so that keyframes authored
// against it also bind to a Mixamo-rigged GLB.
//
// Rest pose: standing, facing +Z, arms hanging at the sides, palms facing back.
// Rotation conventions (degrees, applied relative to rest):
//   Arm X-    : raise arm forward      Arm Z (R- / L+) : raise arm sideways
//   ForeArm X-: bend elbow             Hand X          : flex wrist
//   Finger X+ : curl toward the palm   Head X+ / Y     : nod down / turn
//   Brows X-  : raise eyebrows

import { BoxGeometry, CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three'

const COLORS = {
  skin: 0xe9b795,
  skinDark: 0xd9a383,
  shirt: 0x3f63e6,
  shirtDark: 0x3253c7,
  trousers: 0x2b2f44,
  shoe: 0x1b1d2a,
  hair: 0x2a1b14,
  eyeWhite: 0xffffff,
  pupil: 0x23170f,
  mouth: 0xb3675a,
}

const FINGER_SEGMENTS = {
  Index: [0.032, 0.026, 0.02],
  Middle: [0.035, 0.028, 0.021],
  Ring: [0.032, 0.026, 0.02],
  Pinky: [0.025, 0.02, 0.016],
}
const FINGER_X = { Index: 0.03, Middle: 0.01, Ring: -0.01, Pinky: -0.03 }

function mat(color, extra = {}) {
  return new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02, ...extra })
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

/** One finger as a chain of segment joints: <side>Hand<Finger>1 → 2 → 3. */
function buildFinger(side, finger, position, lengths, width, material) {
  let parent = null
  let first = null
  lengths.forEach((len, i) => {
    const seg = joint(`mixamorig${side}Hand${finger}${i + 1}`, i === 0 ? position : [0, -lengths[i - 1], 0])
    seg.add(mesh(new SphereGeometry(width * 0.55, 10, 8), material))
    seg.add(mesh(new CapsuleGeometry(width * 0.5, Math.max(0.001, len - width), 3, 10), material, [0, -len / 2, 0]))
    if (parent) parent.add(seg)
    else first = seg
    parent = seg
  })
  return first
}

function buildHand(side, skin) {
  const sign = side === 'Left' ? 1 : -1
  const hand = joint(`mixamorig${side}Hand`, [0, -0.25, 0])
  // Palm: rounded slab
  hand.add(mesh(new SphereGeometry(1, 16, 12), skin, [0, -0.045, 0], [0.043, 0.055, 0.017]))
  hand.add(mesh(new BoxGeometry(0.075, 0.06, 0.026), skin, [0, -0.055, 0]))
  for (const finger of Object.keys(FINGER_SEGMENTS)) {
    hand.add(buildFinger(side, finger, [sign * FINGER_X[finger], -0.085, 0], FINGER_SEGMENTS[finger], 0.016, skin))
  }
  const thumb = buildFinger(side, 'Thumb', [sign * 0.042, -0.03, 0.012], [0.032, 0.026], 0.018, skin)
  thumb.rotation.set(0.35, 0, sign * -0.75)
  hand.add(thumb)
  return hand
}

function buildArm(side, skin, shirt) {
  const sign = side === 'Left' ? 1 : -1
  const shoulder = joint(`mixamorig${side}Shoulder`, [sign * 0.16, 0.12, 0])
  const arm = joint(`mixamorig${side}Arm`, [sign * 0.085, 0, 0])
  arm.add(mesh(new SphereGeometry(0.056, 18, 14), shirt)) // deltoid
  arm.add(mesh(new CapsuleGeometry(0.047, 0.17, 4, 14), shirt, [0, -0.13, 0])) // sleeve
  arm.add(mesh(new CapsuleGeometry(0.042, 0.06, 4, 14), skin, [0, -0.25, 0])) // skin above elbow

  const foreArm = joint(`mixamorig${side}ForeArm`, [0, -0.28, 0])
  foreArm.add(mesh(new SphereGeometry(0.045, 16, 12), skin)) // elbow
  foreArm.add(mesh(new CapsuleGeometry(0.038, 0.17, 4, 14), skin, [0, -0.125, 0]))
  foreArm.add(mesh(new SphereGeometry(0.033, 14, 10), skin, [0, -0.25, 0])) // wrist

  foreArm.add(buildHand(side, skin))
  arm.add(foreArm)
  shoulder.add(arm)
  return shoulder
}

function buildLeg(x, trousers, shoe) {
  const leg = new Group()
  leg.add(mesh(new SphereGeometry(0.08, 16, 12), trousers, [x, -0.02, 0]))
  leg.add(mesh(new CapsuleGeometry(0.072, 0.32, 4, 14), trousers, [x, -0.24, 0]))
  leg.add(mesh(new SphereGeometry(0.065, 16, 12), trousers, [x, -0.46, 0]))
  leg.add(mesh(new CapsuleGeometry(0.06, 0.34, 4, 14), trousers, [x, -0.68, 0]))
  leg.add(mesh(new SphereGeometry(0.075, 16, 12), shoe, [x, -0.93, 0.03], [1, 0.55, 1.5]))
  return leg
}

function buildHead(skin, skinDark) {
  const head = joint('mixamorigHead', [0, 0.07, 0])
  const hair = mat(COLORS.hair, { roughness: 0.8 })
  const white = mat(COLORS.eyeWhite, { roughness: 0.3 })
  const pupil = mat(COLORS.pupil, { roughness: 0.3 })

  head.add(mesh(new SphereGeometry(0.105, 32, 24), skin, [0, 0.105, 0], [1, 1.12, 1])) // skull
  head.add(mesh(new SphereGeometry(0.06, 16, 12), skin, [0, 0.03, 0.03], [1, 0.8, 1])) // jaw
  // Hair cap
  head.add(mesh(new SphereGeometry(0.11, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, [0, 0.12, -0.01], [1, 1.05, 1]))
  head.add(mesh(new SphereGeometry(1, 16, 12), hair, [0, 0.165, 0.07], [0.095, 0.025, 0.04])) // fringe
  // Ears
  for (const x of [-0.105, 0.105]) head.add(mesh(new SphereGeometry(0.022, 12, 10), skinDark, [x, 0.1, 0], [0.5, 1, 0.8]))
  // Eyes (named so the avatar component can blink them)
  for (const [i, x] of [-0.038, 0.038].entries()) {
    const eye = joint(i === 0 ? 'EyeRight' : 'EyeLeft', [x, 0.115, 0.088])
    eye.add(mesh(new SphereGeometry(0.017, 14, 12), white, [0, 0, 0], [1, 0.8, 0.6]))
    eye.add(mesh(new SphereGeometry(0.009, 12, 10), pupil, [0, 0, 0.011]))
    head.add(eye)
  }
  // Brows (animated for expressions)
  const brows = joint('Brows', [0, 0.145, 0.085])
  for (const x of [-0.038, 0.038]) {
    const b = mesh(new BoxGeometry(0.036, 0.007, 0.012), hair, [x, 0, 0.012])
    b.rotation.z = x < 0 ? -0.12 : 0.12
    brows.add(b)
  }
  head.add(brows)
  // Nose & mouth
  head.add(mesh(new SphereGeometry(0.014, 12, 10), skinDark, [0, 0.085, 0.105], [0.8, 1, 0.9]))
  const mouth = mesh(new TorusGeometry(0.018, 0.0035, 8, 16, Math.PI), mat(COLORS.mouth), [0, 0.055, 0.098])
  mouth.rotation.set(Math.PI, 0, 0)
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
  const trousers = mat(COLORS.trousers)
  const shoe = mat(COLORS.shoe, { roughness: 0.4 })

  const root = new Group()
  root.name = 'SignBridgeMannequin'

  const hips = joint('mixamorigHips', [0, 0.98, 0])
  hips.add(mesh(new SphereGeometry(1, 20, 14), trousers, [0, 0, 0], [0.15, 0.1, 0.1]))
  hips.add(buildLeg(-0.085, trousers, shoe))
  hips.add(buildLeg(0.085, trousers, shoe))

  const spine = joint('mixamorigSpine', [0, 0.08, 0])
  spine.add(mesh(new CapsuleGeometry(0.155, 0.2, 6, 24), shirt, [0, 0.2, 0], [1, 1, 0.66])) // torso
  const spine1 = joint('mixamorigSpine1', [0, 0.12, 0])
  const spine2 = joint('mixamorigSpine2', [0, 0.12, 0])
  spine2.add(mesh(new SphereGeometry(1, 24, 16), shirt, [0, 0.11, 0], [0.21, 0.06, 0.1])) // shoulder line
  const collar = mesh(new TorusGeometry(0.055, 0.012, 8, 20), shirtDark, [0, 0.165, 0.0])
  collar.rotation.x = Math.PI / 2
  spine2.add(collar)

  const neck = joint('mixamorigNeck', [0, 0.16, 0])
  neck.add(mesh(new CapsuleGeometry(0.04, 0.05, 4, 12), skin, [0, 0.03, 0]))

  neck.add(buildHead(skin, skinDark))
  spine2.add(neck)
  spine2.add(buildArm('Left', skin, shirt))
  spine2.add(buildArm('Right', skin, shirt))
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
