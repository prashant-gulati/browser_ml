// Pure drawing utilities extracted from index.html for testability.
// All drawing functions take `ctx` as an explicit first parameter (no closure over DOM).

// ctx is a Canvas 2D rendering context — the standard browser API object returned by canvas.getContext('2d').
// It's the drawing surface you paint onto. All the drawing methods in this file use it:

// ── Drawing primitives ────────────────────────────────────────────────────────

export function drawBox(ctx, x, y, w, h, label, color = '#00FF88') {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 3;
  ctx.strokeRect(x, y, w, h);

  const corner = 14;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 3;
  [[x,y,corner,0,0,corner],[x+w,y,-corner,0,0,corner],
   [x,y+h,corner,0,0,-corner],[x+w,y+h,-corner,0,0,-corner]].forEach(([cx,cy,dx1,dy1,dx2,dy2]) => {
    ctx.beginPath(); ctx.moveTo(cx+dx1,cy+dy1); ctx.lineTo(cx,cy); ctx.lineTo(cx+dx2,cy+dy2); ctx.stroke();
  });

  if (label) {
    ctx.fillStyle    = color;
    ctx.font         = 'bold 13px -apple-system,sans-serif';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x - 1, y - 20, tw + 10, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + 4, y - 3);
  }
}

export function drawDot(ctx, x, y, r = 3, color = '#FFD700') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// Batch all connections into a single path for performance
export function drawConnections(ctx, landmarks, connections, color, lineWidth, cw, ch) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.beginPath();
  connections.forEach(({ start, end }) => {
    const a = landmarks[start], b = landmarks[end];
    if (!a || !b) return;
    ctx.moveTo(a.x * cw, a.y * ch);
    ctx.lineTo(b.x * cw, b.y * ch);
  });
  ctx.stroke();
}

// ── Draw: Face detections (BlazeFace + MediaPipe) ────────────────────────────
// face: { x, y, w, h, prob, keypoints: [{x, y}] }
export function drawFaceDetections(ctx, canvas, faces) {
  faces.forEach(({ x, y, w, h, prob, keypoints }) => {
    if (!isFinite(x) || !isFinite(y) || w <= 0 || h <= 0) return;
    drawBox(ctx, x, y, w, h, `Face  ${prob}%`);
    keypoints?.forEach(kp => { if (isFinite(kp.x) && isFinite(kp.y)) drawDot(ctx, kp.x, kp.y); });
  });
  const n = faces.length;
  return n === 0 ? 'No face' : n === 1 ? '1 face' : `${n} faces`;
}

// ── Draw: COCO-SSD ───────────────────────────────────────────────────────────

const _classColors = {};
export function classColor(cls) {
  if (!_classColors[cls]) {
    let h = 0;
    for (let i = 0; i < cls.length; i++) h = ((h << 5) - h + cls.charCodeAt(i)) & 0xffff;
    _classColors[cls] = `hsl(${h % 360}, 90%, 58%)`;
  }
  return _classColors[cls];
}

export function drawObjects(ctx, canvas, objects) {
  objects.forEach(({ bbox: [x, y, w, h], class: cls, score }) => {
    const color = classColor(cls);
    const label = `${cls}  ${Math.round(score * 100)}%`;
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle    = color;
    ctx.font         = 'bold 13px -apple-system,sans-serif';
    ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x - 1, y - 20, tw + 10, 20);
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + 4, y - 3);
  });
  const n = objects.length;
  return n === 0 ? 'No objects' : n === 1 ? '1 object' : `${n} objects`;
}

// ── Draw: PoseNet ─────────────────────────────────────────────────────────────

export const POSE_PAIRS = [
  [0,1],[0,2],[1,3],[2,4],
  [5,6],[5,7],[7,9],[6,8],[8,10],
  [5,11],[6,12],[11,12],
  [11,13],[13,15],[12,14],[14,16],
];

export function drawPoses(ctx, canvas, poses) {
  poses.forEach(({ keypoints, score }) => {
    if (score < 0.25) return;
    POSE_PAIRS.forEach(([a, b]) => {
      const kA = keypoints[a], kB = keypoints[b];
      if (!kA || !kB || kA.score < 0.3 || kB.score < 0.3) return;
      ctx.strokeStyle = '#00FF88'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(kA.position.x, kA.position.y);
      ctx.lineTo(kB.position.x, kB.position.y);
      ctx.stroke();
    });
    keypoints.forEach(kp => {
      if (kp.score < 0.3) return;
      drawDot(ctx, kp.position.x, kp.position.y, 4, '#FFD700');
    });
  });
  const n = poses.filter(p => p.score >= 0.25).length;
  return n === 0 ? 'No pose detected' : n === 1 ? '1 person' : `${n} people`;
}

