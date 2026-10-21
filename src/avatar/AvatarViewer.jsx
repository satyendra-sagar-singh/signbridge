import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei'
import { createMannequin } from './mannequin.js'
import { captureRestPose } from './clipBuilder.js'
import { createClipResolver } from './clipSource.js'
import { AvatarFallback } from '../components/AvatarFallback.jsx'

export const AVATAR_MODEL_URL = `${import.meta.env.BASE_URL}models/avatar.glb`

/* ---------- 3D scene pieces ---------- */

function PlayerDriver({ update }) {
  useFrame((_, delta) => update(Math.min(delta, 0.1)))
  return null
}

function MannequinAvatar({ onReady, expression = 'neutral' }) {
  const root = useMemo(() => createMannequin(), [])
  const parts = useMemo(() => {
    const spine1 = root.getObjectByName('mixamorigSpine1')
    return { spine1, spineY: spine1.position.y, face: root.userData.face }
  }, [root])
  useEffect(() => {
    captureRestPose(root)
    onReady({ type: 'mannequin', root, getClip: createClipResolver(root) })
  }, [root, onReady])
  useEffect(() => {
    parts.face?.setExpression(expression)
  }, [parts, expression])
  // Idle life: gentle breathing (position only, so it never fights the
  // mixer's rotation tracks), blinking and lip expressions.
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    parts.spine1.position.y = parts.spineY + Math.sin(t * 1.4) * 0.003
    parts.face?.update(Math.min(delta, 0.1), t)
  })
  return <primitive object={root} />
}

function GltfAvatar({ url, onReady }) {
  const gltf = useGLTF(url)
  const scene = gltf.scene
  useEffect(() => {
    scene.traverse((n) => {
      if (n.isSkinnedMesh || n.isMesh) {
        n.frustumCulled = false
        n.castShadow = true
      }
    })
    captureRestPose(scene)
    onReady({ type: 'glb', root: scene, getClip: createClipResolver(scene, gltf.animations || []), clipCount: (gltf.animations || []).length })
  }, [scene, gltf.animations, onReady])
  return <primitive object={scene} />
}

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    this.props.onError?.(error)
  }
  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

/** Resolves true when the URL serves a GLB (avoids throwing through the loader when it is simply absent). */
async function probeModel(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return false
    const type = (res.headers.get('content-type') || '').toLowerCase()
    return !type.includes('text/html')
  } catch {
    return false
  }
}

function AvatarModel({ onReady, onModelError, modelUrl, expression }) {
  const [available, setAvailable] = useState(null) // null = probing
  useEffect(() => {
    let cancelled = false
    probeModel(modelUrl).then((ok) => {
      if (cancelled) return
      setAvailable(ok)
      if (!ok) onModelError?.(new Error(`No avatar model at ${modelUrl}`))
    })
    return () => {
      cancelled = true
    }
  }, [modelUrl, onModelError])
  const handleGltfError = useCallback((err) => onModelError?.(err), [onModelError])

  if (available === null) return null
  if (available === false) return <MannequinAvatar onReady={onReady} expression={expression} />
  return (
    <ModelErrorBoundary onError={handleGltfError} fallback={<MannequinAvatar onReady={onReady} expression={expression} />}>
      <Suspense fallback={null}>
        <GltfAvatar url={modelUrl} onReady={onReady} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

/* ---------- Viewer (DOM + Canvas) ---------- */

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function AvatarViewer({ onAvatarReady, update, playerState, items, modelUrl = AVATAR_MODEL_URL }) {
  const wrapperRef = useRef(null)
  const controlsRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [avatarType, setAvatarType] = useState('loading') // loading | glb | mannequin
  const [modelError, setModelError] = useState(null)
  const [canvasError, setCanvasError] = useState(null)
  const webgl = useMemo(hasWebGL, [])

  const handleReady = useCallback(
    (info) => {
      setAvatarType(info.type)
      onAvatarReady(info)
    },
    [onAvatarReady],
  )

  const handleModelError = useCallback((err) => {
    setModelError(err)
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    const el = wrapperRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else el.requestFullscreen?.().catch(() => {})
  }

  const resetView = () => controlsRef.current?.reset()

  if (!webgl || canvasError) {
    return <AvatarFallback reason={!webgl ? 'webgl' : 'error'} error={canvasError} items={items} playerState={playerState} />
  }

  const current = playerState.current
  const activeExpression = current && (playerState.status === 'playing' || playerState.status === 'paused') ? current.expression : 'neutral'

  return (
    <>
    <div ref={wrapperRef} className={`avatar-viewer ${fullscreen ? 'is-fullscreen' : ''}`}>
      <div className="avatar-badges" aria-live="polite">
        {avatarType === 'loading' && <span className="badge badge-muted">Loading avatar…</span>}
        {avatarType === 'mannequin' && (
          <span className="badge badge-warn" title={modelError ? 'No avatar GLB at public/models/avatar.glb — using the built-in placeholder. Poses are approximations, not verified ISL.' : 'Poses are approximations, not verified ISL'}>
            Placeholder avatar
          </span>
        )}
        {avatarType === 'glb' && <span className="badge badge-ok">3D avatar loaded</span>}
        {current && playerState.status !== 'idle' && playerState.status !== 'ready' && playerState.status !== 'stopped' && (
          <span className="badge badge-sign">
            {current.kind === 'marker' ? 'Marker: ' : current.kind === 'fingerspell' ? 'Fingerspell: ' : 'Sign: '}
            <strong>{current.label}</strong>
            {current.clip?.userData?.empty && <em> (no clip on this rig)</em>}
          </span>
        )}
      </div>

      <div className="avatar-tools">
        <button type="button" className="icon-btn" onClick={resetView} title="Reset view" aria-label="Reset camera view">⟲</button>
        <button type="button" className="icon-btn" onClick={toggleFullscreen} title={fullscreen ? 'Exit full screen' : 'Full screen'} aria-label={fullscreen ? 'Exit full screen' : 'View full screen'}>
          {fullscreen ? '🡼' : '⛶'}
        </button>
      </div>

      <CanvasErrorBoundary onError={setCanvasError}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0.5, 1.05, 2.75], fov: 35, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ camera }) => camera.lookAt(0, 0.82, 0)}
        >
          <ambientLight intensity={0.7} />
          <hemisphereLight args={[0xffffff, 0xd9e2ff, 0.5]} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-2, 2, -1]} intensity={0.4} />
          <AvatarModel onReady={handleReady} onModelError={handleModelError} modelUrl={modelUrl} expression={activeExpression} />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={3} blur={2.2} far={2} />
          <OrbitControls
            ref={controlsRef}
            target={[0, 0.82, 0]}
            enablePan={false}
            minDistance={1}
            maxDistance={4.5}
            minPolarAngle={0.4}
            maxPolarAngle={Math.PI * 0.62}
            makeDefault
          />
          <PlayerDriver update={update} />
        </Canvas>
      </CanvasErrorBoundary>

      <p className="avatar-hint">Drag to rotate · scroll or pinch to zoom</p>
    </div>
    </>
  )
}

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    this.props.onError?.(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}
