// Procedural development mannequin — a PLACEHOLDER rig used when no avatar GLB
// is available. Its joints are named with Mixamo conventions
// (mixamorigRightArm, mixamorigLeftHandIndex1, …) so that keyframes authored
// against it also bind to a Mixamo-rigged GLB.
//
// Rest pose: standing, facing +Z, arms hanging at the sides, palms facing back.
// Rotation conventions (degrees, applied relative to rest):
//   Arm X-   : raise arm forward      Arm Z (R- / L+) : raise arm sideways
//   ForeArm X-: bend elbow             Hand X          : flex wrist
//   Finger X+ : curl toward the palm   Head X+ / Y     : nod down / turn
//   Brows X-  : raise eyebrows

import { BoxGeometry, CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three'

const SKIN = 0xe8b89a
const SHIRT = 0x3b5bdb
const TROUSERS = 0x2b2d42
const DARK = 0x2a1a12

function mat(color) {
  return new MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 })
}

function mesh(geometry, material, position = [0, 0, 0]) {
  const m = new Mesh(geometry, material)
  m.position.set(...position)
  m.castShadow = true
  return m
}

function joint(name, position = [0, 0, 0]) {
  const g = new Group()
  g.name = name
  g.position.set(...position)
  return g
}

function buildFinger(name, position, length = 0.07, width = 0.015, material) {
  const f = joint(name, position)
  f.add(mesh(new BoxGeometry(width, length, width), material, [0, -length / 2, 0]))
  return f
}

function buildArm(side, skin, shirt) {
  const sign = side === 'Left' ? 1 : -1
  const shoulder = joint(`mixamorig${side}Shoulder`, [sign * 0.17, 0.13, 0])
  const arm = joint(`mixamorig${side}Arm`, [sign * 0.08, 0, 0])
  arm.add(mesh(new SphereGeometry(0.055, 16, 12), shirt))
  arm.add(mesh(new CapsuleGeometry(0.045, 0.2, 4, 12), shirt, [0, -0.15, 0]))

  const foreArm = joint(`mixamorig${side}ForeArm`, [0, -0.28, 0])
  foreArm.add(mesh(new SphereGeometry(0.045, 16, 12), skin))
  foreArm.add(mesh(new CapsuleGeometry(0.038, 0.18, 4, 12), skin, [0, -0.13, 0]))

  const hand = joint(`mixamorig${side}Hand`, [0, -0.26, 0])
  hand.add(mesh(new BoxGeometry(0.085, 0.09, 0.03), skin, [0, -0.045, 0]))
  const fingerNames = ['Index', 'Middle', 'Ring', 'Pinky']
  const offsets = [0.03, 0.01, -0.01, -0.03]
  fingerNames.forEach((finger, i) => {
    const length = finger === 'Middle' ? 0.075 : finger === 'Pinky' ? 0.055 : 0.068
    hand.add(buildFinger(`mixamorig${side}Hand${finger}1`, [sign * offsets[i], -0.09, 0], length, 0.016, skin))
  })
  const thumb = buildFinger(`mixamorig${side}HandThumb1`, [sign * 0.05, -0.03, 0.012], 0.055, 0.017, skin)
  thumb.rotation.z = sign * -0.6
  hand.add(thumb)

  foreArm.add(hand)
  arm.add(foreArm)
  shoulder.add(arm)
  return shoulder
}

/** Builds the mannequin. Returns a Group whose descendants are the named joints. */
export function createMannequin() {
  const skin = mat(SKIN)
  const shirt = mat(SHIRT)
  const trousers = mat(TROUSERS)
  const dark = mat(DARK)

  const root = new Group()
  root.name = 'SignBridgeMannequin'

  const hips = joint('mixamorigHips', [0, 0.95, 0])
  hips.add(mesh(new BoxGeometry(0.3, 0.14, 0.18), trousers, [0, 0, 0]))
  // Static legs (not animated in this MVP).
  for (const x of [-0.085, 0.085]) {
    hips.add(mesh(new CapsuleGeometry(0.065, 0.76, 4, 12), trousers, [x, -0.47, 0]))
    hips.add(mesh(new BoxGeometry(0.11, 0.06, 0.22), dark, [x, -0.92, 0.04]))
  }

  const spine = joint('mixamorigSpine', [0, 0.1, 0])
  const spine1 = joint('mixamorigSpine1', [0, 0.12, 0])
  const spine2 = joint('mixamorigSpine2', [0, 0.14, 0])
  spine2.add(mesh(new BoxGeometry(0.34, 0.42, 0.2), shirt, [0, -0.08, 0]))

  const neck = joint('mixamorigNeck', [0, 0.17, 0])
  neck.add(mesh(new CapsuleGeometry(0.045, 0.06, 4, 10), skin, [0, 0.03, 0]))
  const head = joint('mixamorigHead', [0, 0.08, 0])
  head.add(mesh(new SphereGeometry(0.115, 24, 18), skin, [0, 0.1, 0]))
  // Hair cap
  const hair = mesh(new SphereGeometry(0.118, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.45), dark, [0, 0.105, -0.01])
  head.add(hair)
  // Eyes
  for (const x of [-0.04, 0.04]) head.add(mesh(new SphereGeometry(0.013, 10, 8), dark, [x, 0.11, 0.105]))
  // Eyebrows (animated for expressions, mannequin only)
  const brows = joint('Brows', [0, 0.14, 0.1])
  for (const x of [-0.04, 0.04]) brows.add(mesh(new BoxGeometry(0.035, 0.008, 0.01), dark, [x, 0, 0.012]))
  head.add(brows)
  // Mouth
  head.add(mesh(new BoxGeometry(0.045, 0.008, 0.01), dark, [0, 0.055, 0.108]))

  neck.add(head)
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
