import { STRATEGIES, generateTickets, maxUsefulTickets } from "./lib/strategy-v2.mjs";
import { walkForwardBacktest } from "./lib/backtest.mjs";
import { loadLiveArchive } from "./lib/live-data.mjs";

const $ = (s) => document.querySelector(s);
const strategyGrid = $("#strategyGrid");
const strategySelect = $("#strategy");
const countInput = $("#count");
const generateButton = $("#generate");
const results = $("#results");
const errorBox = $("#error");
const status = $("#dataStatus");
const countNote = $("#countNote");
const qualityGrid = $("#qualityGrid");
const latestDraw = $("#latestDraw");
const backtestStatus = $("#backtestStatus");
const backtestGrid = $("#backtestGrid");
const backtestNote = $("#backtestNote");
let archive = null;
let backtestRun = 0;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
const balls = (numbers, cls) => `<div class="balls ${cls}">${numbers.map((n) => `<span class="ball">${n}</span>`).join("")}</div>`;
const pct = (value) => `${(value * 100).toFixed(1)}%`;
const signed = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;

function renderStrategies() {
  strategyGrid.innerHTML = STRATEGIES.map((s) => `<article class="card"><div class="strategy-name"><h2>${escapeHtml(s.name)}</h2><span class="chip">${s.lookback ? `${s.lookback} тиражей` : "без истории"}</span></div><p><strong>${escapeHtml(s.shortDescription)}</strong></p><p class="muted">${escapeHtml(s.plainDescription)}</p></article>`).join("");
  strategySelect.innerHTML = STRATEGIES.map((s) => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join("");
  strategySelect.value = "portfolio5";
  countInput.value = "5";
  updateCountLimit();
}

function updateCountLimit() {
  const key = strategySelect.value;
  const max = maxUsefulTickets(key);
  countInput.max = String(max);
  if (Number(countInput.value) > max) countInput.value = String(max);
  countInput.disabled = max === 1;
  countNote.textContent = key === "portfolio5"
    ? "Рекомендуемый режим: 5 разных билетов. Портфель распределяет лидирующие сигналы между комбинациями и уменьшает лишнее дублирование."
    : max === 1
      ? "Эта стратегия даёт одну определённую комбинацию; искусственные варианты не создаются."
      : "Можно создать до 10 независимых случайных билетов.";
}

function renderDataQuality(data) {
  const cards = [["Проверено до", `№${data.last}`],["Всего в архиве", data.totalCount.toLocaleString("ru-RU")],["Пропуски", "0"],["Некорректные", "0"]];
  qualityGrid.innerHTML = cards.map(([label, value]) => `<div class="quality-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const draw = data.draws.at(-1);
  const date = new Date(draw.date).toLocaleString("ru-RU", {dateStyle:"medium", timeStyle:"short"});
  latestDraw.innerHTML = `<div class="latest-head"><div><span class="eyebrow">Последний подтверждённый тираж</span><h2>№${draw.number}</h2></div><span class="chip">${escapeHtml(date)}</span></div><div class="fields"><div class="lotto-field field-a"><strong>Поле 1</strong>${balls(draw.fieldA,"field-a")}</div><div class="lotto-field field-b"><strong>Поле 2</strong>${balls(draw.fieldB,"field-b")}</div></div>`;
}

function renderBacktestReport(report) {
  const cards = [
    ["Evidence Grade", report.evidenceGrade],
    ["Walk-forward", `${report.evaluationDraws} тиражей`],
    ["Средний лучший score", `${report.meanBestMatches.toFixed(3)} vs ${report.baselineMeanBestMatches.toFixed(3)}`],
    ["Δ vs random · 95% CI", `${signed(report.meanDelta)} [${signed(report.ci95Low)}; ${signed(report.ci95High)}]`],
    ["Proxy 2+2", `${pct(report.balanced22Rate)} vs ${pct(report.baselineBalanced22Rate)}`],
    ["Max просадка score", report.maxProxyDrawdown.toFixed(1)],
  ];
  backtestGrid.innerHTML = cards.map(([label, value]) => `<div class="quality-item evidence-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  backtestNote.textContent = `Проверка №${report.firstEvaluatedDraw}–${report.lastEvaluatedDraw}. ${report.methodology}. Финансовый ROI пока не показывается: таблица официальных выплат ещё не заполнена полностью.`;
  backtestStatus.className = report.evidenceGrade === "Слабый положительный сигнал" ? "status warn" : "status ok";
  backtestStatus.textContent = report.evidenceGrade;
}

async function renderBacktest() {
  if (!archive) return;
  const run = ++backtestRun;
  backtestStatus.className = "status warn";
  backtestStatus.textContent = "Считаю walk-forward…";
  backtestGrid.innerHTML = "";
  backtestNote.textContent = "";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  try {
    const report = walkForwardBacktest(strategySelect.value, archive.draws, { evaluationDraws: 300 });
    if (run !== backtestRun) return;
    renderBacktestReport(report);
  } catch (error) {
    if (run !== backtestRun) return;
    backtestStatus.className = "status danger";
    backtestStatus.textContent = "Backtest недоступен";
    backtestNote.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function loadArchive() {
  status.className = "status warn";
  status.textContent = "Данные: проверяю live-backend…";
  try {
    archive = await loadLiveArchive();
    status.className = "status ok";
    status.textContent = `LIVE · официальный архив · до №${archive.last} · без пропусков`;
    renderDataQuality(archive);
    generateButton.disabled = false;
    renderBacktest();
  } catch (error) {
    archive = null;
    generateButton.disabled = true;
    status.className = "status danger";
    status.textContent = "BLOCKED · live-архив не прошёл проверку";
    backtestStatus.className = "status danger";
    backtestStatus.textContent = "Backtest заблокирован";
    throw error;
  }
}

function renderTicket(ticket, index) {
  const fields = ticket.explanation.fields.map((field, i) => `<details class="reason" ${i === 0 ? "open" : ""}><summary>${escapeHtml(field.summary)}</summary><ul>${field.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul></details>`).join("");
  return `<article class="ticket"><div class="ticket-head"><h2>Билет ${index + 1}</h2><span class="chip">${escapeHtml(ticket.explanation.strategyName)}</span></div><div class="fields"><div class="lotto-field field-a"><strong>Поле 1</strong>${balls(ticket.fieldA,"field-a")}</div><div class="lotto-field field-b"><strong>Поле 2</strong>${balls(ticket.fieldB,"field-b")}</div></div><section class="why"><h3>Почему выбраны эти числа</h3><p class="muted">${escapeHtml(ticket.explanation.summary)}</p>${fields}<div class="disclaimer">${escapeHtml(ticket.explanation.disclaimer)}</div></section></article>`;
}

async function generate() {
  errorBox.classList.add("hidden");
  generateButton.disabled = true;
  generateButton.textContent = "Считаю…";
  try {
    if (!archive) await loadArchive();
    const tickets = generateTickets(strategySelect.value, archive.draws, Math.max(1, Number(countInput.value) || 1), Date.now());
    results.innerHTML = tickets.map(renderTicket).join("");
    results.scrollIntoView({behavior:"smooth", block:"start"});
  } catch (error) {
    errorBox.textContent = `Не удалось безопасно сгенерировать билет: ${error instanceof Error ? error.message : String(error)}.`;
    errorBox.classList.remove("hidden");
  } finally {
    generateButton.disabled = archive == null;
    generateButton.textContent = "Сгенерировать";
  }
}

strategySelect.addEventListener("change", () => {
  if (strategySelect.value === "portfolio5") countInput.value = "5";
  updateCountLimit();
  renderBacktest();
});
generateButton.addEventListener("click", generate);
renderStrategies();
generateButton.disabled = true;
loadArchive().catch((error) => {
  errorBox.textContent = `Live-backend заблокировал генерацию: ${error instanceof Error ? error.message : String(error)}.`;
  errorBox.classList.remove("hidden");
});
