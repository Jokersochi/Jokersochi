import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const OFFICIAL_ENDPOINT = "https://www.stoloto.ru/p/api/mobile/api/v35/service/draws/archive";
const SNAPSHOT_URL = "https://raw.githubusercontent.com/Jokersochi/Jokersochi/main/public/loto-analytics-4x20/data/draws.json";
const PAGE_SIZE = 50;
const MAX_INCREMENTAL_PAGES = 12;
const OFFICIAL_HEADERS = {
  accept: "*/*",
  "content-type": "application/x-www-form-urlencoded",
  "device-platform": "DESKTOP",
  "device-type": "STOLOTO",
  "gosloto-partner": "bXMjXFRXZ3coWXh6R3s1NTdUX3dnWlBMLUxmdg",
  referer: "https://www.stoloto.ru/4x20/archive",
  "user-agent": "LotoOS-Supabase-Sync/1.2",
};

type CanonicalDraw = {
  draw_number: number;
  draw_date: string;
  status: string;
  field1: number[];
  field2: number[];
  source_url: string;
  raw: Record<string, unknown>;
};

type QaSummary = {
  first: number;
  last: number;
  count: number;
  duplicates: number;
  gaps: number;
  invalid: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label}: ${message}`);
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretMap = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = secretMap ? JSON.parse(secretMap)?.default : legacy;
  if (!url || !secret) throw new Error("Missing Supabase server credentials");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function verifySyncToken(supabase: any, token: string) {
  if (!token || token.length < 32) return false;
  return await retry("Token verification backend unavailable", async () => {
    const { data, error } = await supabase.rpc("verify_lotoos_sync_token", { p_token: token });
    if (error) throw new Error(error.message);
    return data === true;
  });
}

async function latestStoredDraw(supabase: any) {
  return await retry("Latest draw query failed", async () => {
    const { data, error } = await supabase.from("draws").select("draw_number,draw_date").order("draw_number", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
}

async function exactDrawCount(supabase: any) {
  return await retry("Draw count query failed", async () => {
    const { count, error } = await supabase.from("draws").select("draw_number", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    if (count == null) throw new Error("Missing exact count");
    return Number(count);
  });
}

function validField(field: unknown): field is number[] {
  return Array.isArray(field) && field.length === 4 && new Set(field).size === 4 &&
    field.every((n) => Number.isInteger(Number(n)) && Number(n) >= 1 && Number(n) <= 20);
}

function normalizeSnapshotDraw(row: any): CanonicalDraw {
  const number = Number(row?.number);
  const field1 = Array.isArray(row?.fieldA) ? row.fieldA.map(Number) : null;
  const field2 = Array.isArray(row?.fieldB) ? row.fieldB.map(Number) : null;
  const date = row?.date;
  if (!Number.isInteger(number) || number < 1 || !validField(field1) || !validField(field2) || !date || Number.isNaN(Date.parse(date))) {
    throw new Error(`Invalid snapshot draw ${String(row?.number)}`);
  }
  return {
    draw_number: number,
    draw_date: new Date(date).toISOString(),
    status: "COMPLETED",
    field1,
    field2,
    source_url: row?.sourceUrl || `https://www.stoloto.ru/4x20/archive/${number}`,
    raw: { validationStatus: row?.validationStatus || "verified", snapshot: true },
  };
}

function normalizeOfficialDraw(draw: any): CanonicalDraw | null {
  const structured = draw?.combination?.structured;
  if (!Array.isArray(structured) || structured.length !== 8 || draw?.status !== "COMPLETED" || draw?.completed === false) return null;
  const values = structured.map(Number);
  const field1 = values.slice(0, 4);
  const field2 = values.slice(4, 8);
  const number = Number(draw?.number);
  const date = draw?.date;
  if (!Number.isInteger(number) || number < 1 || !validField(field1) || !validField(field2) || !date || Number.isNaN(Date.parse(date))) return null;
  return {
    draw_number: number,
    draw_date: new Date(date).toISOString(),
    status: "COMPLETED",
    field1,
    field2,
    source_url: `https://www.stoloto.ru/4x20/archive/${number}`,
    raw: { validationStatus: "verified", source: "official_v35" },
  };
}

