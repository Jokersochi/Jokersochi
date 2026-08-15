import './style.css';
import { templates } from './templates.js';
import demoPortraitUrl from './assets/demo-portrait.png?url';
import { analyzeFace, detectFace, renderMakeup } from './makeup-engine.js';

const STORAGE_KEY = 'visage-studio-session-v3';
const primaryTemplate = templates[0];

const GROUPS = [
  { id: 'base', label: 'Кожа', sublabel: 'Румянец, сияние и контур', layers: ['blush', 'contour', 'highlight'], defaultValue: 0.76 },
  { id: 'eyes', label: 'Глаза', sublabel: 'Тени и линия ресниц', layers: ['shadow', 'liner'], defaultValue: 0.78 },
  { id: 'lips', label: 'Губы', sublabel: 'Цвет и мягкий блеск', layers: ['lips'], defaultValue: 0.74 }
];

const ICONS = {
  sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.35 6.65L20 10l-6.65 1.35L12 18l-1.35-6.65L4 10l6.65-1.35L12 2Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.2"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 1 1 1.9 8.2M4 4v5h5"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68M4 4v4.68h4.68"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.7A8.5 8.5 0 0 1 8.3 3.5 8.5 8.5 0 1 0 20.5 15.7Z"/></svg>',
  sunSmall: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.25"/><path d="M12 2.5v2M12 19.5v2M4.88 4.88l1.42 1.42M17.7 17.7l1.42 1.42M2.5 12h2M19.5 12h2M4.88 19.12l1.42-1.42M17.7 6.3l1.42-1.42"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5.2c0 4.4-2.9 7.9-7 9.8-4.1-1.9-7-5.4-7-9.8V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>'
};

const icon = (name) => ICONS[name] ?? '';
const app = document.querySelector('#app');

if (!app) {
  throw new Error('Не удалось найти корневой элемент приложения.');
}

const savedSession = readSession();
const savedTemplate = templates.find((item) => item.id === savedSession?.templateId) ?? primaryTemplate;

