import './style.css';

const facadeMaterialOptions = [
  'панорамное остекление',
  'архитектурный бетон',
  'натуральное дерево',
  'анодированный металл',
  'керамогранит крупного формата',
  'металлические ламели',
  'живая зелёная стена'
];

const buildingFormOptions = [
  'монолитный прямоугольный объём с каскадными террасами',
  'L-образная объёмная композиция',
  'U-образное здание с внутренним двором',
  'параметрический объём с скруглёнными углами'
];

const styleOptions = [
  'современный хай-тек с панорамным остеклением',
  'параметрический хай-тек с динамическими фасадами',
  'минималистичный хай-тек с графичной геометрией'
];

const interiorMoodOptions = [
  'минимализм с тёплыми деревянными акцентами и микроцементом',
  'премиальный минимализм с камнем и латунью',
  'нейтральная палитра с текстильными акцентами'
];

const defaultState = {
  siteLength: 29,
  siteWidth: 16,
  siteLocation: 'Сочи, Россия, побережье Чёрного моря',
  siteOrientation:
    'Ориентация длинной стороной к морю; вход и парковка — с задней стороны, передняя зона — пешеходная с озеленением и водными элементами.',
  siteRelief: 'Ровный участок с лёгким уклоном в сторону моря, возможность устройства террасирования.',
  buildingOffsetFront: 3,
  buildingOffsetBack: 10,
  buildingOffsetSides: 3,
  buildingLength: 10,
  buildingWidth: 16,
  floors: 3,
  floorHeight: 3.5,
  buildingForm: buildingFormOptions[0],
  style: styleOptions[0],
  facadeMaterials: [
    facadeMaterialOptions[0],
    facadeMaterialOptions[1],
    facadeMaterialOptions[2],
    facadeMaterialOptions[3]
  ],
  structuralSystem: 'монолитный железобетонный каркас с композитными перекрытиями',
  roofType: 'плоская эксплуатируемая кровля с лаундж-зоной и солнечными панелями',
  interiorMood: interiorMoodOptions[0],
  lightingMood: 'динамическая подсветка фасада и умные сценарии интерьера',
  sustainability: 'геотермальный тепловой насос, рекуперация воздуха и система сбора дождевой воды',
  landscapeAccent: 'инфинити-бассейн, барбекю-павильон, многоуровневое озеленение и смарт-ирригация',
  customBrief:
    'Участок 29×16 м (≈ 464 м²), дом 10×16 м, три этажа по 3,5 м. Позиция — 3 м от передней границы, 10 м до стойки, выходы по бокам 3 м. Вход и парковка — с задней стороны участка. Передняя зона — пешеходная и озеленённая. Размеры и расположение неизменны. Локация — Сочи, Россия. Стиль — современный хайтек с панорамным остеклением.'
};

const state = structuredClone(defaultState);

const generationSessionKey = 'sochi-architect-openai-key';
const generationState = {
  scenes: [],
  status: 'idle',
  currentIndex: -1,
  results: [],
  completedCount: 0,
  apiKey: '',
  rememberKey: false,
  showApiKey: false,
  controller: null,
  feedback: null,
  feedbackType: 'info'
};

let rendersContainerRef = null;
let feedbackTimeoutId = null;

hydrateApiKeyFromSession();

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Не удалось найти корневой элемент приложения.');
}

renderApp();

