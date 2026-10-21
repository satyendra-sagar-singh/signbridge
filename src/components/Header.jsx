import React from 'react'

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#main" className="brand">
          <span className="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
              <rect width="32" height="32" rx="9" fill="url(#g)" />
              <path d="M9 20c2-1 3.5-3 4-6M13 22c2-1.2 4-3.5 4.5-7M17 23c2-1 3.8-3 4.5-6M21 22c1.5-1 3-3 3.5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#4f6df5" />
                  <stop offset="1" stopColor="#0ea5a4" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-name">SignBridge</span>
            <span className="brand-sub">Text to Indian Sign Language</span>
          </span>
        </a>
      </div>
    </header>
  )
}