function auditContinuous(rows: CanonicalDraw[], requireFromOne = false): { sorted: CanonicalDraw[]; qa: QaSummary } {
  const sorted = [...rows].sort((a, b) => a.draw_number - b.draw_number);
  if (!sorted.length) throw new Error("No valid draws");
  if (requireFromOne && sorted[0].draw_number !== 1) throw new Error(`Archive does not start at #1: #${sorted[0].draw_number}`);
  const seen = new Set<number>();
  let duplicates = 0;
  const gapRanges: Array<[number, number]> = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i].draw_number;
    if (seen.has(n)) duplicates++;
    seen.add(n);
    if (i > 0 && n > sorted[i - 1].draw_number + 1) gapRanges.push([sorted[i - 1].draw_number + 1, n - 1]);
  }
  if (duplicates || gapRanges.length) throw new Error(`Quality gate failed: duplicates=${duplicates}, gaps=${JSON.stringify(gapRanges.slice(0, 5))}`);
  return { sorted, qa: { first: sorted[0].draw_number, last: sorted.at(-1)!.draw_number, count: sorted.length, duplicates, gaps: 0, invalid: 0 } };
}

async function upsertBatches(supabase: any, rows: CanonicalDraw[]) {
  let written = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    await retry(`Draw upsert failed at ${i}`, async () => {
      const { error } = await supabase.from("draws").upsert(batch, { onConflict: "draw_number" });
      if (error) throw new Error(error.message);
      return true;
    });
    written += batch.length;
  }
  return written;
}

async function writeRun(supabase: any, status: string, details: any, rowsSeen = 0, rowsUpserted = 0) {
  const { error } = await supabase.from("ingestion_runs").insert({ source_key: "stoloto_official", started_at: details.started_at, finished_at: new Date().toISOString(), rows_seen: rowsSeen, rows_upserted: rowsUpserted, gap_count: details.gap_count ?? null, mismatch_count: details.mismatch_count ?? 0, status, details });
  if (error) console.error("ingestion_runs insert failed", error.message);
}

