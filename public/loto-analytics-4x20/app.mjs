import { STRATEGIES, generateTickets, maxUsefulTickets } from "./lib/strategy.mjs";
import { loadLiveArchive } from "./lib/live-data.mjs";

const strategyGrid = document.querySelector("#strategyGrid");
const strategySelect = document.querySelector("#strategy");
const countInput = document.querySelector("#count");
const generateButton = document.querySelector("#generate");
const results = document.querySelector("#results");
const errorBox = document.querySelector("#error");
const status = document.querySelector("#dataStatus");
const countNote = document.querySelector("#countNote");
const qualityGrid = document.querySelector("#qualityGrid");
const latestDraw = document.querySelector("#latestDraw");
let archive = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
}

function renderStrategies() {
  strategyGrid.innerHTML = STRATEGIES.map((s) => `
    <article class="card">
      <div class="strategy-name"><h2>${escapeHtml(s.name)}</h2><span class="chip">${s.lookback ? `${s.lookback} тиражей` : "без истории"}</span></div>
      <p><strong>${escapeHtml(s.shortDescription)}</strong></p>
      <p class="muted">${escapeHtml(s.plainDescription)}</p>
    </article>`).join("");
  strategySelect.innerHTML = STRATEGIES.map((s) => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join("");
  updateCountLimit();
}

function updateCountLimit() {
  const key = strategySelect.value;
  const max = maxUsefulTickets(key);
  countInput.max = String(max);
  if (Number(countInput.value) > max) countInput.value = String(max);
  countInput.disabled = max === 1;
  countNote.textContent = max === 1
    ? "Эта стратегия по текущим данным даёт одну определённую комбинацию. LotoOS не создаёт искусственные варианты с выдуманными причинами."
    : "Можно создать до 10 независимых случайных билетов.";
}

function balls(numbers, cls) {
  return `<div class="balls ${cls}">${numbers.map((n) => `<span class="ball">${n}</span>`).join("")}</div>`;
}

function renderDataQuality(data) {
  const cards = [
    ["Проверено до", `№${data.last}`],
    ["Всего в архиве", data.totalCount.toLocaleString("ru-RU")],
    ["Пропуски", "0"],
    ["Некорректные", "0"],
  ];
  qualityGrid.innerHTML = cards.map(([label, value]) => `<div class="quality-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

  const draw = data.draws.at(-1);
  const date = new Date(draw.date).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
  latestDraw.innerHTML = `<div class="latest-head"><div><span class="eyebrow">Последний подтверждённый тираж</span><h2>№${draw.number}</h2></div><span class="chip">${escapeHtml(date)}</span></div><div class="fields"><div class="lotto-field field-a"><strong>Поле 1</strong>${balls(draw.fieldA, "field-a")}</div><div class="lotto-field field-b"><strong>Поле 2</strong>${balls(draw.fieldB, "field-b")}</div></div>`;
}

async function loadArchive() {
  status.className = "status warn";
  status.textContent = "Данные: проверяю live-backend…";
  try {
    const data = await loadLiveArchive();
    archive = data;
    status.className = "status ok";
    status.textContent = `LIVE · официальный архив · до №${data.last} · без пропусков`;
    renderDataQuality(data);
    generateButton.disabled = false;
    return data;
  } catch (error) {
    archive = null;
    generateButton.disabled = true;
    status.className = "status danger";
    status.textContent = "BLOCKED · live-архив не прошёл проверку";
    qualityGrid.innerHTML = "";
    latestDraw.innerHTML = "";
    throw error;
  }
}

function renderTicket(ticket, index) {
  const fields = ticket.explanation.fields.map((field, i) => `
    <details class="reason" ${i === 0 ? "open" : ""}>
      <summary>${escapeHtml(field.summary)}</summary>
      <ul>${field.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>
    </details>`).join("");
  return `<article class="ticket">
    <div class="ticket-head"><h2>Билет ${index + 1}</h2><span class="chip">${escapeHtml(ticket.explanation.strategyName)}</span></div>
    <div class="fields"><div class="lotto-field field-a"><strong>Поле 1</strong>${balls(ticket.fieldA, "field-a")}</div><div class="lotto-field field-b"><strong>Поле 2</strong>${balls(ticket.fieldB, "field-b")}</div></div>
    <section class="why"><h3>Почему выбраны эти числа</h3><p class="muted">${escapeHtml(ticket.explanation.summary)}</p>${fields}<div class="disclaimer">${escapeHtml(ticket.explanation.disclaimer)}</div></section>
  </article>`;
}

async function generate() {
  errorBox.classList.add("hidden");
  generateButton.disabled = true;
  generateButton.textContent = "Считаю…";
  try {
    if (!archive) await loadArchive();
    const strategy = strategySelect.value;
    const count = Math.max(1, Number(countInput.value) || 1);
    const tickets = generateTickets(strategy, archive.draws, count, Date.now());
    results.innerHTML = tickets.map(renderTicket).join("");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    errorBox.textContent = `Не удалось безопасно сгенерировать билет: ${error instanceof Error ? error.message : String(error)}. Неподтверждённые или устаревшие данные не используются.`;
    errorBox.classList.remove("hidden");
  } finally {
    generateButton.disabled = archive == null;
    generateButton.textContent = "Сгенерировать";
  }
}

strategySelect.addEventListener("change", updateCountLimit);
generateButton.addEventListener("click", generate);
renderStrategies();
generateButton.disabled = true;
loadArchive().catch((error) => {
  errorBox.textContent = `Live-backend заблокировал генерацию: ${error instanceof Error ? error.message : String(error)}.`;
  errorBox.classList.remove("hidden");
});