function renderApp() {
  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="branding">
          <span class="badge">Sochi Architect Lab</span>
          <h1>Генератор архитектурного энергопроекта</h1>
          <p>
            Соберите исходные данные по участку, стилю и материалам — система мгновенно сформирует поэтапный чек-лист,
            архитектурную концепцию, планировочные решения, интерьер, ландшафт и сценарии для 8K визуализаций.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="ghost-btn" data-action="reset">
            Сбросить до базового участка
          </button>
        </div>
      </header>
      <main class="layout">
        <section class="panel input-panel" aria-label="Параметры проекта">
          <h2>Исходные данные</h2>
          <form class="brief-form" data-role="brief-form">
            ${renderSiteSection()}
            ${renderBuildingSection()}
            ${renderDesignSection()}
            ${renderNarrativeSection()}
          </form>
        </section>
        <section class="panel output-panel" aria-live="polite">
          <div class="status-bar" data-role="status"></div>
          <div class="metrics-grid" data-role="metrics"></div>
          <section class="output-section" aria-labelledby="checklist-title">
            <div class="section-header">
              <h2 id="checklist-title">Чек-лист энергопроекта</h2>
              <p>Последовательность действий перед выпуском документации.</p>
            </div>
            <div data-role="checklist"></div>
          </section>
          <section class="output-section" aria-labelledby="architecture-title">
            <div class="section-header">
              <h2 id="architecture-title">Архитектурное описание</h2>
              <p>Идея, объёмно-планировочные решения и материалы.</p>
            </div>
            <div data-role="architecture"></div>
          </section>
          <section class="output-section" aria-labelledby="plans-title">
            <div class="section-header">
              <h2 id="plans-title">Планировки</h2>
              <p>Ключевые функции каждого уровня.</p>
            </div>
            <div data-role="plans"></div>
          </section>
          <section class="output-section" aria-labelledby="interior-title">
            <div class="section-header">
              <h2 id="interior-title">Интерьер</h2>
              <p>Эстетика, материалы и сценарии освещения.</p>
            </div>
            <div data-role="interior"></div>
          </section>
          <section class="output-section" aria-labelledby="landscape-title">
            <div class="section-header">
              <h2 id="landscape-title">Ландшафт</h2>
              <p>Композиция участка, бассейн, парковка и озеленение.</p>
            </div>
            <div data-role="landscape"></div>
          </section>
          <section class="output-section" aria-labelledby="technical-title">
            <div class="section-header">
              <h2 id="technical-title">Техническое описание</h2>
              <p>Конструктив, инженерия и климатические адаптации.</p>
            </div>
            <div data-role="technical"></div>
          </section>
          <section class="output-section" aria-labelledby="renders-title">
            <div class="section-header">
              <h2 id="renders-title">Рендеры (5 сцен)</h2>
              <p>Цели генерации и параметры сцен для 8K визуализаций.</p>
            </div>
            <div data-role="renders"></div>
          </section>
          <section class="output-section" aria-labelledby="concept-title">
            <div class="section-header">
              <h2 id="concept-title">Концепт-проект</h2>
              <p>Итоговое резюме и рекомендации к реализации.</p>
            </div>
            <div data-role="concept"></div>
          </section>
        </section>
      </main>
    </div>
  `;

  const form = app.querySelector('[data-role="brief-form"]');
  const statusElement = app.querySelector('[data-role="status"]');

  if (!form || !statusElement) {
    throw new Error('Не удалось инициализировать форму или статус проекта.');
  }

  form.addEventListener('input', handleFormChange);
  form.addEventListener('change', handleFormChange);
  app.querySelector('[data-action="reset"]').addEventListener('click', () => {
    Object.assign(state, structuredClone(defaultState));
    synchronizeForm(form);
    updateOutputs(statusElement);
  });

  synchronizeForm(form);
  updateOutputs(statusElement);
}

function renderSiteSection() {
  return `
    <fieldset class="form-section">
      <legend>Участок</legend>
      <div class="form-grid">
        ${renderNumberInput('Длина участка, м', 'siteLength', state.siteLength, 10, 0.1)}
        ${renderNumberInput('Ширина участка, м', 'siteWidth', state.siteWidth, 10, 0.1)}
        ${renderTextInput('Локация', 'siteLocation', state.siteLocation)}
        ${renderTextInput('Ориентация и подъезды', 'siteOrientation', state.siteOrientation)}
        ${renderTextInput('Рельеф и контекст', 'siteRelief', state.siteRelief)}
        ${renderNumberInput('Отступ от передней границы, м', 'buildingOffsetFront', state.buildingOffsetFront, 0, 0.1)}
        ${renderNumberInput('Отступ от задней границы, м', 'buildingOffsetBack', state.buildingOffsetBack, 0, 0.1)}
        ${renderNumberInput('Боковые отступы, м', 'buildingOffsetSides', state.buildingOffsetSides, 0, 0.1)}
      </div>
    </fieldset>
  `;
}

function renderBuildingSection() {
  return `
    <fieldset class="form-section">
      <legend>Здание</legend>
      <div class="form-grid">
        ${renderNumberInput('Длина здания, м', 'buildingLength', state.buildingLength, 5, 0.1)}
        ${renderNumberInput('Ширина здания, м', 'buildingWidth', state.buildingWidth, 5, 0.1)}
        ${renderNumberInput('Количество этажей', 'floors', state.floors, 1, 1)}
        ${renderNumberInput('Высота этажа, м', 'floorHeight', state.floorHeight, 2.5, 0.1)}
        ${renderSelect('Форма здания', 'buildingForm', buildingFormOptions, state.buildingForm)}
        ${renderSelect('Архитектурный стиль', 'style', styleOptions, state.style)}
        ${renderTextInput('Тип кровли', 'roofType', state.roofType)}
        ${renderTextInput('Несущая система', 'structuralSystem', state.structuralSystem)}
      </div>
    </fieldset>
  `;
}

function renderDesignSection() {
  const materials = facadeMaterialOptions
    .map((material) => `
        <label class="checkbox">
          <input type="checkbox" name="facadeMaterials" value="${escapeHtml(material)}" ${
      state.facadeMaterials.includes(material) ? 'checked' : ''
    } />
          <span>${escapeHtml(material)}</span>
        </label>
      `)
    .join('');

  return `
    <fieldset class="form-section">
      <legend>Дизайн и материалы</legend>
      <div class="form-grid">
        ${renderSelect('Настроение интерьера', 'interiorMood', interiorMoodOptions, state.interiorMood)}
        ${renderTextInput('Сценарии освещения', 'lightingMood', state.lightingMood)}
        ${renderTextInput('Сценарии устойчивости', 'sustainability', state.sustainability)}
        ${renderTextInput('Ландшафтные акценты', 'landscapeAccent', state.landscapeAccent)}
      </div>
      <div class="checkbox-grid">
        ${materials}
      </div>
    </fieldset>
  `;
}

function renderNarrativeSection() {
  return `
    <fieldset class="form-section">
      <legend>Контекст проекта</legend>
      <label class="input-group">
        <span>Краткое текстовое задание</span>
        <textarea name="customBrief" rows="6" placeholder="Опишите дополнительные пожелания">${escapeHtml(state.customBrief)}</textarea>
      </label>
    </fieldset>
  `;
}

function renderNumberInput(label, name, value, min, step) {
  return `
    <label class="input-group">
      <span>${escapeHtml(label)}</span>
      <input type="number" name="${escapeHtml(name)}" value="${String(value)}" min="${min}" step="${step}" />
    </label>
  `;
}

function renderTextInput(label, name, value) {
  return `
    <label class="input-group">
      <span>${escapeHtml(label)}</span>
      <input type="text" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function renderSelect(label, name, options, selected) {
  const optionsHtml = options
    .map((option) => `
      <option value="${escapeHtml(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option)}</option>
    `)
    .join('');

  return `
    <label class="input-group">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">${optionsHtml}</select>
    </label>
  `;
}

function handleFormChange(event) {
  const target = event.target;

  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  const { name, type, value } = target;

  if (!name) {
    return;
  }

  if (type === 'checkbox' && name === 'facadeMaterials') {
    updateMaterials(value, target.checked);
  } else if (type === 'number') {
    const numericValue = target.value === '' ? NaN : Number(value);

    if (!Number.isNaN(numericValue)) {
      state[name] = numericValue;
    }
  } else {
    state[name] = value;
  }

  const statusElement = app.querySelector('[data-role="status"]');

  if (statusElement) {
    updateOutputs(statusElement);
  }
}

function updateMaterials(material, checked) {
  if (!state.facadeMaterials) {
    state.facadeMaterials = [];
  }

  if (checked) {
    if (!state.facadeMaterials.includes(material)) {
      state.facadeMaterials.push(material);
    }
  } else {
    state.facadeMaterials = state.facadeMaterials.filter((item) => item !== material);
  }
}

function synchronizeForm(form) {
  const formData = new FormData(form);

  for (const [key] of formData.entries()) {
    const element = form.elements.namedItem(key);

    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
      continue;
    }

    if (element.type === 'checkbox') {
      const checkboxes = form.querySelectorAll(`input[name="${key}"]`);

      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement) {
          checkbox.checked = state.facadeMaterials.includes(checkbox.value);
        }
      });
    } else if (element.type === 'number') {
      element.value = String(state[key] ?? '');
    } else {
      element.value = state[key] ?? '';
    }
  }

  const brief = form.elements.namedItem('customBrief');

  if (brief instanceof HTMLTextAreaElement) {
    brief.value = state.customBrief;
  }
}

