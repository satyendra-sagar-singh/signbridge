import React from 'react'
import { listVocabulary } from '../translation/translate.js'

export function HowItWorks() {
  const steps = [
    { n: 1, title: 'Type your text', body: 'Enter an English sentence. SignBridge checks it is non-empty, within the length limit, and contains real words.' },
    { n: 2, title: 'Match the vocabulary', body: 'Words and phrases are matched against a JSON ISL vocabulary (longest phrase first), so “thank you” becomes one sign, not two.' },
    { n: 3, title: 'Apply ISL ordering', body: 'English filler words (a, the, is, are…) are dropped, WH-question words move to the end of the sentence, and a non-manual QUESTION marker (raised eyebrows) is added for questions.' },
    { n: 4, title: 'Build animation clips', body: 'Each gloss maps to a Three.js AnimationClip — either embedded in the avatar GLB or generated from keyframe poses — and the AnimationMixer plays them in sequence.' },
  ]
  return (
    <section id="how-it-works" className="section">
      <div className="container">
        <h2>How It Works</h2>
        <p className="lead">A transparent, rule-based pipeline you can read and extend.</p>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.n} className="step card">
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function About() {
  const vocab = listVocabulary()
  return (
    <section id="about" className="section section-alt">
      <div className="container about-grid">
        <div>
          <h2>About SignBridge</h2>
          <p>
            SignBridge is an open MVP that turns typed text into Indian Sign Language, signed by a 3D avatar.
            It is built for deaf and hard-of-hearing users, their families, and anyone learning ISL.
          </p>
          <p>
            The app runs entirely in your browser: no API keys, no accounts, no server. The vocabulary lives in a
            JSON file so new signs can be added without changing code, and a real rigged avatar can be dropped into
            <code> public/models/avatar.glb</code>.
          </p>
          <h3>Honest limitations</h3>
          <ul className="plain-list">
            <li>The placeholder mannequin shows approximate hand placement only. Its movements are not verified ISL and should not be used for learning.</li>
            <li>ISL grammar is far richer than the small ordering rules used here (classifiers, spatial grammar, non-manual markers).</li>
            <li>Fingerspelling of unknown words uses placeholder handshapes until a real avatar provides letter clips.</li>
            <li>Regional ISL variation exists; descriptions follow commonly documented forms.</li>
          </ul>
        </div>
        <div className="card vocab-card">
          <h3>Current vocabulary ({vocab.length} signs)</h3>
          <div className="chip-row">
            {vocab.map((s) => (
              <span key={s.gloss} className="chip chip-static" title={s.description}>{s.gloss}</span>
            ))}
          </div>
          <p className="muted small">Add more in <code>src/data/islVocabulary.json</code>.</p>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <span>© {new Date().getFullYear()} SignBridge · Text to Indian Sign Language</span>
        <span className="muted">Built with React, Vite, Three.js and React Three Fiber.</span>
      </div>
    </footer>
  )
}
