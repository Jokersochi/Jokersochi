export const ENDPOINT = "https://www.stoloto.ru/p/api/mobile/api/v35/service/draws/archive";
export const HEADERS = {
  accept: "*/*",
  "content-type": "application/x-www-form-urlencoded",
  "device-platform": "DESKTOP",
  "device-type": "STOLOTO",
  "gosloto-partner": "bXMjXFRXZ3coWXh6R3s1NTdUX3dnWlBMLUxmdg",
  referer: "https://www.stoloto.ru/4x20/archive",
  "user-agent": "Mozilla/5.0 LotoOS-GitHub-Updater/1.0",
};

export function normalizeDraw(draw) {
  const structured = draw?.combination?.structured;
  if (!Array.isArray(structured) || structured.length !== 8) return null;
  const values = structured.map(Number);
  const fieldA = values.slice(0, 4);
  const fieldB = values.slice(4, 8);
  const valid = [fieldA, fieldB].every(
    (field) => field.length === 4 && new Set(field).size === 4 && field.every((n) => Number.isInteger(n) && n >= 1 && n <= 20),
  );
  if (!valid || draw.status !== "COMPLETED" || draw.completed === false) return null;
  const number = Number(draw.number);
  if (!Number.isInteger(number) || number < 1) return null;
  return {
    number,
    date: draw.date ?? null,
    fieldA,
    fieldB,
    sourceUrl: `https://www.stoloto.ru/4x20/archive/${number}`,
    validationStatus: "verified",
  };
}

export function validateArchive(rows, minCount = 1000) {
  const byNumber = new Map();
  const conflicts = [];
  for (const row of rows) {
    const prev = byNumber.get(row.number);
    if (prev) {
      const same = JSON.stringify([prev.fieldA, prev.fieldB, prev.date]) === JSON.stringify([row.fieldA, row.fieldB, row.date]);
      if (!same) conflicts.push(row.number);
      continue;
    }
    byNumber.set(row.number, row);
  }
  if (conflicts.length) throw new Error(`Конфликтующие дубли тиражей: ${conflicts.slice(0, 10).join(", ")}`);
  const draws = [...byNumber.values()].sort((a, b) => a.number - b.number);
  if (draws.length < minCount) throw new Error(`Недостаточно подтверждённых тиражей: ${draws.length}`);
  const gaps = [];
  for (let i = 1; i < draws.length; i++) {
    const expected = draws[i - 1].number + 1;
    if (draws[i].number !== expected) gaps.push({ after: draws[i - 1].number, before: draws[i].number, missingFrom: expected, missingTo: draws[i].number - 1 });
  }
  if (gaps.length) throw new Error(`Архив 4 из 20 содержит разрывы: ${JSON.stringify(gaps.slice(0, 5))}`);
  return {
    source: "official",
    retrievedAt: new Date().toISOString(),
    count: draws.length,
    first: draws[0].number,
    last: draws.at(-1).number,
    quality: { duplicates: rows.length - draws.length, gaps: [], continuous: true },
    draws,
  };
}