function updateOutputs(statusElement) {
  const derived = computeDerivedValues(state);
  const narrative = generateNarrative(state, derived);

  const metricsElement = app.querySelector('[data-role="metrics"]');
  const checklistElement = app.querySelector('[data-role="checklist"]');
  const architectureElement = app.querySelector('[data-role="architecture"]');
  const plansElement = app.querySelector('[data-role="plans"]');
  const interiorElement = app.querySelector('[data-role="interior"]');
  const landscapeElement = app.querySelector('[data-role="landscape"]');
  const technicalElement = app.querySelector('[data-role="technical"]');
  const rendersElement = app.querySelector('[data-role="renders"]');
  const conceptElement = app.querySelector('[data-role="concept"]');

  if (
    !metricsElement ||
    !checklistElement ||
    !architectureElement ||
    !plansElement ||
    !interiorElement ||
    !landscapeElement ||
    !technicalElement ||
    !rendersElement ||
    !conceptElement
  ) {
    throw new Error('Не удалось найти один из блоков вывода.');
  }

  renderMetrics(metricsElement, derived);
  renderList(checklistElement, narrative.checklist);
  renderSection(architectureElement, narrative.architecture);
  renderSection(plansElement, narrative.plans);
  renderSection(interiorElement, narrative.interior);
  renderSection(landscapeElement, narrative.landscape);
  renderSection(technicalElement, narrative.technical);
  renderScenes(rendersElement, narrative.scenes);
  renderSection(conceptElement, narrative.concept);

  statusElement.textContent = `Концепт обновлён: ${formatDateTime(new Date())}`;
}

function computeDerivedValues(currentState) {
  const siteArea = currentState.siteLength * currentState.siteWidth;
  const buildingFootprint = currentState.buildingLength * currentState.buildingWidth;
  const totalFloorArea = buildingFootprint * currentState.floors;
  const totalHeight = currentState.floors * currentState.floorHeight;
  const buildingCoverage = siteArea === 0 ? 0 : (buildingFootprint / siteArea) * 100;

  return {
    siteArea,
    buildingFootprint,
    totalFloorArea,
    totalHeight,
    buildingCoverage
  };
}

