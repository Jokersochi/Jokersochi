import test from "node:test";
import assert from "node:assert/strict";
import { STRATEGIES, DISCLAIMER, generateTicket, generateTickets, maxUsefulTickets } from "../public/loto-analytics-4x20/lib/strategy.mjs";
import { categoryForMatches, countMatches, walkForwardBacktest } from "../public/loto-analytics-4x20/lib/backtest.mjs";
import { normalizeDraw, validateArchive } from "./loto-source.mjs";
import { normalizeLiveRows, normalizePayoutRows, validateLiveStatus } from "../public/loto-analytics-4x20/lib/live-data.mjs";

function history(n = 1000) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    fieldA: [1 + (i % 17), 2 + (i % 17), 3 + (i % 17), 4 + (i % 17)].map((x) => ((x - 1) % 20) + 1),
    fieldB: [5 + (i % 17), 6 + (i % 17), 7 + (i % 17), 8 + (i % 17)].map((x) => ((x - 1) % 20) + 1),
  }));
}

function liveRows(first = 1001, count = 1000) {
  return Array.from({ length: count }, (_, i) => ({
    draw_number: first + i,
    draw_date: new Date(Date.UTC(2026, 0, 1, 0, i % 60)).toISOString(),
    field1: [1, 2, 3, 4],
    field2: [5, 6, 7, 8],
    ticket_price_rub: 300,
  })).reverse();
}

function archiveRows(numbers) {
  return numbers.map((number) => ({ number, date: `d-${number}`, fieldA:[1,2,3,4], fieldB:[5,6,7,8] }));
}

function payoutRows(first, last, amount = 1000) {
  const rows = [];
  for (let draw = first; draw <= last; draw++) {
    for (let category = 1; category <= 12; category++) {
      rows.push({ draw_number: draw, category: String(category), winners_count: 1, payout_per_winner_rub: amount, total_payout_rub: amount });
    }
  }
  return rows;
}

test("six strategies remain explanatory and non-promissory", () => {
  assert.equal(STRATEGIES.length, 6);
  for (const strategy of STRATEGIES) {
    assert.ok(strategy.plainDescription.length > 50);
    assert.doesNotMatch(strategy.plainDescription, /гарант|обязательно выигр|повысит шанс/i);
  }
  assert.match(DISCLAIMER, /не прогноз выигрыша/i);
});

test("tickets contain 4+4 and evidence", () => {
  const h = history();
  for (const strategy of STRATEGIES) {
    const ticket = generateTicket(strategy.key, h, 1234);
    assert.equal(ticket.fieldA.length, 4);
    assert.equal(ticket.fieldB.length, 4);
    assert.equal(ticket.explanation.fields.length, 2);
    assert.ok(ticket.explanation.fields.every((f) => f.details.length === 4));
  }
});

test("deterministic strategies do not fabricate variants", () => {
  const h = history();
  for (const strategy of STRATEGIES.filter((s) => s.deterministic)) {
    assert.equal(maxUsefulTickets(strategy.key), 1);
    assert.equal(generateTickets(strategy.key, h, 10, 42).length, 1);
  }
});

test("source normalization rejects unfinished and invalid draws", () => {
  const good = normalizeDraw({ number: 10, status: "COMPLETED", completed: true, date: "x", combination: { structured: [1,2,3,4,5,6,7,8] } });
  assert.equal(good.number, 10);
  assert.equal(normalizeDraw({ number: 11, status: "STARTED", combination: { structured: [1,2,3,4,5,6,7,8] } }), null);
  assert.equal(normalizeDraw({ number: 12, status: "COMPLETED", combination: { structured: [1,1,3,4,5,6,7,8] } }), null);
});

test("archive validation fails on gaps and accepts continuity", () => {
  const rows = archiveRows([1,2,3,4]);
  const ok = validateArchive(rows, 4);
  assert.equal(ok.quality.continuous, true);
  assert.throws(() => validateArchive([rows[0], rows[2], rows[3]], 3), /разрывы/);
});

test("two official passes recover a transient pagination omission without hiding conflicts", () => {
  const firstPass = archiveRows([1,2,4,5]);
  const secondPass = archiveRows([1,2,3,4,5]);
  const recovered = validateArchive([...firstPass, ...secondPass], 5);
  assert.equal(recovered.quality.continuous, true);
  assert.equal(recovered.first, 1);
  assert.equal(recovered.last, 5);
  assert.equal(recovered.quality.duplicates, 4);
  const conflictingThree = { ...secondPass[2], fieldA: [9,10,11,12] };
  assert.throws(() => validateArchive([...firstPass, ...secondPass, conflictingThree], 5), /Конфликтующие дубли/);
});

