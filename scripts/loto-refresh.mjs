import fs from "node:fs/promises";
import path from "node:path";
import { ENDPOINT, HEADERS, normalizeDraw, validateArchive } from "./loto-source.mjs";

const OUT = path.resolve("public/loto-analytics-4x20/data/draws.json");
const STATUS = path.resolve(".lotoos/refresh-status.json");
const PAGE_SIZE = 50;
const MAX_PAGES = 400;

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

async function fetchHeadRows() {
  const raw = await fetchPage(1);
  return raw.map(normalizeDraw).filter(Boolean);
}

async function refresh() {
  let passes = 1;
  let retryReason = null;
  let normalized = await fetchArchivePass();

  // Re-read the head after the long scan so draws completed during pagination
  // are included without creating a stale-but-contiguous snapshot.
  normalized.push(...(await fetchHeadRows()));

  try {
    validateArchive(normalized, 1000);
  } catch (error) {
    if (!isGapError(error)) throw error;
    retryReason = safeError(error);
    passes = 2;
    console.warn(`Transient pagination gap detected; repeating official archive pass: ${retryReason}`);

    // Page-number pagination can shift while a new draw is inserted at the head.
    // Unioning two independent official passes recovers a boundary omission;
    // validateArchive still rejects conflicting duplicates or any remaining gap.
    normalized.push(...(await fetchArchivePass()));
    normalized.push(...(await fetchHeadRows()));
  }

  const snapshot = validateArchive(normalized, 1000);
  await writeAtomic(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  await writeStatus({
    ok: true,
    source: "official",
    count: snapshot.count,
    first: snapshot.first,
    last: snapshot.last,
    continuous: snapshot.quality.continuous,
    passes,
    recoveredTransientGap: passes > 1,
  });
  console.log(`LotoOS snapshot verified: ${snapshot.count} draws, #${snapshot.first}–#${snapshot.last}, passes=${passes}`);
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
