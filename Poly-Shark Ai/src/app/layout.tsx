import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poly-Shark AI · Apex Intelligence",
  description:
    "Хищный мульти-режимный AI-ассистент: чат, код, ресёрч, креатив. На базе Claude.",
  applicationName: "Poly-Shark AI",
  authors: [{ name: "Poly-Shark Labs" }],
  keywords: ["AI", "Claude", "chat", "code", "research", "Poly-Shark"],
};

export const viewport: Viewport = {
  themeColor: "#050d1c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body>{children}</body>
    </html>
  );
}
