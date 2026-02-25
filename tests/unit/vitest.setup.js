// Minimal canvas 2D API mock for jsdom (which has no canvas implementation).
// Tracks calls and arguments without producing pixel output.
globalThis.createMockCtx = () => ({
  strokeStyle: '',
  lineWidth: 0,
  fillStyle: '',
  font: '',
  textBaseline: '',
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  putImageData: vi.fn(),
  measureText: vi.fn(() => ({ width: 42 })),
  createImageData: vi.fn((w, h) => ({
    data: new Uint8ClampedArray(w * h * 4),
    width: w,
    height: h,
  })),
});

globalThis.createMockCanvas = (w = 100, h = 100) => {
  const ctx = createMockCtx();
  return {
    width: w,
    height: h,
    getContext: vi.fn(() => ctx),
    _ctx: ctx,
  };
};
