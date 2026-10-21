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

import { CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshToonMaterial, QuadraticBezierCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const COLORS = {
  skin: 0xf7c9a3,
  skinDark: 0xe9b48c,
  shirt: 0xe5322b,
  shirtDark: 0xc9261f,
  shorts: 0xf9e13b,
  sock: 0xf7f7f7,
  shoe: 0xf2a72a,
  shoeDark: 0xd98d1c,
  sole: 0xf6f2e9,
  lace: 0xfafafa,
  hair: 0x161616,
  eyeWhite: 0xfafafa,
  iris: 0x4a2c1c,
  pupil: 0x0b0806,
  highlight: 0xffffff,
  lip: 0xc9706a,
  mouth: 0x5a2630,
  blush: 0xf2a8a0,
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
  hand.scale.setScalar(1.0)
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

/**
 * One leg as a joint chain: <side>UpLeg (hip) → <side>Leg (knee) → <side>Foot (ankle) → <side>ToeBase.
 * Rest pose is straight; the names follow Mixamo so clips can drive them later.
 */
function buildLeg(side, { skin, shorts, sock, shoe, shoeDark, sole, lace }) {
  const sign = side === 'Left' ? 1 : -1
  const upLeg = joint(`mixamorig${side}UpLeg`, [sign * 0.085, -0.02, 0])
  upLeg.add(mesh(new CylinderGeometry(0.088, 0.094, 0.13, 20), shorts, [0, -0.08, 0])) // shorts leg
  upLeg.add(mesh(new SphereGeometry(0.056, 16, 12), skin, [0, -0.05, 0])) // hip blend under the shorts
  upLeg.add(mesh(new CapsuleGeometry(0.054, 0.1, 4, 14), skin, [0, -0.12, 0])) // thigh

  const knee = joint(`mixamorig${side}Leg`, [0, -0.19, 0])
  knee.add(mesh(new SphereGeometry(0.052, 18, 14), skin, [0, 0, 0], [1, 1.05, 1])) // kneecap
  knee.add(mesh(new CylinderGeometry(0.048, 0.04, 0.17, 16), skin, [0, -0.1, 0])) // shin, tapering to the ankle
  knee.add(mesh(new CapsuleGeometry(0.044, 0.05, 4, 14), sock, [0, -0.2, 0])) // sock
  knee.add(mesh(new SphereGeometry(0.036, 14, 10), sock, [0, -0.235, 0])) // ankle

  const foot = joint(`mixamorig${side}Foot`, [0, -0.24, 0])
  // Sneaker: sole, upper, toe cap, heel counter, tongue and laces
  foot.add(mesh(new RoundedBoxGeometry(0.095, 0.03, 0.17, 3, 0.012), sole, [0, -0.052, 0.025]))
  foot.add(mesh(new SphereGeometry(1, 24, 16), shoe, [0, -0.024, 0.02], [0.048, 0.042, 0.084])) // upper
  foot.add(mesh(new SphereGeometry(1, 20, 14), shoe, [0, -0.036, 0.065], [0.046, 0.03, 0.05])) // toe box (merges into the upper)
  foot.add(mesh(new SphereGeometry(1, 16, 12), shoeDark, [0, -0.022, -0.035], [0.042, 0.04, 0.032])) // heel counter
  foot.add(mesh(new SphereGeometry(1, 14, 10), shoeDark, [0, 0.006, 0.03], [0.026, 0.02, 0.03])) // tongue
  for (const [i, z] of [0.03, 0.045, 0.06].entries()) {
    const laceBar = mesh(new CylinderGeometry(0.003, 0.003, 0.05 - i * 0.004, 6), lace, [0, 0.012 - i * 0.006, z])
    laceBar.rotation.z = Math.PI / 2
    foot.add(laceBar)
  }
  const toes = joint(`mixamorig${side}ToeBase`, [0, -0.05, 0.08])
  foot.add(toes)

  knee.add(foot)
  upLeg.add(knee)
  return upLeg
}

/** Facial expression targets: smile in [-1, 1], open in [0, 1]. */
const EXPRESSIONS = {
  neutral: { smile: 0.15, open: 0 },
  smile: { smile: 1, open: 0.25 },
  frown: { smile: -0.8, open: 0 },
  question: { smile: 0.05, open: 0.55 },
}

function lipCurve(smile, open, lower) {
  const y = 0.14
  const cornerY = y + smile * 0.03
  const midY = lower ? y - smile * 0.02 - open * 0.05 : y - smile * 0.018 + open * 0.012
  return new QuadraticBezierCurve3(
    new Vector3(-0.052, cornerY, 0.276),
    new Vector3(0, midY, 0.294),
    new Vector3(0.052, cornerY, 0.276),
  )
}

function buildHead(skin, skinDark) {
  const head = joint('mixamorigHead', [0, 0.05, 0])
  const hair = mat(COLORS.hair)
  const white = mat(COLORS.eyeWhite)
  const iris = mat(COLORS.iris)
  const pupil = mat(COLORS.pupil)
  const highlight = mat(COLORS.highlight)
  const lip = mat(COLORS.lip)
  const mouthInner = mat(COLORS.mouth)
  const blush = mat(COLORS.blush)
  const R = 0.3

  head.add(mesh(new SphereGeometry(R, 40, 28), skin, [0, R, 0], [1.02, 0.97, 0.95])) // skull
  head.add(mesh(new SphereGeometry(1, 32, 20), skin, [0, 0.21, 0.02], [0.33, 0.2, 0.27])) // wide jaw
  for (const x of [-0.2, 0.2]) {
    head.add(mesh(new SphereGeometry(0.14, 24, 18), skin, [x, 0.19, 0.1])) // cheeks
    head.add(mesh(new SphereGeometry(1, 16, 12), blush, [x * 0.9, 0.21, 0.235], [0.045, 0.026, 0.014])) // blush
  }
  // Hair: flat black cap with a soft fringe line
  head.add(mesh(new SphereGeometry(R + 0.012, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.27), hair, [0, R, -0.005], [1.02, 0.97, 0.95]))
  head.add(mesh(new SphereGeometry(1, 20, 12), hair, [0, 0.5, 0.2], [0.2, 0.03, 0.09]))
  // Ears: helix rim, concha hollow and lobe, standing off the side of the skull
  for (const side of [-1, 1]) {
    const ear = new Group()
    ear.position.set(side * 0.3, 0.3, -0.02)
    ear.rotation.set(0, side * 0.45, side * -0.1) // angled slightly forward and tilted
    const helix = mesh(new TorusGeometry(0.036, 0.011, 10, 24), skin, [side * 0.022, 0.004, 0], [1, 1.3, 1])
    helix.rotation.y = Math.PI / 2
    ear.add(helix)
    ear.add(mesh(new SphereGeometry(1, 16, 12), skin, [side * 0.012, 0, 0], [0.018, 0.052, 0.038])) // back plate
    ear.add(mesh(new SphereGeometry(1, 14, 10), skinDark, [side * 0.024, -0.002, 0.005], [0.007, 0.032, 0.022])) // concha
    ear.add(mesh(new SphereGeometry(1, 14, 10), skin, [side * 0.022, -0.048, 0.008], [0.014, 0.017, 0.016])) // lobe
    head.add(ear)
  }

  // Eyes: eyeball, iris, pupil, highlight, upper/lower lids (lids rotate to blink)
  const lids = []
  for (const [i, x] of [-0.11, 0.11].entries()) {
    const eye = joint(i === 0 ? 'EyeRight' : 'EyeLeft', [x, 0.33, 0.262])
    eye.add(mesh(new SphereGeometry(0.058, 28, 20), white))
    eye.add(mesh(new SphereGeometry(0.03, 24, 16), iris, [0, 0, 0.052], [1, 1, 0.4]))
    eye.add(mesh(new SphereGeometry(0.015, 16, 12), pupil, [0, 0, 0.061], [1, 1, 0.35]))
    eye.add(mesh(new SphereGeometry(0.0065, 10, 8), highlight, [0.011, 0.012, 0.067]))
    // Lids are hemispheres hinged at the eye centre: tilted back = open, swung forward = closed
    const upper = mesh(new SphereGeometry(0.062, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), skin)
    const lower = mesh(new SphereGeometry(0.061, 28, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), skin)
    lower.rotation.x = 0.85
    eye.add(upper, lower)
    lids.push(upper)
    head.add(eye)
  }
  // Thick brows (animated for expressions)
  const brows = joint('Brows', [0, 0.43, 0.235])
  for (const x of [-0.105, 0.105]) {
    const b = mesh(new CapsuleGeometry(0.015, 0.1, 4, 12), hair, [x, 0, 0])
    b.rotation.z = Math.PI / 2 + (x < 0 ? -0.18 : 0.18)
    brows.add(b)
  }
  head.add(brows)
  // Nose: bridge, tip, nostrils
  head.add(mesh(new CapsuleGeometry(0.012, 0.04, 4, 10), skin, [0, 0.27, 0.295]))
  head.add(mesh(new SphereGeometry(0.021, 16, 12), skin, [0, 0.235, 0.305], [1, 0.85, 0.9]))
  for (const x of [-0.014, 0.014]) head.add(mesh(new SphereGeometry(0.007, 10, 8), skinDark, [x, 0.222, 0.312]))

  // Mouth: upper lip line, lower lip line, dark interior (visible when open)
  const upperLip = mesh(new TubeGeometry(lipCurve(0.15, 0, false), 16, 0.006, 8, false), lip)
  const lowerLip = mesh(new TubeGeometry(lipCurve(0.15, 0, true), 16, 0.0075, 8, false), lip)
  const inner = mesh(new SphereGeometry(1, 16, 12), mouthInner, [0, 0.135, 0.28], [0.04, 0.001, 0.015])
  upperLip.name = 'UpperLip'
  lowerLip.name = 'LowerLip'
  head.add(upperLip, lowerLip, inner)

  // Expression controller (blink + lip morphs), driven per frame by the avatar component.
  const state = { smile: 0.15, open: 0, target: { ...EXPRESSIONS.neutral }, lastBuilt: { smile: -99, open: -99 } }
  const face = {
    setExpression(name) {
      state.target = EXPRESSIONS[name] || EXPRESSIONS.neutral
    },
    update(dt, time) {
      const k = Math.min(1, dt * 8)
      state.smile += (state.target.smile - state.smile) * k
      state.open += (state.target.open - state.open) * k
      if (Math.abs(state.smile - state.lastBuilt.smile) > 0.01 || Math.abs(state.open - state.lastBuilt.open) > 0.01) {
        upperLip.geometry.dispose()
        lowerLip.geometry.dispose()
        upperLip.geometry = new TubeGeometry(lipCurve(state.smile, state.open, false), 16, 0.006, 8, false)
        lowerLip.geometry = new TubeGeometry(lipCurve(state.smile, state.open, true), 16, 0.0075, 8, false)
        inner.position.y = 0.138 - state.smile * 0.01 - state.open * 0.024
        inner.scale.y = 0.001 + state.open * 0.028 + Math.max(0, state.smile) * 0.006
        state.lastBuilt = { smile: state.smile, open: state.open }
      }
      const phase = time % 4.2
      const blink = phase < 0.18 ? Math.sin((phase / 0.18) * Math.PI) : 0
      for (const lid of lids) lid.rotation.x = -0.8 + blink * 2.35
    },
  }
  head.userData.face = face
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
  const shoeDark = mat(COLORS.shoeDark)
  const sole = mat(COLORS.sole)
  const lace = mat(COLORS.lace)
  const nail = mat(COLORS.nail)

  const root = new Group()
  root.name = 'SignBridgeMannequin'

  const hips = joint('mixamorigHips', [0, 0.52, 0])
  hips.add(mesh(new SphereGeometry(1, 24, 16), shorts, [0, -0.02, 0], [0.21, 0.13, 0.14])) // shorts
  const legMats = { skin, shorts, sock, shoe, shoeDark, sole, lace }
  hips.add(buildLeg('Left', legMats))
  hips.add(buildLeg('Right', legMats))

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
  root.userData.face = root.getObjectByName('mixamorigHead').userData.face

  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true
      n.receiveShadow = true
    }
  })
  return root
}