// ── Draw: Handpose ────────────────────────────────────────────────────────────

export const HAND_PAIRS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

export function drawHands(ctx, canvas, hands) {
  hands.forEach(hand => {
    const lm = hand.landmarks;
    HAND_PAIRS.forEach(([a, b]) => {
      const pA = lm[a], pB = lm[b];
      if (!pA || !pB) return;
      ctx.strokeStyle = '#00FF88'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pA[0], pA[1]); ctx.lineTo(pB[0], pB[1]); ctx.stroke();
    });
    lm.forEach(([x, y]) => drawDot(ctx, x, y, 3, '#FFD700'));
    const [tx, ty] = hand.boundingBox.topLeft;
    const [bx, by] = hand.boundingBox.bottomRight;
    drawBox(ctx, tx, ty, bx - tx, by - ty, 'Hand');
  });
  const n = hands.length;
  return n === 0 ? 'No hand detected' : n === 1 ? '1 hand' : `${n} hands`;
}

// ── Draw: BodyPix ─────────────────────────────────────────────────────────────

let _maskCanvas = null;
export function drawSegmentation(ctx, canvas, seg, createCanvas = () => document.createElement('canvas')) {
  const { data } = seg;
  const width  = Math.round(seg.width);
  const height = Math.round(seg.height);
  if (!_maskCanvas || _maskCanvas.width !== width || _maskCanvas.height !== height) {
    _maskCanvas = createCanvas();
    _maskCanvas.width = width;
    _maskCanvas.height = height;
  }
  const maskCtx = _maskCanvas.getContext('2d');
  const imgData = maskCtx.createImageData(width, height);
  let hasPerson = false;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 1) {
      imgData.data[i*4]   = 0;
      imgData.data[i*4+1] = 255;
      imgData.data[i*4+2] = 136;
      imgData.data[i*4+3] = 110;
      hasPerson = true;
    }
  }
  maskCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(_maskCanvas, 0, 0, canvas.width, canvas.height);
  return hasPerson ? '1 person' : 'No person';
}

// ── Draw: Face Landmarks (MediaPipe) ─────────────────────────────────────────

export function drawFaceMesh(ctx, canvas, result, FaceLandmarkerRef) {
  const cw = canvas.width, ch = canvas.height;
  const { faceLandmarks } = result;
  if (!faceLandmarks?.length) return 'No face';
  faceLandmarks.forEach(lm => {
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_TESSELATION,   'rgba(0,255,136,0.15)', 0.5, cw, ch);
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_FACE_OVAL,     'rgba(0,255,136,0.8)',  1.5, cw, ch);
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_LIPS,          '#FFD700',              1.5, cw, ch);
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_RIGHT_EYE,     '#fff',                 1,   cw, ch);
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_LEFT_EYE,      '#fff',                 1,   cw, ch);
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_RIGHT_EYEBROW, 'rgba(255,215,0,0.8)', 1,   cw, ch);
    drawConnections(ctx, lm, FaceLandmarkerRef.FACE_LANDMARKS_LEFT_EYEBROW,  'rgba(255,215,0,0.8)', 1,   cw, ch);
  });
  const n = faceLandmarks.length;
  return n === 1 ? '1 face mesh' : `${n} face meshes`;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

export function setStatus(statusEl, msg, error = false) {
  statusEl.textContent = msg;
  statusEl.style.color = error ? '#ff4444' : '#aaa';
}

export function syncCanvasSize(canvas, video) {
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

// ── Coordinate mapping ────────────────────────────────────────────────────────

export function mapBlazeFacePred(pred) {
  const [x, y]   = pred.topLeft;
  const [x2, y2] = pred.bottomRight;
  const rawProb  = Array.isArray(pred.probability) ? pred.probability[0] : pred.probability;
  const keypoints = (pred.landmarks || []).map(pt => ({
    x: Array.isArray(pt) ? pt[0] : pt,
    y: Array.isArray(pt) ? pt[1] : null,
  }));
  return { x, y, w: x2 - x, h: y2 - y, prob: isFinite(rawProb) ? Math.round(rawProb * 100) : 0, keypoints };
}

export function mapMediaPipeDet(det, cw, ch) {
  const bb    = det.boundingBox;
  const score = det.categories?.[0]?.score;
  const keypoints = (det.keypoints || []).map(kp => ({
    x: kp.x * cw,
    y: kp.y * ch,
  }));
  return {
    x: bb.originX,
    y: bb.originY,
    w: bb.width,
    h: bb.height,
    prob: isFinite(score) ? Math.round(score * 100) : 0,
    keypoints,
  };
}
