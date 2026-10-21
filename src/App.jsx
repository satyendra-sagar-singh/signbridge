import React, { useCallback, useEffect, useState } from 'react'
import { Header } from './components/Header.jsx'
import { TranslatePanel } from './components/TranslatePanel.jsx'
import { PlaybackControls } from './components/PlaybackControls.jsx'
import { Timeline } from './components/Timeline.jsx'
import { TranslationResult } from './components/TranslationResult.jsx'
import { AvatarViewer } from './avatar/AvatarViewer.jsx'
import { useSignPlayer } from './hooks/useSignPlayer.js'
import { translate } from './translation/translate.js'

const EMPTY_ITEMS = []

export default function App() {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [translatedText, setTranslatedText] = useState('')
  const [fingerspell, setFingerspell] = useState(true)
  const [profanity, setProfanity] = useState('censor')
  const [avatar, setAvatar] = useState(null)

  const items = result?.items ?? EMPTY_ITEMS
  const { state, controls, update } = useSignPlayer(avatar, items)

  const handleAvatarReady = useCallback((info) => setAvatar(info), [])

  const runTranslate = useCallback(() => {
    const r = translate(text, { fingerspell, profanity })
    if (!r.ok) {
      setError(r.error)
      setResult(null)
      return
    }
    setError(null)
    setResult(r)
    setTranslatedText(text)
  }, [text, fingerspell, profanity])

  const handleClear = () => {
    setText('')
    setError(null)
    setResult(null)
    setTranslatedText('')
    controls.stop()
  }

  const handleChange = (value) => {
    setText(value)
    if (error) setError(null)
  }

  // Auto-play once a fresh translation has been loaded into the player.
  const [pendingAutoplay, setPendingAutoplay] = useState(false)
  useEffect(() => {
    if (result) setPendingAutoplay(true)
  }, [result])
  useEffect(() => {
    if (pendingAutoplay && state.status === 'ready') {
      setPendingAutoplay(false)
      controls.play()
    }
  }, [pendingAutoplay, state.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <main id="main">
        <section className="hero">
          <div className="container">
            <h1>Convert Text into Indian Sign Language</h1>
            <p className="lead">Type a sentence and watch it signed in ISL by a 3D avatar. Runs entirely in your browser.</p>
          </div>
        </section>

        <section className="container workspace" aria-label="Translator">
          <div className="card workspace-left">
            <TranslatePanel
              text={text}
              onChange={handleChange}
              onTranslate={runTranslate}
              onClear={handleClear}
              error={error}
              fingerspell={fingerspell}
              onToggleFingerspell={setFingerspell}
              profanity={profanity}
              onChangeProfanity={setProfanity}
            />
            <TranslationResult result={result} sourceText={translatedText} />
          </div>
          <div className="workspace-right">
            <AvatarViewer onAvatarReady={handleAvatarReady} update={update} playerState={state} items={items} />
            <div className="card">
              <PlaybackControls state={state} controls={controls} />
              <Timeline state={state} controls={controls} />
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container">SignBridge · Text to Indian Sign Language</div>
      </footer>
    </>
  )
}
