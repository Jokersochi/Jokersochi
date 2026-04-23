import { ViewingCalendar } from "../../components/ViewingCalendar";
import { listViewings } from "../../lib/services/viewing-service";

export default async function ViewingsPage() {
  const viewings = await listViewings().catch(() => []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Показы</h1>
      <ViewingCalendar viewings={viewings} />
    </div>
  );
}
