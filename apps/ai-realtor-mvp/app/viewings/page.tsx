import { ErrorState } from "../../components/ErrorState";
import { ViewingCalendar } from "../../components/ViewingCalendar";
import { listViewings } from "../../lib/services/viewing-service";

export default async function ViewingsPage() {
  try {
    const viewings = await listViewings();

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Показы</h1>
        <ViewingCalendar viewings={viewings} />
      </div>
    );
  } catch (error) {
    return <ErrorState message={(error as Error).message} />;
  }
}
