import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { generateTickets } from "../public/loto-analytics-4x20/lib/strategy-v2.mjs";
import { estimatePortfolioFinancials } from "../public/loto-analytics-4x20/lib/payout.mjs";
import { loadLiveArchive, loadOfficialPayouts } from "../public/loto-analytics-4x20/lib/live-data.mjs";

export const FORWARD_STRATEGIES = ["adaptive20", "balanced20", "ensemble", "portfolio5", "random"];
const DEFAULT_ARCHIVE = path.resolve("public/loto-analytics-4x20/data/draws.json");
const DEFAULT_LEDGER = path.resolve("public/loto-analytics-4x20/data/forward-ledger.json");

function ticketShape(ticket) {
  return {
    fieldA: [...ticket.fieldA].map(Number).sort((a, b) => a - b),
    fieldB: [...ticket.fieldB].map(Number).sort((a, b) => a - b),
  };
}

function assertTicket(ticket) {
  for (const field of [ticket.fieldA, ticket.fieldB]) {
    if (!Array.isArray(field) || field.length !== 4 || new Set(field).size !== 4) throw new Error("Forward Ledger получил некорректный билет");
    if (field.some((n) => !Number.isInteger(n) || n < 1 || n > 20)) throw new Error("Forward Ledger получил число вне 1–20");
  }
}

function seedFor(targetDraw, strategyKey) {
  const digest = crypto.createHash("sha256").update(`${targetDraw}:${strategyKey}:LotoOS-forward-v1`).digest();
  return digest.readUInt32LE(0);
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function countMatches(ticket, draw) {
  const a = new Set(draw.fieldA);
  const b = new Set(draw.fieldB);
  const fieldA = ticket.fieldA.filter((n) => a.has(n)).length;
  const fieldB = ticket.fieldB.filter((n) => b.has(n)).length;
  return {
    fieldA,
    fieldB,
    total: fieldA + fieldB,
    minimumWinPattern: (fieldA >= 2 && fieldB >= 1) || (fieldA >= 1 && fieldB >= 2),
    balanced22: fieldA >= 2 && fieldB >= 2,
  };
}

function makePortfolio(strategyKey, history, targetDraw) {
  const tickets = generateTickets(strategyKey, history, 5, seedFor(targetDraw, strategyKey)).map(ticketShape);
  if (tickets.length !== 5) throw new Error(`${strategyKey}: forward portfolio должен содержать ровно 5 билетов`);
  tickets.forEach(assertTicket);
  const core = { strategyKey, targetDraw, sourceLast: history.at(-1).number, tickets };
  return { ...core, fingerprint: fingerprint(core) };
}

function settleEntry(entry, draw, checkedAt) {
  if (entry.status !== "pending") return entry;
  const strategies = entry.strategies.map((portfolio) => {
    const ticketResults = portfolio.tickets.map((ticket) => countMatches(ticket, draw));
    return {
      ...portfolio,
      result: {
        tickets: ticketResults,
        bestTotal: Math.max(...ticketResults.map((row) => row.total)),
        minimumWinPatternTickets: ticketResults.filter((row) => row.minimumWinPattern).length,
        balanced22Tickets: ticketResults.filter((row) => row.balanced22).length,
      },
    };
  });
  return {
    ...entry,
    status: "checked",
    checkedAt,
    result: { drawNumber: draw.number, fieldA: [...draw.fieldA], fieldB: [...draw.fieldB] },
    strategies,
    financials: {
      available: false,
      complete: false,
      reason: "Результат зафиксирован; ожидается подтверждённый официальный payout-контекст для денежной оценки.",
    },
  };
}

function applyFinancials(entry, financial) {
  if (entry.status !== "checked" || !financial || !Number.isFinite(Number(financial.ticketPriceRub))) return entry;
  const strategies = entry.strategies.map((portfolio) => {
    const estimate = estimatePortfolioFinancials({
      drawNumber: Number(entry.targetDraw),
      ticketPriceRub: Number(financial.ticketPriceRub),
      ticketMatches: portfolio.result?.tickets ?? [],
      payoutRows: financial.payoutRows ?? [],
    });
    return {
      ...portfolio,
      financials: {
        available: estimate.dataAvailable,
        complete: estimate.complete,
        stakeRub: estimate.stakeRub,
        payoutRub: estimate.payoutRub,
        roi: estimate.roi,
        roiLowerBound: estimate.roiLowerBound,
        coverage: estimate.coverage,
        unresolvedTickets: estimate.unresolvedTickets,
        method: estimate.method,
      },
      result: portfolio.result ? { ...portfolio.result, tickets: estimate.tickets } : portfolio.result,
    };
  });

  const available = strategies.every((portfolio) => portfolio.financials?.available === true);
  const complete = available && strategies.every((portfolio) => portfolio.financials?.complete === true);
  return {
    ...entry,
    strategies,
    financials: {
      available,
      complete,
      ticketPriceRub: Number(financial.ticketPriceRub),
      byStrategy: strategies.map((portfolio) => ({ strategyKey: portfolio.strategyKey, ...portfolio.financials })),
      reason: complete
        ? "Контрфактическая денежная оценка рассчитана по официальным пулам и выплатам тиража."
        : "Часть категорий не имеет наблюдаемого призового пула; денежный результат показан как нижняя граница.",
      methodology: "Для процентных категорий наблюдаемый пул делится на опубликованных плюс виртуальных победителей. Для фиксированной категории 2×1/1×2 используется опубликованная фиксированная сумма. Покупка билета слегка изменила бы призовой фонд, поэтому это оценка, а не точная историческая выплата.",
    },
  };
}

function validateSnapshot(snapshot) {
  if (snapshot?.source !== "official" || snapshot?.quality?.continuous !== true || !Array.isArray(snapshot.draws) || snapshot.draws.length < 1000) {
    throw new Error("Forward Ledger работает только с непрерывным подтверждённым официальным архивом");
  }
  const last = snapshot.draws.at(-1)?.number;
  if (Number(last) !== Number(snapshot.last)) throw new Error("Forward Ledger: last не согласован с draws[]");
}

export function advanceForwardLedger(snapshot, priorState = null, now = new Date().toISOString(), financialContext = new Map()) {
  validateSnapshot(snapshot);
  const draws = snapshot.draws;
  const byNumber = new Map(draws.map((draw) => [Number(draw.number), draw]));
  const last = Number(snapshot.last);
  const state = priorState && priorState.version === 1
    ? JSON.parse(JSON.stringify(priorState))
    : { version: 1, startedAtDraw: last, entries: [], missedDraws: [] };

  if (!Array.isArray(state.entries)) state.entries = [];
  if (!Array.isArray(state.missedDraws)) state.missedDraws = [];
  if (state.startedAtDraw == null || !Number.isInteger(Number(state.startedAtDraw)) || Number(state.startedAtDraw) < 1) state.startedAtDraw = last;

  state.entries = state.entries.map((entry) => {
    let next = entry;
    if (next.status === "pending") {
      const draw = byNumber.get(Number(next.targetDraw));
      if (draw) next = settleEntry(next, draw, now);
    }
    const financial = financialContext instanceof Map ? financialContext.get(Number(next.targetDraw)) : null;
    if (next.status === "checked" && financial) next = applyFinancials(next, financial);
    return next;
  });

  const represented = new Set(state.entries.map((entry) => Number(entry.targetDraw)));
  const missed = new Set(state.missedDraws.map(Number));
  for (let drawNumber = Number(state.startedAtDraw) + 1; drawNumber <= last; drawNumber++) {
    if (!represented.has(drawNumber)) missed.add(drawNumber);
  }
  state.missedDraws = [...missed].sort((a, b) => a - b);

  const targetDraw = last + 1;
  if (!represented.has(targetDraw)) {
    const strategies = FORWARD_STRATEGIES.map((key) => makePortfolio(key, draws, targetDraw));
    const lockCore = { targetDraw, sourceLast: last, strategies };
    state.entries.push({
      ...lockCore,
      id: `${targetDraw}:${fingerprint(lockCore)}`,
      fingerprint: fingerprint(lockCore),
      lockedAt: now,
      locked: true,
      status: "pending",
      checkedAt: null,
      result: null,
      financials: { available: false, complete: false, reason: "Ожидается официальный результат и payout-контекст тиража." },
    });
  }

  state.entries.sort((a, b) => Number(a.targetDraw) - Number(b.targetDraw));
  state.updatedAt = now;
  state.verifiedArchiveLast = last;
  state.pending = state.entries.filter((entry) => entry.status === "pending").length;
  state.checked = state.entries.filter((entry) => entry.status === "checked").length;
  state.financiallyEvaluated = state.entries.filter((entry) => entry.financials?.available === true).length;
  return state;
}

async function writeAtomic(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, content, "utf8");
  await fs.rename(temp, file);
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; }
}

