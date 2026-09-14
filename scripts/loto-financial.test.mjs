import test from "node:test";
import assert from "node:assert/strict";
import { estimatePortfolioFinancials } from "../public/loto-analytics-4x20/lib/payout.mjs";
import { buildStrategyReport } from "./loto-tournament-report.mjs";

function payoutRows(drawNumber, overrides = {}) {
  return Array.from({ length: 12 }, (_, i) => {
    const category = i + 1;
    const override = overrides[category] ?? {};
    return {
      drawNumber,
      category,
      winnersCount: override.winnersCount ?? 2,
      payoutPerWinnerRub: override.payoutPerWinnerRub ?? (category === 11 ? 300 : 600),
      totalPayoutRub: override.totalPayoutRub ?? (category === 11 ? 600 : 1200),
    };
  });
}

function syntheticDraws(n = 1400) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    date: new Date(Date.UTC(2026, 0, 1, 0, i % 60)).toISOString(),
    fieldA: [1 + (i % 17), 2 + (i % 17), 3 + (i % 17), 4 + (i % 17)].map((x) => ((x - 1) % 20) + 1),
    fieldB: [5 + (i % 17), 6 + (i % 17), 7 + (i % 17), 8 + (i % 17)].map((x) => ((x - 1) % 20) + 1),
    ticketPriceRub: 300,
  }));
}

function payoutRange(first, last) {
  const rows = [];
  for (let draw = first; draw <= last; draw++) rows.push(...payoutRows(draw));
  return rows;
}

test("percentage prize estimate dilutes the observed pool across published plus virtual winners", () => {
  const result = estimatePortfolioFinancials({
    drawNumber: 10,
    ticketPriceRub: 300,
    ticketMatches: [
      { fieldA: 2, fieldB: 2 },
      { fieldA: 2, fieldB: 2 },
    ],
    payoutRows: payoutRows(10, {
      10: { winnersCount: 2, payoutPerWinnerRub: 600, totalPayoutRub: 1200 },
    }),
  });
  assert.equal(result.stakeRub, 600);
  assert.equal(result.complete, true);
  assert.equal(result.coverage, 1);
  assert.equal(result.tickets[0].category, 10);
  assert.equal(result.tickets[0].payoutStatus, "counterfactual_pool_share");
  assert.equal(result.tickets[0].payoutRub, 300);
  assert.equal(result.tickets[1].payoutRub, 300);
  assert.equal(result.payoutRub, 600);
  assert.equal(result.roi, 0);
});

test("fixed 2x1/1x2 category uses its published fixed amount", () => {
  const result = estimatePortfolioFinancials({
    drawNumber: 11,
    ticketPriceRub: 300,
    ticketMatches: [
      { fieldA: 2, fieldB: 1 },
      { fieldA: 1, fieldB: 2 },
    ],
    payoutRows: payoutRows(11, {
      11: { winnersCount: 100, payoutPerWinnerRub: 300, totalPayoutRub: 30000 },
    }),
  });
  assert.equal(result.complete, true);
  assert.equal(result.payoutRub, 600);
  assert.ok(result.tickets.every((ticket) => ticket.category === 11));
  assert.ok(result.tickets.every((ticket) => ticket.payoutStatus === "fixed_published_amount"));
});

test("zero observed pool stays unresolved and produces only an ROI lower bound", () => {
  const result = estimatePortfolioFinancials({
    drawNumber: 12,
    ticketPriceRub: 300,
    ticketMatches: [{ fieldA: 4, fieldB: 4 }],
    payoutRows: payoutRows(12, {
      1: { winnersCount: 0, payoutPerWinnerRub: 0, totalPayoutRub: 0 },
    }),
  });
  assert.equal(result.complete, false);
  assert.equal(result.coverage, 0);
  assert.equal(result.unresolvedTickets, 1);
  assert.equal(result.roi, null);
  assert.equal(result.roiLowerBound, -1);
  assert.equal(result.tickets[0].payoutStatus, "unresolved_zero_winner");
});

test("strategy report v3 persists counterfactual financial benchmark without changing evidence semantics", () => {
  const draws = syntheticDraws(1400);
  const snapshot = {
    source: "official",
    first: 1,
    last: 1400,
    count: 1400,
    quality: { continuous: true },
    draws: draws.map(({ ticketPriceRub, ...draw }) => draw),
  };
  const payouts = payoutRange(1001, 1400);
  const report = buildStrategyReport(snapshot, {
    evaluationDraws: 50,
    ensembleDraws: 50,
    generatedAt: "2026-09-14T00:00:00.000Z",
    drawsOverride: draws,
    payoutRows: payouts,
  });
  assert.equal(report.version, 3);
  assert.equal(report.financialDataAvailable, true);
  assert.equal(report.archiveLast, 1400);
  assert.equal(report.analysisWindowDraws, 1400);
  assert.ok(report.portfolio5.leaderByProxy);
  assert.equal(report.portfolio5.leaderByProxy.financialDataAvailable, true);
  assert.ok(Number.isFinite(report.portfolio5.leaderByProxy.stakeRub));
  assert.ok(Number.isFinite(report.portfolio5.leaderByProxy.roiLowerBound));
  assert.match(report.caution, /не доказывают/i);
  assert.match(report.financialMethodology, /контрфактическ|виртуальн/i);
});
