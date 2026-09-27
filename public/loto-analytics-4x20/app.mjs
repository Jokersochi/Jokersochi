import { STRATEGIES } from "./lib/strategy-engine.mjs";
import { strategyTournament, walkForwardBacktest } from "./lib/backtest.mjs";
import {
  loadLiveArchive,
  loadOfficialPayouts,
  loadForwardOverview,
  loadLatestEvidenceRuns,
} from "./lib/live-data.mjs";

const $ = (s) => document.querySelector(s);
const status = $("#dataStatus");
const qualityGrid = $("#qualityGrid");
const latestDraw = $("#latestDraw");
const forwardStatus = $("#forwardStatus");
const forwardGrid = $("#forwardGrid");
const forwardNote = $("#forwardNote");
const evidenceStatus = $("#evidenceStatus");
const evidenceGrid = $("#evidenceGrid");
const evidenceNote = $("#evidenceNote");
const researchStatus = $("#researchStatus");
const researchGrid = $("#researchGrid");
const researchNote = $("#researchNote");
const researchStrategy = $("#researchStrategy");
const tournamentStatus = $("#tournamentStatus");
const tournamentBody = $("#tournamentBody");
const tournamentNote = $("#tournamentNote");
const errorBox = $("#error");

let archive = null;
let payoutRows = null;
let researchToken = 0;
let tournamentToken = 0;

const PRODUCTION_LABELS = {
  adaptive20: ["Adaptive Coverage 20", "candidate"],
  balanced20: ["Balanced Coverage 20", "baseline"],
  random: ["Random", "paired comparator"],
};
const RESEARCH_KEYS = ["adaptive20","balanced20","ensemble","portfolio5","hybrid","hot1000","hot200","cold200","overdue","random"];
const TOURNAMENT_KEYS = ["adaptive20","balanced20","portfolio5","hybrid","hot1000","overdue","cold200","random"];

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
const balls = (numbers, cls) => `<div class="balls ${cls}">${numbers.map((n) => `<span class="ball">${n}</span>`).join("")}</div>`;
const pct = (value, digits = 1) => value == null || !Number.isFinite(Number(value)) ? "—" : `${(Number(value) * 100).toFixed(digits)}%`;
const num = (value, digits = 3) => value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(digits);
const signed = (value, digits = 3) => value == null || !Number.isFinite(Number(value)) ? "—" : `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(digits)}`;
const rub = (value) => value == null || !Number.isFinite(Number(value)) ? "—" : new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(Number(value));
const shortHash = (value) => value ? `${String(value).slice(0,10)}…` : "—";

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}
function clearError() { errorBox.classList.add("hidden"); errorBox.textContent = ""; }

