// Sequence player built on THREE.AnimationMixer.
//
// Every control here acts on real AnimationActions: play starts the first
// clip, the mixer's 'finished' event advances to the next sign, pause freezes
// the mixer timeScale, stop deactivates all actions (which restores the rest
// pose), prev/next re-target the active action. Progress is read from
// action.time, so the UI reflects the actual animation state.

import { AnimationMixer, LoopOnce } from 'three';

export const PlayerStatus = Object.freeze({
  IDLE: 'idle', // no sequence loaded
  READY: 'ready', // sequence loaded, not started
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  FINISHED: 'finished',
});

const CROSSFADE = 0.18;

export class SignPlayer {
  /** @param {import('three').Object3D} root */
  constructor(root) {
    this.root = root;
    this.mixer = new AnimationMixer(root);
    this.items = []; // [{ id, gloss, label, clip, ... }]
    this.index = 0;
    this.status = PlayerStatus.IDLE;
    this.speed = 1;
    this.action = null;
    this.listeners = new Set();
    this._onFinished = (e) => {
      if (e.action !== this.action || this.status !== PlayerStatus.PLAYING) return;
      if (this.index + 1 < this.items.length) {
        this._start(this.index + 1);
      } else {
        this.status = PlayerStatus.FINISHED;
        this._emit('change');
      }
    };
    this.mixer.addEventListener('finished', this._onFinished);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit(type) {
    for (const fn of this.listeners) fn(type, this);
  }

  /** Replace the sequence. Items without a clip are rejected by the caller. */
  setSequence(items) {
    this.stop(true);
    this.mixer.uncacheRoot(this.root);
    this.items = items.filter((it) => it.clip);
    this.index = 0;
    this.status = this.items.length ? PlayerStatus.READY : PlayerStatus.IDLE;
    this._emit('change');
  }

  get current() {
    return this.items[this.index] || null;
  }

  get totalDuration() {
    return this.items.reduce((sum, it) => sum + it.clip.duration, 0);
  }

  /** Seconds elapsed across the whole sequence. */
  get elapsed() {
    let t = 0;
    for (let i = 0; i < this.index; i++) t += this.items[i].clip.duration;
    if (this.action && this.status !== PlayerStatus.READY && this.status !== PlayerStatus.STOPPED) {
      t += Math.min(this.action.time, this.action.getClip().duration);
    }
    return t;
  }

  get progress() {
    const total = this.totalDuration;
    return total > 0 ? Math.min(1, this.elapsed / total) : 0;
  }

  _start(i) {
    const item = this.items[i];
    if (!item) return;
    const previous = this.action;
    this.index = i;
    this.action = this.mixer.clipAction(item.clip);
    this.action.reset();
    this.action.setLoop(LoopOnce, 1);
    this.action.clampWhenFinished = true;
    this.action.enabled = true;
    if (previous && previous !== this.action) {
      previous.fadeOut(CROSSFADE);
      this.action.fadeIn(CROSSFADE);
    } else {
      this.action.setEffectiveWeight(1);
    }
    this.action.play();
    this.mixer.timeScale = this.speed;
    this.status = PlayerStatus.PLAYING;
    this._emit('change');
  }

  play() {
    if (!this.items.length) return;
    if (this.status === PlayerStatus.PAUSED) return this.resume();
    this.mixer.stopAllAction();
    this.action = null;
    this._start(0);
  }

  pause() {
    if (this.status !== PlayerStatus.PLAYING) return;
    this.mixer.timeScale = 0;
    this.status = PlayerStatus.PAUSED;
    this._emit('change');
  }

  resume() {
    if (this.status !== PlayerStatus.PAUSED) return;
    this.mixer.timeScale = this.speed;
    this.status = PlayerStatus.PLAYING;
    this._emit('change');
  }

  replay() {
    this.play();
  }

  /** Stops every action; the mixer restores the avatar's rest pose. */
  stop(silent = false) {
    this.mixer.stopAllAction();
    this.action = null;
    this.index = 0;
    this.mixer.timeScale = this.speed;
    this.status = this.items.length ? PlayerStatus.STOPPED : PlayerStatus.IDLE;
    if (!silent) this._emit('change');
  }

  /** Jump to a sign; keeps paused state if the player was paused. */
  jumpTo(i) {
    if (i < 0 || i >= this.items.length) return;
    const wasPaused = this.status === PlayerStatus.PAUSED;
    this._start(i);
    if (wasPaused) this.pause();
  }

  next() {
    this.jumpTo(this.index + 1);
  }

  previous() {
    this.jumpTo(this.index - 1);
  }

  setSpeed(speed) {
    this.speed = speed;
    if (
      this.status === PlayerStatus.PLAYING ||
      this.status === PlayerStatus.READY ||
      this.status === PlayerStatus.STOPPED
    ) {
      this.mixer.timeScale = speed;
    }
    this._emit('change');
  }

  /** Call every frame with the delta in seconds. */
  update(delta) {
    this.mixer.update(delta);
    if (this.status === PlayerStatus.PLAYING) this._emit('tick');
  }

  dispose() {
    this.mixer.removeEventListener('finished', this._onFinished);
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    this.listeners.clear();
  }
}
