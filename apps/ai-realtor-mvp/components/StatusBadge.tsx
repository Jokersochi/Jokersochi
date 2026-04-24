import type { LeadStatus, ViewingStatus } from "../shared/types";

const statusColors: Record<string, string> = {
  new: "bg-slate-100 text-slate-800",
  in_conversation: "bg-blue-100 text-blue-800",
  awaiting_phone: "bg-amber-100 text-amber-800",
  viewing_requested: "bg-indigo-100 text-indigo-800",
  viewing_scheduled: "bg-violet-100 text-violet-800",
  viewing_confirmed: "bg-emerald-100 text-emerald-800",
  viewing_done: "bg-green-100 text-green-800",
  paused: "bg-zinc-100 text-zinc-800",
  escalated: "bg-rose-100 text-rose-800",
  closed: "bg-gray-100 text-gray-700",
  requested: "bg-indigo-100 text-indigo-800",
  awaiting_confirmation: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-rose-100 text-rose-800"
};

export function StatusBadge({ status }: { status: LeadStatus | ViewingStatus }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[status] ?? "bg-slate-100"}`}>{status}</span>;
}
