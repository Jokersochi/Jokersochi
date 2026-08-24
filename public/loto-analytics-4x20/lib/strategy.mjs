export const STRATEGIES = [
  {
    key: "random",
    name: "Случайная",
    shortDescription: "Контрольный вариант без анализа прошлых тиражей.",
    plainDescription: "Компьютер случайно выбирает 4 числа в каждом поле. История тиражей здесь вообще не используется — эта стратегия нужна как честная точка сравнения с остальными.",
    lookback: null,
    deterministic: false,
  },
  {
    key: "hot200",
    name: "Горячие 200",
    shortDescription: "Самые часто выпадавшие числа в последних 200 тиражах.",
    plainDescription: "Берём последние 200 завершённых тиражей и отдельно для каждого поля считаем, сколько раз выпадало каждое число. В билет попадают четыре числа с наибольшей частотой.",
    lookback: 200,
    deterministic: true,
  },
  {
    key: "cold200",
    name: "Холодные 200",
    shortDescription: "Самые редко выпадавшие числа в последних 200 тиражах.",
    plainDescription: "Берём последние 200 завершённых тиражей и выбираем четыре числа в каждом поле, которые за этот период выпадали реже остальных.",
    lookback: 200,
    deterministic: true,
  },
  {
    key: "hot1000",
    name: "Горячие 1000",
    shortDescription: "Самые частые числа на более длинной истории из 1000 тиражей.",
    plainDescription: "Считаем частоты по последним 1000 завершённым тиражам. Более длинное окно меньше реагирует на короткие всплески, но правило остаётся тем же: берём четыре самых частых числа каждого поля.",
    lookback: 1000,
    deterministic: true,
  },
  {
    key: "overdue",
    name: "Просроченные",
    shortDescription: "Числа с необычно длинным текущим перерывом.",
    plainDescription: "Для каждого числа сравниваем, сколько тиражей прошло с его последнего появления, с его обычным средним перерывом. Выбираются числа, у которых текущий перерыв относительно среднего самый большой.",
    lookback: 1000,
    deterministic: true,
  },
  {
    key: "hybrid",
    name: "Гибрид",
    shortDescription: "Сочетает частоту и текущий перерыв.",
    plainDescription: "Стратегия одновременно смотрит на два признака: насколько число чаще или реже нормы выпадало в последних 500 тиражах и насколько его текущий перерыв больше обычного. Эти два показателя складываются в общий балл.",
    lookback: 500,
    deterministic: true,
  },
];

export const DISCLAIMER = "Это объяснение описывает правило отбора, а не прогноз выигрыша. Результаты прошлых тиражей сами по себе не делают конкретное число более вероятным в следующем независимом тираже.";

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
  const meta = STRATEGIES.find((s) => s.key === strategy);
  if (!meta) throw new Error("Неизвестная стратегия");
  const metrics = metricsFor(history, field, meta.lookback ?? 200);
  if (strategy === "hot200" || strategy === "hot1000") return topBy(metrics, (m) => m.count);
  if (strategy === "cold200") return topBy(metrics, (m) => -m.count);
  if (strategy === "overdue") return topBy(metrics, (m) => m.overdueRatio);
  return topBy(metrics, (m) => m.hybridScore);
}

function explainField(strategy, history, field, numbers) {
  const meta = STRATEGIES.find((s) => s.key === strategy);
  const fieldNumber = field === "A" ? 1 : 2;
  if (strategy === "random") {
    return {
      field: fieldNumber,
      numbers,
      summary: `Поле ${fieldNumber}: числа выбраны случайно; прошлые частоты и перерывы не учитывались.`,
      details: numbers.map((v) => `Число ${v}: случайный выбор.`),
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
      return `Число ${value}: текущий перерыв ${m.gap} тираж., средний ${m.meanGap.toFixed(1)}, отношение ${m.overdueRatio.toFixed(2)}×.`;
    }
    return `Число ${value}: отклонение частоты z=${m.z.toFixed(2)}, перерыв ${m.overdueRatio.toFixed(2)}× среднего, общий балл ${m.hybridScore.toFixed(2)}.`;
  });
  const summary =
    strategy === "hot200" || strategy === "hot1000"
      ? `Поле ${fieldNumber}: выбраны четыре лидера по частоте за последние ${meta.lookback} завершённых тиражей.`
      : strategy === "cold200"
        ? `Поле ${fieldNumber}: выбраны четыре самых редких числа за последние 200 завершённых тиражей.`
        : strategy === "overdue"
          ? `Поле ${fieldNumber}: выбраны числа с наибольшим текущим перерывом относительно их обычного среднего.`
          : `Поле ${fieldNumber}: выбраны числа с наибольшим суммарным баллом частоты и относительного перерыва.`;
  return { field: fieldNumber, numbers, summary, details };
}

export function generateTicket(strategy, history, seed = Date.now()) {
  const meta = STRATEGIES.find((s) => s.key === strategy);
  if (!meta) throw new Error("Неизвестная стратегия");
  const fieldA = selectField(strategy, history, "A", seed);
  const fieldB = selectField(strategy, history, "B", seed + 1009);
  return {
    fieldA,
    fieldB,
    explanation: {
      strategy,
      strategyName: meta.name,
      summary: `${meta.plainDescription} Ниже показано, как это правило привело именно к этим числам.`,
      fields: [
        explainField(strategy, history, "A", fieldA),
        explainField(strategy, history, "B", fieldB),
      ],
      disclaimer: DISCLAIMER,
    },
  };
}

export function maxUsefulTickets(strategy) {
  const meta = STRATEGIES.find((s) => s.key === strategy);
  return meta?.deterministic ? 1 : 10;
}

export function generateTickets(strategy, history, count, baseSeed = Date.now()) {
  const capped = Math.max(1, Math.min(count, maxUsefulTickets(strategy)));
  return Array.from({ length: capped }, (_, i) => generateTicket(strategy, history, baseSeed + i * 7919));
}
