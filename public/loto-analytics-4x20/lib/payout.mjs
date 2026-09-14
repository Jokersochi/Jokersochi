export function categoryForMatches(fieldA, fieldB) {
  const hi = Math.max(Number(fieldA), Number(fieldB));
  const lo = Math.min(Number(fieldA), Number(fieldB));
  if (hi < 2) return null;
  if (hi === 4) return { 4: 1, 3: 2, 2: 3, 1: 4, 0: 5 }[lo] ?? null;
  if (hi === 3) return { 3: 6, 2: 7, 1: 8, 0: 9 }[lo] ?? null;
  if (hi === 2) return { 2: 10, 1: 11, 0: 12 }[lo] ?? null;
  return null;
}

export function buildPayoutIndex(rows) {
  const index = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const drawNumber = Number(row?.drawNumber ?? row?.draw_number);
    const category = Number(row?.category);
    const winnersCount = Number(row?.winnersCount ?? row?.winners_count);
    const payoutPerWinnerRub = Number(row?.payoutPerWinnerRub ?? row?.payout_per_winner_rub);
    const totalPayoutRub = Number(row?.totalPayoutRub ?? row?.total_payout_rub);
    if (!Number.isInteger(drawNumber) || !Number.isInteger(category) || category < 1 || category > 12) continue;
    if (![winnersCount, payoutPerWinnerRub, totalPayoutRub].every(Number.isFinite)) continue;
    if (winnersCount < 0 || payoutPerWinnerRub < 0 || totalPayoutRub < 0) continue;
    index.set(`${drawNumber}:${category}`, { drawNumber, category, winnersCount, payoutPerWinnerRub, totalPayoutRub });
  }
  return index;
}

function normalizeIndex(payoutRowsOrIndex) {
  return payoutRowsOrIndex instanceof Map ? payoutRowsOrIndex : buildPayoutIndex(payoutRowsOrIndex);
}

export function estimatePortfolioFinancials({ drawNumber, ticketPriceRub, ticketMatches, payoutRows }) {
  const price = Number(ticketPriceRub);
  const results = Array.isArray(ticketMatches) ? ticketMatches : [];
  if (!Number.isFinite(price) || price <= 0) {
    return {
      dataAvailable: false,
      complete: false,
      stakeRub: 0,
      payoutRub: 0,
      roi: null,
      roiLowerBound: null,
      coverage: 0,
      unresolvedTickets: results.length,
      tickets: results.map((row) => ({ ...row, category: categoryForMatches(row.fieldA, row.fieldB), payoutRub: null, payoutStatus: "unpriced" })),
      method: "missing_ticket_price",
    };
  }

  const index = normalizeIndex(payoutRows);
  const tickets = results.map((row) => ({ ...row, category: categoryForMatches(row.fieldA, row.fieldB), payoutRub: 0, payoutStatus: "resolved_loss" }));
  const grouped = new Map();
  tickets.forEach((ticket, ticketIndex) => {
    if (ticket.category == null) return;
    if (!grouped.has(ticket.category)) grouped.set(ticket.category, []);
    grouped.get(ticket.category).push(ticketIndex);
  });

  let payoutRub = 0;
  let unresolvedTickets = 0;
  for (const [category, indexes] of grouped.entries()) {
    const row = index.get(`${Number(drawNumber)}:${category}`);
    if (!row) {
      unresolvedTickets += indexes.length;
      indexes.forEach((idx) => { tickets[idx].payoutRub = null; tickets[idx].payoutStatus = "missing_category"; });
      continue;
    }

    const virtualWinners = indexes.length;
    let perVirtual = null;
    let status = "unresolved_zero_winner";

    // Category 11 (2x1 / 1x2) is the fixed-prize tier in the published 4x20 rules.
    if (category === 11 && row.payoutPerWinnerRub > 0) {
      perVirtual = row.payoutPerWinnerRub;
      status = "fixed_published_amount";
    } else if (row.totalPayoutRub > 0) {
      // Counterfactual estimate: keep the observed category pool fixed and add our winning tickets
      // to the published winner denominator. The real pool would move slightly because buying a
      // ticket also changes revenue, so this remains an estimate rather than an exact historical fact.
      perVirtual = row.totalPayoutRub / (row.winnersCount + virtualWinners);
      status = "counterfactual_pool_share";
    }

    if (perVirtual == null || !Number.isFinite(perVirtual) || perVirtual < 0) {
      unresolvedTickets += virtualWinners;
      indexes.forEach((idx) => { tickets[idx].payoutRub = null; tickets[idx].payoutStatus = status; });
      continue;
    }

    indexes.forEach((idx) => {
      tickets[idx].payoutRub = perVirtual;
      tickets[idx].payoutStatus = status;
      payoutRub += perVirtual;
    });
  }

  const stakeRub = price * tickets.length;
  const coverage = tickets.length > 0 ? 1 - (unresolvedTickets / tickets.length) : 1;
  const complete = unresolvedTickets === 0;
  const roiLowerBound = stakeRub > 0 ? (payoutRub - stakeRub) / stakeRub : null;

  return {
    dataAvailable: index.size > 0,
    complete,
    stakeRub,
    payoutRub,
    roi: complete ? roiLowerBound : null,
    roiLowerBound,
    coverage,
    unresolvedTickets,
    tickets,
    method: complete ? "counterfactual_official_pool_estimate" : "counterfactual_official_pool_lower_bound",
  };
}
