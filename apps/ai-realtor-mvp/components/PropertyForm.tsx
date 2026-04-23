"use client";

import { useState } from "react";

export function PropertyForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <form className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" onSubmit={(event) => {
      event.preventDefault();
      setIsSubmitted(true);
    }}>
      <h1 className="text-xl font-semibold">Новый объект</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <input required name="title" placeholder="Название" className="rounded-md border border-slate-300 px-3 py-2" />
        <input required name="address" placeholder="Адрес" className="rounded-md border border-slate-300 px-3 py-2" />
        <input required type="number" name="price_listing" placeholder="Цена в объявлении" className="rounded-md border border-slate-300 px-3 py-2" />
        <input required type="number" name="price_floor" placeholder="Минимальная цена" className="rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">Сохранить</button>
      {isSubmitted && <p className="text-sm text-emerald-700">MVP заглушка: подключите Server Action для сохранения в Supabase.</p>}
    </form>
  );
}
