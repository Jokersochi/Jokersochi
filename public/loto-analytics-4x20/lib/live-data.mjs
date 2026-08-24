const SUPABASE_URL = "https://oryuanpvbjxmnihmwbin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oBRPgAo7-YKHzDjhnSKjVA_ozNiJoOs";
const REQUIRED_HISTORY = 1000;

const API_HEADERS = Object.freeze({
  accept: "application/json",
  apikey: SUPABASE_PUBLISHABLE_KEY,
});

function validField(field) {
  return Array.isArray(field)
    && field.length === 4
    && new Set(field).size === 4
    && field.every((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 20);
}

export function validateLiveStatus(state) {
  const payload = state?.payload;
  if (!payload || typeof payload !== "object") throw new Error("Нет archive_status");
  if (payload.production_ready !== true) throw new Error(payload.block_reason || "Архив не прошёл production quality gate");
  if (payload.official_source_verified !== true) throw new Error("Официальный источник не подтверждён");
  if (Number(payload.gap_count) !== 0) throw new Error(`В архиве есть пропуски: ${payload.gap_count}`);
  if (Number(payload.invalid_count) !== 0) throw new Error(`В архиве есть некорректные тиражи: ${payload.invalid_count}`);
  if (Number(payload.duplicate_count) !== 0) throw new Error(`В архиве есть дубликаты: ${payload.duplicate_count}`);
  if (!Number.isInteger(Number(payload.verified_through)) || Number(payload.verified_through) < REQUIRED_HISTORY) {
    throw new Error("Недостаточно подтверждённой истории");
  }
  return payload;
}

export function normalizeLiveRows(rows, verifiedThrough) {
  if (!Array.isArray(rows) || rows.length < REQUIRED_HISTORY) throw new Error(`Нужно минимум ${REQUIRED_HISTORY} подтверждённых тиражей`);
  const normalized = rows.map((row) => {
    const number = Number(row?.draw_number);
    const fieldA = Array.isArray(row?.field1) ? row.field1.map(Number) : null;
    const fieldB = Array.isArray(row?.field2) ? row.field2.map(Number) : null;
    if (!Number.isInteger(number) || !validField(fieldA) || !validField(fieldB)) throw new Error(`Некорректный live-тираж №${row?.draw_number ?? "?"}`);
    if (!row?.draw_date || Number.isNaN(Date.parse(row.draw_date))) throw new Error(`Некорректная дата тиража №${number}`);
    return { number, date: new Date(row.draw_date).toISOString(), fieldA, fieldB };
  }).sort((a, b) => a.number - b.number);

  for (let i = 1; i < normalized.length; i++) {
    if (normalized[i].number !== normalized[i - 1].number + 1) {
      throw new Error(`Live-окно имеет разрыв между №${normalized[i - 1].number} и №${normalized[i].number}`);
    }
  }
  const last = normalized.at(-1)?.number;
  if (last !== Number(verifiedThrough)) throw new Error(`Live-окно отстаёт от archive_status: №${last} вместо №${verifiedThrough}`);
  return normalized;
}

async function fetchJson(path) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: API_HEADERS,
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || `Backend HTTP ${response.status}`);
  return data;
}

export async function loadLiveArchive() {
  const states = await fetchJson("/rest/v1/system_state?key=eq.archive_status&select=payload,updated_at&limit=1");
  const state = Array.isArray(states) ? states[0] : null;
  const payload = validateLiveStatus(state);

  const rows = await fetchJson(`/rest/v1/draws?select=draw_number,draw_date,field1,field2&order=draw_number.desc&limit=${REQUIRED_HISTORY}`);
  const draws = normalizeLiveRows(rows, payload.verified_through);

  return {
    source: "supabase_stoloto_official",
    draws,
    first: draws[0].number,
    last: Number(payload.verified_through),
    totalCount: Number(payload.draw_count),
    verifiedThroughDate: payload.verified_through_date,
    freshnessClass: payload.freshness_signal_class,
    statusUpdatedAt: state.updated_at,
    quality: {
      continuous: true,
      gapCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      officialSourceVerified: true,
      productionReady: true,
    },
  };
}
