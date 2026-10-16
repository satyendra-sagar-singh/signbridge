import { describe, expect, it } from 'vitest'
import { Quaternion } from 'three'
import { createMannequin } from '../src/avatar/mannequin.js'
import { buildClip, captureRestPose, expandPose, resolveBone } from '../src/avatar/clipBuilder.js'
import { createClipResolver } from '../src/avatar/clipSource.js'
import { PlayerStatus, SignPlayer } from '../src/avatar/SignPlayer.js'
import { translate } from '../src/translation/translate.js'
import vocabulary from '../src/data/islVocabulary.json'

function makeRig() {
  const root = createMannequin()
  captureRestPose(root)
  return root
}

describe('mannequin + clipBuilder', () => {
  it('names joints with Mixamo conventions', () => {
    const root = makeRig()
    for (const name of ['RightArm', 'LeftForeArm', 'RightHandIndex1', 'LeftHandThumb1', 'Head', 'Brows']) {
      expect(resolveBone(root, name), name).toBeTruthy()
    }
  })

  it('expands finger macros with explicit keys winning', () => {
    const pose = expandPose({ RightFingers: [90, 0, 0], RightHandIndex1: [0, 0, 0] })
    expect(pose.RightHandMiddle1).toEqual([90, 0, 0])
    expect(pose.RightHandIndex1).toEqual([0, 0, 0])
  })

  it('builds a clip that starts and ends at rest', () => {
    const root = makeRig()
    const clip = buildClip({ name: 'T', keyframes: [{ t: 0.5, pose: { RightArm: [-90, 0, 0] } }], root })
    expect(clip).toBeTruthy()
    expect(clip.tracks).toHaveLength(1)
    expect(clip.duration).toBeCloseTo(0.85)
    const rest = resolveBone(root, 'RightArm').userData.restQuaternion
    const v = clip.tracks[0].values
    const first = new Quaternion(v[0], v[1], v[2], v[3])
    const last = new Quaternion(v[8], v[9], v[10], v[11])
    expect(first.angleTo(rest)).toBeLessThan(1e-6)
    expect(last.angleTo(rest)).toBeLessThan(1e-6)
    const mid = new Quaternion(v[4], v[5], v[6], v[7])
    expect(mid.angleTo(rest)).toBeCloseTo(Math.PI / 2)
  })

  it('returns null when no bones match', () => {
    const root = makeRig()
    expect(buildClip({ name: 'X', keyframes: [{ t: 0.3, pose: { Nope: [1, 2, 3] } }], root })).toBeNull()
  })

  it('every vocabulary entry builds a clip on the mannequin with no missing bones', () => {
    const root = makeRig()
    for (const entry of vocabulary.signs) {
      const clip = buildClip({ name: entry.gloss, keyframes: entry.keyframes, root })
      expect(clip, entry.gloss).toBeTruthy()
      expect(clip.userData.missingBones, entry.gloss).toEqual([])
    }
  })
})

describe('SignPlayer', () => {
  function makePlayer(text = 'I need help.') {
    const root = makeRig()
    const getClip = createClipResolver(root)
    const player = new SignPlayer(root)
    const items = translate(text).items.map((it) => ({ ...it, clip: getClip(it) }))
    player.setSequence(items)
    return { root, player, items }
  }

  it('plays through the sequence and finishes', () => {
    const { player, items } = makePlayer()
    expect(player.status).toBe(PlayerStatus.READY)
    player.play()
    expect(player.status).toBe(PlayerStatus.PLAYING)
    expect(player.index).toBe(0)
    const total = items.reduce((s, i) => s + i.clip.duration, 0)
    for (let t = 0; t < total + 1; t += 1 / 60) player.update(1 / 60)
    expect(player.status).toBe(PlayerStatus.FINISHED)
    expect(player.index).toBe(items.length - 1)
    expect(player.progress).toBeCloseTo(1, 2)
  })

  it('actually moves bones while playing and restores rest on stop', () => {
    const { root, player } = makePlayer('Hello.')
    const arm = resolveBone(root, 'RightArm')
    const rest = arm.userData.restQuaternion.clone()
    player.play()
    for (let i = 0; i < 30; i++) player.update(1 / 60) // 0.5s into HELLO
    expect(arm.quaternion.angleTo(rest)).toBeGreaterThan(0.5)
    player.stop()
    expect(player.status).toBe(PlayerStatus.STOPPED)
    expect(arm.quaternion.angleTo(rest)).toBeLessThan(1e-6)
  })

  it('pause freezes progress, resume continues, speed scales the mixer', () => {
    const { player } = makePlayer()
    player.play()
    for (let i = 0; i < 12; i++) player.update(1 / 60)
    const before = player.elapsed
    player.pause()
    for (let i = 0; i < 12; i++) player.update(1 / 60)
    expect(player.elapsed).toBeCloseTo(before, 5)
    player.resume()
    player.setSpeed(0.5)
    player.update(0.2)
    expect(player.elapsed).toBeCloseTo(before + 0.1, 3)
  })

  it('next/previous/jumpTo re-target the active action', () => {
    const { player } = makePlayer()
    player.play()
    player.next()
    expect(player.index).toBe(1)
    expect(player.current.gloss).toBe('NEED')
    player.previous()
    expect(player.index).toBe(0)
    player.jumpTo(2)
    expect(player.current.gloss).toBe('HELP')
    expect(player.status).toBe(PlayerStatus.PLAYING)
  })
})
