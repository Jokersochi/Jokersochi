interface RecommendationsPanelProps {
  recommendations: string[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold">Рекомендации</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-700">
        {recommendations.length === 0 ? <li>Отклонений нет. Продолжайте по текущему сценарию.</li> : recommendations.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}
