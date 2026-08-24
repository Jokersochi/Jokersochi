import test from "node:test";
import assert from "node:assert/strict";
import { STRATEGIES, DISCLAIMER, generateTicket, generateTickets, maxUsefulTickets } from "../public/loto-analytics-4x20/lib/strategy.mjs";
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
  const rows = [1,2,3,4].map((number) => ({ number, date: null, fieldA:[1,2,3,4], fieldB:[5,6,7,8] }));
  const ok = validateArchive(rows, 4);
  assert.equal(ok.quality.continuous, true);
  assert.throws(() => validateArchive([rows[0], rows[2], rows[3]], 3), /разрывы/);
});

test("live backend status is fail-closed", () => {
  const good = validateLiveStatus({ payload: {
    production_ready: true,
    official_source_verified: true,
    gap_count: 0,
    invalid_count: 0,
    duplicate_count: 0,
    verified_through: 2000,
  } });
  assert.equal(good.verified_through, 2000);
  assert.throws(() => validateLiveStatus({ payload: { ...good, production_ready: false, block_reason: "stale" } }), /stale/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, gap_count: 1 } }), /пропуски/);
  assert.throws(() => validateLiveStatus({ payload: { ...good, official_source_verified: false } }), /Официальный источник/);
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
