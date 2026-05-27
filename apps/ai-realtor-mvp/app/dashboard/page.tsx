import { ErrorState } from "../../components/ErrorState";
import { MetricCard } from "../../components/MetricCard";
import { RecommendationsPanel } from "../../components/RecommendationsPanel";
import { getDashboardMetrics } from "../../lib/services/dashboard-service";

export default async function DashboardPage() {
  try {
    const metrics = await getDashboardMetrics();

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Новые лиды" value={metrics.newLeads} />
          <MetricCard label="Горячие лиды" value={metrics.hotLeads} />
          <MetricCard label="Назначенные показы" value={metrics.scheduledViewings} />
          <MetricCard label="Подтверждённые показы" value={metrics.confirmedViewings} />
          <MetricCard label="No-show" value={metrics.noShowCount} />
        </section>
        <RecommendationsPanel conversionHints={metrics.conversionHints} recommendations={metrics.recommendations} />
      </div>
    );
  } catch (error) {
    return <ErrorState message={(error as Error).message} />;
  }
}
