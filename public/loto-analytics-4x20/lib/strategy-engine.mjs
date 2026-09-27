export const DISCLAIMER = "Это объяснение описывает правило отбора, а не прогноз выигрыша. Результаты прошлых тиражей сами по себе не делают конкретное число более вероятным в следующем независимом тираже.";

const RANDOM = {
  key: "random",
  name: "Random",
  shortDescription: "Контрольный вариант без анализа прошлых тиражей.",
  plainDescription: "Компьютер случайно выбирает 4 числа в каждом поле. История тиражей здесь не используется: стратегия служит честной контрольной точкой для парного сравнения.",
  lookback: null,
  deterministic: false,
  tier: "production",
  status: "baseline",
};

const HOT200 = {
  key: "hot200",
  name: "Горячие 200",
  shortDescription: "Самые часто выпадавшие числа в последних 200 тиражах.",
  plainDescription: "Берём последние 200 завершённых тиражей и отдельно для каждого поля считаем частоту каждого числа. Это exploratory-гипотеза, а не основание считать число более вероятным в следующем тираже.",
  lookback: 200,
  deterministic: true,
  tier: "research",
  status: "exploratory",
};

const COLD200 = {
  key: "cold200",
  name: "Холодные 200",
  shortDescription: "Самые редко выпадавшие числа в последних 200 тиражах.",
  plainDescription: "Берём последние 200 завершённых тиражей и выбираем четыре самых редких числа каждого поля. Это exploratory-гипотеза и она не получает production-статус из исторического backtest.",
  lookback: 200,
  deterministic: true,
  tier: "research",
  status: "exploratory",
};

const HOT1000 = {
  key: "hot1000",
  name: "Горячие 1000",
  shortDescription: "Самые частые числа на окне 1000 тиражей.",
  plainDescription: "Считаем частоты по последним 1000 завершённым тиражам. Длинное окно уменьшает шум коротких всплесков, но не превращает прошлую частоту в прогноз следующего независимого тиража.",
  lookback: 1000,
  deterministic: true,
  tier: "research",
  status: "exploratory",
};

const OVERDUE = {
  key: "overdue",
  name: "Просроченные",
  shortDescription: "Числа с необычно длинным текущим перерывом.",
  plainDescription: "Для каждого числа сравниваем текущий перерыв с его историческим средним. Правило исследуется только как гипотеза: длинный перерыв сам по себе не делает число «должным» выпасть.",
  lookback: 1000,
  deterministic: true,
  tier: "research",
  status: "exploratory",
};

const HYBRID = {
  key: "hybrid",
  name: "Гибрид",
  shortDescription: "Сочетает отклонение частоты и относительный текущий перерыв.",
  plainDescription: "На окне 500 тиражей объединяем z-отклонение частоты и текущий перерыв относительно среднего. Это исследовательский score, а не доказанное предсказательное преимущество.",
  lookback: 500,
  deterministic: true,
  tier: "research",
  status: "exploratory",
};

const ADAPTIVE = {
  key: "adaptive20",
  name: "Adaptive Coverage 20",
  shortDescription: "Пять билетов покрывают все 20 чисел каждого поля ровно по одному разу, а история меняет только распределение между билетами.",
  plainDescription: "Все числа 1–20 обязательно остаются в портфеле. Исторические частоты и относительные перерывы используются только для распределения сигналов между пятью билетами. Production-преимущество может быть признано только отдельным preregistered forward-gate.",
  lookback: 500,
  deterministic: true,
  tier: "production",
  status: "experimental",
};

const BALANCED = {
  key: "balanced20",
  name: "Balanced Coverage 20",
  shortDescription: "Пятибилетный baseline с полным покрытием 1–20 без анализа истории.",
  plainDescription: "В каждом поле пять билетов используют все числа 1–20 ровно по одному разу. Это структурный контрольный портфель, а не прогноз.",
  lookback: null,
  deterministic: true,
  tier: "production",
  status: "baseline",
};

const ENSEMBLE = {
  key: "ensemble",
  name: "Walk-Forward Ensemble",
  shortDescription: "Выбирает один из пятибилетных подходов только по предыдущим out-of-sample проверкам.",
  plainDescription: "Перед генерацией сравниваются Adaptive Coverage, Balanced Coverage, прежний Hybrid Coverage и Random на уже завершённых целях. Это exploratory nested-model, поэтому он не входит в production forward-gate.",
  lookback: 500,
  deterministic: true,
  tier: "research",
  status: "exploratory",
};

