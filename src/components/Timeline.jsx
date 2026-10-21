import React from 'react'
import { PlayerStatus } from '../avatar/SignPlayer.js'

/** Sequence timeline: one chip per sign, sized by clip duration; click to jump. */
export function Timeline({ state, controls }) {
  const { items, index, status, total } = state
  if (!items.length) {
    return (
      <div className="timeline timeline-empty">
        <p>The sign sequence will appear here after you translate.</p>
      </div>
    )
  }
  const showActive = status !== PlayerStatus.READY && status !== PlayerStatus.STOPPED

  return (
    <div className="timeline">
      <div className="timeline-head">
        <h3>Sign sequence</h3>
        <span className="muted">{items.length} items · {total.toFixed(1)}s at 1x</span>
      </div>
      <ol className="timeline-track" aria-label="Sign sequence">
        {items.map((it, i) => {
          const isActive = showActive && i === index
          const isDone = showActive && i < index
          const width = Math.max(8, (it.clip.duration / total) * 100)
          return (
            <li
              key={it.id}
              className={`tl-item kind-${it.kind} ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              style={{ flexBasis: `${width}%` }}
            >
              <button
                type="button"
                onClick={() => controls.jumpTo(i)}
                title={`${it.label}${it.description ? ` — ${it.description}` : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="tl-index">{i + 1}</span>
                <span className="tl-label">{it.gloss}</span>
                {it.clip?.userData?.empty && <span className="tl-flag" title="No animation clip on this rig">!</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
