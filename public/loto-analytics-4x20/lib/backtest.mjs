import { STRATEGIES, generateTickets } from "./strategy-v2.mjs";

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function pairedCi95(values) {
  if (values.length < 2) return { mean: values[0] ?? 0, low: values[0] ?? 0, high: values[0] ?? 0 };
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / (values.length - 1);
  const margin = 1.96 * Math.sqrt(variance / values.length);
  return { mean: avg, low: avg - margin, high: avg + margin };
}

function scoreDraw(tickets, draw) {
  const scored = tickets.map((ticket) => {
    const matches = countMatches(ticket, draw);
    return { ...matches, total: matches.fieldA + matches.fieldB };
  });
  return {
    bestTotal: Math.max(...scored.map((row) => row.total)),
    balanced22: scored.some((row) => row.fieldA >= 2 && row.fieldB >= 2),
  };
}

function maxDrawdown(deltas) {
  let cumulative = 0;
  let peak = 0;
  let drawdown = 0;
  for (const delta of deltas) {
    cumulative += delta;
    peak = Math.max(peak, cumulative);
    drawdown = Math.max(drawdown, peak - cumulative);
  }
  return drawdown;
}

function evidenceGrade(strategyKey, ci) {
  if (strategyKey === "random") return "Контроль";
  if (ci.low > 0 && ci.mean > 0.05) return "Слабый положительный сигнал";
  if (ci.high < 0) return "Отрицательный сигнал";
  return "Преимущество не обнаружено";
}

function ticketCountFor(strategyKey) {
  if (strategyKey === "portfolio5" || strategyKey === "random") return 5;
  return 1;
}

export function countMatches(ticket, draw) {
  const a = new Set(draw.fieldA);
  const b = new Set(draw.fieldB);
  return {
    fieldA: ticket.fieldA.filter((value) => a.has(value)).length,
    fieldB: ticket.fieldB.filter((value) => b.has(value)).length,
  };
}

export function walkForwardBacktest(strategyKey, draws, options = {}) {
  const meta = STRATEGIES.find((strategy) => strategy.key === strategyKey);
  if (!meta) throw new Error("Неизвестная стратегия для backtest");
  if (!Array.isArray(draws) || draws.length < 250) throw new Error("Недостаточно истории для walk-forward backtest");

  const requested = Math.max(50, Math.min(Number(options.evaluationDraws) || 300, 400));
  const lookback = meta.lookback ?? 200;
  const start = Math.max(lookback, draws.length - requested);
  const evalCount = draws.length - start;
  if (evalCount < 50) throw new Error(`Недостаточно out-of-sample тиражей: ${evalCount}`);

  const ticketCount = ticketCountFor(strategyKey);
  const strategyScores = [];
  const baselineScores = [];
  const deltas = [];
  let strategyBalanced22 = 0;
  let baselineBalanced22 = 0;

  for (let i = start; i < draws.length; i++) {
    const target = draws[i];
    const history = draws.slice(0, i);
    const seed = (Math.imul(Number(target.number) >>> 0, 2654435761) ^ 0x85ebca6b) >>> 0;
    const strategyTickets = generateTickets(strategyKey, history, ticketCount, seed);
    const baselineTickets = generateTickets("random", history, ticketCount, seed ^ 0x9e3779b9);
    const strategyScore = scoreDraw(strategyTickets, target);
    const baselineScore = scoreDraw(baselineTickets, target);
    strategyScores.push(strategyScore.bestTotal);
    baselineScores.push(baselineScore.bestTotal);
    deltas.push(strategyScore.bestTotal - baselineScore.bestTotal);
    if (strategyScore.balanced22) strategyBalanced22++;
    if (baselineScore.balanced22) baselineBalanced22++;
  }

  const ci = pairedCi95(deltas);
  return {
    strategyKey,
    strategyName: meta.name,
    ticketCount,
    evaluationDraws: evalCount,
    firstEvaluatedDraw: draws[start].number,
    lastEvaluatedDraw: draws.at(-1).number,
    meanBestMatches: mean(strategyScores),
    baselineMeanBestMatches: mean(baselineScores),
    meanDelta: ci.mean,
    ci95Low: ci.low,
    ci95High: ci.high,
    balanced22Rate: strategyBalanced22 / evalCount,
    baselineBalanced22Rate: baselineBalanced22 / evalCount,
    maxProxyDrawdown: maxDrawdown(deltas),
    evidenceGrade: evidenceGrade(strategyKey, ci),
    financialRoiAvailable: false,
    methodology: "walk-forward: каждый проверяемый тираж исключён из обучающей истории; сравнение парное со случайным портфелем того же размера",
  };
}
