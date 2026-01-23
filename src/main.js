import './style.css';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('Не удалось найти корневой элемент приложения.');
}

const modelResponses = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    title: 'Model 1',
    summary:
      'Структурирует ответ через этапы: анализ запроса, план, итог с чек-листом. Акцент на ясной логике и сценариях использования.'
  },
  {
    id: 'gemini',
    name: 'Gemini',
    title: 'Model 2',
    summary:
      'Добавляет контекст и ограничения, предлагает варианты решений и метрики качества. Упор на практичность и масштабируемость.'
  },
  {
    id: 'claude',
    name: 'Claude',
    title: 'Model 3',
    summary:
      'Формирует более человечный ответ: ясный язык, риски, альтернативы. Поддерживает UX и коммуникацию результата.'
  }
];

const consensusReasons = [
  'Сводит ключевые идеи без повторов и противоречий.',
  'Убирает слабые допущения, заменяя их подтверждаемыми шагами.',
  'Сохраняет краткость, но оставляет проверяемую структуру действий.'
];

const pipelineSteps = [
  {
    title: 'Prompt Optimizer',
    description:
      'Превращает сырой запрос в точный, структурированный и однозначный промт с целями, контекстом и форматами ответа.'
  },
  {
    title: 'Parallel Multi-Model',
    description:
      'Одновременно отправляет улучшенный промт в 3 модели с едиными ограничениями, фиксирует ответы в одном формате.'
  },
  {
    title: 'Consensus Engine',
    description:
      'Сравнивает ответы, обнаруживает расхождения, проверяет слабые места и аргументы.'
  },
  {
    title: 'Final Best Answer',
    description:
      'Синтезирует лучший вариант и объясняет, почему он победил и что было отброшено.'
  }
];

const fullStackPlan = [
  {
    title: 'Frontend (React / Next.js)',
    items: [
      'Десктоп‑first UX, быстрый ввод и предпросмотр улучшенного промта.',
      'Карточки моделей с копированием, сворачиванием и режимом фокуса.',
      'Состояния «выполнение/готово», плавная анимация и автоскролл к финалу.'
    ]
  },
  {
    title: 'API Gateway',
    items: [
      'Единая точка входа для всех моделей и лимитов.',
      'Нормализация формата ответа и трассировка запросов.',
      'Роутинг на провайдеров: OpenAI, Gemini, Claude.'
    ]
  },
  {
    title: 'Prompt Optimizer',
    items: [
      'Преобразование запроса в структуру: цель, контекст, ограничения.',
      'Валидация на двусмысленность и авто‑улучшение.',
      'Отправка улучшенного промта всем моделям.'
    ]
  },
  {
    title: 'Consensus Engine',
    items: [
      'Сравнение ответов по полноте, точности и логике.',
      'Выявление противоречий и слабых гипотез.',
      'Синтез финального ответа с объяснением выбора.'
    ]
  },
  {
    title: 'Data & Analytics',
    items: [
      'Логи запросов, версий промтов, трекинг качества.',
      'Хранилище для истории запросов и рейтингов моделей.',
      'A/B‑эксперименты по форматам ответа.'
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      'Serverless или контейнеры + autoscaling.',
      'Кэширование, очереди для heavy‑prompt запросов.',
      'Наблюдаемость: метрики, алерты, трассировка.'
    ]
  }
];

