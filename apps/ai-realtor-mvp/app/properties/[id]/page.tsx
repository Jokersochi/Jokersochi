import { ErrorState } from "../../../components/ErrorState";
import { getProperty } from "../../../lib/services/property-service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailsPage({ params }: PageProps) {
  try {
    const { id } = await params;
    const property = await getProperty(id);

    if (!property) {
      return <ErrorState message="Объект не найден" />;
    }

    return (
      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">{property.title}</h1>
        <p className="text-sm text-slate-600">{property.address}</p>
        <p className="text-sm">Цена: {Number(property.price_listing).toLocaleString("ru-RU")} ₽</p>
        <p className="text-sm">Floor: {Number(property.price_floor).toLocaleString("ru-RU")} ₽</p>
        <pre className="overflow-auto rounded-md bg-slate-100 p-3 text-xs">{JSON.stringify(property.passport_json, null, 2)}</pre>
      </section>
    );
  } catch (error) {
    return <ErrorState message={(error as Error).message} />;
  }
}
