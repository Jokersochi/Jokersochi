import { LeadTable } from "../../components/LeadTable";
import { listLeads } from "../../lib/services/lead-service";

export default async function LeadsPage() {
  const leads = await listLeads().catch(() => []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Лиды</h1>
      <LeadTable leads={leads} />
    </div>
  );
}
