import { PlayerStatus } from '../avatar/SignPlayer.js';

const SPEEDS = [0.5, 0.75, 1, 1.25];

const STATUS_LABEL = {
  [PlayerStatus.IDLE]: 'No translation loaded',
  [PlayerStatus.READY]: 'Ready to play',
  [PlayerStatus.PLAYING]: 'Playing',
  [PlayerStatus.PAUSED]: 'Paused',
  [PlayerStatus.STOPPED]: 'Stopped',
  [PlayerStatus.FINISHED]: 'Finished',
};

function fmt(seconds) {
  return `${Math.max(0, seconds).toFixed(1)}s`;
}

export function PlaybackControls({ state, controls }) {
  const { status, index, count, speed, elapsed, total, progress, current } = state;
  const hasSequence = count > 0;
  const playing = status === PlayerStatus.PLAYING;
  const paused = status === PlayerStatus.PAUSED;
  const active = playing || paused;

  return (
    <div className="playback">
      <div className="playback-status" role="status" aria-live="polite">
        <span className={`status-dot status-${status}`} aria-hidden="true" />
        <span className="status-text">{STATUS_LABEL[status]}</span>
        {hasSequence && (
          <span className="status-detail">
            {active || status === PlayerStatus.FINISHED
              ? `Sign ${index + 1} of ${count}`
              : `${count} sign${count === 1 ? '' : 's'}`}
            {current && active ? ` · ${current.label}` : ''}
          </span>
        )}
        <span className="status-time">
          {fmt(elapsed)} / {fmt(total / (speed || 1))}
        </span>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Playback progress"
      >
        <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="control-row">
        <button
          type="button"
          className="btn btn-icon"
          onClick={controls.previous}
          disabled={!active || index === 0}
          aria-label="Previous sign"
          title="Previous sign"
        >
          ⏮
        </button>
        {!playing ? (
          <button
            type="button"
            className="btn btn-primary btn-play"
            onClick={paused ? controls.resume : controls.play}
            disabled={!hasSequence}
            aria-label={paused ? 'Resume' : 'Play'}
          >
            {paused ? '▶ Resume' : '▶ Play'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-play"
            onClick={controls.pause}
            aria-label="Pause"
          >
            ⏸ Pause
          </button>
        )}
        <button
          type="button"
          className="btn btn-icon"
          onClick={controls.next}
          disabled={!active || index >= count - 1}
          aria-label="Next sign"
          title="Next sign"
        >
          ⏭
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={controls.replay}
          disabled={!hasSequence}
          aria-label="Replay from start"
        >
          ↺ Replay
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={controls.stop}
          disabled={!active && status !== PlayerStatus.FINISHED}
          aria-label="Stop"
        >
          ■ Stop
        </button>
      </div>

      <div className="speed-row" role="group" aria-label="Playback speed">
        <span className="speed-label">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip chip-small ${speed === s ? 'is-active' : ''}`}
            aria-pressed={speed === s}
            onClick={() => controls.setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
