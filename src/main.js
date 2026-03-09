import './style.css';
import { templates } from './templates.js';
import demoFaceUrl from './assets/demo-face.svg?url';

const primaryTemplate = templates[0];
const state = {
  templateId: primaryTemplate.id,
  ...createTemplateDefaults(primaryTemplate),
  hintDismissed: false
};

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Не удалось найти корневой элемент приложения.');
}

app.innerHTML = `
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="branding">
        <h1>Visage Studio</h1>
        <p>Загрузите свою фотографию и примеряйте готовые образы макияжа. Тон, тени и губы можно настроить под свои черты лица.</p>
      </div>
      <div class="header-actions">
        <label class="label-button primary-btn">
          <input type="file" accept="image/*" data-action="upload" />
          <span>Загрузить фото</span>
        </label>
        <button type="button" class="secondary-btn" data-action="demo">Демо-фото</button>
        <button type="button" class="neutral-btn" data-action="reset">Сбросить настройки</button>
      </div>
    </header>
    <main class="app-shell__body">
      <aside class="panel templates-panel" aria-label="Выбор образа">
        <div>
          <h2>Готовые образы</h2>
          <p>Выберите шаблон макияжа и настройте его интенсивность и оттенки.</p>
        </div>
        <div class="template-list" data-role="template-list"></div>
      </aside>
      <div class="workspace">
        <section class="stage" aria-label="Предпросмотр макияжа">
          <div class="stage__inner" data-role="stage-inner">
            <img class="stage__photo" src="${demoFaceUrl}" alt="Предпросмотр лица" data-role="photo" draggable="false" />
            <canvas class="stage__overlay" data-role="overlay" aria-hidden="true"></canvas>
            <div class="stage__hint" data-role="drag-hint">Перетащите макияж, чтобы подстроить позицию</div>
          </div>
          <div class="status-bar" data-role="status" aria-live="polite">Загрузите своё фото или используйте демонстрационное.</div>
        </section>
        <div class="workspace__side">
          <section class="panel controls-panel" aria-label="Настройки образа">
            <h2>Настройки образа</h2>
            <div class="control">
              <label for="control-intensity">Интенсивность макияжа</label>
              <output data-role="value-intensity">${formatIntensity(state.intensity)}</output>
              <input id="control-intensity" class="control-range" type="range" min="0" max="1" step="0.01" value="${state.intensity}" />
            </div>
            <div class="control">
              <label for="control-scale">Масштаб шаблона</label>
              <output data-role="value-scale">${formatScale(state.scale)}</output>
              <input id="control-scale" class="control-range" type="range" min="0.8" max="1.3" step="0.01" value="${state.scale}" />
            </div>
            <div class="control">
              <label for="control-rotation">Поворот</label>
              <output data-role="value-rotation">${formatRotation(state.rotation)}</output>
              <input id="control-rotation" class="control-range" type="range" min="-15" max="15" step="0.5" value="${state.rotation}" />
            </div>
            <div class="control">
              <label for="control-warmth">Баланс оттенка</label>
              <output data-role="value-warmth">${formatWarmth(state.warmth)}</output>
              <input id="control-warmth" class="control-range" type="range" min="-0.5" max="0.5" step="0.01" value="${state.warmth}" />
            </div>
            <div class="control">
              <label for="control-exposure">Экспозиция</label>
              <output data-role="value-exposure">${formatExposure(state.exposure)}</output>
              <input id="control-exposure" class="control-range" type="range" min="-0.3" max="0.3" step="0.01" value="${state.exposure}" />
            </div>
          </section>
          <section class="variant-panel" data-role="variant-panel" aria-label="Вариации оттенков">
            <h2>Вариации оттенков</h2>
            <div class="variant-list" data-role="variant-list"></div>
            <p class="variant-item__description" data-role="variant-description"></p>
          </section>
          <section class="template-meta" aria-live="polite">
            <h2 data-role="template-name"></h2>
            <p class="template-meta__text" data-role="template-description"></p>
            <ul class="template-meta__tags" data-role="template-tags"></ul>
          </section>
        </div>
      </div>
    </main>
  </div>
`;