const PORTFOLIO = {
  key: "portfolio5",
  name: "Портфель 5 · Hybrid Coverage",
  shortDescription: "Пять билетов с контролем перекрытий и распределением лидеров гибридного score.",
  plainDescription: "На окне 500 тиражей формируется пул из восьми лидеров и распределяется по пяти билетам. В текущем LotoOS это retired negative control: исторические проверки не дали основания использовать его как основной подход.",
  lookback: 500,
  deterministic: true,
  tier: "research",
  status: "negative_control",
};

const BASE_STRATEGIES = [RANDOM, HOT200, COLD200, HOT1000, OVERDUE, HYBRID];
export const STRATEGIES = [ADAPTIVE, BALANCED, ENSEMBLE, PORTFOLIO, ...BASE_STRATEGIES];
export const PRODUCTION_STRATEGIES = [ADAPTIVE, BALANCED, RANDOM];
export const RESEARCH_STRATEGIES = STRATEGIES.filter((strategy) => strategy.tier === "research");

const FIVE_TICKET_KEYS = new Set(["adaptive20", "balanced20", "ensemble", "portfolio5"]);
const PATTERNS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 2, 4, 6],
  [1, 3, 5, 7],
  [0, 3, 6, 7],
];
const SNAKE = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0];
const ENSEMBLE_CANDIDATES = ["adaptive20", "balanced20", "portfolio5", "random"];
const ENSEMBLE_WINDOW = 30;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom4(rnd) {
  const pool = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4).sort((a, b) => a - b);
}

function fieldOf(draw, field) {
  return field === "A" ? draw.fieldA : draw.fieldB;
}

export function metricsFor(history, field, lookback) {
  const list = history.slice(Math.max(0, history.length - lookback));
  const n = list.length;
  const counts = new Array(21).fill(0);
  const lastSeen = new Array(21).fill(-1);
  const gapSum = new Array(21).fill(0);
  const gapN = new Array(21).fill(0);

  list.forEach((draw, index) => {
    for (const value of fieldOf(draw, field)) {
      counts[value] += 1;
      if (lastSeen[value] >= 0) {
        gapSum[value] += index - lastSeen[value];
        gapN[value] += 1;
      }
      lastSeen[value] = index;
    }
  });

  const hotOrder = Array.from({ length: 20 }, (_, i) => i + 1).sort((a, b) => counts[b] - counts[a] || a - b);
  const coldOrder = Array.from({ length: 20 }, (_, i) => i + 1).sort((a, b) => counts[a] - counts[b] || a - b);
  const p = 0.2;
  const sd = Math.sqrt(Math.max(1, n) * p * (1 - p)) || 1;

  return Array.from({ length: 20 }, (_, idx) => {
    const value = idx + 1;
    const gap = lastSeen[value] >= 0 ? n - 1 - lastSeen[value] : n;
    const meanGap = gapN[value] > 0 ? gapSum[value] / gapN[value] : 5;
    const overdueRatio = meanGap > 0 ? gap / meanGap : 0;
    const z = (counts[value] - n * p) / sd;
    return {
      value,
      count: counts[value],
      rankHot: hotOrder.indexOf(value) + 1,
      rankCold: coldOrder.indexOf(value) + 1,
      gap,
      meanGap,
      overdueRatio,
      z,
      hybridScore: z + overdueRatio,
    };
  });
}

function topBy(metrics, score) {
  return [...metrics]
    .sort((a, b) => score(b) - score(a) || a.value - b.value)
    .slice(0, 4)
    .map((m) => m.value)
    .sort((a, b) => a - b);
}

export function selectField(strategy, history, field, seed = 20260824) {
  if (strategy === "random") {
    return pickRandom4(mulberry32(seed + (field === "A" ? 11 : 29)));
  }
  const meta = BASE_STRATEGIES.find((s) => s.key === strategy);
  if (!meta) throw new Error("selectField поддерживает только single-ticket research strategies");
  const metrics = metricsFor(history, field, meta.lookback ?? 200);
  if (strategy === "hot200" || strategy === "hot1000") return topBy(metrics, (m) => m.count);
  if (strategy === "cold200") return topBy(metrics, (m) => -m.count);
  if (strategy === "overdue") return topBy(metrics, (m) => m.overdueRatio);
  return topBy(metrics, (m) => m.hybridScore);
}

