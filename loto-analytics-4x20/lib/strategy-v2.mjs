import {
  STRATEGIES as BASE_STRATEGIES,
  DISCLAIMER,
  metricsFor,
  generateTickets as generateBaseTickets,
  maxUsefulTickets as baseMaxUsefulTickets,
} from "./strategy.mjs";

const PORTFOLIO = {
  key: "portfolio5",
  name: "Портфель 5 · Hybrid Coverage",
  shortDescription: "Пять разных билетов с контролем перекрытий и распределением сильнейших сигналов.",
  plainDescription: "Берём последние 500 завершённых тиражей, отдельно по каждому полю считаем частотное отклонение и текущий перерыв, формируем пул из восьми лидеров по гибридному баллу и раскладываем его по пяти билетам так, чтобы не копировать одну и ту же комбинацию и увеличить покрытие.",
  lookback: 500,
  deterministic: true,
};

export const STRATEGIES = [PORTFOLIO, ...BASE_STRATEGIES];

const PATTERNS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [0, 2, 4, 6],
  [1, 3, 5, 7],
  [0, 3, 6, 7],
];

function rankedPool(history, field) {
  return [...metricsFor(history, field, 500)]
    .sort((a, b) => b.hybridScore - a.hybridScore || b.count - a.count || a.value - b.value)
    .slice(0, 8);
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

export function maxUsefulTickets(strategy) {
  if (strategy === "portfolio5") return 5;
  return baseMaxUsefulTickets(strategy);
}

export function generateTickets(strategy, history, count, baseSeed = Date.now()) {
  if (strategy === "portfolio5") {
    const capped = Math.max(1, Math.min(Number(count) || 5, 5));
    return portfolioTickets(history).slice(0, capped);
  }
  return generateBaseTickets(strategy, history, count, baseSeed);
}