const state = {
  templateId: savedTemplate.id,
  ...createTemplateDefaults(savedTemplate),
  groupMix: createGroupMix(savedSession?.groupMix),
  visibleGroups: createVisibleGroups(savedSession?.visibleGroups),
  activeTab: 'look',
  activeFilter: 'all',
  showBefore: false,
  hintDismissed: false,
  zoom: 1,
  photoMode: 'demo',
  photoFileName: '',
  photoObjectUrl: '',
  face: analyzeFace(1122, 1402),
  faceStatus: 'estimated'
};

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Visage Studio — начало">
        <span class="brand__mark">${icon('sparkle')}</span>
        <span class="brand__wordmark"><strong>VISAGE</strong><em>Studio</em></span>
      </a>
      <nav class="topnav" aria-label="Основная навигация">
        <a class="topnav__link is-active" href="#workspace">Рабочее место</a>
        <a class="topnav__link" href="#guidance">Как получить точнее</a>
      </nav>
      <div class="topbar__actions">
        <span class="privacy-chip">${icon('shield')} Фото остаётся в браузере</span>
        <button class="icon-button" type="button" data-action="theme" aria-label="Переключить тему">${icon('moon')}</button>
      </div>
    </header>

    <section class="hero" id="top">
      <div class="hero__copy">
        <p class="eyebrow"><span class="eyebrow__dot"></span>Визажистский рабочий стол</p>
        <h1>Макияж, который<br /><span>выглядит как ваш.</span></h1>
        <p class="hero__lede">Соберите образ на своём фото, сравните «до и после» и скачайте аккуратный результат. Без регистрации и без отправки фотографии на сервер.</p>
      </div>
      <div class="hero__actions">
        <label class="button button--primary button--large">
          <input type="file" accept="image/*" data-action="upload" />
          ${icon('upload')}<span>Добавить фото</span>
        </label>
        <button class="button button--ghost button--large" type="button" data-action="demo">Открыть демо</button>
      </div>
    </section>

    <main class="app-shell__body" id="workspace">
      <aside class="panel library-panel" aria-label="Библиотека образов">
        <div class="panel__heading">
          <div>
            <p class="panel__kicker">01 / LOOKS</p>
            <h2>Выберите направление</h2>
          </div>
          <span class="panel__count">${templates.length} образа</span>
        </div>
        <p class="panel__intro">Готовые палитры для разных задач — от свежего дневного света до съёмки.</p>
        <div class="filter-tabs" role="tablist" aria-label="Фильтр образов">
          <button type="button" class="filter-tab is-active" data-filter="all" role="tab" aria-selected="true">Все</button>
          <button type="button" class="filter-tab" data-filter="day" role="tab" aria-selected="false">День</button>
          <button type="button" class="filter-tab" data-filter="evening" role="tab" aria-selected="false">Вечер</button>
        </div>
        <div class="template-list" data-role="template-list"></div>
        <div class="library-note">
          <span class="library-note__icon">${icon('sparkle')}</span>
          <div><strong>Подсказка</strong><p>Начните с умеренной интенсивности, а затем добавляйте цвет.</p></div>
        </div>
      </aside>

      <section class="workspace" aria-label="Рабочая область">
        <div class="workspace__header">
          <div>
            <p class="panel__kicker">02 / PREVIEW</p>
            <h2 data-role="template-name">${savedTemplate.name}</h2>
          </div>
          <div class="workspace__actions">
            <span class="live-badge"><span></span>Локальная обработка</span>
            <button class="button button--soft" type="button" data-action="download">${icon('download')} Скачать результат</button>
          </div>
        </div>

        <section class="stage" aria-label="Предпросмотр образа">
          <div class="stage__frame" data-role="stage-frame" data-mode="demo">
            <div class="stage__grid" aria-hidden="true"></div>
            <img class="stage__photo" src="${demoPortraitUrl}" alt="Демонстрационный портрет" data-role="photo" draggable="false" />
            <canvas class="stage__overlay" data-role="overlay" aria-hidden="true"></canvas>
            <div class="stage__caption"><span class="stage__caption-dot"></span><span data-role="photo-label">Демонстрационный портрет</span></div>
            <div class="stage__hint" data-role="drag-hint">Потяните изображение, чтобы выровнять образ</div>
            <div class="stage__empty" data-role="stage-empty" hidden>
              <span class="stage__empty-icon">${icon('upload')}</span>
              <strong>Добавьте портрет</strong>
              <span>Лучше всего работает фронтальный снимок при мягком свете.</span>
              <label class="button button--light"><input type="file" accept="image/*" data-action="upload" />${icon('upload')} Выбрать фото</label>
            </div>
          </div>
          <div class="stage__toolbar">
            <div class="stage__toolbar-group">
              <button class="tool-button" type="button" data-action="before" aria-pressed="false"><span class="tool-button__icon">${icon('eye')}</span><span data-role="before-label">До / После</span></button>
              <button class="tool-button" type="button" data-action="center">${icon('reset')} Центрировать</button>
            </div>
            <div class="stage__toolbar-group stage__zoom">
              <button class="zoom-button" type="button" data-action="zoom-out" aria-label="Уменьшить">−</button>
              <span data-role="zoom-label">100%</span>
              <button class="zoom-button" type="button" data-action="zoom-in" aria-label="Увеличить">+</button>
            </div>
          </div>
          <div class="status-line" data-role="status" data-status="neutral" aria-live="polite"><span class="status-line__dot"></span><span data-role="status-text">Добавьте фото или используйте демо‑портрет.</span></div>
        </section>

        <div class="insight-grid" id="guidance">
          <article class="insight-card insight-card--readiness">
            <div class="insight-card__icon">${icon('check')}</div>
            <div><p class="insight-card__label">Готовность фото</p><strong data-role="readiness-title">Демо‑портрет готов</strong><span data-role="readiness-text">Можно сразу выбирать образ</span></div>
          </article>
          <article class="insight-card">
            <div class="insight-card__icon insight-card__icon--warm">${icon('sparkle')}</div>
            <div><p class="insight-card__label">Для точного результата</p><strong>Свет прямо на лицо</strong><span>Без сильных теней и фильтров камеры</span></div>
          </article>
        </div>
      </section>

      <aside class="panel inspector-panel" aria-label="Настройки образа">
        <div class="inspector__top">
          <div><p class="panel__kicker">03 / REFINE</p><h2>Настройте образ</h2></div>
          <button class="icon-button icon-button--small" type="button" data-action="reset" aria-label="Сбросить настройки">${icon('reset')}</button>
        </div>
        <div class="inspector-tabs" role="tablist" aria-label="Разделы настроек">
          <button class="inspector-tab is-active" type="button" data-tab="look" role="tab" aria-selected="true">Образ</button>
          <button class="inspector-tab" type="button" data-tab="photo" role="tab" aria-selected="false">Фото</button>
        </div>
        <div class="inspector-panel__content" data-tab-panel="look">
          <div class="control-section">
            <div class="control-section__heading"><div><p class="panel__kicker">MIX</p><h3>Слои образа</h3></div><span class="control-section__hint">Включить / смягчить</span></div>
            <div class="group-list" data-role="group-list"></div>
          </div>
          <div class="control-section control-section--compact">
            <div class="control-section__heading"><div><p class="panel__kicker">TONE</p><h3>Вариант оттенка</h3></div></div>
            <div class="variant-list" data-role="variant-list"></div>
            <p class="variant-description" data-role="variant-description"></p>
          </div>
          <div class="control-section control-section--compact">
            <div class="control-section__heading"><div><p class="panel__kicker">FINISH</p><h3>Общая интенсивность</h3></div><output data-role="value-intensity">82%</output></div>
            <input class="range range--accent" data-control="intensity" type="range" min="0" max="1" step="0.01" value="0.82" aria-label="Общая интенсивность" />
            <div class="range-labels"><span>Естественно</span><span>Выразительно</span></div>
          </div>
        </div>
        <div class="inspector-panel__content" data-tab-panel="photo" hidden>
          <div class="photo-guidance">
            <div class="photo-guidance__hero"><span>${icon('sun')}</span><div><strong>Подготовьте хороший кадр</strong><p>Так макияж будет выглядеть ближе к реальному результату.</p></div></div>
            <ul class="guidance-list"><li>${icon('check')}Лицо прямо в камеру</li><li>${icon('check')}Ровный мягкий свет</li><li>${icon('check')}Без очков и сильных фильтров</li><li>${icon('check')}Минимум 720 px по ширине</li></ul>
            <div class="privacy-box">${icon('shield')}<span>Фото не загружается на сервер и исчезает после закрытия вкладки.</span></div>
          </div>
        </div>
        <div class="inspector__footer"><span>${icon('sparkle')} Тонкая настройка без лишнего</span><span class="keyboard-hint">B — сравнение</span></div>
      </aside>
    </main>
    <div class="toast" data-role="toast" role="status" aria-live="polite"></div>
  </div>
