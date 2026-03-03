# Browser ML Playground

Real-time machine learning in the browser — no server, no bundler, no install. Point your webcam and switch between 7 ML backends live.

**[Live demo](https://prashantgulati.netlify.app/browser-ml.html)**

---

## What it does

Runs seven computer vision models entirely on-device via WebGL/WASM, side-by-side with a model picker so you can compare them in real time:

| Backend | What you see |
|---|---|
| BlazeFace | Face bounding boxes |
| MediaPipe Face Mesh | 468 facial landmarks |
| COCO-SSD | Object detection with labels |
| PoseNet | Full-body skeleton |
| HandPose | 21 hand keypoints |
| BodyPix | Pixel-level person segmentation |
| MediaPipe Tasks Vision | GPU-accelerated face detection |

All video stays on your device. Nothing is sent to a server.

---

## Architecture

This is a **zero-build, single-file app** (`browser-ml.html`). No framework, no bundler, no build step — open the file and it works. ML models load from CDN on demand when you pick a backend.

To keep the logic testable without a real browser, pure functions live in [`src/detection-utils.js`](src/detection-utils.js) and are imported by the HTML file. Functions take DOM elements as explicit parameters rather than closing over globals — this is the key design constraint.

**Runtime flow:**
1. User picks a backend from the card picker
2. `startBackend()` opens the camera, boots the model, starts the loops
3. `runInferenceLoop()` runs inference at ~30fps and writes results to `currentData`
4. `renderLoop()` reads `currentData` on every animation frame and calls the appropriate draw function

**Model loading:** TF.js-backed models load as UMD bundles via `loadScript()`. MediaPipe models load as ESM via dynamic `import()`.

---

## Getting started

```bash
# Serve locally (required — getUserMedia needs a secure origin)
npm run serve
# Open http://localhost:8080
```

Or just open the [live demo](https://prashantgulati.netlify.app/browser-ml.html) — no setup needed.

---

## Development

```bash
npm install --legacy-peer-deps   # TF.js packages have conflicting peer deps

npm test                         # Unit tests (Vitest, ~0.5s)
npm run test:watch               # Watch mode
npm run test:e2e                 # E2E + visual regression (Playwright, needs Chromium)
npm run test:e2e:update          # Regenerate visual regression baselines

# Run a single unit test file
npx vitest run tests/unit/detection-utils.test.js

# Run a single E2E test by name
npx playwright test --grep "picker is visible"

# Load test (requires k6 — https://k6.io/docs/get-started/installation/)
k6 run k6/load-test.js
k6 run --env BASE_URL=https://prashantgulati.netlify.app k6/load-test.js
```

**Unit tests** (`tests/unit/`) use Vitest + jsdom. Canvas has no real implementation in jsdom; `createMockCtx()` and `createMockCanvas()` are globals injected by `vitest.setup.js`.

**E2E tests** (`tests/e2e/`) use Playwright with `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream` Chrome flags — no real camera needed. Visual regression baselines are committed in `tests/e2e/snapshots/`.

---

## Security

- **Content Security Policy** — `<meta http-equiv="Content-Security-Policy">` restricts what scripts and resources the page can load. `'unsafe-inline'` and `'unsafe-eval'` are required by inline ES modules and TF.js's WebGL shader compiler respectively.
- **Subresource Integrity** — the `SCRIPT_SRI` map adds `integrity` + `crossorigin` attributes to every `loadScript()` call, and Sentry/web-vitals tags carry SRI hashes. If a CDN is compromised, the browser refuses to execute the file. MediaPipe uses dynamic `import()` which does not yet support SRI — documented gap.
- **Monitoring** — Sentry + web-vitals load with SRI hashes and are no-ops unless `window.SENTRY_DSN` is set at deploy time. Inference latency is tracked as a rolling 30-frame average, reported to Sentry every 90 frames.
- **Dependency auditing** — `devDependencies` pin the exact CDN versions of all 7 ML libraries so `npm audit` covers them.

**Updating SRI hashes** when bumping a CDN library version:
```bash
curl -s <CDN_URL> | openssl dgst -sha384 -binary | openssl base64 -A
```
Update `SCRIPT_SRI` in `browser-ml.html` and the `<script integrity="...">` tags for Sentry/web-vitals.

---

## Future improvements

**Performance & UX**
- Model weight caching — models are 5–20MB each; caching in Cache API / IndexedDB would eliminate re-downloads on repeat visits
- Load progress — show actual download % instead of "Loading…"
- WebGL/WASM feature detection — detect GPU support before starting, degrade gracefully instead of showing a cryptic error
- Adaptive frame rate — generalize the BodyPix throttle to all backends when the GPU is saturated

**Privacy / Legal**
- Explicit on-page notice that all processing is local and no video leaves the device — important for GDPR/CCPA if public-facing
- Camera permission UX — handle the "remember this choice" flow and permission revocation

**Accessibility**
- Keyboard navigation through the backend picker
- ARIA labels on the detection count badge and status element

**Reliability**
- HTTPS enforcement notice — `getUserMedia` requires HTTPS; show a clear message if accessed over HTTP rather than a confusing camera error
- Cross-browser smoke tests — Safari/iOS (WASM + WebGL behaves differently) and Firefox

**Operability**
- SRI hash update process — CDN URLs are pinned to exact versions, but there's no automated process for bumping them when models get security patches
- CI/CD — run tests on PRs to catch broken CDN URLs before they reach users

**Expand model selection**
- More MediaPipe Vision tasks: Gesture Recognition, Image Segmentation, Holistic Landmarker, Face Stylizer, Image Embedding, Interactive Segmentation
- MediaPipe Text: Text Classification, Text Embedding, Language Detection
- MediaPipe Audio: Audio Classification
- PyTorch models via ONNX Runtime Web
- Hugging Face models via Transformers.js
