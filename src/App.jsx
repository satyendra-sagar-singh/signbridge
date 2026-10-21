import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header.jsx';
import { TranslatePanel } from './components/TranslatePanel.jsx';
import { PlaybackControls } from './components/PlaybackControls.jsx';
import { Timeline } from './components/Timeline.jsx';
import { TranslationResult } from './components/TranslationResult.jsx';
import { AvatarViewer } from './avatar/AvatarViewer.jsx';
import { useSignPlayer } from './hooks/useSignPlayer.js';
import { translate } from './translation/translate.js';

const EMPTY_ITEMS = [];

export default function App() {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [translatedText, setTranslatedText] = useState('');
  const [fingerspell, setFingerspell] = useState(true);
  const [avatar, setAvatar] = useState(null);

  const items = result?.items ?? EMPTY_ITEMS;
  const { state, controls, update } = useSignPlayer(avatar, items);

  const handleAvatarReady = useCallback((info) => setAvatar(info), []);

  const runTranslate = useCallback(() => {
    const r = translate(text, { fingerspell });
    if (!r.ok) {
      setError(r.error);
      setResult(null);
      return;
    }
    setError(null);
    setResult(r);
    setTranslatedText(text);
    autoplayRef.current = true;
    // On a phone the stage sits below the input: bring it into view so the
    // signing is visible as soon as it starts.
    if (window.matchMedia('(max-width: 960px)').matches) {
      document
        .getElementById('avatar-stage')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [text, fingerspell]);

  const handleClear = () => {
    setText('');
    setError(null);
    setResult(null);
    setTranslatedText('');
    controls.stop();
  };

  const handleChange = (value) => {
    setText(value);
    if (error) setError(null);
  };

  // Auto-play once a fresh translation has been loaded into the player.
  const autoplayRef = useRef(false);
  useEffect(() => {
    if (autoplayRef.current && state.status === 'ready') {
      // A ref is the right home for "play once after the next load": it is
      // consumed here, not rendered, so it must not be React state.
      // eslint-disable-next-line react-hooks/immutability
      autoplayRef.current = false;
      controls.play();
    }
  }, [state.status, controls]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <section className="hero">
          <div className="container">
            <h1>Convert Text into Indian Sign Language</h1>
            <p className="lead">
              Type a sentence and watch it signed in ISL by a 3D avatar. Runs entirely in your
              browser.
            </p>
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
            />
            <TranslationResult result={result} sourceText={translatedText} />
          </div>
          <div className="workspace-right">
            <AvatarViewer
              onAvatarReady={handleAvatarReady}
              update={update}
              playerState={state}
              items={items}
            />
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
  );
}