const focusLabels = {
  on: 'Фокус на лучший ответ',
  off: 'Полный режим'
};

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand__badge">Multi-AI Suite</span>
        <div>
          <h1>Consensus OS</h1>
          <p>Премиальная система: 3 модели, улучшение промта, консилиум и лучший итоговый ответ.</p>
        </div>
      </div>
      <div class="topbar__actions">
        <button class="icon-button" type="button" data-action="toggle-theme">
          <span class="icon-button__icon">◐</span>
          <span>Тема</span>
        </button>
        <button class="icon-button" type="button" data-action="toggle-focus">
          <span class="icon-button__icon">◎</span>
          <span data-role="focus-label">${focusLabels.on}</span>
        </button>
      </div>
    </header>

    <main class="content">
      <section class="hero">
        <div class="hero__copy">
          <h2>Один запрос → три модели → консилиум → лучший ответ.</h2>
          <p>
            Вы задаёте вопрос один раз. Система улучшает промт, запускает 3 модели параллельно и выдаёт победителя с объяснением.
          </p>
          <div class="hero__chips">
            <span>⚡️ Мгновенный консенсус</span>
            <span>🧠 Авто-улучшение промта</span>
            <span>🔍 Проверка логики</span>
          </div>
        </div>
        <div class="hero__panel">
          <label class="input-label" for="prompt-input">Единый запрос</label>
          <textarea id="prompt-input" placeholder="Например: Спроектируй стратегию запуска SaaS в B2B, цель — 500 лидов за 60 дней"></textarea>
          <div class="hero__actions">
            <button class="primary-button" type="button" data-action="run">Запустить 3 модели</button>
            <div class="secondary-actions">
              <button class="ghost-button" type="button" data-action="clear">Очистить</button>
              <button class="ghost-button" type="button" data-action="example">Пример запроса</button>
            </div>
          </div>
          <p class="helper-text">Запрос оптимизируется автоматически — вы можете только наблюдать за улучшенным промтом.</p>
        </div>
      </section>

      <section class="pipeline" aria-label="Архитектура системы">
        ${pipelineSteps
          .map(
            (step) => `
            <article class="pipeline-card">
              <h3>${step.title}</h3>
              <p>${step.description}</p>
            </article>
          `
          )
          .join('')}
      </section>

      <section class="stack-plan" aria-label="Фулл‑стак план">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Full-Stack Plan</span>
            <h2>Фулл‑стак план реализации</h2>
            <p>Практический маршрут от интерфейса до инфраструктуры: масштабируемо и готово к добавлению 4–10 моделей.</p>
          </div>
          <button class="icon-button" type="button" data-action="copy-plan">Скопировать план</button>
        </div>
        <div class="stack-plan__grid">
          ${fullStackPlan
            .map(
              (block) => `
              <article class="stack-card">
                <h3>${block.title}</h3>
                <ul>
                  ${block.items.map((item) => `<li>${item}</li>`).join('')}
                </ul>
              </article>
            `
            )
            .join('')}
        </div>
      </section>

      <section class="optimized" aria-label="Улучшенный промт">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Prompt Optimizer</span>
            <h2>Улучшенный промт</h2>
            <p>Система переписывает запрос в формат, пригодный для точного ответа и сравнения моделей.</p>
          </div>
          <button class="icon-button" type="button" data-action="copy-optimized">Скопировать</button>
        </div>
        <textarea class="optimized__output" data-role="optimized" readonly></textarea>
      </section>

      <section class="models" aria-label="Ответы моделей">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Multi-Model Responses</span>
            <h2>Параллельные ответы 3 моделей</h2>
            <p>Каждая модель отвечает независимо. Мы сохраняем формат, чтобы удобно сравнивать.</p>
          </div>
          <div class="section-actions">
            <button class="ghost-button" type="button" data-action="collapse-all">Свернуть все</button>
            <button class="ghost-button" type="button" data-action="expand-all">Развернуть все</button>
          </div>
        </div>
        <div class="model-grid">
          ${modelResponses
            .map(
              (model) => `
              <article class="model-card" data-model="${model.id}">
                <header>
                  <div>
                    <span class="model-badge">${model.title}</span>
                    <h3>${model.name}</h3>
                  </div>
                  <div class="model-actions">
                    <button class="chip-button" type="button" data-action="copy" data-model="${model.id}">Копировать</button>
                    <button class="chip-button" type="button" data-action="toggle" data-model="${model.id}">Свернуть</button>
                  </div>
                </header>
                <div class="model-content">
                  <p class="model-summary">${model.summary}</p>
                  <ul>
                    <li><strong>Контекст:</strong> чётко обозначен, чтобы избежать домыслов.</li>
                    <li><strong>Цель:</strong> измеримый результат и критерии качества.</li>
                    <li><strong>Формат:</strong> структурированный план + краткий финал.</li>
                  </ul>
                </div>
              </article>
            `
            )
            .join('')}
        </div>
      </section>

      <section class="consensus" aria-label="Лучший итоговый ответ">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">Consensus Engine</span>
            <h2>Решение консилиума — лучший ответ</h2>
            <p>Система объясняет, почему выбран именно этот результат и какие ответы уступили.</p>
          </div>
          <button class="icon-button" type="button" data-action="copy-final">Скопировать итог</button>
        </div>
        <div class="consensus__body" data-role="final">
          <div class="final-answer" data-role="final-answer">
            <h3>Final Best Answer</h3>
            <p>
              Стартуем с улучшенного промта, фиксируем единый формат ответа, получаем 3 независимых результата. Затем
              консилиум выделяет лучшую стратегию и формирует единый краткий план: цели, шаги, риски, KPI и формат
              результата для клиента.
            </p>
            <ol>
              <li>Определить цель и метрики успеха до отправки запроса.</li>
              <li>Сравнить ответы по полноте, точности и соответствию целям.</li>
              <li>Собрать единый итог, убрать противоречия и усилить аргументы.</li>
            </ol>
          </div>
          <aside class="final-notes">
            <h4>Почему этот ответ лучший</h4>
            <ul>
              ${consensusReasons.map((reason) => `<li>${reason}</li>`).join('')}
            </ul>
            <div class="final-meta">
              <span>🔥 Победил баланс глубины и ясности</span>
              <span>🛡 Ошибки других ответов убраны</span>
              <span>📌 Итог готов к действию</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  </div>
