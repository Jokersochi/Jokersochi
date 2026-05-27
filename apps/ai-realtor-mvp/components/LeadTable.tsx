import type { Lead } from "../shared/types";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import { TemperatureBadge } from "./TemperatureBadge";

export function LeadTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <EmptyState title="Лидов пока нет" description="Подключите webhook inbound-lead и начните принимать сообщения." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-slate-700">
          <tr>
            <th className="px-4 py-3">Канал</th>
            <th className="px-4 py-3">Первое сообщение</th>
            <th className="px-4 py-3">Температура</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Телефон</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{lead.channel}</td>
              <td className="px-4 py-3">{lead.first_message ?? "—"}</td>
              <td className="px-4 py-3"><TemperatureBadge value={lead.temperature} /></td>
              <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
              <td className="px-4 py-3">{lead.phone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
