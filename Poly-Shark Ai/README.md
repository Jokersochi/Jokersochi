# 🦈 Poly-Shark AI

**Apex Intelligence** — мульти-режимный AI-ассистент на базе Claude.

## Возможности

- 💬 **Чат** — универсальный ассистент
- ⚡ **Код** — экспертное программирование со стримингом
- 🔬 **Ресёрч** — структурированный анализ
- ✨ **Креатив** — генерация идей и текстов
- 🌊 Глубоководный дизайн (glassmorphism + ocean gradient)
- 🧠 Постоянная история диалогов (localStorage)
- ⚡ Streaming-ответы через Anthropic SDK
- 🎨 Markdown с подсветкой, GFM-таблицы
- 📱 Полностью адаптивный интерфейс

## Стек

- **Next.js 14** (App Router, Server Components, Edge-ready API)
- **TypeScript** strict
- **TailwindCSS** + кастомная дизайн-система
- **Framer Motion** — анимации
- **Zustand** + persist — стейт
- **Anthropic SDK** — streaming Claude API
- **react-markdown** + remark-gfm

## Запуск

```bash
cp .env.example .env.local
# вставьте ваш ANTHROPIC_API_KEY
npm install
npm run dev
```

Откройте http://localhost:3000

## Структура

```
src/
  app/
    api/chat/route.ts   — streaming endpoint
    layout.tsx
    page.tsx
    globals.css
  components/
    Sidebar.tsx         — список диалогов + переключение режимов
    Chat.tsx            — главный экран
    Composer.tsx        — ввод с auto-resize
    MessageBubble.tsx   — сообщения с Markdown
    SharkLogo.tsx       — анимированный логотип
  lib/
    store.ts            — Zustand store
    prompts.ts          — системные промпты по режимам
    utils.ts
```

## Лицензия

MIT
