import fs from "node:fs/promises";
import path from "node:path";
import { ENDPOINT, HEADERS, normalizeDraw, validateArchive } from "./loto-source.mjs";

const OUT = path.resolve("public/loto-analytics-4x20/data/draws.json");
const PAGE_SIZE = 50;
const MAX_PAGES = 400;

async function fetchPage(page, attempt = 1) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("game", "4x20");
  url.searchParams.set("count", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.requestStatus !== "success" || !Array.isArray(data.draws)) throw new Error("Схема официального источника изменилась");
    return data.draws;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return fetchPage(page, attempt + 1);
  }
}

const normalized = [];
let sawEnd = false;
for (let page = 1; page <= MAX_PAGES; page++) {
  const raw = await fetchPage(page);
  if (!raw.length) { sawEnd = true; break; }
  for (const draw of raw) {
    const row = normalizeDraw(draw);
    if (row) normalized.push(row);
  }
  if (raw.length < PAGE_SIZE) { sawEnd = true; break; }
}
if (!sawEnd) throw new Error(`Архив не завершился за ${MAX_PAGES} страниц — публикация остановлена`);

const snapshot = validateArchive(normalized, 1000);
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
await fs.mkdir(path.dirname(OUT), { recursive: true });
const temp = `${OUT}.tmp`;
await fs.writeFile(temp, serialized, "utf8");
await fs.rename(temp, OUT);
console.log(`LotoOS snapshot verified: ${snapshot.count} draws, #${snapshot.first}–#${snapshot.last}`);
