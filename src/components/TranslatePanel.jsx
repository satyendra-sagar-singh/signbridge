import React from 'react'
import { MAX_INPUT_LENGTH } from '../translation/translate.js'

export const EXAMPLE_PHRASES = ['Hello.', 'Thank you.', 'I need help.', 'How are you?', 'I need water.']

export function TranslatePanel({ text, onChange, onTranslate, onClear, error, fingerspell, onToggleFingerspell }) {
  const remaining = MAX_INPUT_LENGTH - text.length
  const over = remaining < 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onTranslate()
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onTranslate()
  }

  return (
    <form className="translate-panel" onSubmit={handleSubmit} noValidate>
      <label htmlFor="isl-input" className="field-label">Your text</label>
      <textarea
        id="isl-input"
        className={`text-input ${error ? 'has-error' : ''}`}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a sentence you want to translate into ISL..."
        rows={5}
        maxLength={MAX_INPUT_LENGTH + 50}
        aria-describedby="char-counter input-error"
        aria-invalid={Boolean(error)}
        spellCheck
      />
      <div className="input-meta">
        <span id="char-counter" className={`char-counter ${over ? 'is-over' : ''}`}>
          {text.length} / {MAX_INPUT_LENGTH} characters
        </span>
        <label className="toggle">
          <input type="checkbox" checked={fingerspell} onChange={(e) => onToggleFingerspell(e.target.checked)} />
          Fingerspell unknown words
        </label>
      </div>
      {error && (
        <p id="input-error" className="error-msg" role="alert">{error}</p>
      )}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Translate
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClear} disabled={!text}>
          Clear
        </button>
      </div>

      <div className="examples">
        <span className="examples-label">Try an example:</span>
        <div className="chip-row">
          {EXAMPLE_PHRASES.map((p) => (
            <button key={p} type="button" className="chip" onClick={() => onChange(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
