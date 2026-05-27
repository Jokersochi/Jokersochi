import type { LeadTemperature } from "../shared/types";

const colors: Record<LeadTemperature, string> = {
  cold: "bg-slate-200 text-slate-800",
  warm: "bg-amber-200 text-amber-900",
  hot: "bg-rose-200 text-rose-900"
};

export function TemperatureBadge({ value }: { value: LeadTemperature }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors[value]}`}>{value}</span>;
}
