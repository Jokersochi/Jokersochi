import assert from "node:assert/strict";
import { loadLiveArchive, loadOfficialPayouts } from "../public/loto-analytics-4x20/lib/live-data.mjs";

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
assert.deepEqual(payouts.map((row) => row.category), Array.from({ length: 12 }, (_, i) => i + 1));
const payoutTotal = payouts.reduce((sum, row) => sum + row.totalPayoutRub, 0);
assert.ok(Math.abs(payoutTotal - latest.sumPaidRub) < 0.01, `payout total ${payoutTotal} != draw sumPaid ${latest.sumPaidRub}`);

console.log(JSON.stringify({
  ok: true,
  last: archive.last,
  totalCount: archive.totalCount,
  history: archive.draws.length,
  payoutCategories: payouts.length,
  ticketPriceRub: latest.ticketPriceRub,
  sumPaidRub: latest.sumPaidRub,
}));