async function updateArchiveStatus(supabase: any, payload: Record<string, unknown>) {
  await retry("system_state update failed", async () => {
    const { error } = await supabase.from("system_state").upsert({ key: "archive_status", payload, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return true;
  });
}

async function getPreviousArchiveStatus(supabase: any) {
  return await retry("system_state read failed", async () => {
    const { data, error } = await supabase.from("system_state").select("payload").eq("key", "archive_status").maybeSingle();
    if (error) throw new Error(error.message);
    return data?.payload || {};
  });
}

async function reconcileArchiveStatus(supabase: any, latest: { draw_number: number; draw_date: string }, signalClass: string) {
  const [previous, count] = await Promise.all([getPreviousArchiveStatus(supabase), exactDrawCount(supabase)]);
  const maxDraw = Number(latest.draw_number);
  const integrityOk = count === maxDraw;
  const payload = {
    ...previous,
    canonical_imported: true,
    verified_through: maxDraw,
    verified_through_date: latest.draw_date,
    freshness_signal_through: maxDraw,
    freshness_signal_date: new Date().toISOString().slice(0, 10),
    freshness_signal_class: signalClass,
    official_source_verified: true,
    production_ready: integrityOk,
    block_reason: integrityOk ? null : `archive_integrity_count_${count}_expected_${maxDraw}`,
    draw_count: count,
    gap_count: integrityOk ? 0 : Math.max(maxDraw - count, 1),
    duplicate_count: 0,
    invalid_count: 0,
    checked_at: new Date().toISOString(),
  };
  await updateArchiveStatus(supabase, payload);
  if (!integrityOk) throw new Error(`Archive integrity mismatch: count=${count}, max_draw=${maxDraw}`);
  return payload;
}

async function bootstrap(supabase: any, startedAt: string) {
  const response = await fetch(SNAPSHOT_URL, { headers: { "user-agent": "LotoOS-Supabase-Bootstrap/1.2" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
  const snapshot = await response.json();
  if (snapshot?.source !== "official" || !Array.isArray(snapshot?.draws) || snapshot.draws.length < 1000) throw new Error("Unexpected GitHub snapshot schema/source");
  const { sorted, qa } = auditContinuous(snapshot.draws.map(normalizeSnapshotDraw), true);
  if (qa.count !== Number(snapshot.count) || qa.first !== Number(snapshot.first) || qa.last !== Number(snapshot.last)) throw new Error("Snapshot metadata mismatch");
  const written = await upsertBatches(supabase, sorted);
  const count = await exactDrawCount(supabase);
  const latest = await latestStoredDraw(supabase);
  if (!latest || count !== qa.count || Number(latest.draw_number) !== qa.last) throw new Error(`Post-import verification mismatch count=${count}/${qa.count} last=${latest?.draw_number}/${qa.last}`);
  await updateArchiveStatus(supabase, { canonical_imported: true, verified_through: qa.last, verified_through_date: latest.draw_date, freshness_signal_through: qa.last, freshness_signal_date: new Date().toISOString().slice(0, 10), freshness_signal_class: "official_github_refresh_snapshot", official_source_verified: true, production_ready: true, block_reason: null, draw_count: count, gap_count: 0, duplicate_count: 0, invalid_count: 0, checked_at: new Date().toISOString(), source_snapshot_url: SNAPSHOT_URL, source_snapshot_retrieved_at: snapshot.retrievedAt || null });
  await writeRun(supabase, "success", { started_at: startedAt, mode: "bootstrap", ...qa, gap_count: 0 }, qa.count, written);
  return { ok: true, mode: "bootstrap", ...qa, written };
}

async function fetchOfficialPage(page: number) {
  const url = new URL(OFFICIAL_ENDPOINT);
  url.searchParams.set("game", "4x20");
  url.searchParams.set("count", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: OFFICIAL_HEADERS, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data?.requestStatus !== "success" || !Array.isArray(data?.draws)) throw new Error("Official source schema changed");
      return data.draws;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 700);
    }
  }
  throw lastError;
}

async function incremental(supabase: any, startedAt: string) {
  const latest = await latestStoredDraw(supabase);
  if (!latest) return { ok: false, mode: "incremental", needs_bootstrap: true, status: 409 };
  const current = Number(latest.draw_number);
  const collected = new Map<number, CanonicalDraw>();
  let reachedCurrent = false;
  for (let page = 1; page <= MAX_INCREMENTAL_PAGES; page++) {
    const raw = await fetchOfficialPage(page);
    if (!raw.length) break;
    for (const item of raw) {
      const row = normalizeOfficialDraw(item);
      if (!row) continue;
      if (row.draw_number <= current) reachedCurrent = true;
      if (row.draw_number > current) collected.set(row.draw_number, row);
    }
    if (reachedCurrent || raw.length < PAGE_SIZE) break;
  }
  if (!reachedCurrent && collected.size) throw new Error(`Incremental window did not reach current #${current}; refusing partial append`);
  const rows = [...collected.values()].sort((a, b) => a.draw_number - b.draw_number);
  if (!rows.length) {
    await reconcileArchiveStatus(supabase, latest, "stoloto_official_v35_incremental_check");
    await writeRun(supabase, "success", { started_at: startedAt, mode: "incremental", current, no_change: true, gap_count: 0 }, 0, 0);
    return { ok: true, mode: "incremental", current, added: 0 };
  }
  if (rows[0].draw_number !== current + 1) throw new Error(`Incremental gap: expected #${current + 1}, got #${rows[0].draw_number}`);
  const { sorted, qa } = auditContinuous(rows, false);
  const written = await upsertBatches(supabase, sorted);
  const newest = sorted.at(-1)!;
  await reconcileArchiveStatus(supabase, newest, "stoloto_official_v35_incremental");
  await writeRun(supabase, "success", { started_at: startedAt, mode: "incremental", from: current + 1, to: qa.last, count: qa.count, gap_count: 0 }, qa.count, written);
  return { ok: true, mode: "incremental", from: current + 1, to: qa.last, added: qa.count };
}

Deno.serve(async (req: Request) => {
  const startedAt = new Date().toISOString();
  const supabase = adminClient();
  const token = req.headers.get("x-lotoos-sync-token") || "";
  if (!token || token.length < 32) return Response.json({ error: "unauthorized" }, { status: 401 });
  let valid = false;
  try {
    valid = await verifySyncToken(supabase, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 503 });
  }
  if (!valid) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode = body?.mode === "bootstrap" ? "bootstrap" : "incremental";
    const result = mode === "bootstrap" ? await bootstrap(supabase, startedAt) : await incremental(supabase, startedAt);
    if ((result as any)?.status === 409) return Response.json(result, { status: 409 });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeRun(supabase, "failed", { started_at: startedAt, error: message.slice(0, 500), gap_count: null }).catch(() => undefined);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
