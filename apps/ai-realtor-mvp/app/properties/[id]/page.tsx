interface PropertyDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailsPage({ params }: PropertyDetailsPageProps) {
  const { id } = await params;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-semibold">Карточка объекта {id}</h1>
      <p className="mt-2 text-sm text-slate-600">MVP версия: выведите паспорт объекта, историю лидов и показы по property_id.</p>
    </section>
  );
}
