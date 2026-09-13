import test from "node:test";
import assert from "node:assert/strict";
import { advanceForwardLedger, FORWARD_STRATEGIES } from "./loto-forward-ledger.mjs";

function syntheticSnapshot(last) {
  const draws = Array.from({ length: last }, (_, i) => ({
    number: i + 1,
    date: `d-${i + 1}`,
    fieldA: [1 + (i % 17), 2 + (i % 17), 3 + (i % 17), 4 + (i % 17)].map((n) => ((n - 1) % 20) + 1),
    fieldB: [5 + (i % 17), 6 + (i % 17), 7 + (i % 17), 8 + (i % 17)].map((n) => ((n - 1) % 20) + 1),
  }));
  return { source: "official", count: draws.length, first: 1, last, quality: { continuous: true }, draws };
}

test("forward ledger locks five portfolios only for the next unseen draw", () => {
  const first = advanceForwardLedger(syntheticSnapshot(1000), null, "2026-09-13T08:00:00.000Z");
  assert.equal(first.startedAtDraw, 1000);
  assert.equal(first.entries.length, 1);
  assert.equal(first.entries[0].targetDraw, 1001);
  assert.equal(first.entries[0].sourceLast, 1000);
  assert.equal(first.entries[0].locked, true);
  assert.equal(first.entries[0].status, "pending");
  assert.deepEqual(first.entries[0].strategies.map((row) => row.strategyKey), FORWARD_STRATEGIES);
  assert.ok(first.entries[0].strategies.every((row) => row.tickets.length === 5));
  assert.ok(first.entries[0].strategies.every((row) => row.tickets.every((ticket) => ticket.fieldA.length === 4 && ticket.fieldB.length === 4)));
});

test("forward ledger settles immutably and never backfills missed draws", () => {
  const first = advanceForwardLedger(syntheticSnapshot(1000), null, "2026-09-13T08:00:00.000Z");
  const lockedTickets = JSON.stringify(first.entries[0].strategies.map((row) => row.tickets));
  const second = advanceForwardLedger(syntheticSnapshot(1001), first, "2026-09-13T09:00:00.000Z");
  assert.equal(second.entries[0].status, "checked");
  assert.equal(second.entries[0].result.drawNumber, 1001);
  assert.equal(JSON.stringify(second.entries[0].strategies.map((row) => row.tickets)), lockedTickets);
  assert.equal(second.entries.at(-1).targetDraw, 1002);
  assert.equal(second.entries.at(-1).status, "pending");
  assert.equal(second.entries[0].financials.available, false);

  const third = advanceForwardLedger(syntheticSnapshot(1004), second, "2026-09-13T12:00:00.000Z");
  assert.equal(third.entries.find((entry) => entry.targetDraw === 1002).status, "checked");
  assert.deepEqual(third.missedDraws, [1003, 1004]);
  assert.equal(third.entries.at(-1).targetDraw, 1005);
  assert.equal(third.entries.some((entry) => entry.targetDraw === 1003), false);
  assert.equal(third.entries.some((entry) => entry.targetDraw === 1004), false);
});

test("forward ledger refuses unverified or discontinuous archives", () => {
  const good = syntheticSnapshot(1000);
  assert.throws(() => advanceForwardLedger({ ...good, source: "mirror" }), /официальным архивом/);
  assert.throws(() => advanceForwardLedger({ ...good, quality: { continuous: false } }), /официальным архивом/);
});
