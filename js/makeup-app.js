const BASE_DEFAULTS = {
  intensity: 0.85,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0
};

const svgClassicColor = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200">
    <defs>
      <filter id="classic-soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="24" />
      </filter>
      <filter id="classic-wide" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="80" />
      </filter>
      <radialGradient id="classic-lip-highlight" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#ff9fb3" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#b0103c" stop-opacity="1" />
      </radialGradient>
    </defs>
    <g filter="url(#classic-soft)">
      <ellipse cx="500" cy="820" rx="190" ry="96" fill="#b0103c" fill-opacity="0.9" />
      <ellipse cx="500" cy="820" rx="160" ry="72" fill="url(#classic-lip-highlight)" fill-opacity="0.92" />
    </g>
    <g filter="url(#classic-soft)" fill="#d7b46a">
      <ellipse cx="330" cy="560" rx="150" ry="88" fill-opacity="0.48" />
      <ellipse cx="670" cy="560" rx="150" ry="88" fill-opacity="0.48" />
      <ellipse cx="330" cy="560" rx="118" ry="64" fill-opacity="0.36" />
      <ellipse cx="670" cy="560" rx="118" ry="64" fill-opacity="0.36" />
    </g>
    <g filter="url(#classic-wide)" fill="#f2a7a3" fill-opacity="0.36">
      <ellipse cx="320" cy="760" rx="180" ry="120" />
      <ellipse cx="680" cy="760" rx="180" ry="120" />
    </g>
    <g filter="url(#classic-wide)">
      <ellipse cx="500" cy="430" rx="210" ry="140" fill="#fbe0b8" fill-opacity="0.2" />
    </g>
  </svg>
`;

const svgClassicGlow = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200">
    <defs>
      <filter id="classic-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="120" />
      </filter>
    </defs>
    <g filter="url(#classic-glow)" fill="#fff2d8" fill-opacity="0.32">
      <ellipse cx="500" cy="420" rx="260" ry="150" />
      <ellipse cx="320" cy="560" rx="180" ry="110" />
      <ellipse cx="680" cy="560" rx="180" ry="110" />
    </g>
  </svg>
`;

const svgPastelColor = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200">
    <defs>
      <filter id="pastel-soft" x="-22%" y="-22%" width="144%" height="144%">
        <feGaussianBlur stdDeviation="26" />
      </filter>
      <filter id="pastel-wide" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="90" />
      </filter>
      <radialGradient id="pastel-lip" cx="50%" cy="42%" r="58%">
        <stop offset="0%" stop-color="#ffd7e3" stop-opacity="0.92" />
        <stop offset="100%" stop-color="#f085a8" stop-opacity="0.9" />
      </radialGradient>
    </defs>
    <g filter="url(#pastel-soft)">
      <ellipse cx="500" cy="830" rx="180" ry="92" fill="#f4a9b8" fill-opacity="0.88" />
      <ellipse cx="500" cy="830" rx="150" ry="70" fill="url(#pastel-lip)" fill-opacity="0.95" />
    </g>
    <g filter="url(#pastel-soft)" fill="#b7b1f6">
      <ellipse cx="330" cy="560" rx="150" ry="92" fill-opacity="0.38" />
      <ellipse cx="670" cy="560" rx="150" ry="92" fill-opacity="0.38" />
      <ellipse cx="330" cy="560" rx="120" ry="64" fill-opacity="0.3" />
      <ellipse cx="670" cy="560" rx="120" ry="64" fill-opacity="0.3" />
    </g>
    <g filter="url(#pastel-wide)" fill="#ffd3df" fill-opacity="0.34">
      <ellipse cx="320" cy="780" rx="185" ry="120" />
      <ellipse cx="680" cy="780" rx="185" ry="120" />
    </g>
  </svg>
`;

const svgPastelGlow = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200">
    <defs>
      <filter id="pastel-glow" x="-36%" y="-36%" width="172%" height="172%">
        <feGaussianBlur stdDeviation="110" />
      </filter>
    </defs>
    <g filter="url(#pastel-glow)" fill="#fbefff" fill-opacity="0.32">
      <ellipse cx="500" cy="460" rx="260" ry="160" />
      <ellipse cx="320" cy="600" rx="200" ry="120" />
      <ellipse cx="680" cy="600" rx="200" ry="120" />
    </g>
  </svg>
`;