function generateNarrative(currentState, derived) {
  const materials = currentState.facadeMaterials.length
    ? currentState.facadeMaterials
    : [facadeMaterialOptions[0], facadeMaterialOptions[1]];
  const formattedMaterials = materials.join(', ');
  const colorTemperature = '5200K';
  const renderResolution = '8K (7680×4320)';

  return {
    checklist: [
      `Собрать и подтвердить исходные данные участка ${formatDimension(currentState.siteLength)}×${formatDimension(
        currentState.siteWidth
      )} м, включая ограничения, регламенты и энергоэффективные требования.`,
      `Сформировать объемно-пространственную концепцию в стиле ${currentState.style}, учитывая ${currentState.buildingForm}.`,
      `Проработать инженерные решения: ${currentState.structuralSystem}, ${currentState.sustainability}.`,
      `Подготовить 2D-планировки, 3D BIM-модель, спецификации материалов (${formattedMaterials}) и смарт-ландшафт.`,
      `Сформировать пакет визуализаций (${renderResolution}, температура ${colorTemperature}) и PDF-документацию с версиями.`
    ],
    architecture: {
      lead: `Концепция формируется вокруг ${currentState.buildingForm}, что позволяет раскрыть видовые оси на море и подчеркнуть стиль ${currentState.style}.`,
      paragraphs: [
        `Объем здания ${formatDimension(currentState.buildingLength)}×${formatDimension(
          currentState.buildingWidth
        )} м посаден с отступами ${formatDimension(currentState.buildingOffsetFront)} / ${formatDimension(
          currentState.buildingOffsetBack
        )} / ${formatDimension(currentState.buildingOffsetSides
        )} м, создавая приватный двор у бассейна и пешеходную зелёную переднюю зону.`,
        `Фасады читаются как многослойная система: ${formattedMaterials}. Панорамные витражи объединяют внутреннюю и внешнюю среды,
        а выступающие каскады служат солнцезащитой и создают террасы.`,
        `Вертикальные акценты металла контрастируют с тёплыми деревянными кассетами, подчёркивая технологичность и одновременно дружелюбие архитектуры.`
      ],
      lists: [
        {
          title: 'Ключевые приёмы',
          items: [
            'двойная световая высота в общественной зоне и открытые лестничные пролёты',
            'террасирование второго и третьего этажей с зелёными насаждениями в кадках',
            `интеграция подсветки по контуру плит перекрытий для вечерней сцены и выделения ${renderResolution}`
          ]
        },
        {
          title: 'Материалы и отделка',
          items: materials
        }
      ]
    },
    plans: {
      lead: `Общая площадь по полу составляет ${formatArea(derived.totalFloorArea)}, при пятне застройки ${formatArea(
        derived.buildingFootprint
      )} (застройка ${formatPercentage(derived.buildingCoverage)} от участка).`,
      lists: [
        {
          title: '1 этаж',
          items: [
            'входная группа с гардеробом, гостевой санузел и доступ в техническую зону',
            'двухсветная гостиная, объединённая с кухней-островом и столовой, выходящей на террасу у бассейна',
            'кабинет-трансформер / гостевая спальня с собственным санузлом и видом на зелёный периметр'
          ]
        },
        {
          title: '2 этаж',
          items: [
            'мастер-суит с панорамной спальней, гардеробной и ванной комнатой, ориентированной на море',
            'две детские спальни с общим учебным лофтом и доступом на частные балконы',
            'прачечная и инженерное помещение, скрытое в ядре здания'
          ]
        },
        {
          title: '3 этаж',
          items: [
            'пространство для коворкинга и домашнего кинозала с акустической отделкой',
            'спа-блок с сауной и выходом на открытую лаундж-террасу на кровле',
            'технический блок для фотоэлектрических панелей и обслуживания инженерных систем'
          ]
        }
      ]
    },
    interior: {
      lead: `Интерьер выдержан в ключах ${currentState.interiorMood}, подчёркивая объемы через контраст света, стекла и тактильных материалов.`,
      paragraphs: [
        `Палитра — монохромная основа с акцентами дерева тёплого оттенка и графита. Мебель — встроенные системы хранения, модульные диваны,
        дизайнерские кресла с текстурой букле.`,
        `Освещение — ${currentState.lightingMood}: динамика линий в потолке, треки с регулируемой температурой и скрытые профили в ступенях.`
      ],
      lists: [
        {
          title: 'Основные зоны',
          items: [
            'гостиная с двухсветной лестницей-арт-объектом',
            'кухня с островом из камня и техническим бек-офисом',
            'мастер-суит с панорамной ванной, приватной террасой и умными шторами'
          ]
        }
      ]
    },
    landscape: {
      lead: `Ландшафт поддерживает визуальную ось на море и продуманную приватность. ${currentState.landscapeAccent}.`,
      paragraphs: [
        `Бассейн-инфинити выровнен по фасаду дома, образуя зеркало, отражающее вечернюю подсветку. Барбекю-павильон интегрирован в деревянную террасу с навесом из металла.`,
        `Парковка на 2 авто располагается у задней границы и скрыта перголой с лианами. Дорожки — из крупноформатных плит, подсветка — встроенные светильники IP67.`
      ],
      lists: [
        {
          title: 'Озеленение',
          items: [
            'субтропические породы: магнолии, лавры, оливковые деревья, декоративные травы',
            'дренажные канавки и дождевой сад у нижней отметки участка',
            'автоматический полив с датчиками влажности и погодным контролем'
          ]
        }
      ]
    },
    technical: {
      lead: `Конструкция рассчитана на влажный субтропический климат Сочи и повышенные ветровые нагрузки.`,
      paragraphs: [
        `Несущая система: ${currentState.structuralSystem} с диафрагмами жёсткости. Конструктив перекрытий предусматривает выносные консоли для террас.`,
        `Ограждающие конструкции: тройные стеклопакеты с мультифункциональным покрытием, навесные фасады с вентзазором и терморазрывами.`,
        `Инженерные системы: ${currentState.sustainability}, система "умный дом" для управления климатом, светом и шторой.`
      ],
      lists: [
        {
          title: 'Климатическая адаптация',
          items: [
            'солнечные ламели и остекление с селективными плёнками для контроля перегрева',
            'ветрозащитные экраны на террасах, раздвижные стеклянные панели',
            'добавочный приточно-вытяжной контур с рекуперацией и обезвоживанием'
          ]
        }
      ]
    },
    scenes: generateScenes(currentState, derived, renderResolution, colorTemperature),
    concept: {
      lead: 'Концепт-проект формирует гармонию между высокими технологиями, средиземноморской атмосферой Сочи и энергосберегающими решениями.',
      paragraphs: [
        `Проект готов к выпуску PDF-документа SOCHI_HOUSE_PROJECT_v1.0.pdf с 2D-планами, 3D-рендерами и техническим описанием.`,
        `Для каждой итерации рекомендуется вести версионирование и архивировать изменения в каталоге /Revisions/.`
      ],
      lists: [
        {
          title: 'Рекомендации',
          items: [
            'уточнить геологию участка и расчёт фундамента до стадии рабочей документации',
            'согласовать инженерные системы с локальными поставщиками оборудования',
            'организовать контроль качества визуализаций: масштаб, геометрия, свет, материалы, нумерация листов'
          ]
        }
      ]
    }
  };
}