function explainBaseField(strategy, history, field, numbers) {
  const meta = BASE_STRATEGIES.find((s) => s.key === strategy);
  const fieldNumber = field === "A" ? 1 : 2;
  if (strategy === "random") {
    return {
      field: fieldNumber,
      numbers,
      summary: `Поле ${fieldNumber}: числа выбраны случайно; прошлые частоты и перерывы не учитывались.`,
      details: numbers.map((value) => `Число ${value}: случайный контрольный выбор.`),
    };
  }
  const metrics = metricsFor(history, field, meta.lookback ?? 200);
  const byValue = new Map(metrics.map((m) => [m.value, m]));
  const details = numbers.map((value) => {
    const m = byValue.get(value);
    if (strategy === "hot200" || strategy === "hot1000") {
      return `Число ${value}: ${m.count} появлений, ${m.rankHot}-е место по частоте в окне ${meta.lookback}.`;
    }
    if (strategy === "cold200") {
      return `Число ${value}: ${m.count} появлений, ${m.rankCold}-е место среди самых редких в окне 200.`;
    }
    if (strategy === "overdue") {
      return `Число ${value}: текущий перерыв ${m.gap}, средний ${m.meanGap.toFixed(1)}, отношение ${m.overdueRatio.toFixed(2)}×.`;
    }
    return `Число ${value}: z=${m.z.toFixed(2)}, перерыв ${m.overdueRatio.toFixed(2)}× среднего, hybrid=${m.hybridScore.toFixed(2)}.`;
  });
  const summary =
    strategy === "hot200" || strategy === "hot1000"
      ? `Поле ${fieldNumber}: четыре лидера по частоте за последние ${meta.lookback} завершённых тиражей.`
      : strategy === "cold200"
        ? `Поле ${fieldNumber}: четыре самых редких числа за последние 200 завершённых тиражей.`
        : strategy === "overdue"
          ? `Поле ${fieldNumber}: числа с наибольшим текущим перерывом относительно их исторического среднего.`
          : `Поле ${fieldNumber}: числа с наибольшим исследовательским score частоты и относительного перерыва.`;
  return { field: fieldNumber, numbers, summary, details };
}

export function generateTicket(strategy, history, seed = Date.now()) {
  const meta = BASE_STRATEGIES.find((s) => s.key === strategy);
  if (!meta) throw new Error("generateTicket поддерживает single-ticket research/control strategies");
  const fieldA = selectField(strategy, history, "A", seed);
  const fieldB = selectField(strategy, history, "B", seed + 1009);
  return {
    fieldA,
    fieldB,
    explanation: {
      strategy,
      strategyName: meta.name,
      summary: `${meta.plainDescription} Ниже показано, как правило привело именно к этим числам.`,
      fields: [
        explainBaseField(strategy, history, "A", fieldA),
        explainBaseField(strategy, history, "B", fieldB),
      ],
      disclaimer: DISCLAIMER,
    },
  };
}

function rankedPool(history, field) {
  return [...metricsFor(history, field, 500)]
    .sort((a, b) => b.hybridScore - a.hybridScore || b.count - a.count || a.value - b.value)
    .slice(0, 8);
}

function metricMap(history, field) {
  return new Map(metricsFor(history, field, 500).map((m) => [m.value, m]));
}

function explainPortfolioField(field, pool, numbers) {
  const map = new Map(pool.map((m) => [m.value, m]));
  const fieldNumber = field === "A" ? 1 : 2;
  return {
    field: fieldNumber,
    numbers,
    summary: `Поле ${fieldNumber}: комбинация собрана из восьми лидеров hybrid-score за 500 тиражей с контролем перекрытия между пятью билетами.`,
    details: numbers.map((value) => {
      const m = map.get(value);
      return `Число ${value}: ${m.count} появлений; z=${m.z.toFixed(2)}; перерыв ${m.gap}; hybrid=${m.hybridScore.toFixed(2)}.`;
    }),
  };
}

