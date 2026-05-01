const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const chooseButton = document.querySelector('#chooseButton');
const canvas = document.querySelector('#canvas');
const placeholder = document.querySelector('#placeholder');
const templateList = document.querySelector('#templateList');
const templateInfo = document.querySelector('#templateInfo');
const intensitySlider = document.querySelector('#intensity');
const intensityValue = document.querySelector('#intensityValue');
const resetButton = document.querySelector('#resetButton');
const downloadButton = document.querySelector('#downloadButton');

const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Невозможно инициализировать контекст canvas. Проверьте поддержку браузера.');
}

const state = {
  image: null,
  templateId: null,
  intensity: 0.7,
};

const templates = [
  {
    id: 'soft-day',
    name: 'Нежное сияние',
    description: 'Теплый дневной макияж с лёгким румянцем и полупрозрачными губами.',
    palette: ['#ffe3ed', '#fbb8c9', '#f38dac'],
    filter: { brightness: 1.05, contrast: 1.02, saturate: 1.1 },
    overlays: [
      { type: 'cheeks', color: { r: 244, g: 145, b: 170, a: 0.45 }, radius: 0.16, offsetY: 0.04 },
      { type: 'lips', color: { r: 203, g: 82, b: 120, a: 0.55 } },
      { type: 'highlight', color: { r: 255, g: 235, b: 220, a: 0.5 }, width: 0.16, height: 0.4 },
    ],
  },
  {
    id: 'evening-glow',
    name: 'Вечернее сияние',
    description: 'Выразительные глаза, скульптурные скулы и насыщенные губы для вечернего выхода.',
    palette: ['#d9c4ff', '#b08ef2', '#7a4bc6'],
    filter: { brightness: 1.02, contrast: 1.14, saturate: 1.2, hue: -4 },
    overlays: [
      { type: 'shadow', color: { r: 104, g: 74, b: 160, a: 0.4 }, width: 0.28, height: 0.12, offsetY: -0.12 },
      { type: 'cheeks', color: { r: 180, g: 97, b: 150, a: 0.5 }, radius: 0.18, offsetY: 0.06 },
      { type: 'lips', color: { r: 160, g: 40, b: 88, a: 0.65 } },
    ],
  },
  {
    id: 'fresh-pop',
    name: 'Свежий акцент',
    description: 'Яркие оттенки с лёгкой графикой и влажным финишем кожи.',
    palette: ['#dff7ff', '#8cd2ff', '#ff8fc8'],
    filter: { brightness: 1.08, contrast: 1.08, saturate: 1.32 },
    overlays: [
      { type: 'shadow', color: { r: 112, g: 180, b: 255, a: 0.55 }, width: 0.26, height: 0.1, offsetY: -0.1 },
      { type: 'liner', color: { r: 255, g: 140, b: 200, a: 0.65 }, width: 0.32, thickness: 0.04 },
      { type: 'cheeks', color: { r: 255, g: 140, b: 170, a: 0.45 }, radius: 0.17, offsetY: 0.05 },
      { type: 'lips', color: { r: 240, g: 92, b: 120, a: 0.6 } },
    ],
  },
];

const templateButtons = new Map();

function init() {
  buildTemplateList();
  bindEvents();
  updateControls(false);
}

function buildTemplateList() {
  templates.forEach((template) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-card';
    button.dataset.id = template.id;
    button.setAttribute('role', 'listitem');
    button.innerHTML = `
      <h3 class="template-card__title">${template.name}</h3>
      <p class="template-card__description">${template.description}</p>
      <div class="template-card__palette" aria-hidden="true">
        ${template.palette
          .map((color) => `<span class="template-card__swatch" style="background:${color}"></span>`)
          .join('')}
      </div>
    `;
    button.addEventListener('click', () => selectTemplate(template.id));
    templateButtons.set(template.id, button);
    templateList.appendChild(button);
  });
}