function generateScenes(currentState, derived, resolution, colorTemperature) {
  const buildingAreaText = formatArea(derived.buildingFootprint);
  const basePrompt =
    'ультрареалистичный рендер, широкоугольный объектив, высокотехнологичная архитектура, реальный солнечный свет, кинематографическая композиция';

  return [
    {
      title: 'Сцена 1 — Экстерьер дома',
      goal: 'Показать главный фасад и связь дома с морем и бассейном.',
      parameters: `${resolution}, цветовая температура ${colorTemperature}, единая высота камеры 1,6 м, вечерний тёплый свет.`,
      prompt: `${basePrompt}, современный трёхэтажный дом ${formatDimension(currentState.buildingLength)}×${formatDimension(
        currentState.buildingWidth
      )} м, стиль ${currentState.style}, материалы: ${currentState.facadeMaterials.join(
        ', '
      )}, бассейн-инфинити перед домом, парковка на 2 авто, море на заднем плане, мягкая подсветка дорожек.`
    },
    {
      title: 'Сцена 2 — Вид сверху',
      goal: 'Отразить планировку участка и взаимосвязь функциональных зон.',
      parameters: `${resolution}, цветовая температура ${colorTemperature}, съёмка с дрона, дневной солнечный свет.`,
      prompt: `${basePrompt}, вид сверху участка ${formatDimension(currentState.siteLength)}×${formatDimension(
        currentState.siteWidth
      )} м, пятно застройки ${buildingAreaText}, бассейн, террасы, парковка, дорожки, зона отдыха, барбекю и насыщенное озеленение.`
    },
    {
      title: 'Сцена 3 — Интерьер гостиной',
      goal: 'Показать двухсветную гостиную и вид на море.',
      parameters: `${resolution}, цветовая температура ${colorTemperature}, дневное освещение.`,
      prompt: `${basePrompt}, гостиная двойной высоты с панорамными стенами, вид на море, минимализм, серо-белая палитра, дерево, бетон, дизайнерская мебель, подвесные светильники, отражение воды бассейна.`
    },
    {
      title: 'Сцена 4 — Спальня',
      goal: 'Передать атмосферу мастер-спальни с видом на море.',
      parameters: `${resolution}, цветовая температура ${colorTemperature}, мягкое утреннее освещение.`,
      prompt: `${basePrompt}, современная спальня с панорамным остеклением, бетон и дерево, нейтральная палитра, текстильные панели, вид на море, умные шторы, тонкое встроенное освещение.`
    },
    {
      title: 'Сцена 5 — Ночной фасад',
      goal: 'Показать драматичную ночную подсветку и отражение в бассейне.',
      parameters: `${resolution}, цветовая температура ${colorTemperature}, ночное небо, мягкий тёплый свет изнутри.`,
      prompt: `${basePrompt}, трёхэтажный хай-тек фасад, стеклянные стены, отражение дома в бассейне, подсветка ступеней, акцент на металле и дереве, атмосферные облака.`
    }
  ];
}

function renderMetrics(container, derived) {
  container.innerHTML = `
    <article class="metric-card">
      <span class="metric-label">Площадь участка</span>
      <span class="metric-value">${formatArea(derived.siteArea)}</span>
    </article>
    <article class="metric-card">
      <span class="metric-label">Пятно застройки</span>
      <span class="metric-value">${formatArea(derived.buildingFootprint)}</span>
    </article>
    <article class="metric-card">
      <span class="metric-label">Общая площадь</span>
      <span class="metric-value">${formatArea(derived.totalFloorArea)}</span>
    </article>
    <article class="metric-card">
      <span class="metric-label">Высота здания</span>
      <span class="metric-value">${formatDimension(derived.totalHeight)} м</span>
    </article>
  `;
}