function renderDataQuality(data) {
  const cards = [
    ["Проверено до", `№${data.last}`],
    ["Тиражей", data.totalCount.toLocaleString("ru-RU")],
    ["Gap / duplicate", "0 / 0"],
    ["Источник", "Stoloto official"],
  ];
  qualityGrid.innerHTML = cards.map(([label,value]) => `<div class="quality-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const draw = data.draws.at(-1);
  const date = new Date(draw.date).toLocaleString("ru-RU",{dateStyle:"medium",timeStyle:"short"});
  latestDraw.innerHTML = `
    <div class="latest-head">
      <div><span class="eyebrow">Последний подтверждённый тираж</span><h2>№${draw.number}</h2></div>
      <div class="latest-chips"><span class="chip">${escapeHtml(date)}</span><span class="chip">билет ${escapeHtml(rub(draw.ticketPriceRub))}</span></div>
    </div>
    <div class="fields">
      <div class="lotto-field field-a"><strong>Поле 1</strong>${balls(draw.fieldA,"field-a")}</div>
      <div class="lotto-field field-b"><strong>Поле 2</strong>${balls(draw.fieldB,"field-b")}</div>
    </div>`;
}

function forwardTicket(ticket) {
  return `<div class="forward-ticket"><span class="ticket-index">#${ticket.index}</span><div class="mini-fields"><div>${balls(ticket.fieldA,"field-a")}</div><div>${balls(ticket.fieldB,"field-b")}</div></div></div>`;
}

function renderForward(overview, targetDraw) {
  const portfolios = overview.portfolios || [];
  if (portfolios.length !== 3) {
    forwardStatus.className = "status danger";
    forwardStatus.textContent = `BLOCKED · canonical locks ${portfolios.length}/3`;
  } else {
    forwardStatus.className = "status ok";
    forwardStatus.textContent = `LOCKED · тираж №${targetDraw} · 3/3`;
  }
  forwardGrid.innerHTML = portfolios.map((portfolio) => {
    const [name,role] = PRODUCTION_LABELS[portfolio.strategyKey] || [portfolio.strategyKey,"production"];
    const lockDate = new Date(portfolio.locked_at).toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"});
    return `<article class="card portfolio-card">
      <div class="portfolio-head"><div><span class="eyebrow">${escapeHtml(role)}</span><h2>${escapeHtml(name)}</h2></div><span class="mode-badge">${portfolio.provenanceVerified ? "VERIFIED LOCK" : "UNVERIFIED"}</span></div>
      <div class="portfolio-meta"><span>target №${portfolio.targetDraw}</span><span>cutoff №${portfolio.trainingCutoff}</span><span>${escapeHtml(lockDate)}</span></div>
      <div class="forward-tickets">${portfolio.tickets.map(forwardTicket).join("")}</div>
      <div class="hash-line">tickets <code>${escapeHtml(shortHash(portfolio.tickets_hash))}</code> · dataset <code>${escapeHtml(shortHash(portfolio.dataset_hash))}</code> · engine <code>${escapeHtml(shortHash(portfolio.engine_commit_sha))}</code></div>
    </article>`;
  }).join("");
  const gate = overview.status;
  forwardNote.textContent = gate
    ? `Forward counter: ${Number(gate.forward_draws || 0)} / ${Number(gate.min_forward_draws || 1000)}. Эти записи хранятся в append-only Supabase и не зависят от LocalStorage браузера.`
    : "Forward status пока не опубликован; портфели всё равно считаются каноническими только при VERIFIED LOCK.";
}

function renderEvidence(statusRow, evidenceRuns) {
  if (!statusRow) {
    evidenceStatus.className = "status danger";
    evidenceStatus.textContent = "Evidence status отсутствует";
    evidenceGrid.innerHTML = "";
    return;
  }
  const gate = statusRow.gate_status || "insufficient_forward";
  const promoted = statusRow.promoted === true;
  evidenceStatus.className = promoted ? "status ok" : gate === "blocked" ? "status danger" : "status warn";
  evidenceStatus.textContent = promoted ? "PROMOTED" : gate.toUpperCase().replaceAll("_"," ");
  const ci = Array.isArray(statusRow.bootstrap_ci95) ? `[${signed(statusRow.bootstrap_ci95[0])}; ${signed(statusRow.bootstrap_ci95[1])}]` : "ещё не рассчитывается";
  const cards = [
    ["Forward draws", `${Number(statusRow.forward_draws || 0)} / ${Number(statusRow.min_forward_draws || 1000)}`],
    ["Paired Δ vs Random", signed(statusRow.paired_delta_mean)],
    ["Bootstrap 95% CI", ci],
    ["q-value · BH", num(statusRow.q_value,4)],
    ["α", num(statusRow.alpha,2)],
    ["Promotion", promoted ? "да" : "нет"],
  ];
  evidenceGrid.innerHTML = cards.map(([label,value]) => `<div class="quality-item evidence-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  const latest = evidenceRuns?.[0];
  evidenceNote.textContent = `Preregistered: ${statusRow.experiment_key || "adaptive20 forward primary"}. Исторические тесты не добавляют ни одного draw к этому счётчику. ${latest ? `Последний immutable evidence snapshot: №${latest.evaluation_start_draw}–${latest.evaluation_end_draw}, n=${latest.forward_draws}.` : "До min-forward threshold evidence snapshot с inferential gate не создаётся."}`;
}

async function ensureResearchPayouts() {
  if (payoutRows) return payoutRows;
  const first = archive.draws.at(-300).number;
  const last = archive.last;
  payoutRows = await loadOfficialPayouts(first,last);
  return payoutRows;
}

function renderResearchReport(report, payoutError = null) {
  researchStatus.className = report.evidenceGrade.includes("положительный") ? "status warn" : "status ok";
  researchStatus.textContent = "HISTORICAL · " + report.evidenceGrade;
  const cards = [
    ["Окно", `${report.evaluationDraws} тиражей`],
    ["Δ score vs Random", signed(report.meanDelta)],
    ["Bootstrap 95% CI", `[${signed(report.ci95Low)}; ${signed(report.ci95High)}]`],
    ["p-value", num(report.pValue,4)],
    ["Proxy hit lift", pct(report.hitLift)],
    ["Max proxy drawdown", num(report.maxProxyDrawdown,1)],
    ["Payout coverage", pct(report.financialCoverage)],
    ["ROI benchmark", report.financialDataAvailable ? (report.financialRoiAvailable ? pct(report.strategyRoi) : `lower bound ${pct(report.strategyRoiLowerBound)}`) : "н/д"],
  ];
  researchGrid.innerHTML = cards.map(([label,value]) => `<div class="quality-item evidence-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  researchNote.textContent = `№${report.firstEvaluatedDraw}–${report.lastEvaluatedDraw}. ${report.methodology}. Это exploratory historical evidence и оно не может продвинуть стратегию в production. ${report.financialStatus}${payoutError ? ` Payout error: ${payoutError}` : ""}`;
}

async function renderResearch() {
  if (!archive) return;
  const token = ++researchToken;
  researchStatus.className = "status warn";
  researchStatus.textContent = "Считаю bootstrap walk-forward…";
  await new Promise((resolve)=>requestAnimationFrame(resolve));
  let payouts = null, payoutError = null;
  try { payouts = await ensureResearchPayouts(); }
  catch (error) { payoutError = error instanceof Error ? error.message : String(error); }
  try {
    const key = researchStrategy.value;
    const report = walkForwardBacktest(key,archive.draws,{evaluationDraws:300,bootstrapResamples:3000,payoutRows:payouts});
    if (token !== researchToken) return;
    renderResearchReport(report,payoutError);
  } catch (error) {
    if (token !== researchToken) return;
    researchStatus.className = "status danger";
    researchStatus.textContent = "Research blocked";
    researchNote.textContent = error instanceof Error ? error.message : String(error);
  }
}

function gradeClass(grade) {
  if (/положительный/i.test(grade)) return "grade-warn";
  if (/отрицательный/i.test(grade)) return "grade-bad";
  return "grade-neutral";
}

async function renderTournament() {
  if (!archive) return;
  const token=++tournamentToken;
  tournamentStatus.className="status warn";
  tournamentStatus.textContent="Считаю family + BH…";
  await new Promise((resolve)=>requestAnimationFrame(resolve));
  let payouts=null;
  try { payouts=await ensureResearchPayouts(); } catch {}
  try {
    const reports=strategyTournament(archive.draws,{evaluationDraws:120,bootstrapResamples:1500,payoutRows:payouts,strategyKeys:TOURNAMENT_KEYS});
    if (token!==tournamentToken) return;
    tournamentBody.innerHTML=reports.filter((r)=>r.strategyKey!=="random").map((r)=>`<tr>
      <td><strong>${escapeHtml(r.strategyName)}</strong></td>
      <td>${r.ticketCount}</td>
      <td>${signed(r.meanDelta)}</td>
      <td>[${signed(r.ci95Low)}; ${signed(r.ci95High)}]</td>
      <td>${num(r.pValue,4)}</td>
      <td>${num(r.qValue,4)}</td>
      <td>${r.financialDataAvailable ? (r.financialRoiAvailable ? pct(r.strategyRoi) : `≥ ${pct(r.strategyRoiLowerBound)}`) : "н/д"}</td>
      <td><span class="grade ${gradeClass(r.evidenceGrade)}">${escapeHtml(r.evidenceGrade)}</span></td>
    </tr>`).join("");
    tournamentStatus.className="status ok";
    tournamentStatus.textContent="EXPLORATORY · BH/FDR applied";
    tournamentNote.textContent="Семейство exploratory-гипотез корректируется методом Benjamini–Hochberg. Даже q<0.05 здесь не является promotion gate: production требует отдельные preregistered forward-тиражи.";
  } catch (error) {
    if (token!==tournamentToken) return;
    tournamentStatus.className="status danger";
    tournamentStatus.textContent="Tournament blocked";
    tournamentNote.textContent=error instanceof Error ? error.message : String(error);
  }
}

async function loadAll() {
  clearError();
  status.className="status warn";
  status.textContent="LIVE: проверяю canonical backend…";
  archive=await loadLiveArchive();
  status.className="status ok";
  status.textContent=`LIVE · official · №${archive.last}`;
  renderDataQuality(archive);

  const target=archive.last+1;
  const [forward,evidenceRuns]=await Promise.all([
    loadForwardOverview(target),
    loadLatestEvidenceRuns(10),
  ]);
  renderForward(forward,target);
  renderEvidence(forward.status,evidenceRuns);

  researchStrategy.innerHTML=RESEARCH_KEYS.map((key)=>{
    const meta=STRATEGIES.find((s)=>s.key===key);
    return `<option value="${key}">${escapeHtml(meta?.name || key)}</option>`;
  }).join("");
  researchStrategy.value="adaptive20";
  await renderResearch();
  renderTournament();
}

researchStrategy.addEventListener("change",renderResearch);
loadAll().catch((error)=>{
  status.className="status danger";
  status.textContent="BLOCKED";
  showError(`LotoOS заблокировал расчёт: ${error instanceof Error ? error.message : String(error)}`);
});
