import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poly-Shark AI · Интеллектуальный терминал",
  description:
    "Русскоязычный интеллектуальный терминал Poly-Shark AI: чат, программирование, исследования и креативные задачи.",
  applicationName: "Poly-Shark AI",
  authors: [{ name: "Poly-Shark Labs" }],
  keywords: ["ИИ", "чат", "программирование", "исследования", "Poly-Shark"],
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
