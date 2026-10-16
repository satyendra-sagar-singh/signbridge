import React from 'react'

/** Explains the translation: gloss string, per-sign descriptions, notes. */
export function TranslationResult({ result, sourceText }) {
  if (!result) return null
  return (
    <section className="card result" aria-label="Translation result">
      <div className="result-head">
        <h3>Translation</h3>
        <span className="muted">from “{sourceText.trim()}”</span>
      </div>
      <p className="gloss-string" aria-label="ISL gloss">
        {result.items.map((it) => (
          <span key={it.id} className={`gloss kind-${it.kind}`}>{it.kind === 'fingerspell' ? `fs-${it.gloss}` : it.gloss}</span>
        ))}
      </p>
      {result.notes.map((n, i) => (
        <p key={i} className="note">{n}</p>
      ))}
      <details className="result-details">
        <summary>How each sign is made</summary>
        <ul className="sign-list">
          {dedupe(result.items).map((it) => (
            <li key={it.id}>
              <strong>{it.label}</strong>
              {it.description && <span> — {it.description}</span>}
              {it.expression && it.expression !== 'neutral' && <em className="expr"> · expression: {it.expression}</em>}
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((it) => {
    const key = `${it.kind}:${it.gloss}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
