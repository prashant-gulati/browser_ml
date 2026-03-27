# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (legacy-peer-deps required — TF.js model packages have conflicting peer deps)
npm install --legacy-peer-deps

# Unit tests (Vitest, ~0.5s)
npm test

# Watch mode
npm run test:watch

# E2E + visual regression tests (Playwright, requires Chromium)
npm run test:e2e

# Regenerate visual regression baselines after intentional UI changes
npm run test:e2e:update

# Run a single unit test file
npx vitest run tests/unit/detection-utils.test.js

# Run a single E2E test by name
npx playwright test --grep "picker is visible"

# Security audit against pinned CDN deps
npm audit --audit-level=high

# Local dev server (serves on :8080)
npm run serve

# Load test (requires k6 binary installed separately — https://k6.io/docs/get-started/installation/)
k6 run k6/load-test.js
k6 run --env BASE_URL=https://browserml.netlify.app k6/load-test.js
```

## Architecture

This is a **zero-build, single-file browser ML app** (`index.html`) that runs 7 real-time ML backends via webcam entirely in the browser. There is no server, no bundler, and no framework. All ML models load dynamically from CDN on demand.

### The two-file split

`index.html` is the primary artifact. To make its logic testable without a browser, pure functions were extracted to `src/detection-utils.js`. The HTML imports from it:

```js
import { drawFaceDetections, mapBlazeFacePred, setStatus as _setStatus, ... }
  from './src/detection-utils.js';
```

Functions in `detection-utils.js` take DOM elements (`ctx`, `canvas`, `video`, `statusEl`) as **explicit parameters** rather than closing over them. This is the key design constraint — don't revert it.

### Runtime flow

1. **Picker** — user selects a backend (`data-backend` attribute on `.card` elements)
2. **`startBackend(backend)`** — starts camera → calls `BOOTS[backend]()` → starts `renderLoop()`
3. **`runInferenceLoop(inferFn)`** — shared async loop running inference at ~30fps (100ms for BodyPix), writes to `currentData`
4. **`renderLoop()`** — `requestAnimationFrame` loop reading `currentData` and calling `drawFn(ctx, canvas, currentData)` → returns a count string displayed in `#detection-count`
5. **`drawFn`** — set by each boot function to the appropriate draw function from `detection-utils.js`; for `drawFaceMesh` it's a lambda: `(ctx, canvas, result) => drawFaceMesh(ctx, canvas, result, FaceLandmarkerRef)`

### Backends

| Key | Library | Loaded via |
|---|---|---|
| `blazeface` | TF.js + blazeface model | `loadScript()` (UMD) |
| `mediapipe` | @mediapipe/tasks-vision | `import()` (ESM) |
| `cocossd` | TF.js + coco-ssd | `loadScript()` (UMD) |
| `posenet` | TF.js + posenet | `loadScript()` (UMD) |
| `handpose` | TF.js + handpose | `loadScript()` (UMD) |
| `bodypix` | TF.js + body-pix | `loadScript()` (~10fps) |
| `facemesh` | @mediapipe/tasks-vision | `import()` (ESM) |

### Testing

- **Unit tests** (`tests/unit/`) — Vitest + jsdom. Canvas has no implementation in jsdom; `createMockCtx()` and `createMockCanvas()` are globals injected by `vitest.setup.js`. Vitest is scoped to `tests/unit/**` to avoid picking up Playwright spec files.
- **E2E tests** (`tests/e2e/`) — Playwright with `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream` Chrome flags. No real camera needed. Visual regression baselines are in `tests/e2e/snapshots/` and committed to the repo.

### Security

- **CSP** — `<meta http-equiv="Content-Security-Policy">` in `index.html`. Uses `'unsafe-inline'` for `script-src` (unavoidable for inline module scripts) and `worker-src blob:` (required for MediaPipe/BodyPix WASM workers).

CSP = Content security policy = HTTP response header (or <meta> tag) that tells the browser exactly which resources are allowed to load and from where. Anything not whitelisted is blocked — it's a defense-in-depth layer against XSS (cross site scripting) and data injection attacks.

- **SRI** — `SCRIPT_SRI` map in `index.html` adds `integrity` + `crossorigin` to all `loadScript()` calls. MediaPipe uses `import()` (dynamic ESM) which does not support SRI in current browsers — documented gap.

SRI = Subresource integrity: browser security feature that lets you verify that files fetched from external sources (like a CDN) haven't been tampered with.

You add a cryptographic hash to a <script> or <link> tag:
```bash
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-abc123..."
        crossorigin="anonymous"></script>
```
The browser fetches the file, hashes it, and compares it to the integrity attribute. If they don't match — because the CDN was compromised or the file was modified — the browser refuses to execute it.

CORS = Cross origin resource sharing: browser security mechanism that controls how web pages can request resources from a different origin (domain, protocol, or port) than the one that served the page.
SOP = Same origin policy: prevents sending a request to other origin / reading response from another origin. CORS is the mechanism that lets a server opt in to relaxing the read restriction for specific trusted origins.
CSRF = Cross-Site Request Forgery

- **Monitoring** — Sentry + web-vitals SDKs loaded with SRI hashes. Both are no-ops unless `window.SENTRY_DSN` is set at deploy time. Inference latency is reported to Sentry as a rolling 30-frame average every 90 frames.

- **Audit** — `devDependencies` in `package.json` pin the exact CDN versions of all 7 ML libraries so `npm audit` covers them.

### Updating SRI hashes

When bumping a CDN library version, recompute its hash:
```bash
curl -s <CDN_URL> | openssl dgst -sha384 -binary | openssl base64 -A
```
Update `SCRIPT_SRI` in `index.html` and the `<script integrity="...">` tags for Sentry/web-vitals.
