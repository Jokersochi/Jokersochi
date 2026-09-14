import { STRATEGIES, generateTickets, maxUsefulTickets } from "./lib/strategy-v2.mjs";
import { strategyTournament, walkForwardBacktest } from "./lib/backtest.mjs";
import { loadLiveArchive, loadOfficialPayouts } from "./lib/live-data.mjs";
import { loadLedger, recordVirtualPortfolio, settleLedger, summarizeLedger } from "./lib/ledger.mjs";

const $ = (s) => document.querySelector(s);
const strategyGrid = $("#strategyGrid");
const strategySelect = $("#strategy");
const countInput = $("#count");
const generateButton = $("#generate");
const results = $("#results");
const errorBox = $("#error");
const status = $("#dataStatus");
const countNote = $("#countNote");
const ledgerStatus = $("#ledgerStatus");
const qualityGrid = $("#qualityGrid");
const latestDraw = $("#latestDraw");
const backtestStatus = $("#backtestStatus");
const backtestGrid = $("#backtestGrid");
const backtestNote = $("#backtestNote");
const tournamentStatus = $("#tournamentStatus");
const tournamentBody = $("#tournamentBody");
const tournamentNote = $("#tournamentNote");
let archive = null;
let payoutRows = null;
let payoutPromise = null;
let backtestRun = 0;
let tournamentRun = 0;

const FIVE_TICKET_KEYS = new Set(["adaptive20", "balanced20", "ensemble", "portfolio5"]);
const TOURNAMENT_KEYS = ["adaptive20", "balanced20", "portfolio5", "hybrid", "hot1000", "overdue", "cold200", "random"];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
const balls = (numbers, cls) => `<div class="balls ${cls}">${numbers.map((n) => `<span class="ball">${n}</span>`).join("")}</div>`;
const pct = (value) => value == null ? "—" : `${(value * 100).toFixed(1)}%`;
const signed = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
const rub = (value) => new Intl.NumberFormat("ru-RU", { style:"currency", currency:"RUB", maximumFractionDigits:0 }).format(Number(value) || 0);