`;

const templateList = app.querySelector('[data-role="template-list"]');
const groupList = app.querySelector('[data-role="group-list"]');
const variantList = app.querySelector('[data-role="variant-list"]');
const variantDescription = app.querySelector('[data-role="variant-description"]');
const templateName = app.querySelector('[data-role="template-name"]');
const statusText = app.querySelector('[data-role="status-text"]');
const statusLine = app.querySelector('[data-role="status"]');
const stageFrame = app.querySelector('[data-role="stage-frame"]');
const stageHint = app.querySelector('[data-role="drag-hint"]');
const stageEmpty = app.querySelector('[data-role="stage-empty"]');
const photoLabel = app.querySelector('[data-role="photo-label"]');
const photoElement = app.querySelector('[data-role="photo"]');
const overlayCanvas = app.querySelector('[data-role="overlay"]');
const overlayContext = overlayCanvas?.getContext('2d', { alpha: true });
const readinessTitle = app.querySelector('[data-role="readiness-title"]');
const readinessText = app.querySelector('[data-role="readiness-text"]');
const zoomLabel = app.querySelector('[data-role="zoom-label"]');
const beforeLabel = app.querySelector('[data-role="before-label"]');
const toast = app.querySelector('[data-role="toast"]');

if (!templateList || !groupList || !variantList || !variantDescription || !templateName || !statusText || !statusLine || !stageFrame || !stageHint || !stageEmpty || !photoElement || !overlayCanvas || !overlayContext) {
  throw new Error('Не удалось инициализировать рабочую область Visage Studio.');
}

const intensityInput = app.querySelector('[data-control="intensity"]');
const dragState = { isActive: false, pointerId: null, origin: { x: 0, y: 0 }, offset: { x: 0, y: 0 } };
let toastTimer;
let renderFrame = null;

buildTemplateCards();
buildGroupControls();
selectTemplate(state.templateId, { reset: false, silent: true });
setupInteractions();
initializeCanvas();
updatePhotoUi();
updateZoomUi();
renderAll();

function setupInteractions() {
  app.addEventListener('click', handleClick);
  app.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-action="upload"]');
    if (input) handleUpload(event);
  });
  intensityInput.addEventListener('input', (event) => {
    state.intensity = clamp(Number.parseFloat(event.target.value), 0, 1);
    app.querySelector('[data-role="value-intensity"]').textContent = formatPercent(state.intensity);
    scheduleRender();
  });
  stageFrame.addEventListener('pointerdown', onPointerDown);
  stageFrame.addEventListener('pointermove', onPointerMove);
  stageFrame.addEventListener('pointerup', onPointerUp);
  stageFrame.addEventListener('pointercancel', onPointerUp);
  stageFrame.addEventListener('pointerleave', () => { if (dragState.isActive) onPointerUp(); });
  photoElement.addEventListener('load', handlePhotoLoad);
  photoElement.addEventListener('error', () => {
    setStatus('Не удалось загрузить это изображение. Попробуйте другой файл.', 'warning');
    updatePhotoUi();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      downloadResult();
    }
    if (event.key.toLowerCase() === 'b' && !isTypingTarget(event.target)) toggleBeforeAfter();
    if (event.key === 'Escape' && state.showBefore) toggleBeforeAfter(false);
  });
}

function handleClick(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    if (action === 'demo') loadDemoPhoto();
    if (action === 'reset') resetLook();
    if (action === 'before') toggleBeforeAfter();
    if (action === 'center') centerStage();
    if (action === 'zoom-in') setZoom(state.zoom + 0.1);
    if (action === 'zoom-out') setZoom(state.zoom - 0.1);
    if (action === 'download') downloadResult();
    if (action === 'theme') toggleTheme();
  }

  const filter = event.target.closest('[data-filter]');
  if (filter) setFilter(filter.dataset.filter);

  const tab = event.target.closest('[data-tab]');
  if (tab) setActiveTab(tab.dataset.tab);
}

function buildTemplateCards() {
  templateList.innerHTML = '';
  templates.forEach((template, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.dataset.id = template.id;
    card.dataset.filter = index === 0 ? 'day' : index === 1 ? 'evening' : 'day';
    card.setAttribute('aria-pressed', template.id === state.templateId ? 'true' : 'false');
    card.innerHTML = `<span class="template-card__preview" style="--preview:${template.preview}"><span class="template-card__index">0${index + 1}</span><span class="template-card__arrow">${icon('arrow')}</span></span><span class="template-card__body"><strong>${escapeHtml(template.name)}</strong><span>${escapeHtml(template.tags?.[0] ?? 'Персональный образ')}</span></span>`;
    card.addEventListener('click', () => {
      if (state.templateId === template.id) return;
      selectTemplate(template.id);
      setStatus(`Образ «${template.name}» применён.`, 'success');
    });
    templateList.append(card);
  });
  updateTemplateCards();
}

function buildGroupControls() {
  groupList.innerHTML = '';
  GROUPS.forEach((group) => {
    const row = document.createElement('div');
    row.className = 'group-control';
    row.dataset.group = group.id;
    row.innerHTML = `<div class="group-control__top"><button type="button" class="group-toggle" data-group-toggle="${group.id}" aria-pressed="${state.visibleGroups[group.id] ? 'true' : 'false'}"><span class="group-toggle__dot"></span><span><strong>${group.label}</strong><small>${group.sublabel}</small></span></button><output data-group-output="${group.id}">${formatPercent(state.groupMix[group.id])}</output></div><input class="range" data-group-input="${group.id}" type="range" min="0" max="1" step="0.01" value="${state.groupMix[group.id]}" aria-label="Интенсивность: ${group.label}" />`;
    const input = row.querySelector('[data-group-input]');
    const toggle = row.querySelector('[data-group-toggle]');
    input.addEventListener('input', (event) => {
      state.groupMix[group.id] = clamp(Number.parseFloat(event.target.value), 0, 1);
      row.querySelector('[data-group-output]').textContent = formatPercent(state.groupMix[group.id]);
      scheduleRender();
    });
    toggle.addEventListener('click', () => {
      state.visibleGroups[group.id] = !state.visibleGroups[group.id];
      toggle.setAttribute('aria-pressed', String(state.visibleGroups[group.id]));
      row.classList.toggle('is-muted', !state.visibleGroups[group.id]);
      scheduleRender();
    });
    groupList.append(row);
  });
}

function updateVariantPanel() {
  const template = getCurrentTemplate();
  const variants = template?.variants ?? [];
  variantList.innerHTML = '';
  variants.forEach((variant) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'variant-item';
    button.dataset.variant = variant.id;
    button.setAttribute('aria-pressed', variant.id === state.variantId ? 'true' : 'false');
    const [a, b, c] = variant.preview ?? [];
    button.innerHTML = `<span class="variant-item__swatch" style="--swatch-a:${a ?? '#d1d5ff'};--swatch-b:${b ?? a ?? '#fbcfe8'};--swatch-c:${c ?? b ?? a ?? '#fde68a'}"></span><span class="variant-item__name">${escapeHtml(variant.name)}</span><span class="variant-item__check">${icon('check')}</span>`;
    button.addEventListener('click', () => {
      state.variantId = variant.id;
      updateVariantActiveState();
      scheduleRender();
      setStatus(`Оттенок «${variant.name}» выбран.`, 'success');
    });
    variantList.append(button);
  });
  updateVariantActiveState();
}

function updateVariantActiveState() {
  variantList.querySelectorAll('.variant-item').forEach((button) => {
    const isActive = button.dataset.variant === state.variantId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  const variant = getCurrentVariant();
  variantDescription.textContent = variant?.description ?? '';
}

function selectTemplate(templateId, { reset = true, silent = false } = {}) {
  const template = templates.find((item) => item.id === templateId);
  if (!template) return;
  const apply = () => {
    state.templateId = template.id;
    if (reset) applyTemplateDefaults(template);
    updateTemplateCards();
    updateVariantPanel();
    templateName.textContent = template.name;
    intensityInput.value = String(state.intensity);
    app.querySelector('[data-role="value-intensity"]').textContent = formatPercent(state.intensity);
    scheduleRender();
  };
  if (!silent && document.startViewTransition) document.startViewTransition(apply);
  else apply();
}

function updateTemplateCards() {
  templateList.querySelectorAll('.template-card').forEach((card) => {
    const isActive = card.dataset.id === state.templateId;
    const visible = state.activeFilter === 'all' || card.dataset.filter === state.activeFilter;
    card.hidden = !visible;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

function setFilter(filter) {
  state.activeFilter = filter;
  app.querySelectorAll('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  updateTemplateCards();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  app.querySelectorAll('[data-tab]').forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  app.querySelectorAll('[data-tab-panel]').forEach((panel) => { panel.hidden = panel.dataset.tabPanel !== tab; });
}

function initializeCanvas() {
  const resizeObserver = new ResizeObserver(() => {
    const rect = stageFrame.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    overlayCanvas.width = Math.max(1, Math.round(rect.width * ratio));
    overlayCanvas.height = Math.max(1, Math.round(rect.height * ratio));
    overlayCanvas.style.width = `${rect.width}px`;
    overlayCanvas.style.height = `${rect.height}px`;
    scheduleRender();
  });
  resizeObserver.observe(stageFrame);
}

function scheduleRender() {
  if (renderFrame) cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null;
    renderAll();
  });
  persistSession();
}

function renderAll() {
  drawOverlay();
  updateImageFilter();
  updateBeforeAfterState();
  updateZoomUi();
}

function drawOverlay() {
  const width = overlayCanvas.clientWidth || stageFrame.clientWidth;
  const height = overlayCanvas.clientHeight || stageFrame.clientHeight;
  overlayContext.setTransform(1, 0, 0, 1, 0, 0);
  overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (!width || !height) return;
  renderMakeup({
    context: overlayContext,
    width,
    height,
    face: state.face,
    template: getCurrentTemplate(),
    variant: getCurrentVariant(),
    intensity: state.intensity,
    groupMix: state.groupMix,
    visibleGroups: state.visibleGroups,
    scale: state.scale * state.zoom,
    rotation: state.rotation,
    offset: state.offset,
    showBefore: state.showBefore
  });
}

function updateImageFilter() {
  const template = getCurrentTemplate();
  if (!template) return;
  if (state.showBefore) {
    photoElement.style.filter = 'none';
    return;
  }
  const filters = template.filters ?? {};
  const brightness = clamp(1 + ((filters.brightness ?? 1) - 1) * 0.32 + state.exposure * 0.28, 0.96, 1.06).toFixed(3);
  const contrast = clamp(1 + ((filters.contrast ?? 1) - 1) * 0.28, 0.97, 1.05).toFixed(3);
  const saturate = clamp(1 + ((filters.saturate ?? 1) - 1) * 0.22, 0.98, 1.05).toFixed(3);
  const warmth = ((filters.warmth ?? 0) + state.warmth) * 0.35;
  const parts = [`brightness(${brightness})`, `contrast(${contrast})`, `saturate(${saturate})`];
  if (Math.abs(warmth) > 0.001) parts.push(`hue-rotate(${(warmth * 24).toFixed(1)}deg)`);
  photoElement.style.filter = parts.join(' ');
}

function handleUpload(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Выберите файл изображения: JPG, PNG или WebP.', 'warning');
    input.value = '';
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    setStatus('Файл больше 12 МБ. Сожмите изображение и попробуйте снова.', 'warning');
    input.value = '';
    return;
  }
  revokeObjectUrl();
  const objectUrl = URL.createObjectURL(file);
  state.photoObjectUrl = objectUrl;
  state.photoFileName = file.name;
  state.photoMode = 'uploaded';
  state.showBefore = false;
  photoElement.src = objectUrl;
  stageHint.classList.remove('is-hidden');
  setStatus(`Фото «${file.name}» открыто локально.`, 'success');
  input.value = '';
}

function loadDemoPhoto() {
  revokeObjectUrl();
  state.photoMode = 'demo';
  state.photoFileName = '';
  state.showBefore = false;
  state.face = analyzeFace(1122, 1402);
  state.faceStatus = 'estimated';
  photoElement.src = demoPortraitUrl;
  setStatus('Демо‑портрет открыт. Выберите образ справа.', 'success');
}

async function handlePhotoLoad() {
  const { naturalWidth, naturalHeight } = photoElement;
  stageFrame.style.aspectRatio = naturalWidth > 0 && naturalHeight > 0 ? `${naturalWidth} / ${naturalHeight}` : '4 / 5';
  stageFrame.dataset.mode = state.photoMode;
  state.face = analyzeFace(naturalWidth, naturalHeight);
  state.faceStatus = 'estimated';
  updatePhotoUi();
  scheduleRender();
  const boundingBox = await detectFace(photoElement);
  if (boundingBox) {
    state.face = analyzeFace(naturalWidth, naturalHeight, { boundingBox });
    state.faceStatus = 'detected';
    readinessTitle.textContent = state.photoMode === 'demo' ? 'Демо‑портрет распознан' : 'Лицо распознано';
    readinessText.textContent = 'Зоны макияжа выровнены по чертам лица';
    setStatus('Лицо распознано: маски выровнены по чертам.', 'success');
    scheduleRender();
  }
}

function updatePhotoUi() {
  const isDemo = state.photoMode === 'demo';
  stageFrame.dataset.mode = state.photoMode;
  stageEmpty.hidden = true;
  photoLabel.textContent = isDemo ? 'Демонстрационный портрет' : state.photoFileName || 'Ваш портрет';
  if (isDemo) {
    readinessTitle.textContent = state.faceStatus === 'detected' ? 'Демо‑портрет распознан' : 'Демо‑портрет готов';
    readinessText.textContent = state.faceStatus === 'detected' ? 'Зоны макияжа выровнены по чертам лица' : 'Можно сразу выбирать образ';
  } else {
    const ready = photoElement.naturalWidth >= 720 && photoElement.naturalHeight >= 720;
    readinessTitle.textContent = state.faceStatus === 'detected' ? 'Лицо распознано' : ready ? 'Фото подходит' : 'Проверьте разрешение';
    readinessText.textContent = state.faceStatus === 'detected' ? 'Зоны макияжа выровнены по чертам лица' : ready ? `${photoElement.naturalWidth} × ${photoElement.naturalHeight} px` : 'Рекомендуется минимум 720 px';
  }
}

function toggleBeforeAfter(force) {
  state.showBefore = typeof force === 'boolean' ? force : !state.showBefore;
  setStatus(state.showBefore ? 'Показано исходное фото. Нажмите B или кнопку, чтобы вернуть образ.' : 'Показан текущий образ.', 'neutral');
  scheduleRender();
}

function updateBeforeAfterState() {
  stageFrame.classList.toggle('is-before', state.showBefore);
  beforeLabel.textContent = state.showBefore ? 'Показать образ' : 'До / После';
  app.querySelector('[data-action="before"]')?.setAttribute('aria-pressed', String(state.showBefore));
}

function centerStage() {
  state.offset = { x: 0, y: 0 };
  setStatus('Образ выровнен по центру.', 'success');
  scheduleRender();
}

function setZoom(value) {
  state.zoom = clamp(Number(value), 0.8, 1.25);
  updateZoomUi();
  scheduleRender();
}

function updateZoomUi() {
  zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  stageFrame.style.setProperty('--stage-zoom', state.zoom);
}

function resetLook() {
  const template = getCurrentTemplate();
  if (!template) return;
  applyTemplateDefaults(template);
  buildGroupControls();
  intensityInput.value = String(state.intensity);
  app.querySelector('[data-role="value-intensity"]').textContent = formatPercent(state.intensity);
  setStatus('Настройки текущего образа сброшены.', 'success');
  scheduleRender();
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
  state.groupMix = createGroupMix();
  state.visibleGroups = createVisibleGroups();
}

function downloadResult() {
  if (!photoElement.complete || !photoElement.naturalWidth) {
    setStatus('Сначала добавьте корректное фото.', 'warning');
    return;
  }
  if (state.showBefore) toggleBeforeAfter(false);
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = photoElement.naturalWidth;
  exportCanvas.height = photoElement.naturalHeight;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;
  try {
    ctx.filter = photoElement.style.filter || 'none';
    ctx.drawImage(photoElement, 0, 0, exportCanvas.width, exportCanvas.height);
    ctx.filter = 'none';
    ctx.drawImage(overlayCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `visage-${slugify(getCurrentTemplate()?.name ?? 'look')}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setStatus('Результат скачан в PNG.', 'success');
    }, 'image/png');
  } catch (error) {
    setStatus('Браузер не разрешил экспорт этого фото.', 'warning');
  }
}

