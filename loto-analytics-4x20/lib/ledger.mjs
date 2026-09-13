const STORAGE_KEY = "lotoos.virtual-ledger.v1";

function getStorage(storage) {
  if (storage) return storage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  return null;
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sanitizeTicket(ticket) {
  const fieldA = [...ticket.fieldA].map(Number).sort((a, b) => a - b);
  const fieldB = [...ticket.fieldB].map(Number).sort((a, b) => a - b);
  if (fieldA.length !== 4 || fieldB.length !== 4) throw new Error("Виртуальный билет должен содержать 4+4 числа");
  if (new Set(fieldA).size !== 4 || new Set(fieldB).size !== 4) throw new Error("Виртуальный билет содержит повторы внутри поля");
  if ([...fieldA, ...fieldB].some((value) => !Number.isInteger(value) || value < 1 || value > 20)) {
    throw new Error("Числа виртуального билета должны быть в диапазоне 1–20");
  }
  return { fieldA, fieldB };
}

function matches(ticket, draw) {
  const a = new Set(draw.fieldA);
  const b = new Set(draw.fieldB);
  const fieldA = ticket.fieldA.filter((value) => a.has(value)).length;
  const fieldB = ticket.fieldB.filter((value) => b.has(value)).length;
  return { fieldA, fieldB, total: fieldA + fieldB };
}

export function loadLedger(storage) {
  const target = getStorage(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLedger(entries, storage) {
  const target = getStorage(storage);
  if (!target) return false;
  target.setItem(STORAGE_KEY, JSON.stringify(entries));
  return true;
}

export function recordVirtualPortfolio({
  strategyKey,
  strategyName,
  tickets,
  targetDraw,
  sourceLast,
  createdAt = new Date().toISOString(),
  storage,
}) {
  if (!Number.isInteger(Number(targetDraw)) || Number(targetDraw) <= Number(sourceLast)) {
    throw new Error("Виртуальный портфель должен быть зафиксирован для будущего тиража");
  }

  const entries = loadLedger(storage);
  const locked = entries.find((entry) => Number(entry.targetDraw) === Number(targetDraw) && entry.strategyKey === strategyKey);
  if (locked) {
    throw new Error(`Портфель ${strategyName || strategyKey} для тиража №${targetDraw} уже зафиксирован (${locked.fingerprint}). Повторная генерация заблокирована, чтобы исключить выбор задним числом.`);
  }

  const safeTickets = tickets.map(sanitizeTicket);
  const core = {
    strategyKey,
    strategyName,
    targetDraw: Number(targetDraw),
    sourceLast: Number(sourceLast),
    createdAt,
    tickets: safeTickets,
  };
  const fingerprint = fnv1a(JSON.stringify(core));
  const entry = {
    id: `${core.targetDraw}:${strategyKey}:${fingerprint}`,
    ...core,
    fingerprint,
    locked: true,
    status: "pending",
    checkedAt: null,
    result: null,
    financials: {
      available: false,
      reason: "Официальные payout-данные для этого тиража в текущем архиве отсутствуют; ROI не рассчитывается задним числом по предположениям.",
    },
  };
  entries.push(entry);
  saveLedger(entries, storage);
  return entry;
}

export function settleLedger(draws, storage, checkedAt = new Date().toISOString()) {
  const byNumber = new Map(draws.map((draw) => [Number(draw.number), draw]));
  const entries = loadLedger(storage);
  let changed = false;
  const settled = entries.map((entry) => {
    if (entry.status !== "pending") return entry;
    const draw = byNumber.get(Number(entry.targetDraw));
    if (!draw) return entry;
    const ticketResults = entry.tickets.map((ticket) => matches(ticket, draw));
    changed = true;
    return {
      ...entry,
      status: "checked",
      checkedAt,
      result: {
        drawNumber: Number(draw.number),
        fieldA: [...draw.fieldA],
        fieldB: [...draw.fieldB],
        tickets: ticketResults,
        bestTotal: Math.max(...ticketResults.map((row) => row.total)),
        balanced22Count: ticketResults.filter((row) => row.fieldA >= 2 && row.fieldB >= 2).length,
      },
    };
  });
  if (changed) saveLedger(settled, storage);
  return settled;
}

export function summarizeLedger(entries) {
  const pending = entries.filter((entry) => entry.status === "pending").length;
  const checked = entries.filter((entry) => entry.status === "checked").length;
  const portfolios = entries.length;
  const tickets = entries.reduce((sum, entry) => sum + (entry.tickets?.length || 0), 0);
  const checkedWithBalanced22 = entries.filter((entry) => entry.result?.balanced22Count > 0).length;
  const targetDraws = new Set(entries.map((entry) => Number(entry.targetDraw))).size;
  return { portfolios, tickets, pending, checked, checkedWithBalanced22, targetDraws };
}

export const LEDGER_STORAGE_KEY = STORAGE_KEY;
