import assert from "node:assert/strict";
import { loadLiveArchive } from "../public/loto-analytics-4x20/lib/live-data.mjs";

const archive = await loadLiveArchive();
assert.equal(archive.quality.productionReady, true);
assert.equal(archive.quality.officialSourceVerified, true);
assert.equal(archive.quality.continuous, true);
assert.equal(archive.quality.gapCount, 0);
assert.equal(archive.draws.length, 1000);
assert.equal(archive.draws.at(-1).number, archive.last);
assert.ok(archive.totalCount >= archive.last);
console.log(JSON.stringify({ ok: true, last: archive.last, totalCount: archive.totalCount, history: archive.draws.length }));