const svgDramaColor = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200">
    <defs>
      <filter id="drama-soft" x="-24%" y="-24%" width="148%" height="148%">
        <feGaussianBlur stdDeviation="28" />
      </filter>
      <filter id="drama-wide" x="-32%" y="-32%" width="164%" height="164%">
        <feGaussianBlur stdDeviation="88" />
      </filter>
      <radialGradient id="drama-lip" cx="48%" cy="45%" r="64%">
        <stop offset="0%" stop-color="#b75c85" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#61143b" stop-opacity="0.95" />
      </radialGradient>
    </defs>
    <g filter="url(#drama-soft)">
      <ellipse cx="500" cy="825" rx="190" ry="94" fill="#61143b" fill-opacity="0.9" />
      <ellipse cx="500" cy="825" rx="150" ry="70" fill="url(#drama-lip)" fill-opacity="0.95" />
    </g>
    <g filter="url(#drama-soft)" fill="#443661">
      <ellipse cx="330" cy="560" rx="160" ry="94" fill-opacity="0.44" />
      <ellipse cx="670" cy="560" rx="160" ry="94" fill-opacity="0.44" />
      <ellipse cx="330" cy="560" rx="125" ry="68" fill-opacity="0.34" />
      <ellipse cx="670" cy="560" rx="125" ry="68" fill-opacity="0.34" />
    </g>
    <g filter="url(#drama-wide)" fill="#d59ab0" fill-opacity="0.34">
      <ellipse cx="320" cy="780" rx="190" ry="130" />
      <ellipse cx="680" cy="780" rx="190" ry="130" />
    </g>
  </svg>
`;

const svgDramaGlow = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1200">
    <defs>
      <filter id="drama-glow" x="-34%" y="-34%" width="168%" height="168%">
        <feGaussianBlur stdDeviation="105" />
      </filter>
    </defs>
    <g filter="url(#drama-glow)" fill="#fbe3ff" fill-opacity="0.28">
      <ellipse cx="500" cy="430" rx="260" ry="170" />
      <ellipse cx="320" cy="600" rx="200" ry="120" />
      <ellipse cx="680" cy="600" rx="200" ry="120" />
    </g>
  </svg>
`;

const templates = [
  {
    id: 'classic-glam',
    name: 'Классический гламур',
    description: 'Яркие губы, золотистые тени и мягкое свечение для вечерних выходов.',
    accent: ['#b0103c', '#f5c572'],
    palette: ['#b0103c', '#f2a7a3', '#fbe0b8'],
    layers: [
      { id: 'classic-color', src: svgClassicColor, blend: 'multiply', opacity: 0.96 },
      { id: 'classic-glow', src: svgClassicGlow, blend: 'screen', opacity: 0.55 }
    ],
    defaultAdjustments: { intensity: 0.9, scale: 1, offsetX: 0, offsetY: -10, rotation: 0 }
  },
  {
    id: 'soft-pastel',
    name: 'Нежная пастель',
    description: 'Лавандовые тени, нежно-розовые губы и деликатный румянец на каждый день.',
    accent: ['#f4a9b8', '#b7b1f6'],
    palette: ['#f4a9b8', '#ffd3df', '#b7b1f6'],
    layers: [
      { id: 'pastel-color', src: svgPastelColor, blend: 'multiply', opacity: 0.92 },
      { id: 'pastel-glow', src: svgPastelGlow, blend: 'screen', opacity: 0.52 }
    ],
    defaultAdjustments: { intensity: 0.88, scale: 1, offsetX: 0, offsetY: -6, rotation: 0 }
  },
  {
    id: 'evening-drama',
    name: 'Вечерняя драма',
    description: 'Смоки на веках и глубокий винный оттенок губ с лёгким контурингом.',
    accent: ['#61143b', '#4e3a73'],
    palette: ['#61143b', '#d59ab0', '#4e3a73'],
    layers: [
      { id: 'drama-color', src: svgDramaColor, blend: 'multiply', opacity: 0.94 },
      { id: 'drama-glow', src: svgDramaGlow, blend: 'screen', opacity: 0.48 }
    ],
    defaultAdjustments: { intensity: 0.93, scale: 1.02, offsetX: 0, offsetY: -12, rotation: 0 }
  }
];

const state = {
  ...BASE_DEFAULTS,
  selectedTemplateId: null,
  defaults: { ...BASE_DEFAULTS },
  photoLoaded: false
};

const elements = {
  dropzone: document.querySelector('[data-dropzone]'),
  fileInput: document.querySelector('[data-file-input]'),
  triggerUpload: document.querySelector('[data-trigger-upload]'),
  fileName: document.querySelector('[data-file-name]'),
  stage: document.querySelector('[data-stage]'),
  photo: document.querySelector('[data-photo]'),
  placeholder: document.querySelector('[data-placeholder]'),
  overlay: document.querySelector('[data-overlay]'),
  templateList: document.querySelector('[data-template-list]'),
  controls: document.querySelectorAll('[data-control]'),
  controlValues: document.querySelectorAll('[data-control-value]'),
  resetButton: document.querySelector('[data-reset-adjustments]'),
  exportButton: document.querySelector('[data-export]'),
  feedback: document.querySelector('[data-feedback]')
};