function toggleTheme() {
  const light = document.body.dataset.theme === 'light';
  document.body.dataset.theme = light ? 'dark' : 'light';
  app.querySelector('[data-action="theme"]').innerHTML = icon(light ? 'moon' : 'sunSmall');
  localStorage.setItem('visage-theme', light ? 'dark' : 'light');
}

function onPointerDown(event) {
  if (event.target.closest('button, label')) return;
  dragState.isActive = true;
  dragState.pointerId = event.pointerId;
  dragState.origin = { x: event.clientX, y: event.clientY };
  dragState.offset = { ...state.offset };
  stageFrame.setPointerCapture(event.pointerId);
  stageFrame.classList.add('is-dragging');
  stageHint.classList.add('is-hidden');
}

function onPointerMove(event) {
  if (!dragState.isActive || event.pointerId !== dragState.pointerId) return;
  const rect = stageFrame.getBoundingClientRect();
  const dx = (event.clientX - dragState.origin.x) / rect.width;
  const dy = (event.clientY - dragState.origin.y) / rect.height;
  state.offset = { x: clamp(dragState.offset.x + dx, -0.5, 0.5), y: clamp(dragState.offset.y + dy, -0.5, 0.5) };
  drawOverlay();
}

function onPointerUp() {
  if (!dragState.isActive) return;
  try { if (dragState.pointerId !== null) stageFrame.releasePointerCapture(dragState.pointerId); } catch (error) { /* no-op */ }
  dragState.isActive = false;
  dragState.pointerId = null;
  stageFrame.classList.remove('is-dragging');
  persistSession();
}

