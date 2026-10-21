import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { PlayerStatus, SignPlayer } from '../avatar/SignPlayer.js';

const TICK_INTERVAL_MS = 80;

const EMPTY_SNAPSHOT = Object.freeze({
  status: PlayerStatus.IDLE,
  index: 0,
  count: 0,
  speed: 1,
  elapsed: 0,
  total: 0,
  progress: 0,
  current: null,
  items: [],
});

const NO_PLAYER = {
  player: null,
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAPSHOT,
};

/**
 * Wraps a SignPlayer as an external store: React reads an immutable snapshot
 * that is replaced whenever the player emits, so playback state never has to
 * be copied into React state from inside an effect.
 */
function createPlayerStore(root) {
  const player = new SignPlayer(root);
  const listeners = new Set();
  let snapshot = readSnapshot(player);
  let lastTick = 0;
  player.subscribe((type) => {
    if (type === 'tick') {
      const now = performance.now();
      if (now - lastTick < TICK_INTERVAL_MS) return;
      lastTick = now;
    }
    snapshot = readSnapshot(player);
    for (const listener of listeners) listener();
  });
  return {
    player,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
}

/**
 * Owns a SignPlayer bound to the current avatar root and exposes its state to
 * React. `avatar` is { root, getClip(item) } reported by the avatar component
 * once its model is ready.
 */
export function useSignPlayer(avatar, items) {
  const store = useMemo(
    () => (avatar?.root ? createPlayerStore(avatar.root) : NO_PLAYER),
    [avatar],
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  // Dispose the mixer when the avatar (and therefore the store) is replaced.
  useEffect(() => () => store.player?.dispose(), [store]);

  // Load the sequence whenever the translation or avatar changes.
  useEffect(() => {
    if (!store.player || !avatar) return;
    const sequence = items.map((item) => ({ ...item, clip: avatar.getClip(item) }));
    store.player.setSequence(sequence);
  }, [store, avatar, items]);

  const update = useCallback((delta) => store.player?.update(delta), [store]);

  const controls = useMemo(
    () => ({
      play: () => store.player?.play(),
      pause: () => store.player?.pause(),
      resume: () => store.player?.resume(),
      replay: () => store.player?.replay(),
      stop: () => store.player?.stop(),
      next: () => store.player?.next(),
      previous: () => store.player?.previous(),
      jumpTo: (i) => store.player?.jumpTo(i),
      setSpeed: (s) => store.player?.setSpeed(s),
    }),
    [store],
  );

  return { state, controls, update };
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
  };
}
