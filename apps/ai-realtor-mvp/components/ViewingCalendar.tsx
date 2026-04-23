import type { Viewing } from "../shared/types";

export function ViewingCalendar({ viewings }: { viewings: Viewing[] }) {
  return (
    <div className="space-y-3">
      {viewings.map((viewing) => (
        <article key={viewing.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="font-medium">{new Date(viewing.scheduled_at).toLocaleString("ru-RU")}</p>
          <p className="text-sm text-slate-600">Статус: {viewing.status} · Подтверждение: {viewing.confirmation_status}</p>
        </article>
      ))}
      {viewings.length === 0 && <p className="text-sm text-slate-500">Пока нет запланированных показов.</p>}
    </div>
  );
}