`;

const promptInput = app.querySelector('#prompt-input');
const optimizedOutput = app.querySelector('[data-role="optimized"]');
const runButton = app.querySelector('[data-action="run"]');
const clearButton = app.querySelector('[data-action="clear"]');
const exampleButton = app.querySelector('[data-action="example"]');
const focusLabel = app.querySelector('[data-role="focus-label"]');
const finalSection = app.querySelector('.consensus');

if (!promptInput || !optimizedOutput || !runButton || !clearButton || !exampleButton || !focusLabel || !finalSection) {
  throw new Error('Не удалось инициализировать интерфейс.');
}

const themeToggle = app.querySelector('[data-action="toggle-theme"]');
const focusToggle = app.querySelector('[data-action="toggle-focus"]');
const copyOptimizedButton = app.querySelector('[data-action="copy-optimized"]');
const copyFinalButton = app.querySelector('[data-action="copy-final"]');
const copyPlanButton = app.querySelector('[data-action="copy-plan"]');
const collapseAllButton = app.querySelector('[data-action="collapse-all"]');
const expandAllButton = app.querySelector('[data-action="expand-all"]');

const modelCards = [...app.querySelectorAll('.model-card')];
const copyButtons = [...app.querySelectorAll('[data-action="copy"]')];
const toggleButtons = [...app.querySelectorAll('[data-action="toggle"]')];

const DEFAULT_PROMPT =
  'Сформируй стратегию запуска SaaS-продукта для B2B: цель — 500 квалифицированных лидов за 60 дней, бюджет ограничен.';

const EXAMPLE_PROMPT =
  'Нужен план вывода AI-инструмента для отдела продаж: указать позиционирование, каналы, KPI и риски в формате таблицы.';

let isRunning = false;
let focusMode = false;

initializeTheme();
updateOptimizedPrompt();

promptInput.addEventListener('input', () => {
  updateOptimizedPrompt();
});

runButton.addEventListener('click', () => {
  if (isRunning) return;
  runSimulation();
});

clearButton.addEventListener('click', () => {
  promptInput.value = '';
  updateOptimizedPrompt();
});

exampleButton.addEventListener('click', () => {
  promptInput.value = EXAMPLE_PROMPT;
  updateOptimizedPrompt();
  promptInput.focus();
});

copyOptimizedButton?.addEventListener('click', () => {
  copyToClipboard(optimizedOutput.value, copyOptimizedButton);
});

copyFinalButton?.addEventListener('click', () => {
  const finalText = app.querySelector('[data-role="final-answer"]')?.innerText ?? '';
  copyToClipboard(finalText, copyFinalButton);
});

copyPlanButton?.addEventListener('click', () => {
  const planText = fullStackPlan
    .map((block) => `${block.title}\n- ${block.items.join('\n- ')}`)
    .join('\n\n');
  copyToClipboard(planText, copyPlanButton);
});

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem('multi-ai-theme', nextTheme);
});

focusToggle?.addEventListener('click', () => {
  focusMode = !focusMode;
  document.body.classList.toggle('focus-mode', focusMode);
  focusLabel.textContent = focusMode ? focusLabels.off : focusLabels.on;
});

collapseAllButton?.addEventListener('click', () => {
  modelCards.forEach((card) => card.classList.add('is-collapsed'));
  toggleButtons.forEach((button) => {
    button.textContent = 'Развернуть';
  });
});

expandAllButton?.addEventListener('click', () => {
  modelCards.forEach((card) => card.classList.remove('is-collapsed'));
  toggleButtons.forEach((button) => {
    button.textContent = 'Свернуть';
  });
});

copyButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const modelId = button.dataset.model;
    const card = modelCards.find((item) => item.dataset.model === modelId);
    const text = card?.innerText ?? '';
    copyToClipboard(text, button);
  });
});

toggleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const modelId = button.dataset.model;
    const card = modelCards.find((item) => item.dataset.model === modelId);
    if (!card) return;
    const isCollapsed = card.classList.toggle('is-collapsed');
    button.textContent = isCollapsed ? 'Развернуть' : 'Свернуть';
  });
});

function updateOptimizedPrompt() {
  const value = promptInput.value.trim() || DEFAULT_PROMPT;
  optimizedOutput.value = buildOptimizedPrompt(value);
}

function buildOptimizedPrompt(promptValue) {
  return `Роль: эксперт по запуску продуктов и AI-стратегиям.\n\nЦель: получить практичный, проверяемый план действий.\n\nИсходный запрос пользователя:\n${promptValue}\n\nКонтекст и ограничения:\n- Указать ключевые гипотезы и метрики успеха.\n- Дать 2-3 альтернативы и риски для каждой.\n- Сохранить ясный, структурированный формат.\n\nФормат ответа:\n1. Краткий итог (3-5 предложений).\n2. План по этапам (таблица или список).\n3. Риски и проверки качества.\n4. Финальные рекомендации.`;
}

function runSimulation() {
  isRunning = true;
  runButton.disabled = true;
  runButton.textContent = 'Запуск моделей...';

  modelCards.forEach((card) => card.classList.add('is-loading'));

  setTimeout(() => {
    modelCards.forEach((card) => card.classList.remove('is-loading'));
    runButton.disabled = false;
    runButton.textContent = 'Запустить 3 модели';
    isRunning = false;
    finalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 900);
}

function copyToClipboard(text, button) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      flashCopyState(button);
    });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    flashCopyState(button);
  }
}

function flashCopyState(button) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = 'Скопировано';
  button.classList.add('is-success');
  setTimeout(() => {
    button.textContent = original || 'Копировать';
    button.classList.remove('is-success');
  }, 1200);
}

function initializeTheme() {
  const stored = localStorage.getItem('multi-ai-theme');
  if (stored) {
    document.documentElement.dataset.theme = stored;
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.dataset.theme = 'light';
  } else {
    document.documentElement.dataset.theme = 'dark';
  }
}
