const MAX_CANVAS_WIDTH = 900;
const MAX_CANVAS_HEIGHT = 900;

const state = {
  image: null,
  template: null,
  hasPhoto: false,
  adjustments: {
    intensity: 0.8,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
};

const templates = [
  {
    id: 'soft-glow',
    name: 'Натуральное сияние',
    description: 'Лёгкие розовые оттенки, подчёркнутые тёплым хайлайтером. Подходит для дневных образов.',
    swatch: ['#f9a8d4', '#fcd34d', '#c084fc'],
    shapes: [
      {
        type: 'pair',
        color: 'rgba(158, 105, 210, 1)',
        opacity: 0.28,
        blendMode: 'lighter',
        rotation: -0.18,
        rx: 0.14,
        ry: 0.055,
        cx: 0.26,
        cy: -0.08,
      },
      {
        type: 'ellipse',
        color: 'rgba(199, 65, 110, 1)',
        opacity: 0.4,
        blendMode: 'source-over',
        rotation: 0,
        rx: 0.22,
        ry: 0.1,
        cx: 0,
        cy: 0.24,
      },
      {
        type: 'pair',
        color: 'rgba(255, 177, 193, 1)',
        opacity: 0.32,
        blendMode: 'screen',
        rotation: -0.3,
        rx: 0.22,
        ry: 0.12,
        cx: 0.32,
        cy: 0.18,
      },
      {
        type: 'ellipse',
        color: 'rgba(255, 243, 193, 1)',
        opacity: 0.3,
        blendMode: 'screen',
        rotation: 0,
        rx: 0.42,
        ry: 0.35,
        cx: 0,
        cy: -0.1,
      },
    ],
  },
  {
    id: 'evening-glam',
    name: 'Вечерний гламур',
    description: 'Контрастный smoky-eye с насыщенными винными губами и холодными хайлайтами.',
    swatch: ['#f472b6', '#1f2937', '#c026d3'],
    shapes: [
      {
        type: 'pair',
        color: 'rgba(51, 38, 67, 1)',
        opacity: 0.48,
        blendMode: 'multiply',
        rotation: -0.12,
        rx: 0.17,
        ry: 0.06,
        cx: 0.25,
        cy: -0.1,
        scaleY: 0.9,
      },
      {
        type: 'pair',
        color: 'rgba(136, 93, 201, 1)',
        opacity: 0.26,
        blendMode: 'screen',
        rotation: -0.22,
        rx: 0.24,
        ry: 0.09,
        cx: 0.3,
        cy: -0.02,
      },
      {
        type: 'ellipse',
        color: 'rgba(121, 18, 54, 1)',
        opacity: 0.55,
        blendMode: 'source-over',
        rotation: 0,
        rx: 0.21,
        ry: 0.1,
        cx: 0,
        cy: 0.24,
      },
      {
        type: 'ellipse',
        color: 'rgba(255, 203, 112, 1)',
        opacity: 0.32,
        blendMode: 'screen',
        rotation: 0,
        rx: 0.24,
        ry: 0.3,
        cx: 0,
        cy: -0.18,
      },
      {
        type: 'pair',
        color: 'rgba(166, 45, 90, 1)',
        opacity: 0.26,
        blendMode: 'screen',
        rotation: -0.18,
        rx: 0.15,
        ry: 0.06,
        cx: 0.34,
        cy: 0.18,
      },
    ],
  },
  {
    id: 'festival-light',
    name: 'Фестивальный свет',
    description: 'Экспериментальный образ с мягкими неоновыми тенями, сияющими скуловыми хайлайтерами и глянцевыми губами.',
    swatch: ['#38bdf8', '#f97316', '#f472b6'],
    shapes: [
      {
        type: 'pair',
        color: 'rgba(56, 189, 248, 1)',
        opacity: 0.42,
        blendMode: 'screen',
        rotation: -0.1,
        rx: 0.2,
        ry: 0.07,
        cx: 0.3,
        cy: -0.07,
      },
      {
        type: 'pair',
        color: 'rgba(249, 115, 22, 1)',
        opacity: 0.3,
        blendMode: 'screen',
        rotation: -0.22,
        rx: 0.28,
        ry: 0.09,
        cx: 0.32,
        cy: 0,
      },
      {
        type: 'ellipse',
        color: 'rgba(244, 114, 182, 1)',
        opacity: 0.48,
        blendMode: 'lighter',
        rotation: 0,
        rx: 0.24,
        ry: 0.11,
        cx: 0,
        cy: 0.24,
      },
      {
        type: 'pair',
        color: 'rgba(186, 230, 253, 1)',
        opacity: 0.24,
        blendMode: 'screen',
        rotation: -0.18,
        rx: 0.25,
        ry: 0.13,
        cx: 0.36,
        cy: 0.18,
      },
      {
        type: 'ellipse',
        color: 'rgba(255, 255, 255, 1)',
        opacity: 0.3,
        blendMode: 'overlay',
        rotation: 0,
        rx: 0.5,
        ry: 0.42,
        cx: 0,
        cy: -0.08,
      },
    ],
  },
];

const photoCanvas = document.getElementById('photoCanvas');
const makeupCanvas = document.getElementById('makeupCanvas');
const uploader = document.getElementById('uploader');
const uploaderInput = document.getElementById('photoInput');
const canvasPlaceholder = document.getElementById('canvasPlaceholder');
const templateList = document.getElementById('templateList');
const selectedTemplateName = document.getElementById('selectedTemplateName');
const selectedTemplateDescription = document.getElementById('selectedTemplateDescription');
const downloadButton = document.getElementById('downloadResult');
const resetAdjustmentsButton = document.getElementById('resetAdjustments');
const resetAllButton = document.getElementById('resetAll');
const intensityControl = document.getElementById('intensityControl');
const scaleControl = document.getElementById('scaleControl');
const offsetXControl = document.getElementById('offsetXControl');
const offsetYControl = document.getElementById('offsetYControl');
const intensityValue = document.getElementById('intensityValue');
const scaleValue = document.getElementById('scaleValue');
const offsetXValue = document.getElementById('offsetXValue');
const offsetYValue = document.getElementById('offsetYValue');

const photoCtx = photoCanvas.getContext('2d');
const makeupCtx = makeupCanvas.getContext('2d');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetAdjustments() {
  state.adjustments = {
    intensity: 0.8,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
  updateControlsUI();
  renderMakeup();
}

function resetAll() {
  uploaderInput.value = '';
  state.image = null;
  state.hasPhoto = false;
  state.template = null;
  resetAdjustments();
  selectedTemplateName.textContent = 'Выберите шаблон';
  selectedTemplateDescription.textContent = 'Загрузите фото и нажмите на один из шаблонов, чтобы увидеть, как он ложится на ваш образ.';
  downloadButton.disabled = true;
  canvasPlaceholder.classList.remove('canvas-placeholder--hidden');
  photoCtx.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
  makeupCtx.clearRect(0, 0, makeupCanvas.width, makeupCanvas.height);
  [...templateList.querySelectorAll('.template-card')].forEach(card => card.setAttribute('aria-pressed', 'false'));
}

function updateControlsUI() {
  intensityControl.value = Math.round(state.adjustments.intensity * 100);
  scaleControl.value = Math.round(state.adjustments.scale * 100);
  offsetXControl.value = Math.round(state.adjustments.offsetX * 100);
  offsetYControl.value = Math.round(state.adjustments.offsetY * 100);

  intensityValue.textContent = `${Math.round(state.adjustments.intensity * 100)}%`;
  scaleValue.textContent = `${Math.round(state.adjustments.scale * 100)}%`;
  offsetXValue.textContent = `${Math.round(state.adjustments.offsetX * 100)}%`;
  offsetYValue.textContent = `${Math.round(state.adjustments.offsetY * 100)}%`;
}

function drawImageToCanvas(image) {
  const ratio = Math.min(MAX_CANVAS_WIDTH / image.width, MAX_CANVAS_HEIGHT / image.height, 1);
  const targetWidth = Math.round(image.width * ratio);
  const targetHeight = Math.round(image.height * ratio);

  photoCanvas.width = targetWidth;
  photoCanvas.height = targetHeight;
  makeupCanvas.width = targetWidth;
  makeupCanvas.height = targetHeight;

  photoCtx.clearRect(0, 0, targetWidth, targetHeight);
  photoCtx.drawImage(image, 0, 0, targetWidth, targetHeight);

  makeupCtx.clearRect(0, 0, targetWidth, targetHeight);
}

function renderMakeup() {
  makeupCtx.clearRect(0, 0, makeupCanvas.width, makeupCanvas.height);

  if (!state.template || !state.hasPhoto) {
    return;
  }

  const { width, height } = makeupCanvas;
  const centerX = width / 2 + state.adjustments.offsetX * width * 0.35;
  const centerY = height / 2 + state.adjustments.offsetY * height * 0.35;
  const scale = state.adjustments.scale;

  state.template.shapes.forEach(shape => {
    if (shape.type === 'pair') {
      drawEllipse(makeupCtx, {
        ...shape,
        cx: -shape.cx,
        rotation: -shape.rotation,
      }, centerX, centerY, width, height, scale);
      drawEllipse(makeupCtx, shape, centerX, centerY, width, height, scale);
    } else {
      drawEllipse(makeupCtx, shape, centerX, centerY, width, height, scale);
    }
  });
}

function drawEllipse(ctx, shape, centerX, centerY, width, height, scale) {
  const {
    color,
    opacity,
    blendMode,
    rotation = 0,
    rx,
    ry,
    cx,
    cy,
    scaleX = 1,
    scaleY = 1,
  } = shape;

  ctx.save();
  ctx.globalCompositeOperation = blendMode || 'source-over';
  ctx.globalAlpha = clamp(opacity * state.adjustments.intensity, 0, 1);
  ctx.translate(centerX + cx * width * 0.5 * scale, centerY + cy * height * 0.5 * scale);
  ctx.rotate(rotation);
  ctx.scale(scaleX, scaleY);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * width * 0.5 * scale, ry * height * 0.5 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function setTemplate(templateId) {
  const template = templates.find(item => item.id === templateId) || null;
  state.template = template;
  if (template) {
    selectedTemplateName.textContent = template.name;
    selectedTemplateDescription.textContent = template.description;
    canvasPlaceholder.classList.add('canvas-placeholder--hidden');
  }
  [...templateList.querySelectorAll('.template-card')].forEach(card => {
    card.setAttribute('aria-pressed', card.dataset.template === templateId ? 'true' : 'false');
  });
  renderMakeup();
  downloadButton.disabled = !state.hasPhoto;
}

function createTemplateCard(template) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'template-card';
  button.dataset.template = template.id;
  button.setAttribute('role', 'listitem');
  button.setAttribute('aria-pressed', 'false');

  const swatch = document.createElement('div');
  swatch.className = 'template-card__swatch';
  template.swatch.forEach(color => {
    const span = document.createElement('span');
    span.style.background = color;
    swatch.appendChild(span);
  });

  const title = document.createElement('h3');
  title.className = 'template-card__title';
  title.textContent = template.name;

  const description = document.createElement('p');
  description.className = 'template-card__description';
  description.textContent = template.description;

  button.appendChild(swatch);
  button.appendChild(title);
  button.appendChild(description);

  button.addEventListener('click', () => {
    setTemplate(template.id);
  });

  return button;
}

function handleFiles(files) {
  const file = files[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    alert('Поддерживаются только изображения. Пожалуйста, выберите файл JPG, PNG или HEIC.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('Размер файла превышает 10 МБ. Выберите изображение меньшего размера.');
    return;
  }

  const image = new Image();
  image.onload = () => {
    state.image = image;
    state.hasPhoto = true;
    canvasPlaceholder.classList.add('canvas-placeholder--hidden');
    drawImageToCanvas(image);
    if (!state.template) {
      setTemplate(templates[0].id);
    } else {
      renderMakeup();
    }
    downloadButton.disabled = false;
    URL.revokeObjectURL(image.src);
  };
  image.onerror = () => {
    alert('Не удалось прочитать файл. Попробуйте выбрать другое изображение.');
  };
  image.src = URL.createObjectURL(file);
}

function downloadResult() {
  if (!state.hasPhoto) {
    return;
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = photoCanvas.width;
  exportCanvas.height = photoCanvas.height;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.drawImage(photoCanvas, 0, 0);
  exportCtx.drawImage(makeupCanvas, 0, 0);

  const link = document.createElement('a');
  link.href = exportCanvas.toDataURL('image/png');
  const templateId = state.template ? state.template.id : 'no-template';
  link.download = `virtual-makeup-${templateId}.png`;
  link.click();
}

function init() {
  templates.forEach(template => {
    templateList.appendChild(createTemplateCard(template));
  });

  uploaderInput.addEventListener('change', event => {
    handleFiles(event.target.files);
  });

  ;['dragenter', 'dragover'].forEach(eventName => {
    uploader.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      uploader.classList.add('uploader--dragover');
    });
  });

  ;['dragleave', 'drop'].forEach(eventName => {
    uploader.addEventListener(eventName, event => {
      event.preventDefault();
      event.stopPropagation();
      uploader.classList.remove('uploader--dragover');
    });
  });

  uploader.addEventListener('drop', event => {
    const files = event.dataTransfer?.files;
    if (files?.length) {
      handleFiles(files);
    }
  });

  intensityControl.addEventListener('input', event => {
    state.adjustments.intensity = clamp(Number(event.target.value) / 100, 0, 1.5);
    intensityValue.textContent = `${event.target.value}%`;
    renderMakeup();
  });

  scaleControl.addEventListener('input', event => {
    state.adjustments.scale = clamp(Number(event.target.value) / 100, 0.4, 1.6);
    scaleValue.textContent = `${event.target.value}%`;
    renderMakeup();
  });

  offsetXControl.addEventListener('input', event => {
    state.adjustments.offsetX = clamp(Number(event.target.value) / 100, -0.4, 0.4);
    offsetXValue.textContent = `${event.target.value}%`;
    renderMakeup();
  });

  offsetYControl.addEventListener('input', event => {
    state.adjustments.offsetY = clamp(Number(event.target.value) / 100, -0.4, 0.4);
    offsetYValue.textContent = `${event.target.value}%`;
    renderMakeup();
  });

  resetAdjustmentsButton.addEventListener('click', () => {
    resetAdjustments();
  });

  resetAllButton.addEventListener('click', () => {
    resetAll();
  });

  downloadButton.addEventListener('click', () => {
    downloadResult();
  });

  window.addEventListener('resize', () => {
    if (state.image) {
      drawImageToCanvas(state.image);
      renderMakeup();
    }
  });

  resetAdjustments();
}

init();
