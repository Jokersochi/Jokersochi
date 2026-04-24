interface RecommendationsPanelProps {
  conversionHints: string[];
  recommendations: string[];
}

export function RecommendationsPanel({ conversionHints, recommendations }: RecommendationsPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Conversion hints</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {conversionHints.map((hint) => <li key={hint}>{hint}</li>)}
        </ul>
      </article>
      <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Рекомендации владельцу</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {recommendations.length === 0 ? <li>Критичных отклонений нет.</li> : recommendations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </article>
    </section>
  );
}
