https://code.claude.com/docs/en/best-practices

Good prompting: explore, plan, implement, commit; @ for files
/clear to clear context window
Claude.MD - /init - advisory
Set up hooks - .claude/settings.json - deterministic
Skills - .claude/skills - domain specific
MCP servers
CLI tools
Plugins bundle skills, hooks, subagents, and MCP servers
Agents - .claude/agents/security-reviewer.md - run in separate context windows

---
name: security-reviewer
description: Reviews code for security vulnerabilities
tools: Read, Grep, Glob, Bash
model: opus
---
You are a senior security engineer. Review code for:
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication and authorization flaws
- Secrets or credentials in code
- Insecure data handling

Provide specific line references and suggested fixes.



**Production Readiness**
Testing
UI changes can be verified using the Claude in Chrome extension. It opens new tabs in your browser, tests the UI, and iterates until the code works.
Your verification can also be a test suite, a linter, or a Bash command that checks output. Invest in making your verification rock-solid.

Monitoring and analytics
Security vulnerabilities

***Not yet captured — worth considering:***

Performance & UX

- Model weight caching — models are 5–20MB each; cache them in Cache API / IndexedDB so repeat visits don't re-download. Big UX win.
- Load progress — show actual download % instead of just "Loading…"
- WebGL/WASM feature detection — detect GPU support before starting, degrade gracefully with a clear message instead of a cryptic error
- Adaptive frame rate — detect when GPU is saturated and back off inference rate automatically (partially done for BodyPix but not generalized)

Security
- Subresource Integrity (SRI) hashes on CDN <script> tags — prevents supply-chain attacks if jsDelivr is compromised
- Content Security Policy — restrict what scripts/resources the page can load

Privacy / Legal
- Explicit notice that all processing is local, no video leaves the device — important for GDPR/CCPA if this is public-facing
- Camera permission UX — handle the "remember this choice" flow and permission revocation

Accessibility
- Keyboard navigation through the picker
- ARIA labels on the detection count badge and status

Reliability
- HTTPS enforcement notice — getUserMedia requires HTTPS; show a clear message if accessed over HTTP rather than a confusing camera error
- Cross-browser smoke tests — especially Safari/iOS (WASM + WebGL behaves differently) and Firefox

Operability
- Version pinning strategy — CDN URLs are pinned to exact versions now (good), but you need a process for updating them when models get security patches
- CI/CD — run tests on PRs, catch broken CDN URLs before they reach users

The highest-leverage items that aren't in your plan at all are model weight caching, SRI hashes, and the privacy notice.

**Model Selection**
- TF.js / Mediapipe models
- Pytorch version - ONNX Runtime web
- Transformers.js version

**More mediapipe**
Vision (Browser-compatible)
Model	What it does

Gesture Recognition	Detects hand gestures (thumbs up, peace sign, etc.) — built on top of hand landmarks
Image Classification	Classifies what's in an image (cat, car, etc.)
Image Segmentation	Pixel-level segmentation — selfie, hair, or general objects (newer/faster than BodyPix)
Interactive Segmentation	Segment a specific object based on a user click/tap
Holistic Landmarker	Face + pose + both hands simultaneously in one pipeline
Face Stylizer	Applies artistic styles to faces (anime, oil painting, etc.)
Image Embedding	Converts an image into a vector — useful for similarity search

Text (Browser-compatible)
Model	What it does

Text Classification	Sentiment analysis, spam detection, etc.
Text Embedding	Converts text to vectors for semantic similarity
Language Detection	Identifies what language a string is written in

Audio (Browser-compatible)
Model	What it does

Audio Classification	Classifies sounds — music, speech, dog barking, etc