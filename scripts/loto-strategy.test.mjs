import test from "node:test";
import assert from "node:assert/strict";
import {
  STRATEGIES,
  PRODUCTION_STRATEGIES,
  RESEARCH_STRATEGIES,
  DISCLAIMER,
  generateTicket,
  generateTickets,
  maxUsefulTickets,
} from "../public/loto-analytics-4x20/lib/strategy-engine.mjs";
import {
  buildTargetTickets,
  categoryForMatches,
  countMatches,
  strategyTournament,
  walkForwardBacktest,
} from "../public/loto-analytics-4x20/lib/backtest.mjs";
import { normalizeDraw, validateArchive } from "./loto-source.mjs";
import {
  normalizeLiveRows,
  normalizePayoutRows,
  validateLiveStatus,
} from "../public/loto-analytics-4x20/lib/live-data.mjs";

function history(n = 1000) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    fieldA: [1 + (i % 17), 2 + (i % 17), 3 + (i % 17), 4 + (i % 17)].map((x) => ((x - 1) % 20) + 1),
    fieldB: [5 + (i % 17), 6 + (i % 17), 7 + (i % 17), 8 + (i % 17)].map((x) => ((x - 1) % 20) + 1),
  }));
}

function pricedHistory(n = 1000) {
  return history(n).map((draw) => ({ ...draw, ticketPriceRub: 300 }));
}

function identicalPricedHistory(n = 300) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    fieldA: [1, 2, 3, 4],
    fieldB: [5, 6, 7, 8],
    ticketPriceRub: 300,
  }));
}

function payoutRows(firstDraw, lastDraw, overrides = {}) {
  const rows = [];
  for (let drawNumber = firstDraw; drawNumber <= lastDraw; drawNumber++) {
    for (let category = 1; category <= 12; category++) {
      const override = overrides[category] ?? {};
      rows.push({
        drawNumber,
        category,
        winnersCount: override.winnersCount ?? 1,
        payoutPerWinnerRub: override.payoutPerWinnerRub ?? 600,
        totalPayoutRub: override.totalPayoutRub ?? 600,
      });
    }
  }
  return rows;
}

function liveRows(first = 1001, count = 1000) {
  return Array.from({ length: count }, (_, i) => ({
    draw_number: first + i,
    draw_date: new Date(Date.UTC(2026, 0, 1, 0, i % 60)).toISOString(),
    field1: [1, 2, 3, 4],
    field2: [5, 6, 7, 8],
  })).reverse();
}

function archiveRows(numbers) {
  return numbers.map((number) => ({ number, date: `d-${number}`, fieldA:[1,2,3,4], fieldB:[5,6,7,8] }));
}

function assertFullCoverage(tickets, field) {
  assert.equal(tickets.length, 5);
  const values = tickets.flatMap((ticket) => ticket[field]).sort((a, b) => a - b);
  assert.deepEqual(values, Array.from({ length: 20 }, (_, i) => i + 1));
}

test("unified engine separates production evidence from exploratory strategies", () => {
  assert.deepEqual(PRODUCTION_STRATEGIES.map((s) => s.key), ["adaptive20", "balanced20", "random"]);
  assert.ok(RESEARCH_STRATEGIES.some((s) => s.key === "portfolio5" && s.status === "negative_control"));
  assert.ok(RESEARCH_STRATEGIES.some((s) => s.key === "hot1000"));
  assert.ok(STRATEGIES.length >= PRODUCTION_STRATEGIES.length + RESEARCH_STRATEGIES.length - 1);
  for (const strategy of STRATEGIES) {
    assert.ok(strategy.plainDescription.length > 50);
    assert.doesNotMatch(strategy.plainDescription, /гарант|обязательно выигр|точно выигр/i);
  }
  assert.match(DISCLAIMER, /не прогноз выигрыша/i);
});

test("single-ticket research/control strategies contain valid 4+4 explanations", () => {
  const h = history();
  for (const key of ["random","hot200","cold200","hot1000","overdue","hybrid"]) {
    const ticket = generateTicket(key, h, 1234);
    assert.equal(ticket.fieldA.length, 4);
    assert.equal(ticket.fieldB.length, 4);
    assert.equal(new Set(ticket.fieldA).size, 4);
    assert.equal(new Set(ticket.fieldB).size, 4);
    assert.equal(ticket.explanation.fields.length, 2);
    assert.ok(ticket.explanation.fields.every((field) => field.details.length === 4));
    assert.equal(ticket.explanation.disclaimer, DISCLAIMER);
  }
});

