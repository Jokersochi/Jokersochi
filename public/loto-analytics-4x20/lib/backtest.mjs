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

export function categoryForMatches(fieldA, fieldB) {
  const hi = Math.max(Number(fieldA), Number(fieldB));
  const lo = Math.min(Number(fieldA), Number(fieldB));
  if (hi < 2) return null;
  if (hi === 4) return { 4: 1, 3: 2, 2: 3, 1: 4, 0: 5 }[lo] ?? null;
  if (hi === 3) return { 3: 6, 2: 7, 1: 8, 0: 9 }[lo] ?? null;
  if (hi === 2) return { 2: 10, 1: 11, 0: 12 }[lo] ?? null;
  return null;
}

function payoutIndex(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const draw = Number(row?.drawNumber ?? row?.draw_number);
    const category = Number(row?.category);
    const winners = Number(row?.winnersCount ?? row?.winners_count);
    const amount = Number(row?.payoutPerWinnerRub ?? row?.payout_per_winner_rub);
    if (!Number.isInteger(draw) || !Number.isInteger(category) || category < 1 || category > 12 || !Number.isFinite(winners) || !Number.isFinite(amount)) continue;
    map.set(`${draw}:${category}`, { winnersCount: winners, payoutPerWinnerRub: amount });
  }
  return map;
}

function monetaryOutcome(tickets, draw, payouts) {
  const ticketPrice = Number(draw.ticketPriceRub);
  if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
    return { stake: 0, payout: 0, unresolved: tickets.length, pricedTickets: 0 };
  }
  let payout = 0;
  let unresolved = 0;
  for (const ticket of tickets) {
    const matches = countMatches(ticket, draw);
    const category = categoryForMatches(matches.fieldA, matches.fieldB);
    if (category == null) continue;
    const row = payouts.get(`${draw.number}:${category}`);
    if (!row || row.winnersCount <= 0 || row.payoutPerWinnerRub <= 0) {
      unresolved++;
      continue;
    }
    payout += row.payoutPerWinnerRub;
  }
  return { stake: ticketPrice * tickets.length, payout, unresolved, pricedTickets: tickets.length };
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

  const payouts = payoutIndex(options.payoutRows);
  let strategyStake = 0;
  let strategyReturn = 0;
  let baselineStake = 0;
  let baselineReturn = 0;
  let strategyUnresolved = 0;
  let baselineUnresolved = 0;
  let strategyPricedTickets = 0;
  let baselinePricedTickets = 0;

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

    if (payouts.size) {
      const strategyMoney = monetaryOutcome(strategyTickets, target, payouts);
      const baselineMoney = monetaryOutcome(baselineTickets, target, payouts);
      strategyStake += strategyMoney.stake;
      strategyReturn += strategyMoney.payout;
      strategyUnresolved += strategyMoney.unresolved;
      strategyPricedTickets += strategyMoney.pricedTickets;
      baselineStake += baselineMoney.stake;
      baselineReturn += baselineMoney.payout;
      baselineUnresolved += baselineMoney.unresolved;
      baselinePricedTickets += baselineMoney.pricedTickets;
    }
  }

  const ci = pairedCi95(deltas);
  const strategyRoiLowerBound = strategyStake > 0 ? (strategyReturn - strategyStake) / strategyStake : null;
  const baselineRoiLowerBound = baselineStake > 0 ? (baselineReturn - baselineStake) / baselineStake : null;
  const strategyCoverage = strategyPricedTickets > 0 ? 1 - (strategyUnresolved / strategyPricedTickets) : 0;
  const baselineCoverage = baselinePricedTickets > 0 ? 1 - (baselineUnresolved / baselinePricedTickets) : 0;
  const fullFinancialCoverage = payouts.size > 0 && strategyCoverage === 1 && baselineCoverage === 1;

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
    financialRoiAvailable: fullFinancialCoverage,
    financialDataAvailable: payouts.size > 0,
    strategyStakeRub: strategyStake,
    strategyReturnRub: strategyReturn,
    baselineStakeRub: baselineStake,
    baselineReturnRub: baselineReturn,
    strategyRoi: fullFinancialCoverage ? strategyRoiLowerBound : null,
    baselineRoi: fullFinancialCoverage ? baselineRoiLowerBound : null,
    strategyRoiLowerBound,
    baselineRoiLowerBound,
    financialCoverage: strategyCoverage,
    baselineFinancialCoverage: baselineCoverage,
    unresolvedStrategyTickets: strategyUnresolved,
    unresolvedBaselineTickets: baselineUnresolved,
    methodology: "walk-forward: каждый проверяемый тираж исключён из обучающей истории; сравнение парное со случайным портфелем того же размера",
    financialMethodology: "архивный payout benchmark: стоимость билета и выплата берутся из официальных данных конкретного тиража; категории без фактических победителей считаются неопределёнными, поэтому при неполном покрытии ROI показан только как нижняя граница",
  };
}
