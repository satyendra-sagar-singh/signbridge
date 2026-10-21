import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Grid, OrbitControls, useGLTF } from '@react-three/drei';
import { createMannequin } from './mannequin.js';
import { captureRestPose } from './clipBuilder.js';
import { createClipResolver } from './clipSource.js';
import { AvatarFallback } from '../components/AvatarFallback.jsx';

export const AVATAR_MODEL_URL = `${import.meta.env.BASE_URL}models/avatar.glb`;

/* ---------- 3D scene pieces ---------- */

function PlayerDriver({ update }) {
  useFrame((_, delta) => update(Math.min(delta, 0.1)));
  return null;
}

function MannequinAvatar({ onReady, expression = 'neutral' }) {
  const root = useMemo(() => createMannequin(), []);
  const parts = useMemo(() => {
    const spine1 = root.getObjectByName('mixamorigSpine1');
    return { spine1, spineY: spine1.position.y, face: root.userData.face };
  }, [root]);
  useEffect(() => {
    captureRestPose(root);
    onReady({ type: 'mannequin', root, getClip: createClipResolver(root) });
  }, [root, onReady]);
  useEffect(() => {
    parts.face?.setExpression(expression);
  }, [parts, expression]);
  // Idle life: gentle breathing (position only, so it never fights the
  // mixer's rotation tracks), blinking and lip expressions.
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const { spine1, spineY, face } = parts;
    // Three.js objects are mutated in place every frame by design; they are
    // not React state and the mixer owns their rotations.
    // eslint-disable-next-line react-hooks/immutability
    spine1.position.y = spineY + Math.sin(t * 1.4) * 0.003;
    face?.update(Math.min(delta, 0.1), t);
  });
  return <primitive object={root} />;
}

function GltfAvatar({ url, onReady }) {
  const gltf = useGLTF(url);
  const scene = gltf.scene;
  useEffect(() => {
    scene.traverse((n) => {
      if (n.isSkinnedMesh || n.isMesh) {
        n.frustumCulled = false;
        n.castShadow = true;
      }
    });
    captureRestPose(scene);
    onReady({
      type: 'glb',
      root: scene,
      getClip: createClipResolver(scene, gltf.animations || []),
      clipCount: (gltf.animations || []).length,
    });
  }, [scene, gltf.animations, onReady]);
  return <primitive object={scene} />;
}

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    this.props.onError?.(error);
  }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

/** Resolves true when the URL serves a GLB (avoids throwing through the loader when it is simply absent). */
async function probeModel(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    return !type.includes('text/html');
  } catch {
    return false;
  }
}