const templateList = app.querySelector('[data-role="template-list"]');
const variantPanel = app.querySelector('[data-role="variant-panel"]');
const variantList = app.querySelector('[data-role="variant-list"]');
const variantDescription = app.querySelector('[data-role="variant-description"]');
const templateName = app.querySelector('[data-role="template-name"]');
const templateDescription = app.querySelector('[data-role="template-description"]');
const templateTags = app.querySelector('[data-role="template-tags"]');
const statusBar = app.querySelector('[data-role="status"]');
const stageInner = app.querySelector('[data-role="stage-inner"]');
const stageHint = app.querySelector('[data-role="drag-hint"]');
const photoElement = app.querySelector('[data-role="photo"]');
const overlayCanvas = app.querySelector('[data-role="overlay"]');
const uploadInput = app.querySelector('input[data-action="upload"]');
const demoButton = app.querySelector('button[data-action="demo"]');
const resetButton = app.querySelector('button[data-action="reset"]');

if (!templateList || !variantPanel || !variantList || !templateName || !templateDescription || !templateTags || !statusBar || !stageInner || !stageHint || !photoElement || !overlayCanvas || !uploadInput || !demoButton || !resetButton) {
  throw new Error('Не удалось инициализировать интерфейс приложения.');
}

const overlayContext = overlayCanvas.getContext('2d', { alpha: true });

if (!overlayContext) {
  throw new Error('Браузер не поддерживает 2D-контекст для canvas.');
}

const controlElements = {
  intensity: {
    input: document.getElementById('control-intensity'),
    output: app.querySelector('[data-role="value-intensity"]')
  },
  scale: {
    input: document.getElementById('control-scale'),
    output: app.querySelector('[data-role="value-scale"]')
  },
  rotation: {
    input: document.getElementById('control-rotation'),
    output: app.querySelector('[data-role="value-rotation"]')
  },
  warmth: {
    input: document.getElementById('control-warmth'),
    output: app.querySelector('[data-role="value-warmth"]')
  },
  exposure: {
    input: document.getElementById('control-exposure'),
    output: app.querySelector('[data-role="value-exposure"]')
  }
};

Object.values(controlElements).forEach(({ input, output }) => {
  if (!input || !output) {
    throw new Error('Элемент управления не найден на странице.');
  }
});

buildTemplateCards();
selectTemplate(state.templateId, { reset: true, silent: true });
setupVariantInteractions();
updateTemplateMeta();
updateControlsFromState();
initializeCanvas();
renderAll();

uploadInput.addEventListener('change', handleUpload);
demoButton.addEventListener('click', () => {
  revokeObjectUrl();
  photoElement.src = demoFaceUrl;
  state.hintDismissed = false;
  stageHint.classList.remove('is-hidden');
  setStatus('Загружено демонстрационное фото.', 'success');
});

resetButton.addEventListener('click', () => {
  const template = getCurrentTemplate();
  if (!template) return;
  applyTemplateDefaults(template);
  updateControlsFromState();
  state.hintDismissed = false;
  stageHint.classList.remove('is-hidden');
  renderAll();
  setStatus('Настройки образа сброшены.', 'success');
});

stageInner.addEventListener('pointerdown', onPointerDown);
stageInner.addEventListener('pointermove', onPointerMove);
stageInner.addEventListener('pointerup', onPointerUp);
stageInner.addEventListener('pointercancel', onPointerUp);
stageInner.addEventListener('pointerleave', () => {
  if (dragState.isActive) {
    onPointerUp();
  }
});

photoElement.addEventListener('load', handlePhotoLoad);
photoElement.addEventListener('error', () => {
  revokeObjectUrl();
  setStatus('Не удалось загрузить изображение. Попробуйте другой файл.', 'warning');
});

function buildTemplateCards() {
  templateList.innerHTML = '';

  templates.forEach((template) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.dataset.id = template.id;
    card.setAttribute('aria-pressed', template.id === state.templateId ? 'true' : 'false');

    const preview = document.createElement('span');
    preview.className = 'template-card__preview';
    preview.style.setProperty('--preview', template.preview);

    const content = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'template-card__title';
    title.textContent = template.name;

    const description = document.createElement('p');
    description.className = 'template-card__description';
    description.textContent = template.description;

    content.append(title, description);
    card.append(preview, content);

    card.addEventListener('click', () => {
      if (state.templateId === template.id) {
        return;
      }

      selectTemplate(template.id, { reset: true });
      setStatus(`Применён образ «${template.name}».`, 'success');
    });

    templateList.append(card);
  });
}

function setupVariantInteractions() {
  variantList.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('.variant-item') : null;
    if (!button) return;

    const { variant: variantId } = button.dataset;
    if (!variantId || variantId === state.variantId) {
      return;
    }

    state.variantId = variantId;
    updateVariantActiveState();
    renderAll();

    const variant = getCurrentVariant();
    if (variant) {
      setStatus(`Выбрана вариация «${variant.name}».`, 'success');
    }
  });
}