test("deterministic single-ticket hypotheses do not fabricate variants", () => {
  const h = history();
  for (const key of ["hot200","cold200","hot1000","overdue","hybrid"]) {
    assert.equal(maxUsefulTickets(key), 1);
    assert.equal(generateTickets(key, h, 10, 42).length, 1);
  }
  assert.equal(maxUsefulTickets("random"), 10);
});

test("Adaptive20 and Balanced20 preserve exact full 1-20 coverage per field", () => {
  const h = history(700);
  for (const key of ["adaptive20", "balanced20"]) {
    assert.equal(maxUsefulTickets(key), 5);
    const tickets = generateTickets(key, h, 5, 42);
    assertFullCoverage(tickets, "fieldA");
    assertFullCoverage(tickets, "fieldB");
    assert.ok(tickets.every((ticket) => ticket.explanation.disclaimer === DISCLAIMER));
  }
});

test("Portfolio5 remains research-only negative control", () => {
  const meta = STRATEGIES.find((strategy) => strategy.key === "portfolio5");
  assert.equal(meta.tier, "research");
  assert.equal(meta.status, "negative_control");
  assert.equal(PRODUCTION_STRATEGIES.some((strategy) => strategy.key === "portfolio5"), false);
  assert.equal(generateTickets("portfolio5", history(700), 5, 42).length, 5);
});

test("Walk-Forward Ensemble does not read target or future results", () => {
  const draws = history(420);
  const targetIndex = 390;
  const before = buildTargetTickets("ensemble", draws, targetIndex, 5, 123);
  const changed = draws.map((draw) => ({ ...draw, fieldA: [...draw.fieldA], fieldB: [...draw.fieldB] }));
  changed[targetIndex] = { ...changed[targetIndex], fieldA: [17,18,19,20], fieldB: [1,2,3,4] };
  changed[targetIndex + 1] = { ...changed[targetIndex + 1], fieldA: [1,5,9,13], fieldB: [2,6,10,14] };
  const after = buildTargetTickets("ensemble", changed, targetIndex, 5, 123);
  assert.equal(before.length, 5);
  assert.deepEqual(after, before);
});

test("source normalization rejects unfinished and invalid draws", () => {
  const good = normalizeDraw({ number: 10, status: "COMPLETED", completed: true, date: "x", combination: { structured: [1,2,3,4,5,6,7,8] } });
  assert.equal(good.number, 10);
  assert.equal(normalizeDraw({ number: 11, status: "STARTED", combination: { structured: [1,2,3,4,5,6,7,8] } }), null);
  assert.equal(normalizeDraw({ number: 12, status: "COMPLETED", combination: { structured: [1,1,3,4,5,6,7,8] } }), null);
});

test("archive validation fails closed on gaps and conflicting duplicates", () => {
  const rows = archiveRows([1,2,3,4]);
  const ok = validateArchive(rows, 4);
  assert.equal(ok.quality.continuous, true);
  assert.throws(() => validateArchive([rows[0], rows[2], rows[3]], 3), /разрывы/);

  const firstPass = archiveRows([1,2,4,5]);
  const secondPass = archiveRows([1,2,3,4,5]);
  const recovered = validateArchive([...firstPass, ...secondPass], 5);
  assert.equal(recovered.quality.continuous, true);
  const conflictingThree = { ...secondPass[2], fieldA: [9,10,11,12] };
  assert.throws(() => validateArchive([...firstPass, ...secondPass, conflictingThree], 5), /Конфликтующие дубли/);
});

test("live backend status is fail-closed", () => {
  const good = validateLiveStatus({ payload: {
    production_ready: true,
    official_source_verified: true,
    gap_count: 0,
    invalid_count: 0,
    duplicate_count: 0,
    verified_through: 2000,
    draw_count: 2000,
  } });
  assert.equal(good.verified_through, 2000);
  assert.throws(() => validateLiveStatus({ payload: { ...good, production_ready: false, block_reason: "stale" } }), /stale/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, gap_count: 1 } }), /пропуски/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, official_source_verified: false } }), /Официальный источник/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, draw_count: 18 } }), /несогласован/);
});

test("live draw window must contain continuous verified history", () => {
  const rows = liveRows();
  const normalized = normalizeLiveRows(rows, 2000);
  assert.equal(normalized.length, 1000);
  assert.equal(normalized[0].number, 1001);
  assert.equal(normalized.at(-1).number, 2000);
  const withGap = liveRows();
  withGap.splice(500, 1);
  withGap.push({ ...withGap.at(-1), draw_number: 999 });
  assert.throws(() => normalizeLiveRows(withGap, 2000), /разрыв|отстаёт/);
});