function AvatarModel({ onReady, onModelError, modelUrl, expression }) {
  const [available, setAvailable] = useState(null); // null = probing
  useEffect(() => {
    let cancelled = false;
    probeModel(modelUrl).then((ok) => {
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) onModelError?.(new Error(`No avatar model at ${modelUrl}`));
    });
    return () => {
      cancelled = true;
    };
  }, [modelUrl, onModelError]);
  const handleGltfError = useCallback((err) => onModelError?.(err), [onModelError]);

  if (available === null) return null;
  if (available === false) return <MannequinAvatar onReady={onReady} expression={expression} />;
  return (
    <ModelErrorBoundary
      onError={handleGltfError}
      fallback={<MannequinAvatar onReady={onReady} expression={expression} />}
    >
      <Suspense fallback={null}>
        <GltfAvatar url={modelUrl} onReady={onReady} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/* ---------- Viewer (DOM + Canvas) ---------- */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function AvatarViewer({
  onAvatarReady,
  update,
  playerState,
  items,
  modelUrl = AVATAR_MODEL_URL,
}) {
  const wrapperRef = useRef(null);
  const controlsRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [avatarType, setAvatarType] = useState('loading'); // loading | glb | mannequin
  const [modelError, setModelError] = useState(null);
  const [canvasError, setCanvasError] = useState(null);
  const webgl = useMemo(() => hasWebGL(), []);

  const handleReady = useCallback(
    (info) => {
      setAvatarType(info.type);
      onAvatarReady(info);
    },
    [onAvatarReady],
  );

  const handleModelError = useCallback((err) => {
    setModelError(err);
  }, []);

  // iOS Safari has no element Fullscreen API: fall back to a fixed, full-viewport stage.
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const canUseFullscreenApi = useMemo(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenEnabled),
    [],
  );
  const isFullscreen = fullscreen || pseudoFullscreen;

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!pseudoFullscreen) return undefined;
    document.body.classList.add('stage-fullscreen');
    const onKey = (e) => {
      if (e.key === 'Escape') setPseudoFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('stage-fullscreen');
      window.removeEventListener('keydown', onKey);
    };
  }, [pseudoFullscreen]);

  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!canUseFullscreenApi) {
      setPseudoFullscreen((v) => !v);
      return;
    }
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => setPseudoFullscreen(true));
  };

  const [autoRotate, setAutoRotate] = useState(false);

  const resetView = () => {
    controlsRef.current?.reset();
    setAutoRotate(false);
  };

  /** Orbit the camera to a preset side, keeping the current distance. */
  const viewFrom = (angleDeg) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object;
    const target = controls.target;
    const r = cam.position.distanceTo(target);
    const a = (angleDeg * Math.PI) / 180;
    cam.position.set(
      target.x + Math.sin(a) * r * 0.97,
      target.y + r * 0.12,
      target.z + Math.cos(a) * r * 0.97,
    );
    controls.update();
    setAutoRotate(false);
  };

  // Arrow keys pan the view while the stage has focus (not while typing elsewhere).
  useEffect(() => {
    const controls = controlsRef.current;
    const el = wrapperRef.current;
    if (controls && el) controls.listenToKeyEvents(el);
  }, [avatarType]);

  if (!webgl || canvasError) {
    return (
      <AvatarFallback
        reason={!webgl ? 'webgl' : 'error'}
        error={canvasError}
        items={items}
        playerState={playerState}
      />
    );
  }

  const current = playerState.current;
  const activeExpression =
    current && (playerState.status === 'playing' || playerState.status === 'paused')
      ? current.expression
      : 'neutral';

  return (
    <>
      <div
        ref={wrapperRef}
        id="avatar-stage"
        className={`avatar-viewer ${fullscreen ? 'is-fullscreen' : ''} ${pseudoFullscreen ? 'is-pseudo-fullscreen' : ''}`}
        tabIndex={0}
        aria-label="3D avatar stage: drag to rotate, right-drag to move, scroll to zoom"
      >
        <div className="avatar-badges" aria-live="polite">
          {avatarType === 'loading' && <span className="badge badge-muted">Loading avatar…</span>}
          {avatarType === 'mannequin' && (
            <span
              className="badge badge-warn"
              title={
                modelError
                  ? 'No avatar GLB at public/models/avatar.glb — using the built-in placeholder. Poses are approximations, not verified ISL.'
                  : 'Poses are approximations, not verified ISL'
              }
            >
              Placeholder avatar
            </span>
          )}
          {avatarType === 'glb' && <span className="badge badge-ok">3D avatar loaded</span>}
          {current &&
            playerState.status !== 'idle' &&
            playerState.status !== 'ready' &&
            playerState.status !== 'stopped' && (
              <span className="badge badge-sign">
                {current.kind === 'marker'
                  ? 'Marker: '
                  : current.kind === 'fingerspell'
                    ? 'Fingerspell: '
                    : 'Sign: '}
                <strong>{current.label}</strong>
                {current.clip?.userData?.empty && <em> (no clip on this rig)</em>}
              </span>
            )}
        </div>

        <div className="avatar-tools">
          <button
            type="button"
            className={`icon-btn ${autoRotate ? 'is-active' : ''}`}
            onClick={() => setAutoRotate((v) => !v)}
            title="Auto-rotate (turntable)"
            aria-pressed={autoRotate}
            aria-label="Toggle auto-rotate"
          >
            ⟳
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={resetView}
            title="Reset view"
            aria-label="Reset camera view"
          >
            ⟲
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            aria-label={isFullscreen ? 'Exit full screen' : 'View full screen'}
          >
            {isFullscreen ? '🡼' : '⛶'}
          </button>
        </div>

        <div className="view-presets" role="group" aria-label="Camera angle">
          {[
            ['Front', 0],
            ['Left', 90],
            ['Back', 180],
            ['Right', -90],
          ].map(([label, deg]) => (
            <button
              key={label}
              type="button"
              className="chip chip-small"
              onClick={() => viewFrom(deg)}
            >
              {label}
            </button>
          ))}
        </div>

        <CanvasErrorBoundary onError={setCanvasError}>
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0.5, 1.0, 2.85], fov: 35, near: 0.1, far: 50 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={({ camera }) => camera.lookAt(0, 0.76, 0)}
          >
            <ambientLight intensity={0.7} />
            <hemisphereLight args={[0xffffff, 0xd9e2ff, 0.5]} />
            <directionalLight
              position={[2, 4, 3]}
              intensity={1.6}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[-2, 2, -1]} intensity={0.4} />
            <AvatarModel
              onReady={handleReady}
              onModelError={handleModelError}
              modelUrl={modelUrl}
              expression={activeExpression}
            />
            <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={3} blur={2.2} far={2} />
            <Grid
              position={[0, -0.002, 0]}
              args={[6, 6]}
              cellSize={0.25}
              cellThickness={0.6}
              cellColor="#9aa7d4"
              sectionSize={1}
              sectionThickness={1}
              sectionColor="#7c8bd0"
              fadeDistance={6}
              fadeStrength={1.5}
              infiniteGrid
            />
            <OrbitControls
              ref={controlsRef}
              target={[0, 0.76, 0]}
              enablePan
              screenSpacePanning
              panSpeed={0.8}
              keyPanSpeed={12}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.8}
              autoRotate={autoRotate}
              autoRotateSpeed={2.5}
              minDistance={0.8}
              maxDistance={6}
              minPolarAngle={0.15}
              maxPolarAngle={Math.PI * 0.85}
              makeDefault
            />
            <PlayerDriver update={update} />
          </Canvas>
        </CanvasErrorBoundary>

        <p className="avatar-hint">
          Drag to rotate · right-drag or two fingers to move · scroll or pinch to zoom · arrow keys
          to pan
        </p>
      </div>
    </>
  );
}

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    this.props.onError?.(error);
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}
