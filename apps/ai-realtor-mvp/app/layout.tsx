import Link from "next/link";
import "./globals.css";
import type { ReactNode } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Объекты" },
  { href: "/leads", label: "Лиды" },
  { href: "/viewings", label: "Показы" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <header className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-semibold">AI Realtor v1</p>
            <nav className="mt-3 flex flex-wrap gap-2">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
