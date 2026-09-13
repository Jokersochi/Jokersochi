import fs from "node:fs/promises";
import path from "node:path";
import { ENDPOINT, HEADERS, normalizeDraw, validateArchive } from "./loto-source.mjs";

const OUT = path.resolve("public/loto-analytics-4x20/data/draws.json");
const STATUS = path.resolve(".lotoos/refresh-status.json");
const PAGE_SIZE = 50;
const MAX_PAGES = 400;
const MAX_INCREMENTAL_PAGES = 10;

async function writeAtomic(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, content, "utf8");
  await fs.rename(temp, file);
}

async function writeStatus(status) {
  await writeAtomic(STATUS, `${JSON.stringify(status, null, 2)}\n`);
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 300);
}

function isGapError(error) {
  return /содержит разрывы/i.test(safeError(error));
}

async function fetchPage(page, attempt = 1) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("game", "4x20");
  url.searchParams.set("count", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.requestStatus !== "success" || !Array.isArray(data.draws)) {
      throw new Error("Схема официального источника изменилась: отсутствует requestStatus=success или draws[]");
    }
    return data.draws;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return fetchPage(page, attempt + 1);
  }
}

async function fetchArchivePass() {
  const normalized = [];
  let sawEnd = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const raw = await fetchPage(page);
    if (!raw.length) {
      sawEnd = true;
      break;
    }
    for (const draw of raw) {
      const row = normalizeDraw(draw);
      if (row) normalized.push(row);
    }
    if (raw.length < PAGE_SIZE) {
      sawEnd = true;
      break;
    }
  }
  if (!sawEnd) throw new Error(`Архив не завершился за ${MAX_PAGES} страниц — публикация остановлена`);
  return normalized;
}

async function fetchIncrementalRows(previousLast) {
  const normalized = [];
  for (let page = 1; page <= MAX_INCREMENTAL_PAGES; page++) {
    const raw = await fetchPage(page);
    if (!raw.length) break;
    const rows = raw.map(normalizeDraw).filter(Boolean);
    normalized.push(...rows);
    if (rows.some((row) => row.number <= previousLast)) return normalized;
    if (raw.length < PAGE_SIZE) break;
  }
  throw new Error(`Incremental refresh не нашёл перекрытие с подтверждённым тиражом №${previousLast}`);
}

async function fetchHeadRows() {
  const raw = await fetchPage(1);
  return raw.map(normalizeDraw).filter(Boolean);
}

async function loadExistingSnapshot() {
  try {
    const parsed = JSON.parse(await fs.readFile(OUT, "utf8"));
    if (parsed?.source !== "official" || !Array.isArray(parsed.draws)) return null;
    return validateArchive(parsed.draws, 1000);
  } catch {
    return null;
  }
}

async function buildFullSnapshot() {
  let passes = 1;
  let normalized = await fetchArchivePass();
  normalized.push(...(await fetchHeadRows()));
  try {
    validateArchive(normalized, 1000);
  } catch (error) {
    if (!isGapError(error)) throw error;
    passes = 2;
    console.warn(`Transient pagination gap detected; repeating official archive pass: ${safeError(error)}`);
    normalized.push(...(await fetchArchivePass()));
    normalized.push(...(await fetchHeadRows()));
  }
  return { snapshot: validateArchive(normalized, 1000), passes };
}

async function refresh() {
  const existing = await loadExistingSnapshot();
  const forceFull = process.env.LOTO_FULL_AUDIT === "1";
  let mode = forceFull ? "full-audit" : "incremental";
  let passes = 1;
  let snapshot = null;

  if (existing && !forceFull) {
    try {
      const incremental = await fetchIncrementalRows(existing.last);
      const merged = [...existing.draws, ...incremental, ...(await fetchHeadRows())];
      snapshot = validateArchive(merged, 1000);
      if (snapshot.last < existing.last) throw new Error("Incremental snapshot regressed behind previous verified archive");
    } catch (error) {
      console.warn(`Incremental refresh rejected; falling back to full official audit: ${safeError(error)}`);
      mode = "full-fallback";
    }
  }

  if (!snapshot) {
    const full = await buildFullSnapshot();
    snapshot = full.snapshot;
    passes = full.passes;
    if (!existing && !forceFull) mode = "full-bootstrap";
  }

  await writeAtomic(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeStatus({
    ok: true,
    source: "official",
    mode,
    count: snapshot.count,
    first: snapshot.first,
    last: snapshot.last,
    previousLast: existing?.last ?? null,
    continuous: snapshot.quality.continuous,
    passes,
    recoveredTransientGap: passes > 1,
  });
  console.log(`LotoOS snapshot verified: ${snapshot.count} draws, #${snapshot.first}–#${snapshot.last}, mode=${mode}, passes=${passes}`);
}

try {
  await refresh();
} catch (error) {
  await writeStatus({
    ok: false,
    source: "official",
    stage: "refresh-or-validation",
    error: safeError(error),
  });
  console.error(`LotoOS refresh blocked: ${safeError(error)}`);
  process.exitCode = 2;
}