function selectTemplate(templateId, { reset = false, silent = false } = {}) {
  const template = templates.find((item) => item.id === templateId);
  if (!template) {
    console.warn(`Шаблон с идентификатором ${templateId} не найден.`);
    return;
  }

  state.templateId = template.id;

  if (reset) {
    applyTemplateDefaults(template);
    updateControlsFromState();
  }

  updateTemplateCards();
  updateVariantPanel();
  updateTemplateMeta();
  renderAll();

  if (!silent) {
    const variant = getCurrentVariant();
    if (variant) {
      setStatus(`Применён образ «${template.name}» – вариация «${variant.name}».`, 'success');
    } else {
      setStatus(`Применён образ «${template.name}».`, 'success');
    }
  }
}

function updateTemplateCards() {
  const cards = templateList.querySelectorAll('.template-card');
  cards.forEach((card) => {
    const isActive = card.dataset.id === state.templateId;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function updateVariantPanel() {
  const template = getCurrentTemplate();
  const variants = template?.variants ?? [];

  if (!variants.length) {
    variantPanel.hidden = true;
    variantList.innerHTML = '';
    variantDescription.textContent = '';
    return;
  }

  variantPanel.hidden = false;
  variantList.innerHTML = '';

  variants.forEach((variant) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'variant-item';
    button.dataset.variant = variant.id;
    button.setAttribute('aria-pressed', variant.id === state.variantId ? 'true' : 'false');

    const preview = document.createElement('span');
    preview.className = 'variant-item__preview';
    const [a, b, c] = variant.preview ?? [];
    preview.style.setProperty('--swatch-a', a ?? '#d1d5ff');
    preview.style.setProperty('--swatch-b', b ?? a ?? '#fbcfe8');
    preview.style.setProperty('--swatch-c', c ?? b ?? a ?? '#fde68a');

    const title = document.createElement('span');
    title.className = 'variant-item__title';
    title.textContent = variant.name;

    button.append(preview, title);
    variantList.append(button);
  });

  updateVariantActiveState();
  updateVariantDescription();
}

function updateVariantActiveState() {
  const buttons = variantList.querySelectorAll('.variant-item');
  buttons.forEach((button) => {
    const isActive = button.dataset.variant === state.variantId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  updateVariantDescription();
}

function updateVariantDescription() {
  const variant = getCurrentVariant();
  variantDescription.textContent = variant?.description ?? '';
}

function updateTemplateMeta() {
  const template = getCurrentTemplate();
  if (!template) {
    return;
  }

  templateName.textContent = template.name;
  templateDescription.textContent = template.description;
  templateTags.innerHTML = '';

  template.tags?.forEach((tag) => {
    const item = document.createElement('li');
    item.className = 'template-meta__tag';
    item.textContent = tag;
    templateTags.append(item);
  });
}

function updateControlsFromState() {
  controlElements.intensity.input.value = String(state.intensity);
  controlElements.intensity.output.textContent = formatIntensity(state.intensity);

  controlElements.scale.input.value = String(state.scale);
  controlElements.scale.output.textContent = formatScale(state.scale);

  controlElements.rotation.input.value = String(state.rotation);
  controlElements.rotation.output.textContent = formatRotation(state.rotation);

  controlElements.warmth.input.value = String(state.warmth);
  controlElements.warmth.output.textContent = formatWarmth(state.warmth);

  controlElements.exposure.input.value = String(state.exposure);
  controlElements.exposure.output.textContent = formatExposure(state.exposure);
}

controlElements.intensity.input.addEventListener('input', (event) => {
  const value = Number.parseFloat(event.target.value);
  if (Number.isFinite(value)) {
    state.intensity = clamp(value, 0, 1);
    controlElements.intensity.output.textContent = formatIntensity(state.intensity);
    renderAll();
  }
});

controlElements.scale.input.addEventListener('input', (event) => {
  const value = Number.parseFloat(event.target.value);
  if (Number.isFinite(value)) {
    state.scale = clamp(value, 0.6, 1.5);
    controlElements.scale.output.textContent = formatScale(state.scale);
    renderAll();
  }
});

controlElements.rotation.input.addEventListener('input', (event) => {
  const value = Number.parseFloat(event.target.value);
  if (Number.isFinite(value)) {
    state.rotation = clamp(value, -30, 30);
    controlElements.rotation.output.textContent = formatRotation(state.rotation);
    renderAll();
  }
});

controlElements.warmth.input.addEventListener('input', (event) => {
  const value = Number.parseFloat(event.target.value);
  if (Number.isFinite(value)) {
    state.warmth = clamp(value, -1, 1);
    controlElements.warmth.output.textContent = formatWarmth(state.warmth);
    updateImageFilter();
  }
});

controlElements.exposure.input.addEventListener('input', (event) => {
  const value = Number.parseFloat(event.target.value);
  if (Number.isFinite(value)) {
    state.exposure = clamp(value, -0.5, 0.5);
    controlElements.exposure.output.textContent = formatExposure(state.exposure);
    updateImageFilter();
  }
});

function initializeCanvas() {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const ratio = window.devicePixelRatio || 1;
      overlayCanvas.width = Math.max(1, Math.round(width * ratio));
      overlayCanvas.height = Math.max(1, Math.round(height * ratio));
      overlayCanvas.style.width = `${width}px`;
      overlayCanvas.style.height = `${height}px`;
      overlayContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderAll();
    }
  });

  resizeObserver.observe(stageInner);
}

function renderAll() {
  drawOverlay();
  updateImageFilter();
}

function drawOverlay() {
  const template = getCurrentTemplate();
  if (!template) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  overlayContext.setTransform(1, 0, 0, 1, 0, 0);
  overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  overlayContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = overlayCanvas.width / ratio;
  const height = overlayCanvas.height / ratio;

  if (width === 0 || height === 0) {
    return;
  }

  const variant = getCurrentVariant();

  overlayContext.save();
  overlayContext.translate(width / 2 + state.offset.x * width, height / 2 + state.offset.y * height);
  overlayContext.rotate((state.rotation * Math.PI) / 180);
  overlayContext.scale(state.scale, state.scale);
  overlayContext.translate(-width / 2, -height / 2);

  template.overlays.forEach((layer) => {
    const color = resolveLayerColor(layer, variant);
    const opacity = resolveLayerOpacity(layer, variant);

    if (!color || opacity <= 0) {
      return;
    }

    overlayContext.save();
    overlayContext.globalAlpha = opacity;
    overlayContext.globalCompositeOperation = layer.blend ?? 'source-over';

    if (layer.blur) {
      const blurRadius = (layer.blur * Math.max(width, height)).toFixed(2);
      overlayContext.filter = `blur(${blurRadius}px)`;
    } else {
      overlayContext.filter = 'none';
    }

    drawLayer(overlayContext, layer, width, height, color);
    overlayContext.restore();
  });

  overlayContext.restore();
  overlayContext.setTransform(1, 0, 0, 1, 0, 0);
}

function drawLayer(ctx, layer, width, height, color) {
  const x = layer.x * width;
  const y = layer.y * height;
  const rx = (layer.rx ?? 0) * width;
  const ry = (layer.ry ?? 0) * height;
  const rotation = ((layer.rotation ?? 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  if (rotation) {
    ctx.rotate(rotation);
  }

  if (layer.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    if (layer.stroke) {
      ctx.lineWidth = (layer.stroke ?? 0.005) * Math.max(width, height);
      ctx.strokeStyle = color;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
  } else if (layer.type === 'rect') {
    const w = (layer.width ?? 0.1) * width;
    const h = (layer.height ?? 0.05) * height;
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

function resolveLayerColor(layer, variant) {
  if (variant?.roles && layer.group && variant.roles[layer.group]) {
    return variant.roles[layer.group];
  }
  return layer.color ?? null;
}

function resolveLayerOpacity(layer, variant) {
  const baseOpacity = layer.opacity ?? 1;
  const groupMultiplier = variant?.intensity?.[layer.group] ?? 1;
  return clamp(baseOpacity * state.intensity * groupMultiplier, 0, 1);
}

function updateImageFilter() {
  const template = getCurrentTemplate();
  if (!template) {
    return;
  }

  const filters = template.filters ?? {};
  const brightness = clamp((filters.brightness ?? 1) * (1 + state.exposure), 0.2, 2).toFixed(2);
  const contrast = clamp(filters.contrast ?? 1, 0.5, 2).toFixed(2);
  const saturate = clamp(filters.saturate ?? 1, 0.5, 2).toFixed(2);
  const warmth = (filters.warmth ?? 0) + state.warmth;
  const sepia = filters.sepia ?? 0;

  const parts = [
    `brightness(${brightness})`,
    `contrast(${contrast})`,
    `saturate(${saturate})`
  ];

  if (sepia > 0) {
    parts.push(`sepia(${sepia})`);
  }

  if (Math.abs(warmth) > 0.001) {
    parts.push(`hue-rotate(${(warmth * 45).toFixed(1)}deg)`);
  }

  photoElement.style.filter = parts.join(' ');
}

function handleUpload(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    setStatus('Можно загрузить только изображение.', 'warning');
    input.value = '';
    return;
  }

  revokeObjectUrl();
  const objectUrl = URL.createObjectURL(file);
  photoElement.src = objectUrl;
  photoElement.dataset.objectUrl = objectUrl;
  state.hintDismissed = false;
  stageHint.classList.remove('is-hidden');
  setStatus(`Загружено фото: ${file.name}`, 'success');
  input.value = '';
}

function handlePhotoLoad() {
  const { naturalWidth, naturalHeight } = photoElement;
  if (Number.isFinite(naturalWidth) && Number.isFinite(naturalHeight) && naturalWidth > 0 && naturalHeight > 0) {
    stageInner.style.aspectRatio = `${naturalWidth} / ${naturalHeight}`;
  } else {
    stageInner.style.aspectRatio = '3 / 4';
  }

  if (photoElement.dataset.objectUrl) {
    revokeObjectUrl();
  }

  renderAll();
}

const dragState = {
  isActive: false,
  pointerId: null,
  origin: { x: 0, y: 0 },
  offset: { x: 0, y: 0 }
};

function onPointerDown(event) {
  dragState.isActive = true;
  dragState.pointerId = event.pointerId;
  dragState.origin = { x: event.clientX, y: event.clientY };
  dragState.offset = { ...state.offset };
  stageInner.setPointerCapture(event.pointerId);
  stageInner.classList.add('is-dragging');

  if (!state.hintDismissed) {
    state.hintDismissed = true;
    stageHint.classList.add('is-hidden');
  }
}

function onPointerMove(event) {
  if (!dragState.isActive || event.pointerId !== dragState.pointerId) {
    return;
  }

  const rect = stageInner.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const dx = (event.clientX - dragState.origin.x) / rect.width;
  const dy = (event.clientY - dragState.origin.y) / rect.height;

  state.offset = {
    x: clamp(dragState.offset.x + dx, -0.5, 0.5),
    y: clamp(dragState.offset.y + dy, -0.5, 0.5)
  };

  drawOverlay();
}

function onPointerUp() {
  if (!dragState.isActive) {
    return;
  }

  if (dragState.pointerId !== null) {
    try {
      stageInner.releasePointerCapture(dragState.pointerId);
    } catch (error) {
      // ignore capture release errors
    }
  }

  dragState.isActive = false;
  dragState.pointerId = null;
  stageInner.classList.remove('is-dragging');
}

function setStatus(message, status) {
  statusBar.textContent = message;
  if (status) {
    statusBar.dataset.status = status;
  } else {
    delete statusBar.dataset.status;
  }
}

function getCurrentTemplate() {
  return templates.find((template) => template.id === state.templateId) ?? null;
}

function getCurrentVariant() {
  const template = getCurrentTemplate();
  if (!template) {
    return null;
  }
  const variants = template.variants ?? [];
  if (!variants.length) {
    return null;
  }
  return variants.find((variant) => variant.id === state.variantId) ?? variants[0] ?? null;
}

function applyTemplateDefaults(template) {
  const defaults = createTemplateDefaults(template);
  state.intensity = defaults.intensity;
  state.scale = defaults.scale;
  state.rotation = defaults.rotation;
  state.warmth = defaults.warmth;
  state.exposure = defaults.exposure;
  state.offset = { ...defaults.offset };
  state.variantId = defaults.variantId;
}

function revokeObjectUrl() {
  const objectUrl = photoElement.dataset.objectUrl;
  if (!objectUrl) {
    return;
  }

  URL.revokeObjectURL(objectUrl);
  delete photoElement.dataset.objectUrl;
}

function createTemplateDefaults(template) {
  const defaults = template.defaults ?? {};
  return {
    intensity: defaults.intensity ?? 0.85,
    scale: defaults.scale ?? 1,
    rotation: defaults.rotation ?? 0,
    warmth: defaults.warmth ?? 0,
    exposure: defaults.exposure ?? 0,
    offset: {
      x: defaults.offsetX ?? 0,
      y: defaults.offsetY ?? 0
    },
    variantId:
      template.defaultVariant ??
      defaults.variantId ??
      (Array.isArray(template.variants) && template.variants.length ? template.variants[0].id : null)
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatIntensity(value) {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function formatScale(value) {
  return `${Math.round(clamp(value, 0.5, 1.8) * 100)}%`;
}

function formatRotation(value) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}°`;
}

function formatWarmth(value) {
  const degrees = Math.round(value * 45);
  const sign = degrees > 0 ? '+' : '';
  return `${sign}${degrees}°`;
}

function formatExposure(value) {
  const percent = Math.round(value * 100);
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
}
