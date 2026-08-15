const TAU = Math.PI * 2;

const STYLE_BY_TEMPLATE = {
  'soft-glow': {
    blush: 0.44,
    shadow: 0.34,
    liner: 0.48,
    lips: 0.52,
    contour: 0.2,
    highlight: 0.28,
    gloss: 0.22,
    softness: 0.78
  },
  'evening-drama': {
    blush: 0.52,
    shadow: 0.74,
    liner: 0.82,
    lips: 0.76,
    contour: 0.4,
    highlight: 0.34,
    gloss: 0.12,
    softness: 0.66
  },
  'color-pop': {
    blush: 0.48,
    shadow: 0.68,
    liner: 0.78,
    lips: 0.72,
    contour: 0.3,
    highlight: 0.34,
    gloss: 0.24,
    softness: 0.72
  }
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function rgba(color, alpha = 1) {
  if (!color) return `rgba(255, 255, 255, ${alpha})`;
  if (color.startsWith('rgba')) return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  if (color.startsWith('rgb')) return color.replace(/\)$/, `, ${alpha})`).replace('rgb(', 'rgba(');
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map((item) => item + item).join('');
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  return color;
}

function point(x, y) { return { x, y }; }

function canvasPoint(source, width, height) {
  return point(source.x * width, source.y * height);
}

/**
 * The face model is stored in normalized image coordinates so the same
 * landmarks work at preview and export resolutions. Canvas APIs use pixels,
 * therefore every position and size must be projected before painting.
 */
export function faceToCanvasGeometry(face, width, height) {
  if (!face || !width || !height) return null;
  return {
    rect: {
      x: face.rect.x * width,
      y: face.rect.y * height,
      w: face.rect.w * width,
      h: face.rect.h * height
    },
    eyes: {
      left: {
        ...face.eyes.left,
        center: canvasPoint(face.eyes.left.center, width, height),
        width: face.eyes.left.width * width,
        height: face.eyes.left.height * height
      },
      right: {
        ...face.eyes.right,
        center: canvasPoint(face.eyes.right.center, width, height),
        width: face.eyes.right.width * width,
        height: face.eyes.right.height * height
      }
    },
    brows: {
      left: canvasPoint(face.brows.left, width, height),
      right: canvasPoint(face.brows.right, width, height)
    },
    cheeks: {
      left: canvasPoint(face.cheeks.left, width, height),
      right: canvasPoint(face.cheeks.right, width, height)
    },
    nose: {
      bridge: canvasPoint(face.nose.bridge, width, height),
      tip: canvasPoint(face.nose.tip, width, height),
      width: face.nose.width * width
    },
    lips: {
      center: canvasPoint(face.lips.center, width, height),
      width: face.lips.width * width,
      height: face.lips.height * height
    },
    jaw: {
      left: canvasPoint(face.jaw.left, width, height),
      right: canvasPoint(face.jaw.right, width, height)
    }
  };
}

function normalizedBoundingBox(width, height, boundingBox) {
  if (!boundingBox || !width || !height) return null;
  const x = boundingBox.x / width;
  const y = boundingBox.y / height;
  const w = boundingBox.width / width;
  const h = boundingBox.height / height;
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  return {
    x: clamp(x, 0, 0.9),
    y: clamp(y, 0, 0.9),
    w: clamp(w, 0.1, 0.95),
    h: clamp(h, 0.1, 0.95)
  };
}

/**
 * Creates a small, explicit face model. It is deliberately independent from
 * the renderer so a real landmark provider can replace the heuristic later.
 * When FaceDetector is available, only the bounding box is used as a safe
 * correction; the renderer still preserves each face's real pixels.
 */