test("payout table requires exactly 12 categories per draw", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    draw_number: 1300,
    category: String(i + 1),
    winners_count: 1,
    payout_per_winner_rub: 600,
    total_payout_rub: 600,
  }));
  assert.equal(normalizePayoutRows(rows, 1300, 1300).length, 12);
  assert.throws(() => normalizePayoutRows(rows.slice(0, 11), 1300, 1300), /Неполная таблица выплат/);
});

test("official 4x20 match pairs map to all 12 prize categories", () => {
  const expected = [
    [4,4,1],[4,3,2],[4,2,3],[4,1,4],[4,0,5],
    [3,3,6],[3,2,7],[3,1,8],[3,0,9],
    [2,2,10],[2,1,11],[2,0,12],
  ];
  for (const [a,b,category] of expected) assert.equal(categoryForMatches(a,b), category);
  assert.equal(categoryForMatches(1,1), null);
});

test("historical walk-forward uses bootstrap inference and paired Random", () => {
  const draws = history(1300);
  const report = walkForwardBacktest("hot1000", draws, { evaluationDraws: 100, bootstrapResamples: 1200 });
  assert.equal(report.evaluationDraws, 100);
  assert.equal(report.firstEvaluatedDraw, 1201);
  assert.equal(report.lastEvaluatedDraw, 1300);
  assert.equal(report.ticketCount, 1);
  assert.ok(Number.isFinite(report.meanDelta));
  assert.ok(Number.isFinite(report.ci95Low));
  assert.ok(Number.isFinite(report.ci95High));
  assert.ok(Number.isFinite(report.pValue) && report.pValue > 0 && report.pValue <= 1);
  assert.equal(report.bootstrapResamples, 1200);
  assert.match(report.methodology, /bootstrap/i);
  assert.match(report.methodology, /sign-flip/i);
});

test("historical evaluation supports up to 1000 draws without becoming production evidence", () => {
  const draws = history(1600);
  const report = walkForwardBacktest("adaptive20", draws, { evaluationDraws: 1000, bootstrapResamples: 1000 });
  assert.equal(report.evaluationDraws, 1000);
  assert.match(report.evidenceGrade, /Исследовательский|Надёжное|Отрицательный/i);
});

test("financial benchmark uses exact ticket cost and published payout rows", () => {
  const draws = pricedHistory(400);
  const payouts = payoutRows(351, 400);
  const report = walkForwardBacktest("hot200", draws, { evaluationDraws: 50, payoutRows: payouts, bootstrapResamples: 1000 });
  assert.equal(report.strategyStakeRub, 50 * 300);
  assert.equal(report.baselineStakeRub, 50 * 300);
  assert.equal(report.financialCoverage, 1);
  assert.equal(report.baselineFinancialCoverage, 1);
  assert.equal(report.financialRoiAvailable, true);
  assert.ok(Number.isFinite(report.strategyRoi));
});

test("zero-winner payout category stays counterfactual-unresolved", () => {
  const draws = identicalPricedHistory(260);
  const payouts = payoutRows(211, 260, { 1: { winnersCount: 0, payoutPerWinnerRub: 0, totalPayoutRub: 0 } });
  const report = walkForwardBacktest("hot200", draws, { evaluationDraws: 50, payoutRows: payouts, bootstrapResamples: 1000 });
  assert.equal(report.unresolvedStrategyTickets, 50);
  assert.equal(report.financialCoverage, 0);
  assert.equal(report.financialRoiAvailable, false);
  assert.equal(report.strategyRoi, null);
  assert.ok(Number.isFinite(report.strategyRoiLowerBound));
});

test("exploratory tournament applies BH/FDR and keeps Random as control", () => {
  const reports = strategyTournament(history(700), {
    evaluationDraws: 50,
    bootstrapResamples: 1000,
    strategyKeys: ["balanced20", "adaptive20", "hot200", "random"],
  });
  assert.equal(reports.length, 4);
  assert.equal(reports.at(-1).strategyKey, "random");
  for (const report of reports.filter((row) => row.strategyKey !== "random")) {
    assert.ok(Number.isFinite(report.pValue));
    assert.ok(Number.isFinite(report.qValue));
    assert.ok(report.qValue >= report.pValue - 1e-12);
    assert.ok(report.qValue <= 1);
  }
});

test("match counter treats fields independently", () => {
  const draw = { fieldA:[1,2,3,4], fieldB:[10,11,12,13] };
  const ticket = { fieldA:[1,2,8,9], fieldB:[10,12,19,20] };
  assert.deepEqual(countMatches(ticket, draw), { fieldA:2, fieldB:2 });
});
