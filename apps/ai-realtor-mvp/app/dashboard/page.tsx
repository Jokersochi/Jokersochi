import { MetricCard } from "../../components/MetricCard";
import { RecommendationsPanel } from "../../components/RecommendationsPanel";
import { getDashboardMetrics } from "../../lib/services/dashboard-service";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics().catch(() => ({
    newLeads: 0,
    hotLeads: 0,
    scheduledViewings: 0,
    confirmedViewings: 0,
    noShowCount: 0,
    recommendations: ["Подключите Supabase ENV, чтобы увидеть метрики."]
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Новые лиды" value={metrics.newLeads} />
        <MetricCard label="Горячие лиды" value={metrics.hotLeads} />
        <MetricCard label="Назначенные показы" value={metrics.scheduledViewings} />
        <MetricCard label="Подтверждённые показы" value={metrics.confirmedViewings} />
        <MetricCard label="No-show" value={metrics.noShowCount} />
      </section>
      <RecommendationsPanel recommendations={metrics.recommendations} />
    </div>
  );
}
