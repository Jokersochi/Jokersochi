import { analyzeFace, faceToCanvasGeometry } from './makeup-engine.js';

describe('makeup face geometry', () => {
  test('projects normalized landmarks into canvas pixels', () => {
    const normalized = analyzeFace(720, 900);
    const canvas = faceToCanvasGeometry(normalized, 640, 800);

    expect(normalized.cheeks.left.x).toBeLessThan(1);
    expect(canvas.cheeks.left.x).toBeCloseTo(normalized.cheeks.left.x * 640);
    expect(canvas.cheeks.left.y).toBeCloseTo(normalized.cheeks.left.y * 800);
    expect(canvas.eyes.right.width).toBeCloseTo(normalized.eyes.right.width * 640);
    expect(canvas.lips.height).toBeCloseTo(normalized.lips.height * 800);
    expect(canvas.rect.w).toBeCloseTo(normalized.rect.w * 640);
  });

  test('keeps landmarks inside the portrait canvas', () => {
    const canvas = faceToCanvasGeometry(analyzeFace(720, 900), 640, 800);

    expect(canvas.eyes.left.center.x).toBeGreaterThan(0);
    expect(canvas.eyes.right.center.x).toBeLessThan(640);
    expect(canvas.brows.left.y).toBeGreaterThan(0);
    expect(canvas.lips.center.y).toBeLessThan(800);
  });
});