function setStatus(message, status = 'neutral') {
  statusText.textContent = message;
  statusLine.dataset.status = status;
  if (status !== 'neutral') showToast(message, status);
}

function showToast(message, tone) {
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function revokeObjectUrl() {
  if (state.photoObjectUrl) URL.revokeObjectURL(state.photoObjectUrl);
  state.photoObjectUrl = '';
}

function getCurrentTemplate() { return templates.find((template) => template.id === state.templateId) ?? null; }
function getCurrentVariant() {
  const variants = getCurrentTemplate()?.variants ?? [];
  return variants.find((variant) => variant.id === state.variantId) ?? variants[0] ?? null;
}
function createTemplateDefaults(template) {
  const defaults = template.defaults ?? {};
  return { intensity: defaults.intensity ?? 0.82, scale: defaults.scale ?? 1, rotation: defaults.rotation ?? 0, warmth: defaults.warmth ?? 0, exposure: defaults.exposure ?? 0, offset: { x: defaults.offsetX ?? 0, y: defaults.offsetY ?? 0 }, variantId: template.defaultVariant ?? template.variants?.[0]?.id ?? null };
}
function createGroupMix(saved) { return Object.fromEntries(GROUPS.map((group) => [group.id, clamp(Number(saved?.[group.id] ?? group.defaultValue), 0, 1)])); }
function createVisibleGroups(saved) { return Object.fromEntries(GROUPS.map((group) => [group.id, saved?.[group.id] !== false])); }
function readSession() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { return null; } }
function persistSession() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ templateId: state.templateId, groupMix: state.groupMix, visibleGroups: state.visibleGroups, intensity: state.intensity, zoom: state.zoom })); } catch (error) { /* private browsing can block storage */ }
}
function formatPercent(value) { return `${Math.round(clamp(value, 0, 1) * 100)}%`; }
function clamp(value, min, max) { return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max); }
function slugify(value) { return value.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, ''); }
function isTypingTarget(target) { return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

document.body.dataset.theme = localStorage.getItem('visage-theme') || 'dark';
