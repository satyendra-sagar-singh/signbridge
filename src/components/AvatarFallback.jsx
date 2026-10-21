/** Shown when WebGL is unavailable or the 3D canvas crashed. */
export function AvatarFallback({ reason, error, items }) {
  return (
    <div className="avatar-fallback" role="region" aria-label="Avatar unavailable">
      <div className="fallback-icon" aria-hidden="true">
        🧏
      </div>
      <h3>3D avatar unavailable</h3>
      <p>
        {reason === 'webgl'
          ? 'Your browser does not support WebGL, which is required to render the 3D avatar. Try a recent version of Chrome, Edge, Firefox or Safari.'
          : 'The 3D viewer ran into a problem and could not be displayed.'}
      </p>
      {error && <pre className="fallback-error">{String(error.message || error)}</pre>}
      {items?.length > 0 && (
        <>
          <p>You can still read the translation as a sequence of ISL glosses:</p>
          <ol className="fallback-list">
            {items.map((it) => (
              <li key={it.id}>
                <strong>{it.label}</strong>
                {it.description && <span> — {it.description}</span>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
