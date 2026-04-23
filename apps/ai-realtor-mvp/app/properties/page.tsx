import Link from "next/link";
import { PropertyList } from "../../components/PropertyList";
import { listProperties } from "../../lib/services/property-service";

export default async function PropertiesPage() {
  const properties = await listProperties().catch(() => []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Объекты</h1>
        <Link href="/properties/new" className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Добавить объект</Link>
      </div>
      <PropertyList properties={properties} />
    </div>
  );
}