function portfolioTickets(history) {
  const a = rankedPool(history, "A");
  const b = rankedPool(history, "B");
  return PATTERNS.map((pattern, index) => {
    const fieldA = pattern.map((i) => a[i].value).sort((x, y) => x - y);
    const bPattern = PATTERNS[(index * 2 + 1) % PATTERNS.length];
    const fieldB = bPattern.map((i) => b[i].value).sort((x, y) => x - y);
    return {
      fieldA,
      fieldB,
      explanation: {
        strategy: "portfolio5",
        strategyName: PORTFOLIO.name,
        summary: `${PORTFOLIO.plainDescription} Это negative control, а не production-рекомендация.`,
        fields: [explainPortfolioField("A", a, fieldA), explainPortfolioField("B", b, fieldB)],
        disclaimer: DISCLAIMER,
      },
    };
  });
}

function permutation(shift = 0, step = 7) {
  return Array.from({ length: 20 }, (_, i) => ((shift + i * step) % 20) + 1);
}

function chunkFive(values) {
  return Array.from({ length: 5 }, (_, i) => values.slice(i * 4, i * 4 + 4).sort((a, b) => a - b));
}

function balancedTickets() {
  const fieldsA = chunkFive(permutation(0, 7));
  const fieldsB = chunkFive(permutation(3, 9));
  return fieldsA.map((fieldA, index) => ({
    fieldA,
    fieldB: fieldsB[index],
    explanation: {
      strategy: "balanced20",
      strategyName: BALANCED.name,
      summary: `${BALANCED.plainDescription} Портфель служит структурным baseline.`,
      fields: [
        {
          field: 1,
          numbers: fieldA,
          summary: "Поле 1: все числа 1–20 распределены между пятью билетами без повторов.",
          details: fieldA.map((value) => `Число ${value}: входит в полное покрытие и встречается в портфеле ровно один раз.`),
        },
        {
          field: 2,
          numbers: fieldsB[index],
          summary: "Поле 2: все числа 1–20 распределены между пятью билетами без повторов.",
          details: fieldsB[index].map((value) => `Число ${value}: входит в полное покрытие и встречается в портфеле ровно один раз.`),
        },
      ],
      disclaimer: DISCLAIMER,
    },
  }));
}

function adaptiveField(history, field, offset) {
  const ranked = [...metricsFor(history, field, 500)]
    .sort((a, b) => b.hybridScore - a.hybridScore || b.count - a.count || a.value - b.value);
  const buckets = Array.from({ length: 5 }, () => []);
  ranked.forEach((metric, index) => {
    const bucket = SNAKE[(index + offset) % SNAKE.length];
    buckets[bucket].push(metric.value);
  });
  if (buckets.some((bucket) => bucket.length !== 4)) {
    throw new Error("Adaptive Coverage не смог сохранить структуру 5×4");
  }
  return buckets.map((bucket) => bucket.sort((a, b) => a - b));
}

function adaptiveTickets(history) {
  const fieldsA = adaptiveField(history, "A", 0);
  const fieldsB = adaptiveField(history, "B", 3);
  const mapA = metricMap(history, "A");
  const mapB = metricMap(history, "B");
  return fieldsA.map((fieldA, index) => {
    const fieldB = fieldsB[index];
    return {
      fieldA,
      fieldB,
      explanation: {
        strategy: "adaptive20",
        strategyName: ADAPTIVE.name,
        summary: `${ADAPTIVE.plainDescription} Полное покрытие 1–20 имеет приоритет над историческим score.`,
        fields: [
          {
            field: 1,
            numbers: fieldA,
            summary: "Поле 1: четыре числа из полного покрытия распределены так, чтобы уровни hybrid-score не концентрировались в одном билете.",
            details: fieldA.map((value) => {
              const m = mapA.get(value);
              return `Число ${value}: z=${m.z.toFixed(2)}, перерыв ${m.overdueRatio.toFixed(2)}× среднего, hybrid=${m.hybridScore.toFixed(2)}; число не исключалось из-за score.`;
            }),
          },
          {
            field: 2,
            numbers: fieldB,
            summary: "Поле 2: сохранено полное покрытие 1–20, а уровни исторического score разведены между билетами.",
            details: fieldB.map((value) => {
              const m = mapB.get(value);
              return `Число ${value}: z=${m.z.toFixed(2)}, перерыв ${m.overdueRatio.toFixed(2)}× среднего, hybrid=${m.hybridScore.toFixed(2)}; число не исключалось из-за score.`;
            }),
          },
        ],
        disclaimer: DISCLAIMER,
      },
    };
  });
}

