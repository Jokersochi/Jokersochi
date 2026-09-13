import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { strategyTournament, walkForwardBacktest } from "../public/loto-analytics-4x20/lib/backtest.mjs";

const ARCHIVE = path.resolve("public/loto-analytics-4x20/data/draws.json");
const OUT = path.resolve("public/loto-analytics-4x20/data/strategy-report.json");
const PORTFOLIO_KEYS = ["adaptive20", "balanced20", "portfolio5"];
const SINGLE_KEYS = ["hybrid", "hot1000", "hot200", "cold200", "overdue"];
const STABILITY_WINDOWS = [100, 200, 300, 400];

function validateSnapshot(snapshot) {
  if (snapshot?.source !== "official" || snapshot?.quality?.continuous !== true || !Array.isArray(snapshot.draws) || snapshot.draws.length < 1200) {
    throw new Error("Strategy report требует непрерывный подтверждённый официальный архив минимум из 1200 тиражей");
  }
  if (Number(snapshot.draws.at(-1)?.number) !== Number(snapshot.last)) {
    throw new Error("Strategy report: last не согласован с draws[]");
  }
}

function compact(report) {
  return {
    strategyKey: report.strategyKey,
    strategyName: report.strategyName,
    ticketCount: report.ticketCount,
    evaluationDraws: report.evaluationDraws,
    firstEvaluatedDraw: report.firstEvaluatedDraw,
    lastEvaluatedDraw: report.lastEvaluatedDraw,
    meanBestMatches: report.meanBestMatches,
    baselineMeanBestMatches: report.baselineMeanBestMatches,
    excessProxyScore: report.excessProxyScore,
    ci95Low: report.ci95Low,
    ci95High: report.ci95High,
    proxyHitRate: report.proxyHitRate,
    baselineProxyHitRate: report.baselineProxyHitRate,
    hitLift: report.hitLift,
    balanced22Rate: report.balanced22Rate,
    baselineBalanced22Rate: report.baselineBalanced22Rate,
    maxProxyDrawdown: report.maxProxyDrawdown,
    evidenceGrade: report.evidenceGrade,
  };
}

function pairedBaseline(report) {
  return {
    ticketCount: report.ticketCount,
    evaluationDraws: report.evaluationDraws,
    firstEvaluatedDraw: report.firstEvaluatedDraw,
    lastEvaluatedDraw: report.lastEvaluatedDraw,
    meanBestMatches: report.baselineMeanBestMatches,
    proxyHitRate: report.baselineProxyHitRate,
    balanced22Rate: report.baselineBalanced22Rate,
    note: "Random baseline использует то же число билетов и те же целевые тиражи, что и сравниваемая стратегия.",
  };
}

function summarizeGroup(reports) {
  const ranking = reports.map(compact);
  const primaryPositive = ranking.find((report) => report.ci95Low > 0 && report.excessProxyScore > 0.05) ?? null;
  return {
    leaderByProxy: ranking[0] ?? null,
    positiveSignalAtPrimaryWindow: primaryPositive,
    pairedRandomBaseline: reports[0] ? pairedBaseline(reports[0]) : null,
    ranking,
  };
}

function stabilityFor(strategyKey, draws) {
  const windows = STABILITY_WINDOWS.map((evaluationDraws) => compact(walkForwardBacktest(strategyKey, draws, { evaluationDraws })));
  const positiveWindows = windows.filter((row) => row.excessProxyScore > 0).length;
  const ciPositiveWindows = windows.filter((row) => row.ci95Low > 0).length;
  const averageExcess = windows.reduce((sum, row) => sum + row.excessProxyScore, 0) / windows.length;
  return {
    strategyKey,
    positiveWindows,
    ciPositiveWindows,
    averageExcess,
    robustPositiveSignal: positiveWindows === windows.length && ciPositiveWindows >= 2,
    windows: windows.map((row) => ({
      evaluationDraws: row.evaluationDraws,
      excessProxyScore: row.excessProxyScore,
      ci95Low: row.ci95Low,
      ci95High: row.ci95High,
      hitLift: row.hitLift,
      evidenceGrade: row.evidenceGrade,
    })),
  };
}

export function buildStrategyReport(snapshot, { evaluationDraws = 300, ensembleDraws = 80, generatedAt = new Date().toISOString() } = {}) {
  validateSnapshot(snapshot);
  const draws = snapshot.draws;
  const portfolioReports = strategyTournament(draws, { evaluationDraws, strategyKeys: PORTFOLIO_KEYS });
  const singleReports = strategyTournament(draws, { evaluationDraws, strategyKeys: SINGLE_KEYS });
  const ensemble = walkForwardBacktest("ensemble", draws, { evaluationDraws: ensembleDraws });
  const portfolio5 = summarizeGroup(portfolioReports);
  const singleTicket = summarizeGroup(singleReports);
  const stability = PORTFOLIO_KEYS.map((key) => stabilityFor(key, draws));
  const robust = stability.filter((row) => row.robustPositiveSignal).sort((a, b) => b.averageExcess - a.averageExcess);

  return {
    version: 2,
    generatedAt,
    source: "official",
    archiveLast: Number(snapshot.last),
    archiveCount: Number(snapshot.count ?? draws.length),
    methodology: "Strict walk-forward: target draw is excluded from training history. Every strategy is paired against Random with the same ticket count. Five-ticket and one-ticket strategies are ranked separately. Portfolio stability is rechecked on 100/200/300/400-draw windows.",
    caution: "Положительный proxy-сигнал не доказывает возможность прогнозировать независимый тираж; это исследовательская метрика совпадений, без коррекции за все возможные гипотезы и без финансового ROI.",
    financialRoiAvailable: false,
    financialStatus: "Публичный архив комбинаций не содержит полной официальной payout-таблицы по каждому тиражу; финансовый ROI намеренно не моделируется по предположениям.",
    portfolio5,
    singleTicket,
    ensemble: compact(ensemble),
    stability: { windows: STABILITY_WINDOWS, portfolio5: stability },
    decision: {
      defaultStrategy: "adaptive20",
      defaultReason: "Adaptive Coverage 20 сохраняет полное покрытие 1–20 и используется как диверсифицированный default, а не как заявка на доказанное предсказательное преимущество.",
      robustPositiveSignal: robust.length > 0,
      robustSignalLeader: robust[0]?.strategyKey ?? null,
      primaryWindowLeader: portfolio5.leaderByProxy?.strategyKey ?? null,
    },
  };
}

async function writeAtomic(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, content, "utf8");
  await fs.rename(temp, file);
}

export async function buildFiles({ archivePath = ARCHIVE, outPath = OUT } = {}) {
  const snapshot = JSON.parse(await fs.readFile(archivePath, "utf8"));
  const report = buildStrategyReport(snapshot);
  await writeAtomic(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Strategy evidence: archive #${report.archiveLast}; primary=${report.decision.primaryWindowLeader ?? "n/a"}; robust=${report.decision.robustSignalLeader ?? "none"}`);
  return report;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    await buildFiles();
  } catch (error) {
    console.error(`Strategy evidence blocked: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
