import Link from "next/link";
import type { Property } from "../shared/types";
import { EmptyState } from "./EmptyState";

export function PropertyList({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return <EmptyState title="Объектов нет" description="Добавьте пилотный объект, чтобы начать обработку лидов." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3">Объект</th>
            <th className="px-4 py-3">Адрес</th>
            <th className="px-4 py-3">Цена</th>
            <th className="px-4 py-3">Мин. цена</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-medium"><Link href={`/properties/${property.id}`} className="hover:underline">{property.title}</Link></td>
              <td className="px-4 py-3">{property.address}</td>
              <td className="px-4 py-3">{Number(property.price_listing).toLocaleString("ru-RU")} ₽</td>
              <td className="px-4 py-3">{Number(property.price_floor).toLocaleString("ru-RU")} ₽</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