function renderStrategies() {
  strategyGrid.innerHTML = STRATEGIES.map((s) => `<article class="card"><div class="strategy-name"><h2>${escapeHtml(s.name)}</h2><span class="chip">${s.lookback ? `${s.lookback} тиражей` : "без истории"}</span></div><p><strong>${escapeHtml(s.shortDescription)}</strong></p><p class="muted">${escapeHtml(s.plainDescription)}</p></article>`).join("");
  strategySelect.innerHTML = STRATEGIES.map((s) => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join("");
  strategySelect.value = "adaptive20";
  countInput.value = "5";
  updateCountLimit();
  renderLedgerStatus(loadLedger());
}

function updateCountLimit() {
  const key = strategySelect.value;
  const max = maxUsefulTickets(key);
  countInput.max = String(max);
  if (Number(countInput.value) > max) countInput.value = String(max);
  countInput.disabled = max === 1;
  if (key === "adaptive20") {
    countNote.textContent = "Default: 5 билетов, полное покрытие 1–20 в каждом поле. Исторические метрики влияют на распределение между билетами, но не исключают числа.";
  } else if (key === "balanced20") {
    countNote.textContent = "Контрольный портфель: 5 билетов покрывают все 20 чисел каждого поля ровно по одному разу, история не используется.";
  } else if (key === "ensemble") {
    countNote.textContent = "Ensemble выбирает 5-билетный подход только по предыдущим out-of-sample результатам, без доступа к будущему тиражу.";
  } else if (key === "portfolio5") {
    countNote.textContent = "Challenger: прежний Hybrid Coverage остаётся в турнире, но больше не является стратегией по умолчанию.";
  } else if (max === 1) {
    countNote.textContent = "Эта стратегия даёт одну определённую комбинацию; искусственные варианты не создаются.";
  } else {
    countNote.textContent = "Можно создать до 10 независимых случайных билетов.";
  }
}

function renderLedgerStatus(entries) {
  if (!ledgerStatus) return;
  const summary = summarizeLedger(entries);
  ledgerStatus.textContent = summary.portfolios === 0
    ? "Virtual Ledger: пока нет зафиксированных портфелей. Следующая генерация будет сохранена до результата тиража."
    : `Virtual Ledger: ${summary.portfolios} портф., ${summary.tickets} билетов · тиражей ${summary.targetDraws} · ожидают ${summary.pending} · проверено ${summary.checked}. Повторная генерация той же стратегии на тот же тираж заблокирована.`;
}

function renderDataQuality(data) {
  const cards = [["Проверено до", `№${data.last}`],["Всего в архиве", data.totalCount.toLocaleString("ru-RU")],["Пропуски", "0"],["Некорректные", "0"]];
  qualityGrid.innerHTML = cards.map(([label, value]) => `<div class="quality-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const draw = data.draws.at(-1);
  const date = new Date(draw.date).toLocaleString("ru-RU", {dateStyle:"medium", timeStyle:"short"});
  const economics = draw.ticketPriceRub ? `<span class="chip">билет ${escapeHtml(rub(draw.ticketPriceRub))}</span>` : "";
  latestDraw.innerHTML = `<div class="latest-head"><div><span class="eyebrow">Последний подтверждённый тираж</span><h2>№${draw.number}</h2></div><div class="latest-chips"><span class="chip">${escapeHtml(date)}</span>${economics}</div></div><div class="fields"><div class="lotto-field field-a"><strong>Поле 1</strong>${balls(draw.fieldA,"field-a")}</div><div class="lotto-field field-b"><strong>Поле 2</strong>${balls(draw.fieldB,"field-b")}</div></div>`;
}

async function ensurePayouts() {
  if (payoutRows) return payoutRows;
  if (!archive) throw new Error("Live-архив ещё не загружен");
  if (!payoutPromise) {
    const first = archive.draws.at(-300)?.number;
    const last = archive.draws.at(-1)?.number;
    payoutPromise = loadOfficialPayouts(first, last).then((rows) => {
      payoutRows = rows;
      return rows;
    }).finally(() => { payoutPromise = null; });
  }
  return payoutPromise;
}

function renderBacktestReport(report, payoutError = null) {
  const hitLift = report.hitLift == null ? "н/д" : `${report.hitLift >= 0 ? "+" : ""}${(report.hitLift * 100).toFixed(1)}%`;
  const cards = [
    ["Evidence Grade", report.evidenceGrade],
    ["Walk-forward", `${report.evaluationDraws} тиражей`],
    ["Средний лучший score", `${report.meanBestMatches.toFixed(3)} vs ${report.baselineMeanBestMatches.toFixed(3)}`],
    ["Excess score vs Random · 95% CI", `${signed(report.excessProxyScore)} [${signed(report.ci95Low)}; ${signed(report.ci95High)}]`],
    ["Proxy hit-rate", `${pct(report.proxyHitRate)} vs ${pct(report.baselineProxyHitRate)}`],
    ["Hit Lift vs Random", hitLift],
    ["Proxy 2+2", `${pct(report.balanced22Rate)} vs ${pct(report.baselineBalanced22Rate)}`],
    ["Max просадка score", report.maxProxyDrawdown.toFixed(1)],
  ];
  if (report.financialDataAvailable) {
    cards.push(
      [report.financialRoiAvailable ? "Архивный ROI" : "ROI · нижняя граница", `${report.financialRoiAvailable ? "" : "≥ "}${pct(report.financialRoiAvailable ? report.strategyRoi : report.strategyRoiLowerBound)} vs random ${report.financialRoiAvailable ? "" : "≥ "}${pct(report.financialRoiAvailable ? report.baselineRoi : report.baselineRoiLowerBound)}`],
      ["Payout coverage", `${pct(report.financialCoverage)} vs ${pct(report.baselineFinancialCoverage)}`],
      ["Расход → выплаты", `${rub(report.strategyStakeRub)} → ${rub(report.strategyReturnRub)}`],
    );
  } else {
    cards.push(["Архивный ROI", "данные выплат недоступны"]);
  }
  backtestGrid.innerHTML = cards.map(([label, value]) => `<div class="quality-item evidence-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const moneyNote = report.financialDataAvailable
    ? `${report.financialMethodology}. Неопределённых виртуальных исходов: ${report.unresolvedStrategyTickets}; у random: ${report.unresolvedBaselineTickets}.`
    : `Денежный блок недоступен${payoutError ? `: ${payoutError}` : "."}`;
  backtestNote.textContent = `Проверка №${report.firstEvaluatedDraw}–${report.lastEvaluatedDraw}. ${report.methodology}. ${report.financialStatus} ${moneyNote}`;
  backtestStatus.className = report.evidenceGrade === "Слабый положительный сигнал" ? "status warn" : "status ok";
  backtestStatus.textContent = report.evidenceGrade;
}

async function renderBacktest() {
  if (!archive) return;
  const run = ++backtestRun;
  backtestStatus.className = "status warn";
  backtestStatus.textContent = "Считаю walk-forward + ROI…";
  backtestGrid.innerHTML = "";
  backtestNote.textContent = "";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  let payouts = null;
  let payoutError = null;
  try {
    payouts = await ensurePayouts();
  } catch (error) {
    payoutError = error instanceof Error ? error.message : String(error);
  }
  try {
    const evaluationDraws = strategySelect.value === "ensemble" ? 120 : 300;
    const report = walkForwardBacktest(strategySelect.value, archive.draws, { evaluationDraws, payoutRows: payouts });
    if (run !== backtestRun) return;
    renderBacktestReport(report, payoutError);
  } catch (error) {
    if (run !== backtestRun) return;
    backtestStatus.className = "status danger";
    backtestStatus.textContent = "Backtest недоступен";
    backtestNote.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function renderTournament() {
  if (!archive || !tournamentStatus || !tournamentBody) return;
  const run = ++tournamentRun;
  tournamentStatus.className = "status warn";
  tournamentStatus.textContent = "Считаю рейтинг + ROI…";
  tournamentBody.innerHTML = "";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  let payouts = null;
  let payoutError = null;
  try {
    payouts = await ensurePayouts();
  } catch (error) {
    payoutError = error instanceof Error ? error.message : String(error);
  }
  try {
    const reports = strategyTournament(archive.draws, { evaluationDraws: 80, strategyKeys: TOURNAMENT_KEYS, payoutRows: payouts });
    if (run !== tournamentRun) return;
    const random = reports.find((report) => report.strategyKey === "random");
    const ranked = reports.filter((report) => report.strategyKey !== "random");
    tournamentBody.innerHTML = ranked.map((report, index) => {
      const lift = report.hitLift == null ? "н/д" : `${report.hitLift >= 0 ? "+" : ""}${(report.hitLift * 100).toFixed(1)}%`;
      const gradeClass = report.evidenceGrade === "Слабый положительный сигнал" ? "grade-warn" : report.evidenceGrade === "Отрицательный сигнал" ? "grade-bad" : "grade-neutral";
      const roiValue = report.financialDataAvailable
        ? `${report.financialRoiAvailable ? "" : "≥ "}${pct(report.financialRoiAvailable ? report.strategyRoi : report.strategyRoiLowerBound)}`
        : "н/д";
      const coverage = report.financialDataAvailable ? pct(report.financialCoverage) : "н/д";
      return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(report.strategyName)}</strong></td><td>${report.ticketCount}</td><td>${signed(report.excessProxyScore)}</td><td>${escapeHtml(lift)}</td><td>${escapeHtml(roiValue)}</td><td>${escapeHtml(coverage)}</td><td><span class="grade ${gradeClass}">${escapeHtml(report.evidenceGrade)}</span></td></tr>`;
    }).join("");
    tournamentStatus.className = "status ok";
    tournamentStatus.textContent = `${ranked.length} стратегий · 80 walk-forward тиражей`;
    if (tournamentNote) {
      const payoutText = payouts
        ? "ROI использует фактическую цену и опубликованные выплаты конкретных тиражей; при неполном coverage показана только нижняя граница."
        : `ROI недоступен${payoutError ? `: ${payoutError}` : "."}`;
      tournamentNote.textContent = `Рейтинг сортируется по excess proxy-score против Random того же размера. Random-контроль: ${random ? `${random.ticketCount} бил./тираж` : "н/д"}. ${payoutText} Evidence Grade не зависит от исторического ROI. Walk-Forward Ensemble оценивается отдельно в Evidence Lab, чтобы не делать вложенный самореферентный турнир слишком тяжёлым для браузера.`;
    }
  } catch (error) {
    if (run !== tournamentRun) return;
    tournamentStatus.className = "status danger";
    tournamentStatus.textContent = "Tournament недоступен";
    if (tournamentNote) tournamentNote.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function loadArchive() {
  status.className = "status warn";
  status.textContent = "Данные: проверяю live-backend…";
  try {
    archive = await loadLiveArchive();
    payoutRows = null;
    payoutPromise = null;
    status.className = "status ok";
    status.textContent = `LIVE · официальный архив · до №${archive.last} · без пропусков`;
    renderDataQuality(archive);
    renderLedgerStatus(settleLedger(archive.draws));
    generateButton.disabled = false;
    renderBacktest();
    renderTournament();
  } catch (error) {
    archive = null;
    generateButton.disabled = true;
    status.className = "status danger";
    status.textContent = "BLOCKED · live-архив не прошёл проверку";
    backtestStatus.className = "status danger";
    backtestStatus.textContent = "Backtest заблокирован";
    if (tournamentStatus) {
      tournamentStatus.className = "status danger";
      tournamentStatus.textContent = "Tournament заблокирован";
    }
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
    const key = strategySelect.value;
    const targetDraw = Number(archive.last) + 1;
    const meta = STRATEGIES.find((strategy) => strategy.key === key);
    const alreadyLocked = loadLedger().find((entry) => Number(entry.targetDraw) === targetDraw && entry.strategyKey === key);
    if (alreadyLocked) {
      throw new Error(`${meta?.name ?? key} для тиража №${targetDraw} уже зафиксирована в Virtual Ledger (${alreadyLocked.fingerprint}). Новую комбинацию для той же стратегии можно создать только после завершения этого тиража.`);
    }

    const tickets = generateTickets(key, archive.draws, Math.max(1, Number(countInput.value) || 1), Date.now());
    const entry = recordVirtualPortfolio({
      strategyKey: key,
      strategyName: meta?.name ?? key,
      tickets,
      targetDraw,
      sourceLast: Number(archive.last),
    });
    results.innerHTML = tickets.map(renderTicket).join("");
    renderLedgerStatus(loadLedger());
    if (ledgerStatus) ledgerStatus.textContent += ` Последняя фиксация: ${entry.strategyName} → тираж №${entry.targetDraw}, fingerprint ${entry.fingerprint}.`;
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
  if (FIVE_TICKET_KEYS.has(strategySelect.value)) countInput.value = "5";
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