function renderList(container, items) {
  container.innerHTML = `<ul class="bullet-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderSection(container, section) {
  const parts = [];

  if (section.lead) {
    parts.push(`<p class="lead">${escapeHtml(section.lead)}</p>`);
  }

  if (section.paragraphs) {
    parts.push(section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join(''));
  }

  if (section.lists) {
    section.lists.forEach((list) => {
      parts.push(`
        <div class="list-block">
          <h3>${escapeHtml(list.title)}</h3>
          <ul class="bullet-list">${list.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      `);
    });
  }

  container.innerHTML = parts.join('');
}

function renderScenes(container, scenes) {
  rendersContainerRef = container;
  generationState.scenes = scenes.slice();
  ensureSceneResultsLength(scenes.length);
  markStaleSceneResults(scenes);
  updateCompletedCountFromResults();

  const controlsMarkup = renderSceneControlsMarkup(scenes);
  const cardsMarkup = scenes.map((scene, index) => renderSceneCard(scene, index)).join('');

  container.innerHTML = `${controlsMarkup}<div class="scene-grid">${cardsMarkup}</div>`;

  attachSceneControlHandlers(container);
}

function renderSceneControlsMarkup(scenes) {
  const totalScenes = scenes.length;
  const progress = getProgressData(scenes);
  const statusText = getSceneStatusText(totalScenes, progress);
  const generateDisabled = generationState.status === 'running';
  const cancelDisabled = generationState.status !== 'running' || !generationState.controller;
  const toggleLabel = generationState.showApiKey ? 'Скрыть' : 'Показать';
  const feedbackClass = resolveFeedbackClass(generationState.feedbackType);
  const manualFeedback = generationState.feedback
    ? `<p class="scene-feedback scene-feedback--${feedbackClass}">${escapeHtml(generationState.feedback)}</p>`
    : '';
  const staleFeedback = generationState.results.some((result) => result.status === 'stale')
    ? `<p class="scene-feedback scene-feedback--warning">Параметры проекта изменились после последней генерации. Перезапустите процесс, чтобы получить актуальные рендеры.</p>`
    : '';

  const apiKeyField = `
    <label class="input-group scene-key-group">
      <span>OpenAI API ключ</span>
      <div class="scene-key-field">
        <input
          type="${generationState.showApiKey ? 'text' : 'password'}"
          name="openaiKey"
          autocomplete="off"
          data-role="api-key"
          placeholder="sk-..."
          value="${escapeHtml(generationState.apiKey)}"
        />
        <button type="button" class="scene-button scene-button--ghost" data-action="toggle-key">
          ${escapeHtml(toggleLabel)}
        </button>
      </div>
      <p class="scene-hint">Ключ используется только в вашем браузере. Отметьте «Запомнить», чтобы сохранить его до закрытия вкладки.</p>
    </label>
  `;

  const controls = `
    <div class="scene-controls">
      <div class="scene-controls__row">
        ${apiKeyField}
        <label class="checkbox scene-remember">
          <input type="checkbox" data-role="remember" ${generationState.rememberKey ? 'checked' : ''} />
          <span>Запомнить ключ в sessionStorage</span>
        </label>
      </div>
      <div class="scene-controls__row scene-controls__actions">
        <div class="scene-button-group">
          <button type="button" class="scene-button scene-button--primary" data-action="generate" ${generateDisabled ? 'disabled' : ''}>
            Сгенерировать все сцены
          </button>
          <button type="button" class="scene-button scene-button--ghost" data-action="cancel" ${cancelDisabled ? 'disabled' : ''}>
            Отменить
          </button>
        </div>
        <div class="scene-status-text">
          <span>${escapeHtml(statusText)}</span>
          ${
            totalScenes
              ? `<div class="scene-progress-track" aria-hidden="true"><div class="scene-progress-fill" style="width: ${progress.percent}%"></div></div>`
              : ''
          }
        </div>
      </div>
      ${manualFeedback}
      ${!generationState.feedback || generationState.feedbackType === 'success' ? staleFeedback : ''}
    </div>
  `;

  return controls;
}

function renderSceneCard(scene, index) {
  const result = generationState.results[index] ?? { status: 'idle' };
  const isRunning = generationState.status === 'running';
  const isCurrent = isRunning && generationState.currentIndex === index;
  let statusBlock = '';

  if (result.status === 'success' && result.url) {
    statusBlock = `
      <figure class="scene-preview">
        <img src="${escapeHtml(result.url)}" alt="${escapeHtml(scene.title)}" loading="lazy" />
        <figcaption>
          <span>Сцена готова. Изображение доступно по ссылке ниже.</span>
          ${
            result.revisedPrompt
              ? `<span class="scene-note"><strong>Уточнённый промпт:</strong> ${escapeHtml(result.revisedPrompt)}</span>`
              : ''
          }
        </figcaption>
      </figure>
    `;
  } else if (result.status === 'error') {
    statusBlock = `<p class="scene-error">Ошибка: ${escapeHtml(result.message)}</p>`;
  } else if (result.status === 'stale') {
    statusBlock = `
      <div class="scene-warning">
        <p>Параметры изменились, изображение может быть устаревшим.</p>
        ${
          result.url
            ? `<a class="scene-button scene-button--primary-link" href="${escapeHtml(result.url)}" target="_blank" rel="noopener">Открыть последний рендер</a>`
            : ''
        }
      </div>
    `;
  } else if (result.status === 'pending' && isCurrent) {
    statusBlock = '<p class="scene-progress">Генерация сцены...</p>';
  } else if (result.status === 'pending') {
    statusBlock = '<p class="scene-status">Ожидает очереди на генерацию.</p>';
  } else {
    statusBlock = '<p class="scene-status scene-status--muted">Изображение ещё не создано.</p>';
  }

  const actions = [];

  actions.push(
    `<button type="button" class="scene-button scene-button--ghost" data-action="copy-prompt" data-index="${index}" ${
      isRunning ? 'disabled' : ''
    }>Скопировать промпт</button>`
  );

  if (result.status === 'success' && result.url) {
    actions.push(
      `<a class="scene-button scene-button--primary-link" href="${escapeHtml(result.url)}" target="_blank" rel="noopener">Открыть рендер</a>`
    );
  }

  return `
    <article class="scene-card" data-scene-index="${index}">
      <h3>${escapeHtml(scene.title)}</h3>
      <p><strong>Цель:</strong> ${escapeHtml(scene.goal)}</p>
      <p><strong>Параметры:</strong> ${escapeHtml(scene.parameters)}</p>
      ${renderScenePrompt(scene.prompt)}
      ${statusBlock}
      <div class="scene-actions">${actions.join('')}</div>
    </article>
  `;
}

function renderScenePrompt(prompt) {
  return `
    <div class="scene-prompt-block">
      <span>Промпт:</span>
      <pre>${escapeHtml(prompt)}</pre>
    </div>
  `;
}

function attachSceneControlHandlers(container) {
  const generateButton = container.querySelector('[data-action="generate"]');
  const cancelButton = container.querySelector('[data-action="cancel"]');
  const toggleButton = container.querySelector('[data-action="toggle-key"]');
  const apiKeyInput = container.querySelector('[data-role="api-key"]');
  const rememberCheckbox = container.querySelector('[data-role="remember"]');
  const copyButtons = container.querySelectorAll('[data-action="copy-prompt"]');

  if (generateButton) {
    generateButton.addEventListener('click', () => {
      void startSceneGeneration();
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      cancelSceneGeneration();
    });
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      generationState.showApiKey = !generationState.showApiKey;
      refreshSceneView();
    });
  }

  if (apiKeyInput instanceof HTMLInputElement) {
    apiKeyInput.addEventListener('input', () => {
      generationState.apiKey = apiKeyInput.value;

      if (generationState.rememberKey) {
        persistApiKey(generationState.apiKey);
      }
    });
  }

  if (rememberCheckbox instanceof HTMLInputElement) {
    rememberCheckbox.addEventListener('change', () => {
      generationState.rememberKey = rememberCheckbox.checked;

      if (generationState.rememberKey) {
        persistApiKey(generationState.apiKey);

        if (generationState.status !== 'running') {
          showTemporaryFeedback('Ключ сохранён до конца сессии.', 'info', 2200);
        }
      } else {
        persistApiKey('');

        if (generationState.status !== 'running') {
          showTemporaryFeedback('Ключ удалён из sessionStorage.', 'info', 2200);
        }
      }
    });
  }

  copyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.getAttribute('data-index'));

      if (!Number.isNaN(index)) {
        void copyScenePrompt(index);
      }
    });
  });
}

async function startSceneGeneration() {
  if (generationState.status === 'running') {
    return;
  }

  const scenes = generationState.scenes;

  if (!scenes.length) {
    generationState.feedback = 'Нет сцен для генерации.';
    generationState.feedbackType = 'error';
    refreshSceneView();
    return;
  }

  const apiKey = generationState.apiKey.trim();

  if (!apiKey) {
    generationState.feedback = 'Введите API-ключ OpenAI, чтобы сгенерировать рендеры.';
    generationState.feedbackType = 'error';
    refreshSceneView();
    return;
  }

  clearFeedbackTimeout();

  if (generationState.rememberKey) {
    persistApiKey(apiKey);
  }

  generationState.feedback = null;
  generationState.feedbackType = 'info';
  generationState.status = 'running';
  generationState.currentIndex = -1;
  generationState.controller = new AbortController();
  generationState.results = scenes.map(() => ({ status: 'pending', promptSignature: '' }));

  refreshSceneView();

  let aborted = false;
  let hasErrors = false;

  for (let index = 0; index < scenes.length; index += 1) {
    if (!generationState.controller || generationState.controller.signal.aborted) {
      aborted = true;
      break;
    }

    generationState.currentIndex = index;
    refreshSceneView();

    try {
      const scene = scenes[index];
      const signature = composeSceneSignature(scene);
      const result = await requestDalleImage(scene, apiKey, generationState.controller.signal);

      generationState.results[index] = {
        status: 'success',
        url: result.url,
        revisedPrompt: result.revisedPrompt,
        promptSignature: signature
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        aborted = true;
        break;
      }

      hasErrors = true;
      generationState.results[index] = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка при обращении к API изображений.',
        promptSignature: signature
      };
    }

    refreshSceneView();
  }

  generationState.controller = null;
  generationState.currentIndex = -1;

  if (aborted) {
    generationState.status = 'aborted';
    generationState.feedback = 'Генерация остановлена.';
    generationState.feedbackType = 'warning';
  } else if (hasErrors) {
    generationState.status = 'partial';
    generationState.feedback = 'Некоторые сцены не удалось создать. Проверьте сообщения внутри карточек.';
    generationState.feedbackType = 'warning';
  } else {
    generationState.status = 'completed';
    generationState.feedback = 'Готово! Все сцены сгенерированы и доступны ниже.';
    generationState.feedbackType = 'success';
  }

  refreshSceneView();
}

function cancelSceneGeneration() {
  if (generationState.controller) {
    generationState.controller.abort();
  }
}

async function copyScenePrompt(index) {
  const scene = generationState.scenes[index];

  if (!scene) {
    return;
  }

  try {
    await copyTextToClipboard(composeSceneSignature(scene));

    if (!generationState.feedback || generationState.feedbackType === 'info' || generationState.feedbackType === 'success') {
      showTemporaryFeedback('Промпт скопирован в буфер обмена.', 'success', 2200);
    }
  } catch (error) {
    generationState.feedback = 'Не удалось скопировать промпт. Разрешите доступ к буферу обмена.';
    generationState.feedbackType = 'error';
    refreshSceneView();
  }
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  const selection = document.getSelection();
  const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);

  if (selectedRange && selection) {
    selection.removeAllRanges();
    selection.addRange(selectedRange);
  }
}

function refreshSceneView() {
  if (rendersContainerRef && generationState.scenes.length) {
    renderScenes(rendersContainerRef, generationState.scenes);
  }
}

function ensureSceneResultsLength(length) {
  if (generationState.results.length === length) {
    return;
  }

  const nextResults = Array.from({ length }, (_, index) => generationState.results[index] ?? { status: 'idle' });
  generationState.results = nextResults;
}

function markStaleSceneResults(scenes) {
  generationState.results = scenes.map((scene, index) => {
    const existing = generationState.results[index] ?? { status: 'idle' };
    const signature = composeSceneSignature(scene);

    if (existing.status === 'pending') {
      return existing;
    }

    if (existing.status === 'success' || existing.status === 'stale') {
      if (existing.promptSignature && existing.promptSignature !== signature) {
        return { ...existing, status: 'stale' };
      }

      if (existing.status === 'stale' && existing.promptSignature === signature) {
        return { ...existing, status: 'success' };
      }

      return existing;
    }

    if (existing.status === 'error' && existing.promptSignature && existing.promptSignature !== signature) {
      return { status: 'idle' };
    }

    return existing;
  });
}

function updateCompletedCountFromResults() {
  if (generationState.status === 'running') {
    return;
  }

  generationState.completedCount = generationState.results.filter((result) =>
    result.status === 'success' || result.status === 'error' || result.status === 'stale'
  ).length;
}

function getProgressData(scenes) {
  const total = scenes.length;

  if (total === 0) {
    return { total: 0, finished: 0, effective: 0, percent: 0 };
  }

  const finished = generationState.results.reduce((count, result) => {
    if (result.status === 'success' || result.status === 'error' || result.status === 'stale') {
      return count + 1;
    }

    return count;
  }, 0);

  const inProgressBonus =
    generationState.status === 'running' && generationState.currentIndex >= 0
      ? Math.min(1, total - finished)
      : 0;

  const effective = Math.min(total, finished + inProgressBonus);
  const percent = Math.round((effective / total) * 100);

  return { total, finished, effective, percent };
}

function getSceneStatusText(totalScenes, progress) {
  if (totalScenes === 0) {
    return 'Нет сцен для генерации.';
  }

  switch (generationState.status) {
    case 'running':
      return `Генерация: ${progress.effective}/${totalScenes}`;
    case 'completed':
      return `Готово: ${progress.finished}/${totalScenes} сцен.`;
    case 'partial':
      return `Готово с предупреждениями: ${progress.finished}/${totalScenes} сцен.`;
    case 'aborted':
      return `Остановлено на ${progress.finished}/${totalScenes} сценах.`;
    default:
      if (progress.finished > 0) {
        return `Доступно ${progress.finished}/${totalScenes} изображений.`;
      }

      return 'Готово к запуску генерации.';
  }
}

function resolveFeedbackClass(type) {
  return ['success', 'warning', 'error', 'info'].includes(type) ? type : 'info';
}

function composeSceneSignature(scene) {
  return `${scene.goal}. ${scene.parameters}. ${scene.prompt}`;
}

async function requestDalleImage(scene, apiKey, signal) {
  const finalPrompt = composeSceneSignature(scene);

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: finalPrompt,
      size: '1024x1024',
      quality: 'high',
      n: 1,
      response_format: 'url'
    }),
    signal
  });

  let payload;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message ?? `API изображений ответил ошибкой (${response.status}).`;
    throw new Error(message);
  }

  const data = Array.isArray(payload?.data) ? payload.data[0] : null;

  if (!data) {
    throw new Error('API не вернуло данных об изображении.');
  }

  if (data.url) {
    return { url: data.url, revisedPrompt: data.revised_prompt ?? '' };
  }

  if (data.b64_json) {
    return {
      url: `data:image/png;base64,${data.b64_json}`,
      revisedPrompt: data.revised_prompt ?? ''
    };
  }

  throw new Error('Ответ API не содержит ссылки на изображение.');
}

function hydrateApiKeyFromSession() {
  if (!supportsSessionStorage()) {
    return;
  }

  try {
    const storedKey = window.sessionStorage.getItem(generationSessionKey);

    if (storedKey) {
      generationState.apiKey = storedKey;
      generationState.rememberKey = true;
    }
  } catch (error) {
    // Игнорируем ошибки доступа к sessionStorage
  }
}

function persistApiKey(value) {
  if (!supportsSessionStorage()) {
    return;
  }

  try {
    if (value) {
      window.sessionStorage.setItem(generationSessionKey, value);
    } else {
      window.sessionStorage.removeItem(generationSessionKey);
    }
  } catch (error) {
    generationState.feedback = 'Не удалось сохранить ключ в sessionStorage. Проверьте настройки браузера.';
    generationState.feedbackType = 'warning';
    refreshSceneView();
  }
}

function supportsSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function showTemporaryFeedback(message, type = 'info', duration = 2200) {
  if (!rendersContainerRef) {
    return;
  }

  if (generationState.status === 'running' && type !== 'error' && type !== 'warning') {
    return;
  }

  clearFeedbackTimeout();
  generationState.feedback = message;
  generationState.feedbackType = type;
  refreshSceneView();

  if (typeof window !== 'undefined') {
    feedbackTimeoutId = window.setTimeout(() => {
      generationState.feedback = null;
      feedbackTimeoutId = null;
      refreshSceneView();
    }, duration);
  }
}

function clearFeedbackTimeout() {
  if (feedbackTimeoutId && typeof window !== 'undefined') {
    window.clearTimeout(feedbackTimeoutId);
    feedbackTimeoutId = null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatArea(value) {
  return `${formatNumber(value, value < 100 ? 1 : 0)} м²`;
}

function formatDimension(value) {
  return formatNumber(value, value % 1 === 0 ? 0 : 1);
}

function formatPercentage(value) {
  return `${formatNumber(value, 1)}%`;
}

function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