test("live backend status is fail-closed", () => {
  const good = validateLiveStatus({ payload: { production_ready:true, official_source_verified:true, gap_count:0, invalid_count:0, duplicate_count:0, verified_through:2000, draw_count:2000 } });
  assert.equal(good.verified_through, 2000);
  assert.throws(() => validateLiveStatus({ payload: { ...good, production_ready:false, block_reason:"stale" } }), /stale/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, gap_count:1 } }), /пропуски/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, official_source_verified:false } }), /Официальный источник/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, draw_count:18 } }), /несогласован/);
});

test("live draw window must contain 1000 continuous verified draws", () => {
  const rows = liveRows();
  const normalized = normalizeLiveRows(rows, 2000);
  assert.equal(normalized.length, 1000);
  assert.equal(normalized[0].number, 1001);
  assert.equal(normalized.at(-1).number, 2000);
  assert.equal(normalized.at(-1).ticketPriceRub, 300);
  const withGap = liveRows();
  withGap.splice(500, 1);
  withGap.push({ ...withGap.at(-1), draw_number:999 });
  assert.throws(() => normalizeLiveRows(withGap, 2000), /разрыв|отстаёт/);
  assert.throws(() => normalizeLiveRows(rows.slice(0, 999), 2000), /минимум 1000/);
});

test("payout table requires exactly 12 categories per draw", () => {
  const rows = payoutRows(100, 101);
  const normalized = normalizePayoutRows(rows, 100, 101);
  assert.equal(normalized.length, 24);
  assert.equal(normalized[0].category, 1);
  assert.throws(() => normalizePayoutRows(rows.slice(0, -1), 100, 101), /Неполная таблица выплат/);
});

test("official 4x20 match pairs map to 12 prize categories", () => {
  assert.equal(categoryForMatches(4,4), 1);
  assert.equal(categoryForMatches(3,4), 2);
  assert.equal(categoryForMatches(4,0), 5);
  assert.equal(categoryForMatches(3,3), 6);
  assert.equal(categoryForMatches(2,3), 7);
  assert.equal(categoryForMatches(2,2), 10);
  assert.equal(categoryForMatches(1,2), 11);
  assert.equal(categoryForMatches(0,2), 12);
  assert.equal(categoryForMatches(1,1), null);
});

test("walk-forward backtest scores only future targets against a paired random baseline", () => {
  const draws = history(1300);
  const report = walkForwardBacktest("hot1000", draws, { evaluationDraws:100 });
  assert.equal(report.evaluationDraws, 100);
  assert.equal(report.firstEvaluatedDraw, 1201);
  assert.equal(report.lastEvaluatedDraw, 1300);
  assert.equal(report.ticketCount, 1);
  assert.ok(Number.isFinite(report.meanDelta));
  assert.ok(Number.isFinite(report.ci95Low));
  assert.ok(Number.isFinite(report.ci95High));
  assert.equal(report.financialRoiAvailable, false);
  assert.match(report.methodology, /walk-forward/i);
});

test("financial walk-forward uses per-draw ticket cost and official payout rows", () => {
  const draws = history(1300).map((draw) => ({ ...draw, ticketPriceRub:300 }));
  const report = walkForwardBacktest("hot1000", draws, { evaluationDraws:100, payoutRows:payoutRows(1201,1300) });
  assert.equal(report.strategyStakeRub, 30000);
  assert.equal(report.baselineStakeRub, 30000);
  assert.equal(report.financialCoverage, 1);
  assert.equal(report.baselineFinancialCoverage, 1);
  assert.equal(report.financialRoiAvailable, true);
  assert.ok(Number.isFinite(report.strategyRoi));
  assert.ok(Number.isFinite(report.baselineRoi));
  assert.match(report.financialMethodology, /официальных данных/i);
});

test("zero-winner payout category is unresolved instead of being treated as zero prize", () => {
  const draws = history(1300).map((draw) => ({ ...draw, ticketPriceRub:300 }));
  const rows = payoutRows(1201,1300);
  for (const row of rows) {
    if (row.category === "11") { row.winners_count = 0; row.payout_per_winner_rub = 0; row.total_payout_rub = 0; }
  }
  const report = walkForwardBacktest("hot1000", draws, { evaluationDraws:100, payoutRows:rows });
  assert.ok(report.financialCoverage <= 1);
  assert.ok(report.strategyRoiLowerBound != null);
});

test("match counter treats fields independently", () => {
  const draw = { fieldA:[1,2,3,4], fieldB:[10,11,12,13] };
  const ticket = { fieldA:[1,2,8,9], fieldB:[10,12,19,20] };
  assert.deepEqual(countMatches(ticket, draw), { fieldA:2, fieldB:2 });
});