function bindEvents() {
  chooseButton.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file);
    }
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
      event.target.value = '';
    }
  });

  intensitySlider.addEventListener('input', () => {
    state.intensity = Number(intensitySlider.value) / 100;
    intensityValue.textContent = `${Math.round(state.intensity * 100)}%`;
    render();
  });

  resetButton.addEventListener('click', () => {
    state.templateId = null;
    state.intensity = 0.7;
    intensitySlider.value = '70';
    intensityValue.textContent = '70%';
    highlightTemplate();
    updateTemplateInfo();
    render();
  });

  downloadButton.addEventListener('click', () => {
    if (!state.image) {
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const templateSuffix = state.templateId ?? 'original';
      anchor.href = url;
      anchor.download = `virtual-makeup-${templateSuffix}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Пожалуйста, выберите файл изображения (JPG, PNG, WebP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
      fitCanvas(image);
      updateControls(true);
      render();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function fitCanvas(image) {
  const maxSize = 1024;
  const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.style.display = 'block';
  placeholder.style.display = 'none';
}

function selectTemplate(id) {
  if (!state.image) {
    alert('Сначала загрузите фотографию.');
    return;
  }
  state.templateId = state.templateId === id ? null : id;
  highlightTemplate();
  updateTemplateInfo();
  render();
}

function highlightTemplate() {
  templateButtons.forEach((button, id) => {
    button.dataset.active = id === state.templateId ? 'true' : 'false';
  });
}

function updateTemplateInfo() {
  const template = getActiveTemplate();
  if (!template) {
    templateInfo.innerHTML = `
      <h3>Советы</h3>
      <p>После загрузки фото выберите шаблон, чтобы увидеть описание выбранного образа.</p>
    `;
    return;
  }

  templateInfo.innerHTML = `
    <h3>${template.name}</h3>
    <p>${template.description}</p>
    <p class="templates__tip">Нажмите на карточку повторно, чтобы вернуться к исходному фото.</p>
  `;
}

function updateControls(enabled) {
  intensitySlider.disabled = !enabled;
  resetButton.disabled = !enabled;
  downloadButton.disabled = !enabled;
  if (!enabled) {
    intensitySlider.value = '70';
    intensityValue.textContent = '70%';
    state.intensity = 0.7;
    highlightTemplate();
    updateTemplateInfo();
  }
}

function getActiveTemplate() {
  if (!state.templateId) {
    return null;
  }
  return templates.find((template) => template.id === state.templateId) ?? null;
}

function render() {
  if (!state.image) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const template = getActiveTemplate();
  ctx.filter = template ? buildFilter(template.filter, state.intensity) : 'none';
  ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  if (template) {
    applyOverlays(template.overlays ?? []);
  }

  ctx.restore();
}

function buildFilter(filterConfig = {}, intensity = 1) {
  const base = 1;
  const parts = [];
  if (filterConfig.brightness) {
    parts.push(`brightness(${lerp(base, filterConfig.brightness, intensity)})`);
  }
  if (filterConfig.contrast) {
    parts.push(`contrast(${lerp(base, filterConfig.contrast, intensity)})`);
  }
  if (filterConfig.saturate) {
    parts.push(`saturate(${lerp(base, filterConfig.saturate, intensity)})`);
  }
  if (filterConfig.hue) {
    parts.push(`hue-rotate(${filterConfig.hue * intensity}deg)`);
  }
  return parts.length ? parts.join(' ') : 'none';
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function applyOverlays(overlays) {
  overlays.forEach((overlay) => {
    switch (overlay.type) {
      case 'cheeks':
        drawCheeks(overlay);
        break;
      case 'lips':
        drawLips(overlay);
        break;
      case 'highlight':
        drawHighlight(overlay);
        break;
      case 'shadow':
        drawShadow(overlay);
        break;
      case 'liner':
        drawLiner(overlay);
        break;
      default:
        break;
    }
  });
}

function faceAnchor() {
  const { width, height } = canvas;
  return {
    cx: width / 2,
    cy: height * 0.45,
    width,
    height,
  };
}

function drawCheeks(overlay) {
  const anchor = faceAnchor();
  const radius = (overlay.radius ?? 0.16) * Math.min(anchor.width, anchor.height);
  const offsetY = overlay.offsetY ?? 0.05;
  const offsetX = 0.24;

  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';

  [ -1, 1 ].forEach((direction) => {
    const centerX = anchor.cx + direction * anchor.width * offsetX;
    const centerY = anchor.cy + anchor.height * offsetY;
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
    gradient.addColorStop(0, rgba(overlay.color, state.intensity));
    gradient.addColorStop(1, rgba({ ...overlay.color, a: 0 }, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawLips(overlay) {
  const anchor = faceAnchor();
  const width = anchor.width * 0.26;
  const height = anchor.height * 0.12;
  const centerX = anchor.cx;
  const centerY = anchor.cy + anchor.height * 0.22;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.quadraticCurveTo(-0.3, -1.1, 0, -1);
  ctx.quadraticCurveTo(0.3, -1.1, 1, 0);
  ctx.quadraticCurveTo(0.35, 1.05, 0, 1);
  ctx.quadraticCurveTo(-0.35, 1.05, -1, 0);
  ctx.closePath();
  ctx.fillStyle = rgba(overlay.color, state.intensity * 1.1);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fill();
  ctx.restore();
}

function drawHighlight(overlay) {
  const anchor = faceAnchor();
  const width = (overlay.width ?? 0.18) * anchor.width;
  const height = (overlay.height ?? 0.36) * anchor.height;
  const centerX = anchor.cx;
  const centerY = anchor.cy - anchor.height * 0.02;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((-12 * Math.PI) / 180);
  const gradient = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  gradient.addColorStop(0, rgba({ ...overlay.color, a: 0 }, 0));
  gradient.addColorStop(0.5, rgba(overlay.color, state.intensity));
  gradient.addColorStop(1, rgba({ ...overlay.color, a: 0 }, 0));
  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawShadow(overlay) {
  const anchor = faceAnchor();
  const width = (overlay.width ?? 0.26) * anchor.width;
  const height = (overlay.height ?? 0.1) * anchor.height;
  const centerY = anchor.cy + anchor.height * (overlay.offsetY ?? -0.08);

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  [ -1, 1 ].forEach((direction) => {
    const centerX = anchor.cx + direction * anchor.width * 0.18;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.quadraticCurveTo(-0.4, -1.1, 0, -1);
    ctx.quadraticCurveTo(0.4, -1.1, 1, 0);
    ctx.quadraticCurveTo(0.1, 1.05, 0, 0.85);
    ctx.quadraticCurveTo(-0.1, 1.05, -1, 0);
    ctx.closePath();
    ctx.fillStyle = rgba(overlay.color, state.intensity);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

function drawLiner(overlay) {
  const anchor = faceAnchor();
  const width = (overlay.width ?? 0.3) * anchor.width;
  const thickness = (overlay.thickness ?? 0.035) * anchor.height;
  const baseY = anchor.cy + anchor.height * -0.1;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  [ -1, 1 ].forEach((direction) => {
    const startX = anchor.cx + direction * anchor.width * 0.16;
    ctx.save();
    ctx.translate(startX, baseY);
    ctx.scale(direction, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width * 0.3, -thickness * 0.4, width, -thickness * 0.1);
    ctx.quadraticCurveTo(width * 0.3, thickness * 0.5, 0, thickness * 0.2);
    ctx.closePath();
    ctx.fillStyle = rgba(overlay.color, state.intensity * 0.9);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

function rgba(color, intensityMultiplier) {
  const alpha = Math.min(1, Math.max(0, (color.a ?? 1) * intensityMultiplier));
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

init();
