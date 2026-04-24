import type { Viewing } from "../shared/types";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function ViewingCalendar({ viewings }: { viewings: Viewing[] }) {
  if (viewings.length === 0) {
    return <EmptyState title="Показов пока нет" description="Назначьте первый показ и включите напоминания в n8n." />;
  }

  return (
    <div className="space-y-3">
      {viewings.map((viewing) => (
        <article key={viewing.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="font-medium">{new Date(viewing.scheduled_at).toLocaleString("ru-RU")}</p>
          <p className="mt-2 text-sm text-slate-600">Слот: 45 минут · Подтверждение: {viewing.confirmation_status}</p>
          <div className="mt-2"><StatusBadge status={viewing.status} /></div>
        </article>
      ))}
    </div>
  );
}