export function analyzeFace(width, height, { boundingBox } = {}) {
  const aspect = width > 0 && height > 0 ? width / height : 0.8;
  const detected = normalizedBoundingBox(width, height, boundingBox);
  const rect = detected ?? (aspect > 1.15
    ? { x: 0.25, y: 0.07, w: 0.5, h: 0.76 }
    : { x: 0.16, y: 0.06, w: 0.68, h: 0.75 });
  const left = rect.x;
  const top = rect.y;
  const faceWidth = rect.w;
  const faceHeight = rect.h;
  const eyeY = top + faceHeight * 0.385;
  const eyeOffset = faceWidth * 0.265;
  const eyeWidth = faceWidth * 0.22;
  const eyeHeight = faceHeight * 0.075;
  const lipY = top + faceHeight * 0.745;
  const cheekY = top + faceHeight * 0.61;
  const jawY = top + faceHeight * 0.79;

  return {
    rect,
    eyes: {
      left: { center: point(left + faceWidth * 0.32, eyeY), width: eyeWidth, height: eyeHeight, angle: -0.04 },
      right: { center: point(left + faceWidth * 0.68, eyeY), width: eyeWidth, height: eyeHeight, angle: 0.04 }
    },
    brows: {
      left: point(left + faceWidth * 0.32, top + faceHeight * 0.305),
      right: point(left + faceWidth * 0.68, top + faceHeight * 0.305)
    },
    cheeks: {
      left: point(left + faceWidth * 0.225, cheekY),
      right: point(left + faceWidth * 0.775, cheekY)
    },
    nose: {
      bridge: point(left + faceWidth * 0.5, top + faceHeight * 0.47),
      tip: point(left + faceWidth * 0.5, top + faceHeight * 0.62),
      width: faceWidth * 0.16
    },
    lips: {
      center: point(left + faceWidth * 0.5, lipY),
      width: faceWidth * 0.29,
      height: faceHeight * 0.09
    },
    jaw: {
      left: point(left + faceWidth * 0.12, jawY),
      right: point(left + faceWidth * 0.88, jawY)
    }
  };
}

export async function detectFace(image) {
  if (typeof FaceDetector !== 'function' || !image) return null;
  try {
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(image);
    return faces[0]?.boundingBox ?? null;
  } catch {
    return null;
  }
}

function strength(group, local, intensity, groupMix, visibleGroups) {
  const groupId = group === 'blush' || group === 'contour' || group === 'highlight' ? 'base' : group === 'shadow' || group === 'liner' ? 'eyes' : 'lips';
  if (visibleGroups?.[groupId] === false) return 0;
  return clamp((intensity ?? 1) * (groupMix?.[groupId] ?? 1) * local);
}

function ellipse(ctx, center, radiusX, radiusY, color, alpha, blend = 'soft-light', blur = 0) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = blend;
  ctx.globalAlpha = clamp(alpha);
  if (blur) ctx.filter = `blur(${blur}px)`;
  const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, Math.max(radiusX, radiusY));
  gradient.addColorStop(0, rgba(color, 1));
  gradient.addColorStop(0.4, rgba(color, 0.72));
  gradient.addColorStop(0.78, rgba(color, 0.16));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function eyeShape(ctx, eye, color, alpha, blur, intensity) {
  if (alpha <= 0) return;
  const { x, y } = eye.center;
  const width = eye.width;
  const height = eye.height;
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = clamp(alpha);
  ctx.filter = `blur(${blur}px)`;
  const gradient = ctx.createLinearGradient(x, y - height * 1.7, x, y + height * 1.1);
  gradient.addColorStop(0, rgba(color, 0));
  gradient.addColorStop(0.22, rgba(color, 0.35));
  gradient.addColorStop(0.55, rgba(color, 0.82));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.6, y + height * 0.25);
  ctx.quadraticCurveTo(x, y - height * (1.05 + intensity * 0.38), x + width * 0.6, y + height * 0.25);
  ctx.quadraticCurveTo(x, y + height * 0.58, x - width * 0.6, y + height * 0.25);
  ctx.fill();
  ctx.restore();
}

function liner(ctx, eye, color, alpha, widthFactor = 1) {
  if (alpha <= 0) return;
  const { x, y } = eye.center;
  const width = eye.width;
  const height = eye.height;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = rgba(color, 0.82);
  ctx.lineWidth = Math.max(1.15, width * 0.065 * widthFactor);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.filter = 'blur(.32px)';
  ctx.beginPath();
  ctx.moveTo(x - width * 0.56, y + height * 0.13);
  ctx.quadraticCurveTo(x, y - height * 0.72, x + width * 0.56, y + height * 0.1);
  ctx.quadraticCurveTo(x + width * 0.72, y - height * 0.02, x + width * 0.84, y - height * 0.2);
  ctx.stroke();
  ctx.restore();
}

