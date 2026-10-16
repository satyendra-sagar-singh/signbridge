import { useCallback, useEffect, useRef, useState } from 'react'
import { PlayerStatus, SignPlayer } from '../avatar/SignPlayer.js'

const TICK_INTERVAL_MS = 80

/**
 * Owns a SignPlayer bound to the current avatar root and mirrors its state
 * into React. `avatar` is { root, getClip(item) } reported by the avatar
 * component once its model is ready.
 */
export function useSignPlayer(avatar, items) {
  const playerRef = useRef(null)
  const [snapshot, setSnapshot] = useState(() => emptySnapshot())
  const lastTick = useRef(0)

  // (Re)create the player when the avatar root changes.
  useEffect(() => {
    if (!avatar?.root) {
      playerRef.current?.dispose()
      playerRef.current = null
      setSnapshot(emptySnapshot())
      return undefined
    }
    const player = new SignPlayer(avatar.root)
    playerRef.current = player
    const unsubscribe = player.subscribe((type) => {
      if (type === 'tick') {
        const now = performance.now()
        if (now - lastTick.current < TICK_INTERVAL_MS) return
        lastTick.current = now
      }
      setSnapshot(readSnapshot(player))
    })
    setSnapshot(readSnapshot(player))
    return () => {
      unsubscribe()
      player.dispose()
      if (playerRef.current === player) playerRef.current = null
    }
  }, [avatar])

  // Load the sequence whenever the translation or avatar changes.
  useEffect(() => {
    const player = playerRef.current
    if (!player || !avatar) return
    const sequence = items.map((item) => ({ ...item, clip: avatar.getClip(item) }))
    player.setSequence(sequence)
  }, [avatar, items])

  const update = useCallback((delta) => playerRef.current?.update(delta), [])

  const controls = {
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    resume: () => playerRef.current?.resume(),
    replay: () => playerRef.current?.replay(),
    stop: () => playerRef.current?.stop(),
    next: () => playerRef.current?.next(),
    previous: () => playerRef.current?.previous(),
    jumpTo: (i) => playerRef.current?.jumpTo(i),
    setSpeed: (s) => playerRef.current?.setSpeed(s),
  }

  return { state: snapshot, controls, update }
}

function emptySnapshot() {
  return {
    status: PlayerStatus.IDLE,
    index: 0,
    count: 0,
    speed: 1,
    elapsed: 0,
    total: 0,
    progress: 0,
    current: null,
    items: [],
  }
}

function readSnapshot(player) {
  return {
    status: player.status,
    index: player.index,
    count: player.items.length,
    speed: player.speed,
    elapsed: player.elapsed,
    total: player.totalDuration,
    progress: player.progress,
    current: player.current,
    items: player.items,
  }
}