async function loadFinancialContext(snapshot, prior) {
  const eligible = (prior?.entries ?? [])
    .filter((entry) => Number(entry.targetDraw) <= Number(snapshot.last) && entry.financials?.complete !== true)
    .map((entry) => Number(entry.targetDraw));
  if (!eligible.length) return new Map();

  const first = Math.min(...eligible);
  const last = Math.max(...eligible);
  const live = await loadLiveArchive();
  if (Number(live.last) < last) throw new Error(`Live backend отстаёт: №${live.last}, нужен №${last}`);
  const liveByNumber = new Map(live.draws.map((draw) => [Number(draw.number), draw]));
  const payouts = await loadOfficialPayouts(first, last);
  const context = new Map();
  for (const drawNumber of eligible) {
    const draw = liveByNumber.get(drawNumber);
    if (!draw || !Number.isFinite(Number(draw.ticketPriceRub))) continue;
    context.set(drawNumber, { ticketPriceRub: Number(draw.ticketPriceRub), payoutRows: payouts });
  }
  return context;
}

export async function advanceFiles({ archivePath = DEFAULT_ARCHIVE, ledgerPath = DEFAULT_LEDGER, now = new Date().toISOString() } = {}) {
  const snapshot = await readJson(archivePath);
  const prior = await readJson(ledgerPath);
  let financialContext = new Map();
  try {
    financialContext = await loadFinancialContext(snapshot, prior);
  } catch (error) {
    console.warn(`Forward Ledger financial context unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
  const next = advanceForwardLedger(snapshot, prior, now, financialContext);
  await writeAtomic(ledgerPath, `${JSON.stringify(next, null, 2)}\n`);
  const latest = next.entries.at(-1);
  console.log(`Forward Ledger: archive #${next.verifiedArchiveLast}, checked=${next.checked}, pending=${next.pending}, financial=${next.financiallyEvaluated}, missed=${next.missedDraws.length}, next=#${latest?.targetDraw ?? "n/a"}`);
  return next;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    await advanceFiles();
  } catch (error) {
    console.error(`Forward Ledger blocked: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