function browHighlight(ctx, brow, color, alpha, width) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = rgba(color, 0.55);
  ctx.lineWidth = Math.max(1, width * 0.028);
  ctx.lineCap = 'round';
  ctx.filter = 'blur(2px)';
  ctx.beginPath();
  ctx.moveTo(brow.x - width * 0.18, brow.y);
  ctx.quadraticCurveTo(brow.x, brow.y - width * 0.035, brow.x + width * 0.18, brow.y);
  ctx.stroke();
  ctx.restore();
}

function lips(ctx, lip, color, alpha, gloss, intensity) {
  if (alpha <= 0) return;
  const { x, y } = lip.center;
  const width = lip.width;
  const height = lip.height;
  const upper = new Path2D();
  upper.moveTo(x - width * 0.5, y);
  upper.quadraticCurveTo(x - width * 0.2, y - height * 0.42, x, y - height * 0.08);
  upper.quadraticCurveTo(x + width * 0.2, y - height * 0.42, x + width * 0.5, y);
  upper.quadraticCurveTo(x + width * 0.2, y + height * 0.12, x, y + height * 0.04);
  upper.quadraticCurveTo(x - width * 0.2, y + height * 0.12, x - width * 0.5, y);
  upper.closePath();
  const lower = new Path2D();
  lower.moveTo(x - width * 0.5, y);
  lower.quadraticCurveTo(x - width * 0.18, y + height * 0.56, x, y + height * 0.6);
  lower.quadraticCurveTo(x + width * 0.18, y + height * 0.56, x + width * 0.5, y);
  lower.closePath();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = clamp(alpha);
  ctx.filter = 'blur(.55px)';
  const gradient = ctx.createLinearGradient(x, y - height, x, y + height);
  gradient.addColorStop(0, rgba(color, 0.58));
  gradient.addColorStop(0.42, rgba(color, 0.94));
  gradient.addColorStop(1, rgba(color, 0.62));
  ctx.fillStyle = gradient;
  ctx.fill(upper);
  ctx.fill(lower);
  ctx.restore();
  if (gloss > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = clamp(gloss * (0.72 + intensity * 0.28));
    ctx.filter = 'blur(1px)';
    const shine = ctx.createLinearGradient(x - width * 0.2, y - height * 0.1, x + width * 0.2, y + height * 0.2);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.45, 'rgba(255,255,255,.8)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fill(upper);
    ctx.fill(lower);
    ctx.restore();
  }
}

function cheekContour(ctx, face, color, alpha, width, side) {
  if (alpha <= 0) return;
  const { rect, cheeks, jaw } = face;
  const isLeft = side === 'left';
  const startX = isLeft ? rect.x + rect.w * 0.08 : rect.x + rect.w * 0.92;
  const cheek = isLeft ? cheeks.left : cheeks.right;
  const endX = isLeft ? jaw.left.x : jaw.right.x;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = rgba(color, 0.78);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, width * 0.09);
  ctx.filter = `blur(${Math.max(5, width * 0.06)}px)`;
  ctx.beginPath();
  ctx.moveTo(startX, cheek.y - width * 0.05);
  ctx.quadraticCurveTo(cheek.x, cheek.y - width * 0.02, endX, jaw.left.y - width * 0.02);
  ctx.stroke();
  ctx.restore();
}

function noseContour(ctx, nose, color, alpha, width) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = rgba(color, 0.5);
  ctx.lineWidth = Math.max(1.5, width * 0.035);
  ctx.lineCap = 'round';
  ctx.filter = `blur(${Math.max(3, width * 0.025)}px)`;
  [-1, 1].forEach((direction) => {
    ctx.beginPath();
    ctx.moveTo(nose.bridge.x + direction * nose.width * 0.45, nose.bridge.y);
    ctx.quadraticCurveTo(nose.tip.x + direction * nose.width * 0.6, nose.tip.y - width * 0.02, nose.tip.x + direction * nose.width * 0.52, nose.tip.y);
    ctx.stroke();
  });
  ctx.restore();
}

