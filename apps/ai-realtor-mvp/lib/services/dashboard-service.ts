import { listLeads } from "./lead-service";
import { listViewings } from "./viewing-service";
import type { DashboardMetrics } from "../../shared/types";

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [leads, viewings] = await Promise.all([listLeads(), listViewings()]);

  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const hotLeads = leads.filter((lead) => lead.temperature === "hot").length;
  const scheduledViewings = viewings.filter((viewing) => viewing.status === "awaiting_confirmation").length;
  const confirmedViewings = viewings.filter((viewing) => viewing.status === "confirmed").length;
  const noShowCount = viewings.filter((viewing) => viewing.status === "no_show").length;

  const recommendations: string[] = [];
  if (newLeads > 5) recommendations.push("Ускорить первичный ответ: новых лидов больше 5.");
  if (noShowCount > 0) recommendations.push("Проверить скрипт подтверждения за 2 часа для снижения no-show.");
  if (hotLeads > 0) recommendations.push("Связаться с горячими лидами в течение 15 минут.");

  return { newLeads, hotLeads, scheduledViewings, confirmedViewings, noShowCount, recommendations };
}
