import type { Lead } from "../shared/types";

export function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-slate-600">
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
              <td className="px-4 py-3">{lead.first_message}</td>
              <td className="px-4 py-3">{lead.temperature}</td>
              <td className="px-4 py-3">{lead.status}</td>
              <td className="px-4 py-3">{lead.phone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
