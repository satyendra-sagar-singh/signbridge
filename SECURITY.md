# Security Policy

## Supported Versions

| Version      | Supported |
| ------------ | --------- |
| 0.x (latest) | ✅        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use one of these private channels:

- **GitHub private vulnerability reporting** (preferred): [Report a vulnerability](https://github.com/satyendra-sagar-singh/signbridge/security/advisories/new)
- **Email:** satyendra.sagar@icloud.com with subject `[SECURITY] signbridge`

You can expect an acknowledgement within 72 hours. Please include a description of the issue, steps to reproduce, and the affected version(s). Coordinated disclosure is appreciated — a fix will be prioritized and credited to you in the release notes unless you prefer otherwise.

## Scope

SignBridge is a static, client-side web application: it makes no network requests of its own beyond loading its assets and the optional `public/models/avatar.glb`, stores nothing, and has no accounts or server. Its security boundary is the browser page itself.

Reports of particular interest:

- **Script injection through user input** — any path where typed text, a vocabulary entry, or a slang/profanity rule ends up interpreted as HTML or script rather than rendered as text
- **Hostile avatar files** — a crafted GLB/GLTF that crashes the page, hangs the renderer, or exhausts memory beyond what a malformed model should be able to do
- **Denial of service through translation** — input that makes the rule engine (contraction, slang, profanity or phrase matching) hang or consume unbounded time or memory (for example ReDoS in a rule)
- **Dependency vulnerabilities** that are reachable from how this app uses React, Three.js or the React Three Fiber stack

Out of scope:

- Vulnerabilities in third-party packages that are not reachable from this app's usage of them — report those upstream
- Translation accuracy, placeholder-mannequin poses, and vocabulary coverage, which are quality issues, not security ones
- Anything requiring a compromised browser, extension or operating system
