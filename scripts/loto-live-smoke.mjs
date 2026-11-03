import assert from "node:assert/strict";
import {
  loadLiveArchive,
  loadOfficialPayouts,
  loadForwardOverview,
} from "../public/loto-analytics-4x20/lib/live-data.mjs";

const archive = await loadLiveArchive();
assert.equal(archive.quality.productionReady, true);
assert.equal(archive.quality.officialSourceVerified, true);
assert.equal(archive.quality.continuous, true);
assert.equal(archive.quality.gapCount, 0);
assert.equal(archive.draws.length, 1600);
assert.equal(archive.draws.at(-1).number, archive.last);
assert.ok(archive.totalCount >= archive.last);

const latest = archive.draws.at(-1);
assert.ok(Number.isFinite(latest.ticketPriceRub) && latest.ticketPriceRub > 0);
assert.ok(Number.isFinite(latest.sumPaidRub) && latest.sumPaidRub >= 0);

const payouts = await loadOfficialPayouts(archive.last, archive.last);
assert.equal(payouts.length, 12);
assert.deepEqual(
  payouts.map((row) => row.category).sort((a, b) => a - b),
  Array.from({ length: 12 }, (_, i) => i + 1),
);
const payoutTotal = payouts.reduce((sum, row) => sum + row.totalPayoutRub, 0);
assert.ok(Math.abs(payoutTotal - latest.sumPaidRub) < 0.01, `payout total ${payoutTotal} != draw sumPaid ${latest.sumPaidRub}`);

const targetDraw = archive.last + 1;
const forward = await loadForwardOverview(targetDraw);
assert.ok(forward.status, "forward_evidence_status missing");
assert.equal(forward.status.promoted, false, "new preregistered experiment must not start promoted");
assert.ok(Number(forward.status.min_forward_draws) >= 1000);
assert.equal(forward.portfolios.length, 3, `expected 3 canonical forward portfolios for #${targetDraw}`);
for (const portfolio of forward.portfolios) {
  assert.equal(portfolio.targetDraw, targetDraw);
  assert.equal(portfolio.trainingCutoff, archive.last);
  assert.equal(portfolio.sourceVerifiedThrough, archive.last);
  assert.equal(portfolio.provenanceVerified, true);
  assert.equal(portfolio.tickets.length, 5);
}

console.log(JSON.stringify({
  ok: true,
  last: archive.last,
  totalCount: archive.totalCount,
  history: archive.draws.length,
  payoutCategories: payouts.length,
  ticketPriceRub: latest.ticketPriceRub,
  sumPaidRub: latest.sumPaidRub,
  forwardTarget: targetDraw,
  forwardPortfolios: forward.portfolios.length,
  forwardDraws: Number(forward.status.forward_draws || 0),
  promotionMinimum: Number(forward.status.min_forward_draws || 1000),
}));
