import {
  STRATEGIES as BASE_STRATEGIES,
  DISCLAIMER,
  metricsFor,
  generateTickets as generateBaseTickets,
  maxUsefulTickets as baseMaxUsefulTickets,
} from "./strategy.mjs";

const ADAPTIVE = {
  key: "adaptive20",
  name: "Adaptive Coverage 20",
  shortDescription: "Пять билетов покрывают все 20 чисел каждого поля ровно по одному разу, а распределение учитывает текущие исторические метрики.",
  plainDescription: "Все числа 1–20 обязательно остаются в портфеле. Исторические частоты и относительные перерывы используются только для того, чтобы развести более сильные и более слабые сигналы по разным билетам, а не для исключения чисел из игры.",
  lookback: 500,
  deterministic: true,
};

const BALANCED = {
  key: "balanced20",
  name: "Balanced Coverage 20",
  shortDescription: "Честный 5-билетный baseline с полным покрытием 1–20 без анализа истории.",
  plainDescription: "В каждом поле пять билетов используют все числа от 1 до 20 ровно по одному разу. Это не прогноз и не попытка найти горячие числа — это контрольный портфель с максимальным разнообразием без повторов внутри поля.",
  lookback: null,
  deterministic: true,
};

const ENSEMBLE = {
  key: "ensemble",
  name: "Walk-Forward Ensemble",
  shortDescription: "Выбирает один из 5-билетных подходов только по предыдущим out-of-sample проверкам.",
  plainDescription: "Перед генерацией система сравнивает Adaptive Coverage, Balanced Coverage, прежний Hybrid Coverage и Random на небольшом окне уже завершённых тиражей. Для каждого проверяемого тиража используются только более ранние данные, поэтому будущий результат не попадает в выбор стратегии.",
  lookback: 500,
  deterministic: true,
};

const PORTFOLIO = {
  key: "portfolio5",
  name: "Портфель 5 · Hybrid Coverage",
  shortDescription: "Пять разных билетов с контролем перекрытий и распределением сильнейших сигналов.",
  plainDescription: "Берём последние 500 завершённых тиражей, отдельно для каждого поля считаем частотное отклонение и текущий перерыв, формируем пул из восьми лидеров по гибридному баллу и раскладываем его по пяти билетам так, чтобы не копировать одну и ту же комбинацию. Эта стратегия оставлена как challenger, а не как default.",
  lookback: 500,
  deterministic: true,
};

export const STRATEGIES = [ADAPTIVE, BALANCED, ENSEMBLE, PORTFOLIO, ...BASE_STRATEGIES];

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

function rankedPool(history, field) {
  return [...metricsFor(history, field, 500)]
    .sort((a, b) => b.hybridScore - a.hybridScore || b.count - a.count || a.value - b.value)
    .slice(0, 8);
}

function metricMap(history, field) {
  return new Map(metricsFor(history, field, 500).map((m) => [m.value, m]));
}

function explainField(field, pool, numbers) {
  const map = new Map(pool.map((m) => [m.value, m]));
  const fieldNumber = field === "A" ? 1 : 2;
  return {
    field: fieldNumber,
    numbers,
    summary: `Поле ${fieldNumber}: комбинация собрана из восьми лидеров гибридного рейтинга за 500 тиражей с контролем перекрытия между пятью билетами.`,
    details: numbers.map((value) => {
      const m = map.get(value);
      return `Число ${value}: ${m.count} появлений; z=${m.z.toFixed(2)}; текущий перерыв ${m.gap}; гибридный балл ${m.hybridScore.toFixed(2)}.`;
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
        summary: `${PORTFOLIO.plainDescription} Это диверсификация выбора, а не доказательство прогностического преимущества.`,
        fields: [explainField("A", a, fieldA), explainField("B", b, fieldB)],
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
      summary: `${BALANCED.plainDescription} Портфель служит честным 5-билетным baseline и не использует прошлые тиражи.`,
      fields: [
        {
          field: 1,
          numbers: fieldA,
          summary: "Поле 1: все числа 1–20 распределены между пятью билетами без повторов.",
          details: fieldA.map((value) => `Число ${value}: входит в полное покрытие 1–20 и встречается в портфеле ровно один раз.`),
        },
        {
          field: 2,
          numbers: fieldsB[index],
          summary: "Поле 2: все числа 1–20 распределены между пятью билетами без повторов.",
          details: fieldsB[index].map((value) => `Число ${value}: входит в полное покрытие 1–20 и встречается в портфеле ровно один раз.`),
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
        summary: `${ADAPTIVE.plainDescription} Полное покрытие 1–20 имеет приоритет над историческим сигналом.`,
        fields: [
          {
            field: 1,
            numbers: fieldA,
            summary: "Поле 1: четыре числа взяты из полного покрытия 1–20 и распределены так, чтобы разные уровни гибридного рейтинга не концентрировались в одном билете.",
            details: fieldA.map((value) => {
              const m = mapA.get(value);
              return `Число ${value}: z=${m.z.toFixed(2)}, перерыв ${m.overdueRatio.toFixed(2)}× среднего, hybrid=${m.hybridScore.toFixed(2)}; число не исключалось из-за рейтинга.`;
            }),
          },
          {
            field: 2,
            numbers: fieldB,
            summary: "Поле 2: сохранено полное покрытие 1–20, а сильные и слабые исторические сигналы разведены между билетами.",
            details: fieldB.map((value) => {
              const m = mapB.get(value);
              return `Число ${value}: z=${m.z.toFixed(2)}, перерыв ${m.overdueRatio.toFixed(2)}× среднего, hybrid=${m.hybridScore.toFixed(2)}; число не исключалось из-за рейтинга.`;
            }),
          },
        ],
        disclaimer: DISCLAIMER,
      },
    };
  });
}

function countMatches(ticket, draw) {
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
    const matches = countMatches(ticket, draw);
    best = Math.max(best, matches.fieldA + matches.fieldB);
    if (matches.fieldA >= 2 && matches.fieldB >= 2) balanced22 = true;
  }
  return best + (balanced22 ? 0.25 : 0);
}

function candidateTickets(key, history, seed) {
  if (key === "adaptive20") return adaptiveTickets(history);
  if (key === "balanced20") return balancedTickets();
  if (key === "portfolio5") return portfolioTickets(history);
  if (key === "random") return generateBaseTickets("random", history, 5, seed);
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
    reason: `Выбран ${best.key} по среднему proxy-score на ${best.evaluationDraws} предыдущих out-of-sample тиражах; каждый из них оценивался только по более ранней истории.`,
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
  return baseMaxUsefulTickets(strategy);
}

export function generateTickets(strategy, history, count, baseSeed = Date.now()) {
  const capped = Math.max(1, Math.min(Number(count) || 1, maxUsefulTickets(strategy)));
  if (strategy === "adaptive20") return adaptiveTickets(history).slice(0, capped);
  if (strategy === "balanced20") return balancedTickets().slice(0, capped);
  if (strategy === "ensemble") return ensembleTickets(history, baseSeed).slice(0, capped);
  if (strategy === "portfolio5") return portfolioTickets(history).slice(0, capped);
  return generateBaseTickets(strategy, history, capped, baseSeed);
}
