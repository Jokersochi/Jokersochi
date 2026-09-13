import test from "node:test";
import assert from "node:assert/strict";
import { STRATEGIES, DISCLAIMER, generateTicket, generateTickets, maxUsefulTickets } from "../public/loto-analytics-4x20/lib/strategy.mjs";
import { STRATEGIES as V2_STRATEGIES, generateTickets as generateV2Tickets, maxUsefulTickets as maxV2UsefulTickets } from "../public/loto-analytics-4x20/lib/strategy-v2.mjs";
import { buildTargetTickets, countMatches, strategyTournament, walkForwardBacktest } from "../public/loto-analytics-4x20/lib/backtest.mjs";
import { loadLedger, recordVirtualPortfolio, settleLedger, summarizeLedger } from "../public/loto-analytics-4x20/lib/ledger.mjs";
import { normalizeDraw, validateArchive } from "./loto-source.mjs";
import { normalizeLiveRows, validateLiveStatus } from "../public/loto-analytics-4x20/lib/live-data.mjs";

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
  })).reverse();
}

function archiveRows(numbers) {
  return numbers.map((number) => ({ number, date: `d-${number}`, fieldA:[1,2,3,4], fieldB:[5,6,7,8] }));
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

function assertFullCoverage(tickets, field) {
  assert.equal(tickets.length, 5);
  const values = tickets.flatMap((ticket) => ticket[field]).sort((a, b) => a - b);
  assert.deepEqual(values, Array.from({ length: 20 }, (_, i) => i + 1));
}

test("six base strategies remain explanatory and non-promissory", () => {
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

test("deterministic base strategies do not fabricate variants", () => {
  const h = history();
  for (const strategy of STRATEGIES.filter((s) => s.deterministic)) {
    assert.equal(maxUsefulTickets(strategy.key), 1);
    assert.equal(generateTickets(strategy.key, h, 10, 42).length, 1);
  }
});

test("Adaptive Coverage is the v2 default and both coverage portfolios use 1-20 exactly once per field", () => {
  assert.equal(V2_STRATEGIES[0].key, "adaptive20");
  const h = history(700);
  for (const key of ["adaptive20", "balanced20"]) {
    assert.equal(maxV2UsefulTickets(key), 5);
    const tickets = generateV2Tickets(key, h, 5, 42);
    assertFullCoverage(tickets, "fieldA");
    assertFullCoverage(tickets, "fieldB");
    assert.ok(tickets.every((ticket) => ticket.explanation.disclaimer === DISCLAIMER));
  }
});

test("Walk-Forward Ensemble produces five tickets and does not read target or future results", () => {
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

test("Virtual Ledger locks the first portfolio per strategy/draw and settles without inventing payout ROI", () => {
  const storage = memoryStorage();
  const h = history(120);
  const tickets = generateV2Tickets("balanced20", h, 5, 7);
  const entry = recordVirtualPortfolio({
    strategyKey: "balanced20",
    strategyName: "Balanced Coverage 20",
    tickets,
    targetDraw: 121,
    sourceLast: 120,
    createdAt: "2026-09-13T05:00:00.000Z",
    storage,
  });
  assert.equal(entry.status, "pending");
  assert.equal(entry.locked, true);
  assert.equal(entry.financials.available, false);
  assert.equal(loadLedger(storage).length, 1);
  assert.throws(() => recordVirtualPortfolio({
    strategyKey: "balanced20",
    strategyName: "Balanced Coverage 20",
    tickets,
    targetDraw: 121,
    sourceLast: 120,
    createdAt: "2026-09-13T05:01:00.000Z",
    storage,
  }), /уже зафиксирован/);

  const target = { number: 121, fieldA: [1,2,3,4], fieldB: [5,6,7,8] };
  const settled = settleLedger([...h, target], storage, "2026-09-13T06:00:00.000Z");
  assert.equal(settled[0].status, "checked");
  assert.equal(settled[0].result.drawNumber, 121);
  assert.equal(settled[0].result.tickets.length, 5);
  const snapshot = JSON.stringify(settled[0]);
  const settledAgain = settleLedger([...h, { ...target, fieldA:[17,18,19,20], fieldB:[1,2,3,4] }], storage, "2026-09-13T07:00:00.000Z");
  assert.equal(JSON.stringify(settledAgain[0]), snapshot);
  const summary = summarizeLedger(settledAgain);
  assert.equal(summary.pending, 0);
  assert.equal(summary.checked, 1);
  assert.equal(summary.targetDraws, 1);
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
  assert.throws(
    () => validateArchive([...firstPass, ...secondPass, conflictingThree], 5),
    /Конфликтующие дубли/,
  );
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

test("live draw window must contain 1000 continuous verified draws", () => {
  const rows = liveRows();
  const normalized = normalizeLiveRows(rows, 2000);
  assert.equal(normalized.length, 1000);
  assert.equal(normalized[0].number, 1001);
  assert.equal(normalized.at(-1).number, 2000);

  const withGap = liveRows();
  withGap.splice(500, 1);
  withGap.push({ ...withGap.at(-1), draw_number: 999 });
  assert.throws(() => normalizeLiveRows(withGap, 2000), /разрыв|отстаёт/);
  assert.throws(() => normalizeLiveRows(rows.slice(0, 999), 2000), /минимум 1000/);
});

test("walk-forward backtest scores only future targets against a paired random baseline", () => {
  const draws = history(1300);
  const report = walkForwardBacktest("hot1000", draws, { evaluationDraws: 100 });
  assert.equal(report.evaluationDraws, 100);
  assert.equal(report.firstEvaluatedDraw, 1201);
  assert.equal(report.lastEvaluatedDraw, 1300);
  assert.equal(report.ticketCount, 1);
  assert.ok(Number.isFinite(report.meanDelta));
  assert.ok(Number.isFinite(report.ci95Low));
  assert.ok(Number.isFinite(report.ci95High));
  assert.ok(Number.isFinite(report.proxyHitRate));
  assert.equal(report.financialRoiAvailable, false);
  assert.match(report.financialStatus, /payout/i);
  assert.match(report.methodology, /walk-forward/i);
});

test("strategy tournament keeps Random as explicit control", () => {
  const draws = history(700);
  const reports = strategyTournament(draws, { evaluationDraws: 50, strategyKeys: ["balanced20", "adaptive20", "random"] });
  assert.equal(reports.length, 3);
  assert.equal(reports.at(-1).strategyKey, "random");
  assert.ok(reports.every((report) => report.evaluationDraws === 50));
});

test("match counter treats fields independently", () => {
  const draw = { fieldA:[1,2,3,4], fieldB:[10,11,12,13] };
  const ticket = { fieldA:[1,2,8,9], fieldB:[10,12,19,20] };
  assert.deepEqual(countMatches(ticket, draw), { fieldA:2, fieldB:2 });
});