const BLEND_TO_COMPOSITE = new Map([
  ['multiply', 'multiply'],
  ['screen', 'screen']
]);

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim())}`;
}

function renderTemplateCards() {
  if (!elements.templateList) {
    return;
  }

  elements.templateList.innerHTML = '';
  const fragment = document.createDocumentFragment();

  templates.forEach((template) => {
    const card = document.createElement('article');
    card.className = 'template-card';
    card.setAttribute('role', 'listitem');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-card__button';
    button.dataset.templateId = template.id;
    button.setAttribute('data-template-select', '');
    button.setAttribute('aria-pressed', 'false');

    const accent = document.createElement('span');
    accent.className = 'template-card__accent';
    accent.style.background = `linear-gradient(135deg, ${template.accent[0]}, ${template.accent[1]})`;

    const content = document.createElement('span');
    content.className = 'template-card__content';

    const name = document.createElement('span');
    name.className = 'template-card__name';
    name.textContent = template.name;

    const description = document.createElement('span');
    description.className = 'template-card__desc';
    description.textContent = template.description;

    const palette = document.createElement('span');
    palette.className = 'template-card__palette';
    template.palette.forEach((color) => {
      const swatch = document.createElement('span');
      swatch.className = 'template-card__swatch';
      swatch.style.setProperty('--swatch', color);
      palette.append(swatch);
    });

    content.append(name, description, palette);
    button.append(accent, content);
    card.append(button);
    fragment.append(card);
  });

  elements.templateList.append(fragment);
  elements.templateList.setAttribute('role', 'list');
}

function selectTemplate(templateId, { silent = false } = {}) {
  const template = templates.find((item) => item.id === templateId);
  if (!template || !elements.overlay) {
    return;
  }

  state.selectedTemplateId = template.id;
  elements.overlay.innerHTML = '';

  template.layers.forEach((layer) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'lazy';
    img.alt = '';
    img.dataset.baseOpacity = String(layer.opacity ?? 1);
    img.className = 'makeup-layer';
    img.src = svgToDataUri(layer.src);
    img.style.mixBlendMode = layer.blend ?? 'normal';
    elements.overlay.append(img);
  });

  applyTemplateDefaults(template);
  updateTemplateSelectionUI();
  updateOverlayVisibility();
  updateActionButtons();

  if (!silent) {
    if (state.photoLoaded) {
      showFeedback(`Шаблон «${template.name}» активирован. Настройте посадку для идеального совпадения.`, 'success');
    } else {
      showFeedback(`Шаблон «${template.name}» готов. Загрузите фото, чтобы увидеть результат.`, 'info');
    }
  }
}

function updateTemplateSelectionUI() {
  const buttons = elements.templateList?.querySelectorAll('[data-template-select]');
  if (!buttons) {
    return;
  }

  buttons.forEach((button) => {
    const isActive = button.dataset.templateId === state.selectedTemplateId;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    button.classList.toggle('is-active', isActive);
  });
}

function applyTemplateDefaults(template, { preserveIntensity = false } = {}) {
  const defaults = {
    ...BASE_DEFAULTS,
    ...(template?.defaultAdjustments ?? {})
  };
  state.defaults = defaults;

  Object.entries(defaults).forEach(([key, value]) => {
    if (key === 'intensity' && preserveIntensity) {
      return;
    }
    state[key] = value;
  });

  updateControlInputsFromState();
  updateOverlayTransform();
  updateResetAvailability();
}

function updateControlInputsFromState() {
  elements.controls.forEach((control) => {
    const key = control.dataset.control;
    if (key && typeof state[key] === 'number') {
      control.value = String(state[key]);
    }
  });
  updateControlLabels();
}

function updateControlLabels() {
  elements.controlValues.forEach((element) => {
    const key = element.dataset.controlValue;
    const value = state[key];

    if (typeof value !== 'number') {
      return;
    }

    let text = '';

    if (key === 'intensity' || key === 'scale') {
      text = `${Math.round(value * 100)}%`;
    } else if (key === 'offsetX' || key === 'offsetY') {
      const sign = value > 0 ? '+' : value < 0 ? '−' : '';
      text = `${sign}${Math.abs(Math.round(value))} px`;
    } else if (key === 'rotation') {
      text = `${value.toFixed(1).replace(/\.0$/, '')}°`;
    }

    element.textContent = text;
  });
}

function updateOverlayTransform() {
  if (!elements.overlay) {
    return;
  }

  elements.overlay.style.setProperty('--overlay-scale', state.scale.toFixed(3));
  elements.overlay.style.setProperty('--overlay-offset-x', `${state.offsetX}px`);
  elements.overlay.style.setProperty('--overlay-offset-y', `${state.offsetY}px`);
  elements.overlay.style.setProperty('--overlay-rotation', `${state.rotation}deg`);

  const layers = elements.overlay.querySelectorAll('.makeup-layer');
  layers.forEach((layer) => {
    const base = Number(layer.dataset.baseOpacity) || 1;
    const opacity = Math.max(0, Math.min(1, base * state.intensity));
    layer.style.opacity = String(opacity);
  });
}

function updateResetAvailability() {
  if (!elements.resetButton) {
    return;
  }

  const changed = Object.keys(BASE_DEFAULTS).some((key) => {
    return Math.abs(state[key] - (state.defaults?.[key] ?? BASE_DEFAULTS[key])) > 0.005;
  });

  elements.resetButton.disabled = !changed;
}

function updateActionButtons() {
  const ready = state.photoLoaded && Boolean(state.selectedTemplateId);
  if (elements.exportButton) {
    elements.exportButton.disabled = !ready;
  }
}

function updateOverlayVisibility() {
  if (!elements.overlay || !elements.placeholder) {
    return;
  }

  const visible = state.photoLoaded && Boolean(state.selectedTemplateId);
  elements.overlay.classList.toggle('overlay-layers--visible', visible);
  elements.placeholder.classList.toggle('is-hidden', state.photoLoaded);
}

function resetAdjustments() {
  const template = templates.find((item) => item.id === state.selectedTemplateId);
  if (!template) {
    return;
  }

  applyTemplateDefaults(template);
  showFeedback('Настройки шаблона восстановлены по умолчанию.', 'info');
}

function handleControlInput(event) {
  const control = event.target;
  const key = control.dataset.control;
  const numericValue = Number(control.value);

  if (!key || Number.isNaN(numericValue)) {
    return;
  }

  state[key] = numericValue;
  updateControlLabels();
  updateOverlayTransform();
  updateResetAvailability();
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function handleFiles(fileList) {
  const [file] = Array.from(fileList).filter((item) => item.type.startsWith('image/'));

  if (!file) {
    showFeedback('Пожалуйста, выберите файл изображения в формате JPG, PNG или HEIC.', 'error');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showFeedback('Файл слишком большой. Пожалуйста, выберите изображение размером до 10 МБ.', 'error');
    return;
  }

  prepareStageForNewImage();

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (!elements.photo) {
      return;
    }
    elements.photo.src = String(reader.result);
    elements.photo.dataset.fileName = file.name;
  });

  reader.addEventListener('error', () => {
    showFeedback('Не удалось прочитать файл. Попробуйте выбрать изображение ещё раз.', 'error');
  });

  reader.readAsDataURL(file);
  if (elements.fileName) {
    elements.fileName.textContent = `Выбран файл: ${file.name}`;
    elements.fileName.hidden = false;
  }
}

function prepareStageForNewImage() {
  state.photoLoaded = false;
  if (elements.photo) {
    elements.photo.removeAttribute('src');
    elements.photo.hidden = true;
  }
  if (elements.stage) {
    elements.stage.style.removeProperty('aspect-ratio');
  }
  updateOverlayVisibility();
  updateActionButtons();
}

function handlePhotoLoad() {
  if (!elements.photo || !elements.stage) {
    return;
  }

  state.photoLoaded = true;
  elements.photo.hidden = false;

  if (elements.photo.naturalWidth && elements.photo.naturalHeight) {
    elements.stage.style.aspectRatio = `${elements.photo.naturalWidth} / ${elements.photo.naturalHeight}`;
  }

  updateOverlayVisibility();
  updateOverlayTransform();
  updateActionButtons();

  const fileName = elements.photo.dataset.fileName;
  if (fileName) {
    showFeedback(`Фото «${fileName}» загружено. Выберите образ или отрегулируйте посадку.`, 'success');
  } else {
    showFeedback('Фотография загружена. Выберите образ для примерки макияжа.', 'success');
  }
}

function handlePhotoError() {
  showFeedback('Не удалось загрузить изображение. Попробуйте другой файл.', 'error');
}

function openFileDialog() {
  elements.fileInput?.click();
}

function handleDropzoneClick(event) {
  if (event.target.closest('button')) {
    return;
  }
  openFileDialog();
}

function handleDropzoneKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openFileDialog();
  }
}

function handleDragOver(event) {
  event.preventDefault();
  elements.dropzone?.classList.add('upload-area--active');
}

function handleDragLeave(event) {
  if (!elements.dropzone) {
    return;
  }

  if (event.target === elements.dropzone) {
    elements.dropzone.classList.remove('upload-area--active');
  } else if (!elements.dropzone.contains(event.relatedTarget)) {
    elements.dropzone.classList.remove('upload-area--active');
  }
}

function handleDrop(event) {
  event.preventDefault();
  elements.dropzone?.classList.remove('upload-area--active');
  if (event.dataTransfer?.files?.length) {
    handleFiles(event.dataTransfer.files);
  }
}

function registerEvents() {
  elements.triggerUpload?.addEventListener('click', openFileDialog);
  elements.fileInput?.addEventListener('change', (event) => {
    const target = event.target;
    if (target.files) {
      handleFiles(target.files);
      target.value = '';
    }
  });

  elements.dropzone?.addEventListener('click', handleDropzoneClick);
  elements.dropzone?.addEventListener('keydown', handleDropzoneKeydown);
  elements.dropzone?.addEventListener('dragover', handleDragOver);
  elements.dropzone?.addEventListener('dragleave', handleDragLeave);
  elements.dropzone?.addEventListener('drop', handleDrop);

  elements.photo?.addEventListener('load', handlePhotoLoad);
  elements.photo?.addEventListener('error', handlePhotoError);

  elements.controls.forEach((control) => {
    control.addEventListener('input', handleControlInput);
  });

  elements.resetButton?.addEventListener('click', resetAdjustments);
  elements.exportButton?.addEventListener('click', exportResult);

  window.addEventListener('paste', (event) => {
    if (event.clipboardData?.files?.length) {
      handleFiles(event.clipboardData.files);
      showFeedback('Изображение вставлено из буфера обмена.', 'success');
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function exportResult() {
  if (!state.photoLoaded || !elements.photo || !elements.overlay) {
    showFeedback('Сначала загрузите фотографию и примените образ.', 'error');
    return;
  }

  const template = templates.find((item) => item.id === state.selectedTemplateId);
  if (!template) {
    showFeedback('Выберите образ для сохранения результата.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  const width = elements.photo.naturalWidth || elements.photo.clientWidth;
  const height = elements.photo.naturalHeight || elements.photo.clientHeight;

  if (!width || !height) {
    showFeedback('Не удалось определить размер изображения для экспорта.', 'error');
    return;
  }

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    showFeedback('Браузер не поддерживает экспорт холста.', 'error');
    return;
  }

  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = 'source-over';
  context.drawImage(elements.photo, 0, 0, width, height);

  const stageWidth = elements.stage?.clientWidth || width;
  const stageHeight = elements.stage?.clientHeight || height;
  const ratioX = width / stageWidth;
  const ratioY = height / stageHeight;

  context.save();
  context.translate(width / 2, height / 2);
  context.translate(state.offsetX * ratioX, state.offsetY * ratioY);
  context.rotate((state.rotation * Math.PI) / 180);
  context.scale(state.scale, state.scale);

  const layers = elements.overlay.querySelectorAll('.makeup-layer');
  layers.forEach((layer) => {
    const base = Number(layer.dataset.baseOpacity) || 1;
    const opacity = clamp(base * state.intensity, 0, 1);
    context.globalAlpha = opacity;
    const blendMode = layer.style.mixBlendMode || 'source-over';
    context.globalCompositeOperation = BLEND_TO_COMPOSITE.get(blendMode) || 'source-over';
    context.drawImage(layer, -width / 2, -height / 2, width, height);
  });

  context.restore();
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `virtual-makeup-${template.id}.png`;
  link.click();
  showFeedback('Изображение сохранено. Проверьте папку загрузок.', 'success');
}

function initialize() {
  renderTemplateCards();
  registerEvents();

  if (templates.length) {
    selectTemplate(templates[0].id, { silent: true });
  }

  showFeedback('Загрузите портрет и выберите образ, чтобы примерить макияж.', 'info');
  updateControlInputsFromState();
  updateResetAvailability();
  updateActionButtons();
}

function showFeedback(message, type = 'info') {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.textContent = message;
  elements.feedback.dataset.type = type;

  if (message) {
    elements.feedback.classList.add('app-feedback--visible');
  } else {
    elements.feedback.classList.remove('app-feedback--visible');
  }
}

initialize();
