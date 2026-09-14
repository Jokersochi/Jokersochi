import { STRATEGIES, generateTickets } from "./strategy-v2.mjs";
import { buildPayoutIndex, estimatePortfolioFinancials } from "./payout.mjs";
export { categoryForMatches } from "./payout.mjs";

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
  const bestTotal = Math.max(...scored.map((row) => row.total));
  return {
    bestTotal,
    balanced22: scored.some((row) => row.fieldA >= 2 && row.fieldB >= 2),
    proxyHit: bestTotal >= 3,
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
  if (["adaptive20", "balanced20", "ensemble", "portfolio5", "random"].includes(strategyKey)) return 5;
  return 1;
}

function seedFor(targetNumber, salt = 0) {
  return (Math.imul(Number(targetNumber) >>> 0, 2654435761) ^ salt) >>> 0;
}

export function countMatches(ticket, draw) {
  const a = new Set(draw.fieldA);
  const b = new Set(draw.fieldB);
  return {
    fieldA: ticket.fieldA.filter((value) => a.has(value)).length,
    fieldB: ticket.fieldB.filter((value) => b.has(value)).length,
  };
}

export function buildTargetTickets(strategyKey, draws, targetIndex, count = ticketCountFor(strategyKey), salt = 0) {
  if (!Array.isArray(draws) || targetIndex <= 0 || targetIndex >= draws.length) {
    throw new Error("Некорректная цель walk-forward");
  }
  const history = draws.slice(0, targetIndex);
  const target = draws[targetIndex];
  return generateTickets(strategyKey, history, count, seedFor(target.number, salt));
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
  let strategyProxyHits = 0;
  let baselineProxyHits = 0;

  const payoutIndex = buildPayoutIndex(options.payoutRows);
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
    const strategyTickets = buildTargetTickets(strategyKey, draws, i, ticketCount, 0x85ebca6b);
    const baselineTickets = buildTargetTickets("random", draws, i, ticketCount, 0x9e3779b9);
    const strategyScore = scoreDraw(strategyTickets, target);
    const baselineScore = scoreDraw(baselineTickets, target);
    strategyScores.push(strategyScore.bestTotal);
    baselineScores.push(baselineScore.bestTotal);
    deltas.push(strategyScore.bestTotal - baselineScore.bestTotal);
    if (strategyScore.balanced22) strategyBalanced22++;
    if (baselineScore.balanced22) baselineBalanced22++;
    if (strategyScore.proxyHit) strategyProxyHits++;
    if (baselineScore.proxyHit) baselineProxyHits++;

    if (payoutIndex.size) {
      const strategyMoney = estimatePortfolioFinancials({
        drawNumber: target.number,
        ticketPriceRub: target.ticketPriceRub,
        ticketMatches: strategyTickets.map((ticket) => countMatches(ticket, target)),
        payoutRows: payoutIndex,
      });
      const baselineMoney = estimatePortfolioFinancials({
        drawNumber: target.number,
        ticketPriceRub: target.ticketPriceRub,
        ticketMatches: baselineTickets.map((ticket) => countMatches(ticket, target)),
        payoutRows: payoutIndex,
      });
      strategyStake += strategyMoney.stakeRub;
      strategyReturn += strategyMoney.payoutRub;
      strategyUnresolved += strategyMoney.unresolvedTickets;
      if (strategyMoney.stakeRub > 0) strategyPricedTickets += strategyTickets.length;
      baselineStake += baselineMoney.stakeRub;
      baselineReturn += baselineMoney.payoutRub;
      baselineUnresolved += baselineMoney.unresolvedTickets;
      if (baselineMoney.stakeRub > 0) baselinePricedTickets += baselineTickets.length;
    }
  }

  const ci = pairedCi95(deltas);
  const proxyHitRate = strategyProxyHits / evalCount;
  const baselineProxyHitRate = baselineProxyHits / evalCount;
  const hitLift = baselineProxyHitRate > 0 ? (proxyHitRate / baselineProxyHitRate) - 1 : null;

  const strategyRoiLowerBound = strategyStake > 0 ? (strategyReturn - strategyStake) / strategyStake : null;
  const baselineRoiLowerBound = baselineStake > 0 ? (baselineReturn - baselineStake) / baselineStake : null;
  const strategyCoverage = strategyPricedTickets > 0 ? 1 - (strategyUnresolved / strategyPricedTickets) : 0;
  const baselineCoverage = baselinePricedTickets > 0 ? 1 - (baselineUnresolved / baselinePricedTickets) : 0;
  const fullFinancialCoverage = payoutIndex.size > 0 && strategyCoverage === 1 && baselineCoverage === 1;
  const financialStatus = payoutIndex.size === 0
    ? "Недостаточно официальных payout-данных; финансовая оценка намеренно заблокирована."
    : fullFinancialCoverage
      ? "Контрфактический ROI-ориентир рассчитан по официальным пулам/выплатам с поправкой на добавленные виртуальные выигрышные билеты."
      : "Показана нижняя граница контрфактического ROI: категории без наблюдаемого призового пула остаются неопределёнными.";

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
    excessProxyScore: ci.mean,
    ci95Low: ci.low,
    ci95High: ci.high,
    balanced22Rate: strategyBalanced22 / evalCount,
    baselineBalanced22Rate: baselineBalanced22 / evalCount,
    proxyHitRate,
    baselineProxyHitRate,
    hitLift,
    maxProxyDrawdown: maxDrawdown(deltas),
    evidenceGrade: evidenceGrade(strategyKey, ci),
    financialRoiAvailable: fullFinancialCoverage,
    financialDataAvailable: payoutIndex.size > 0,
    financialIsCounterfactualEstimate: payoutIndex.size > 0,
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
    financialStatus,
    methodology: "walk-forward: каждый проверяемый тираж исключён из обучающей истории; сравнение парное со случайным портфелем того же размера",
    financialMethodology: "контрфактическая оценка: стоимость билета берётся из официального тиража; для процентных категорий наблюдаемый пул делится на опубликованных плюс виртуальных победителей, фиксированная категория 2×1/1×2 использует опубликованную фиксированную сумму; покупка виртуального билета слегка изменила бы сам призовой фонд, поэтому это оценка, а не точная историческая выплата",
  };
}

export function strategyTournament(draws, options = {}) {
  const keys = options.strategyKeys ?? ["adaptive20", "balanced20", "ensemble", "portfolio5", "hybrid", "hot1000", "overdue", "random"];
  const reports = keys.map((key) => walkForwardBacktest(key, draws, options));
  return reports.sort((a, b) => {
    if (a.strategyKey === "random") return 1;
    if (b.strategyKey === "random") return -1;
    return b.meanDelta - a.meanDelta || b.proxyHitRate - a.proxyHitRate;
  });
}