function countMatchesInternal(ticket, draw) {
  const a = new Set(draw.fieldA);
  const b = new Set(draw.fieldB);
  return {
    fieldA: ticket.fieldA.filter((value) => a.has(value)).length,
    fieldB: ticket.fieldB.filter((value) => b.has(value)).length,
  };
}

function proxyScore(tickets, draw) {
  let best = 0;
  let balanced22 = false;
  for (const ticket of tickets) {
    const matches = countMatchesInternal(ticket, draw);
    best = Math.max(best, matches.fieldA + matches.fieldB);
    if (matches.fieldA >= 2 && matches.fieldB >= 2) balanced22 = true;
  }
  return best + (balanced22 ? 0.25 : 0);
}

function baseTickets(strategy, history, count, baseSeed) {
  const capped = Math.max(1, Math.min(Number(count) || 1, strategy === "random" ? 10 : 1));
  return Array.from({ length: capped }, (_, i) => generateTicket(strategy, history, baseSeed + i * 7919));
}

function candidateTickets(key, history, seed) {
  if (key === "adaptive20") return adaptiveTickets(history);
  if (key === "balanced20") return balancedTickets();
  if (key === "portfolio5") return portfolioTickets(history);
  if (key === "random") return baseTickets("random", history, 5, seed);
  throw new Error(`Неизвестный ensemble candidate: ${key}`);
}

export function selectEnsembleCandidate(history) {
  if (!Array.isArray(history) || history.length < 80) {
    return { key: "adaptive20", evaluationDraws: 0, score: null, reason: "Недостаточно истории для внутреннего walk-forward; используется Adaptive Coverage 20." };
  }
  const start = Math.max(50, history.length - ENSEMBLE_WINDOW);
  const rows = ENSEMBLE_CANDIDATES.map((key, candidateIndex) => {
    let total = 0;
    let evaluated = 0;
    for (let i = start; i < history.length; i++) {
      const target = history[i];
      const prior = history.slice(0, i);
      const seed = (Math.imul(Number(target.number) >>> 0, 2654435761) ^ Math.imul(candidateIndex + 1, 2246822519)) >>> 0;
      total += proxyScore(candidateTickets(key, prior, seed), target);
      evaluated += 1;
    }
    return { key, score: total / Math.max(1, evaluated), evaluationDraws: evaluated };
  });
  rows.sort((a, b) => b.score - a.score || ENSEMBLE_CANDIDATES.indexOf(a.key) - ENSEMBLE_CANDIDATES.indexOf(b.key));
  const best = rows[0];
  return {
    ...best,
    reason: `Выбран ${best.key} по среднему proxy-score на ${best.evaluationDraws} предыдущих out-of-sample тиражах; каждый проверялся только по более ранней истории.`,
    candidates: rows,
  };
}

function ensembleTickets(history, seed) {
  const selection = selectEnsembleCandidate(history);
  return candidateTickets(selection.key, history, seed).map((ticket) => ({
    ...ticket,
    explanation: {
      ...ticket.explanation,
      strategy: "ensemble",
      strategyName: ENSEMBLE.name,
      summary: `${ENSEMBLE.plainDescription} ${selection.reason}`,
      disclaimer: DISCLAIMER,
      selectedCandidate: selection.key,
      evaluationDraws: selection.evaluationDraws,
    },
  }));
}

export function maxUsefulTickets(strategy) {
  if (FIVE_TICKET_KEYS.has(strategy)) return 5;
  const meta = BASE_STRATEGIES.find((s) => s.key === strategy);
  return meta?.deterministic ? 1 : 10;
}

export function generateTickets(strategy, history, count, baseSeed = Date.now()) {
  const capped = Math.max(1, Math.min(Number(count) || 1, maxUsefulTickets(strategy)));
  if (strategy === "adaptive20") return adaptiveTickets(history).slice(0, capped);
  if (strategy === "balanced20") return balancedTickets().slice(0, capped);
  if (strategy === "ensemble") return ensembleTickets(history, baseSeed).slice(0, capped);
  if (strategy === "portfolio5") return portfolioTickets(history).slice(0, capped);
  if (BASE_STRATEGIES.some((s) => s.key === strategy)) return baseTickets(strategy, history, capped, baseSeed);
  throw new Error(`Неизвестная стратегия: ${strategy}`);
}