export function renderMakeup({
  context,
  width,
  height,
  face,
  template,
  variant,
  intensity = 1,
  groupMix = {},
  visibleGroups = {},
  scale = 1,
  rotation = 0,
  offset = { x: 0, y: 0 },
  showBefore = false
}) {
  if (!context || !width || !height || showBefore) {
    context?.clearRect(0, 0, width, height);
    return;
  }
  context.clearRect(0, 0, width, height);
  const geometry = faceToCanvasGeometry(face ?? analyzeFace(width, height), width, height);
  const style = STYLE_BY_TEMPLATE[template?.id] ?? STYLE_BY_TEMPLATE['soft-glow'];
  const roles = variant?.roles ?? {};
  const layerMix = variant?.intensity ?? {};
  const widthUnit = geometry.rect.w;
  const alphaFor = (layer, multiplier = 1) => style[layer]
    * strength(layer, (layerMix[layer] ?? 1) * multiplier, intensity, groupMix, visibleGroups);

  context.save();
  context.translate(width / 2 + (offset?.x ?? 0) * width, height / 2 + (offset?.y ?? 0) * height);
  context.rotate((rotation * Math.PI) / 180);
  context.scale(scale, scale);
  context.translate(-width / 2, -height / 2);

  // Every effect below is a translucent, face-shaped mask. The original photo
  // stays visible underneath, preserving pores, fine hairs and uneven light.
  ellipse(context, geometry.cheeks.left, widthUnit * 0.23, widthUnit * 0.13, roles.blush ?? '#e5969a', alphaFor('blush'), 'soft-light', widthUnit * style.softness * 0.04);
  ellipse(context, geometry.cheeks.right, widthUnit * 0.23, widthUnit * 0.13, roles.blush ?? '#e5969a', alphaFor('blush'), 'soft-light', widthUnit * style.softness * 0.04);
  cheekContour(context, geometry, roles.contour ?? '#6e493d', alphaFor('contour'), widthUnit, 'left');
  cheekContour(context, geometry, roles.contour ?? '#6e493d', alphaFor('contour'), widthUnit, 'right');
  noseContour(context, geometry.nose, roles.contour ?? '#6e493d', alphaFor('contour', 0.55), widthUnit);

  eyeShape(context, geometry.eyes.left, roles.shadow ?? '#a68caa', alphaFor('shadow'), widthUnit * 0.018, intensity);
  eyeShape(context, geometry.eyes.right, roles.shadow ?? '#a68caa', alphaFor('shadow'), widthUnit * 0.018, intensity);
  liner(context, geometry.eyes.left, roles.liner ?? roles.shadow ?? '#352a36', alphaFor('liner'), template?.id === 'color-pop' ? 1.08 : 0.92);
  liner(context, geometry.eyes.right, roles.liner ?? roles.shadow ?? '#352a36', alphaFor('liner'), template?.id === 'color-pop' ? 1.08 : 0.92);

  browHighlight(context, geometry.brows.left, roles.highlight ?? '#fff2e9', alphaFor('highlight', 0.44), widthUnit);
  browHighlight(context, geometry.brows.right, roles.highlight ?? '#fff2e9', alphaFor('highlight', 0.44), widthUnit);
  ellipse(context, point(geometry.nose.bridge.x, geometry.nose.bridge.y - widthUnit * 0.01), widthUnit * 0.052, widthUnit * 0.16, roles.highlight ?? '#fff2e9', alphaFor('highlight'), 'screen', widthUnit * 0.025);
  ellipse(context, geometry.cheeks.left, widthUnit * 0.12, widthUnit * 0.07, roles.highlight ?? '#fff2e9', alphaFor('highlight', 0.55), 'screen', widthUnit * 0.026);
  ellipse(context, geometry.cheeks.right, widthUnit * 0.12, widthUnit * 0.07, roles.highlight ?? '#fff2e9', alphaFor('highlight', 0.55), 'screen', widthUnit * 0.026);
  lips(context, geometry.lips, roles.lips ?? '#bb6f77', alphaFor('lips'), style.gloss * strength('lips', layerMix.lips ?? 1, intensity, groupMix, visibleGroups), intensity);

  context.restore();
}
