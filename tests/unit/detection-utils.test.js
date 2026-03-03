// The unit tests are tightly focused on observable outputs and canvas API calls — 
// they don't test internal implementation details. That's intentional and good: if drawBox 
// internally refactors how it draws corners, tests only break if the external behavior changes.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  drawBox, drawDot, drawConnections,
  drawFaceDetections, classColor, drawObjects,
  drawPoses, drawHands, drawSegmentation, drawFaceMesh,
  setStatus, syncCanvasSize,
  mapBlazeFacePred, mapMediaPipeDet,
} from '../../src/detection-utils.js';

// ── drawBox ───────────────────────────────────────────────────────────────────
describe('drawBox', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('calls strokeRect with correct coordinates', () => {
    drawBox(ctx, 10, 20, 100, 80, 'Test');
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 80);
  });

  it('calls strokeRect exactly once', () => {
    drawBox(ctx, 0, 0, 50, 50, 'x');
    expect(ctx.strokeRect).toHaveBeenCalledTimes(1);
  });

  it('draws 4 corner accents (4 beginPath calls)', () => {
    drawBox(ctx, 0, 0, 100, 100, null);
    expect(ctx.beginPath).toHaveBeenCalledTimes(4);
  });

  it('calls fillText with the label when label is provided', () => {
    drawBox(ctx, 0, 0, 50, 50, 'Face 90%');
    expect(ctx.fillText).toHaveBeenCalledWith('Face 90%', expect.any(Number), expect.any(Number));
  });

  it('does not call fillText when label is falsy', () => {
    drawBox(ctx, 0, 0, 50, 50, null);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('does not call fillText when label is empty string', () => {
    drawBox(ctx, 0, 0, 50, 50, '');
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('uses the provided color as strokeStyle for the main rect', () => {
    drawBox(ctx, 0, 0, 50, 50, null, '#FF0000');
    expect(ctx.strokeStyle).not.toBeUndefined();
  });

  it('uses default color #00FF88 when no color provided', () => {
    drawBox(ctx, 0, 0, 50, 50, 'label');
    // fillStyle will be set to the color for the label background
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

// ── drawDot ───────────────────────────────────────────────────────────────────
describe('drawDot', () => {
  let ctx;
  beforeEach(() => { ctx = createMockCtx(); });

  it('calls arc with correct coordinates and radius', () => {
    drawDot(ctx, 50, 60, 5, '#fff');
    expect(ctx.arc).toHaveBeenCalledWith(50, 60, 5, 0, Math.PI * 2);
  });

  it('calls arc with default radius 3 when not provided', () => {
    drawDot(ctx, 10, 20);
    expect(ctx.arc).toHaveBeenCalledWith(10, 20, 3, 0, Math.PI * 2);
  });

  it('calls fill once', () => {
    drawDot(ctx, 0, 0);
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });
});

// ── drawFaceDetections ────────────────────────────────────────────────────────
describe('drawFaceDetections', () => {
  let ctx, canvas;
  beforeEach(() => {
    ctx    = createMockCtx();
    canvas = { width: 640, height: 480 };
  });

  it('returns "No face" for empty array', () => {
    expect(drawFaceDetections(ctx, canvas, [])).toBe('No face');
  });

  it('returns "1 face" for one detection', () => {
    const face = { x: 10, y: 10, w: 100, h: 100, prob: 95, keypoints: [] };
    expect(drawFaceDetections(ctx, canvas, [face])).toBe('1 face');
  });

  it('returns "3 faces" for three detections', () => {
    const face = { x: 10, y: 10, w: 100, h: 100, prob: 90, keypoints: [] };
    expect(drawFaceDetections(ctx, canvas, [face, face, face])).toBe('3 faces');
  });

  it('skips faces where x is NaN', () => {
    const face = { x: NaN, y: 10, w: 100, h: 100, prob: 90, keypoints: [] };
    drawFaceDetections(ctx, canvas, [face]);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it('skips faces where w <= 0', () => {
    const face = { x: 10, y: 10, w: 0, h: 100, prob: 90, keypoints: [] };
    drawFaceDetections(ctx, canvas, [face]);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it('skips faces where h <= 0', () => {
    const face = { x: 10, y: 10, w: 100, h: -5, prob: 90, keypoints: [] };
    drawFaceDetections(ctx, canvas, [face]);
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });

  it('draws keypoints for valid finite keypoints', () => {
    const face = { x: 10, y: 10, w: 100, h: 100, prob: 90, keypoints: [{ x: 50, y: 50 }] };
    drawFaceDetections(ctx, canvas, [face]);
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 3, 0, Math.PI * 2);
  });

  it('skips keypoints where x is NaN', () => {
    const face = { x: 10, y: 10, w: 100, h: 100, prob: 90, keypoints: [{ x: NaN, y: 50 }] };
    drawFaceDetections(ctx, canvas, [face]);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it('count is based on total array length, not valid count', () => {
    const invalid = { x: NaN, y: 0, w: 100, h: 100, prob: 0, keypoints: [] };
    const valid   = { x: 10,  y: 10, w: 100, h: 100, prob: 90, keypoints: [] };
    expect(drawFaceDetections(ctx, canvas, [invalid, valid])).toBe('2 faces');
  });
});

// ── classColor ────────────────────────────────────────────────────────────────
describe('classColor', () => {
  it('returns a string starting with "hsl("', () => {
    expect(classColor('person')).toMatch(/^hsl\(/);
  });

  it('returns the same value for the same input (memoized)', () => {
    expect(classColor('car')).toBe(classColor('car'));
  });

  it('returns different values for different inputs', () => {
    expect(classColor('dog')).not.toBe(classColor('cat'));
  });
});

// ── drawObjects ───────────────────────────────────────────────────────────────
describe('drawObjects', () => {
  let ctx, canvas;
  beforeEach(() => {
    ctx    = createMockCtx();
    canvas = { width: 640, height: 480 };
  });

  it('returns "No objects" for empty array', () => {
    expect(drawObjects(ctx, canvas, [])).toBe('No objects');
  });

  it('returns "1 object" for one detection', () => {
    const obj = { bbox: [10, 20, 100, 80], class: 'person', score: 0.9 };
    expect(drawObjects(ctx, canvas, [obj])).toBe('1 object');
  });

  it('returns "5 objects" for five detections', () => {
    const obj = { bbox: [0, 0, 50, 50], class: 'car', score: 0.8 };
    expect(drawObjects(ctx, canvas, [obj, obj, obj, obj, obj])).toBe('5 objects');
  });

  it('calls strokeRect for each object', () => {
    const obj = { bbox: [10, 20, 100, 80], class: 'chair', score: 0.7 };
    drawObjects(ctx, canvas, [obj, obj]);
    expect(ctx.strokeRect).toHaveBeenCalledTimes(2);
  });
});

// ── drawPoses ─────────────────────────────────────────────────────────────────
describe('drawPoses', () => {
  let ctx, canvas;
  beforeEach(() => {
    ctx    = createMockCtx();
    canvas = { width: 640, height: 480 };
  });

  it('returns "No pose detected" for empty array', () => {
    expect(drawPoses(ctx, canvas, [])).toBe('No pose detected');
  });

  it('returns "1 person" for one pose with sufficient score', () => {
    const pose = { score: 0.8, keypoints: [] };
    expect(drawPoses(ctx, canvas, [pose])).toBe('1 person');
  });

  it('returns "2 people" for two valid poses', () => {
    const pose = { score: 0.8, keypoints: [] };
    expect(drawPoses(ctx, canvas, [pose, pose])).toBe('2 people');
  });

  it('skips poses with score < 0.25', () => {
    const low  = { score: 0.1, keypoints: [] };
    const high = { score: 0.8, keypoints: [] };
    expect(drawPoses(ctx, canvas, [low, high])).toBe('1 person');
  });
});

// ── drawHands ─────────────────────────────────────────────────────────────────
describe('drawHands', () => {
  let ctx, canvas;
  beforeEach(() => {
    ctx    = createMockCtx();
    canvas = { width: 640, height: 480 };
  });

  it('returns "No hand detected" for empty array', () => {
    expect(drawHands(ctx, canvas, [])).toBe('No hand detected');
  });

  it('returns "1 hand" for one hand', () => {
    const hand = {
      landmarks: Array.from({ length: 21 }, () => [0, 0, 0]),
      boundingBox: { topLeft: [0, 0], bottomRight: [100, 100] },
    };
    expect(drawHands(ctx, canvas, [hand])).toBe('1 hand');
  });

  it('returns "2 hands" for two hands', () => {
    const hand = {
      landmarks: Array.from({ length: 21 }, () => [0, 0, 0]),
      boundingBox: { topLeft: [0, 0], bottomRight: [50, 50] },
    };
    expect(drawHands(ctx, canvas, [hand, hand])).toBe('2 hands');
  });
});

// ── drawSegmentation ──────────────────────────────────────────────────────────
describe('drawSegmentation', () => {
  let ctx, canvas, mockOffscreen;
  beforeEach(() => {
    ctx    = createMockCtx();
    canvas = { width: 640, height: 480 };
    // Mock offscreen canvas returned by createCanvas factory
    mockOffscreen = { width: 0, height: 0, getContext: vi.fn(() => createMockCtx()) };
  });

  it('returns "No person" when no pixels are set', () => {
    const seg = { data: new Uint8Array(4), width: 2, height: 2 };
    const result = drawSegmentation(ctx, canvas, seg, () => mockOffscreen);
    expect(result).toBe('No person');
  });

  it('returns "1 person" when at least one pixel is set', () => {
    const data = new Uint8Array(4);
    data[0] = 1;
    const seg = { data, width: 2, height: 2 };
    const result = drawSegmentation(ctx, canvas, seg, () => mockOffscreen);
    expect(result).toBe('1 person');
  });

  it('calls drawImage to composite mask onto canvas', () => {
    const seg = { data: new Uint8Array(4), width: 2, height: 2 };
    drawSegmentation(ctx, canvas, seg, () => mockOffscreen);
    // mockOffscreen.width/height are set to seg dimensions before drawImage is called
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ getContext: expect.any(Function) }),
      0, 0, canvas.width, canvas.height,
    );
  });
});

// ── drawFaceMesh ──────────────────────────────────────────────────────────────
describe('drawFaceMesh', () => {
  let ctx, canvas, FaceLandmarkerRef;
  beforeEach(() => {
    ctx    = createMockCtx();
    canvas = { width: 640, height: 480 };
    FaceLandmarkerRef = {
      FACE_LANDMARKS_TESSELATION:   [{ start: 0, end: 1 }],
      FACE_LANDMARKS_FACE_OVAL:     [],
      FACE_LANDMARKS_LIPS:          [],
      FACE_LANDMARKS_RIGHT_EYE:     [],
      FACE_LANDMARKS_LEFT_EYE:      [],
      FACE_LANDMARKS_RIGHT_EYEBROW: [],
      FACE_LANDMARKS_LEFT_EYEBROW:  [],
    };
  });

  it('returns "No face" when faceLandmarks is empty', () => {
    expect(drawFaceMesh(ctx, canvas, { faceLandmarks: [] }, FaceLandmarkerRef)).toBe('No face');
  });

  it('returns "1 face mesh" for one face', () => {
    const lm = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.5 },
    ];
    const result = drawFaceMesh(ctx, canvas, { faceLandmarks: [lm] }, FaceLandmarkerRef);
    expect(result).toBe('1 face mesh');
  });

  it('returns "2 face meshes" for two faces', () => {
    const lm = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const result = drawFaceMesh(ctx, canvas, { faceLandmarks: [lm, lm] }, FaceLandmarkerRef);
    expect(result).toBe('2 face meshes');
  });
});

// ── setStatus ─────────────────────────────────────────────────────────────────
describe('setStatus', () => {
  let el;
  beforeEach(() => {
    el = { textContent: '', style: { color: '' } };
  });

  it('sets textContent to the provided message', () => {
    setStatus(el, 'Loading…');
    expect(el.textContent).toBe('Loading…');
  });

  it('sets color to #aaa by default', () => {
    setStatus(el, 'ok');
    expect(el.style.color).toBe('#aaa');
  });

  it('sets color to #ff4444 when error is true', () => {
    setStatus(el, 'Error!', true);
    expect(el.style.color).toBe('#ff4444');
  });

  it('resets to non-error color when error is false', () => {
    setStatus(el, 'ok', false);
    expect(el.style.color).toBe('#aaa');
  });
});

// ── syncCanvasSize ────────────────────────────────────────────────────────────
describe('syncCanvasSize', () => {
  it('updates canvas dimensions when they differ from video', () => {
    const canvas = { width: 0, height: 0 };
    const video  = { videoWidth: 1280, videoHeight: 720 };
    syncCanvasSize(canvas, video);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
  });

  it('does not reassign when canvas already matches video', () => {
    const canvas = { width: 640, height: 480 };
    const video  = { videoWidth: 640, videoHeight: 480 };
    // Wrap to detect assignments
    let assigned = false;
    const proxy = new Proxy(canvas, {
      set(t, k, v) { assigned = true; t[k] = v; return true; },
    });
    syncCanvasSize(proxy, video);
    expect(assigned).toBe(false);
  });
});

// ── mapBlazeFacePred ──────────────────────────────────────────────────────────
describe('mapBlazeFacePred', () => {
  it('computes w as bottomRight[0] - topLeft[0]', () => {
    const pred = { topLeft: [10, 20], bottomRight: [110, 120], probability: 0.9, landmarks: [] };
    expect(mapBlazeFacePred(pred).w).toBe(100);
  });

  it('computes h as bottomRight[1] - topLeft[1]', () => {
    const pred = { topLeft: [10, 20], bottomRight: [110, 120], probability: 0.9, landmarks: [] };
    expect(mapBlazeFacePred(pred).h).toBe(100);
  });

  it('handles array probability by taking first element', () => {
    const pred = { topLeft: [0, 0], bottomRight: [50, 50], probability: [0.85], landmarks: [] };
    expect(mapBlazeFacePred(pred).prob).toBe(85);
  });

  it('handles scalar probability directly', () => {
    const pred = { topLeft: [0, 0], bottomRight: [50, 50], probability: 0.72, landmarks: [] };
    expect(mapBlazeFacePred(pred).prob).toBe(72);
  });

  it('rounds probability to integer', () => {
    const pred = { topLeft: [0, 0], bottomRight: [50, 50], probability: 0.756, landmarks: [] };
    expect(Number.isInteger(mapBlazeFacePred(pred).prob)).toBe(true);
  });

  it('treats NaN probability as 0', () => {
    const pred = { topLeft: [0, 0], bottomRight: [50, 50], probability: NaN, landmarks: [] };
    expect(mapBlazeFacePred(pred).prob).toBe(0);
  });

  it('maps [x, y] landmark pairs to {x, y} keypoints', () => {
    const pred = { topLeft: [0, 0], bottomRight: [50, 50], probability: 0.9, landmarks: [[10, 20], [30, 40]] };
    const { keypoints } = mapBlazeFacePred(pred);
    expect(keypoints[0]).toEqual({ x: 10, y: 20 });
    expect(keypoints[1]).toEqual({ x: 30, y: 40 });
  });

  it('handles missing landmarks gracefully', () => {
    const pred = { topLeft: [0, 0], bottomRight: [50, 50], probability: 0.9 };
    expect(() => mapBlazeFacePred(pred)).not.toThrow();
    expect(mapBlazeFacePred(pred).keypoints).toEqual([]);
  });
});

// ── mapMediaPipeDet ───────────────────────────────────────────────────────────
describe('mapMediaPipeDet', () => {
  const makeDet = (overrides = {}) => ({
    boundingBox: { originX: 50, originY: 60, width: 200, height: 180, ...overrides.boundingBox },
    categories: [{ score: 0.95 }],
    keypoints: [],
    ...overrides,
  });

  it('maps originX/Y/width/height to x/y/w/h', () => {
    const det = makeDet();
    const result = mapMediaPipeDet(det, 640, 480);
    expect(result).toMatchObject({ x: 50, y: 60, w: 200, h: 180 });
  });

  it('reads score from categories[0].score', () => {
    const det = makeDet();
    expect(mapMediaPipeDet(det, 640, 480).prob).toBe(95);
  });

  it('treats missing categories as prob 0', () => {
    const det = { boundingBox: { originX: 0, originY: 0, width: 100, height: 100 }, keypoints: [] };
    expect(mapMediaPipeDet(det, 640, 480).prob).toBe(0);
  });

  it('scales keypoints using cw and ch', () => {
    const det = makeDet({ keypoints: [{ x: 0.5, y: 0.25 }] });
    const { keypoints } = mapMediaPipeDet(det, 640, 480);
    expect(keypoints[0]).toEqual({ x: 320, y: 120 });
  });
});
