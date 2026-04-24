import type { Lead, Viewing } from "../../shared/types";
import { listLeads } from "./lead-service";
import { listViewings } from "./viewing-service";

export interface DashboardMetrics {
  newLeads: number;
  hotLeads: number;
  scheduledViewings: number;
  confirmedViewings: number;
  noShowCount: number;
  conversionHints: string[];
  recommendations: string[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [leads, viewings] = await Promise.all([listLeads(), listViewings()]);
  return buildMetrics(leads, viewings);
}

function buildMetrics(leads: Lead[], viewings: Viewing[]): DashboardMetrics {
  const newLeads = leads.filter((l) => l.status === "new").length;
  const hotLeads = leads.filter((l) => l.temperature === "hot").length;
  const scheduledViewings = viewings.filter((v) => ["requested", "awaiting_confirmation"].includes(v.status)).length;
  const confirmedViewings = viewings.filter((v) => v.status === "confirmed").length;
  const noShowCount = viewings.filter((v) => v.status === "no_show").length;

  const conversionHints = [
    "Запрашивайте телефон в первом ответе при запросе показа.",
    "Всегда предлагайте 2-3 конкретных слота вместо свободного вопроса.",
    "Подтверждайте показ за 2 часа, иначе автоотмена."
  ];

  const recommendations: string[] = [];
  if (hotLeads > 0) recommendations.push("Свяжитесь с hot лидами в течение 15 минут.");
  if (noShowCount > 0) recommendations.push("Проверьте подтверждения T-2h и ручное подтверждение для лидов с 2 no-show.");
  if (scheduledViewings === 0) recommendations.push("Усильте CTA на конкретные слоты в переписке.");

  return { newLeads, hotLeads, scheduledViewings, confirmedViewings, noShowCount, conversionHints, recommendations };
}
