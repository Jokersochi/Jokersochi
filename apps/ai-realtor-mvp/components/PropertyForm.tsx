"use client";

import { useState } from "react";

const demoPassport = {
  rooms: null,
  area: null,
  floor: null,
  renovation: null,
  documents: "уточнить у владельца",
  description: "Пилотный объект для AI Realtor MVP"
};

export function PropertyForm() {
  const [response, setResponse] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    const payload = {
      title: formData.get("title"),
      address: formData.get("address"),
      price_listing: Number(formData.get("price_listing")),
      price_floor: Number(formData.get("price_floor")),
      passport_json: demoPassport
    };

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    setResponse(json.ok ? "Объект сохранён" : `Ошибка: ${json.error}`);
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-semibold">Новый объект</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <input required name="title" defaultValue="Квартира, пилотный объект" className="rounded-md border border-slate-300 px-3 py-2" />
        <input required name="address" defaultValue="demo address" className="rounded-md border border-slate-300 px-3 py-2" />
        <input required type="number" name="price_listing" defaultValue={9000000} className="rounded-md border border-slate-300 px-3 py-2" />
        <input required type="number" name="price_floor" defaultValue={8500000} className="rounded-md border border-slate-300 px-3 py-2" />
      </div>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-white">Сохранить</button>
      {response ? <p className="text-sm text-slate-700">{response}</p> : null}
    </form>
  );
}
