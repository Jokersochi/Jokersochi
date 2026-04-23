# AI Realtor — Денежная версия v1 (MVP)

## 1) Folder tree

```txt
apps/ai-realtor-mvp
├─ app/
│  ├─ api/
│  │  ├─ dashboard/route.ts
│  │  ├─ leads/route.ts
│  │  ├─ properties/route.ts
│  │  └─ viewings/route.ts
│  ├─ dashboard/page.tsx
│  ├─ leads/page.tsx
│  ├─ properties/
│  │  ├─ [id]/page.tsx
│  │  ├─ new/page.tsx
│  │  └─ page.tsx
│  ├─ viewings/page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ LeadTable.tsx
│  ├─ MetricCard.tsx
│  ├─ PropertyForm.tsx
│  ├─ PropertyList.tsx
│  ├─ RecommendationsPanel.tsx
│  └─ ViewingCalendar.tsx
├─ db/migrations/
│  └─ 20260422_000001_init_ai_realtor.sql
├─ docs/workflows/
│  ├─ daily-report.md
│  ├─ inbound-lead.md
│  ├─ post-viewing.md
│  ├─ reminders.md
│  └─ viewing-scheduler.md
├─ lib/
│  ├─ prompts/
│  │  ├─ classify.user.txt
│  │  ├─ followup.user.txt
│  │  ├─ owner-summary.user.txt
│  │  ├─ schedule.user.txt
│  │  └─ seller.system.txt
│  ├─ services/
│  │  ├─ dashboard-service.ts
│  │  ├─ lead-service.ts
│  │  ├─ property-service.ts
│  │  └─ viewing-service.ts
│  ├─ supabase/client.ts
│  └─ workflows/
│     ├─ daily-report.json
│     ├─ inbound-lead.json
│     ├─ post-viewing.json
│     ├─ reminders.json
│     └─ viewing-scheduler.json
├─ shared/
│  ├─ types.ts
│  └─ validators.ts
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ tailwind.config.ts
└─ tsconfig.json
```

## 2) Database schema
- Основная схема реализована в SQL миграции: `db/migrations/20260422_000001_init_ai_realtor.sql`.
- Включены таблицы: `properties`, `leads`, `lead_messages`, `viewings`, `audit_logs`.
- Добавлены check constraints для статусов, температуры и ценового floor.
- Добавлены индексы и триггер автообновления `updated_at`.

## 3) Shared types
- Типы домена: `LeadStatus`, `LeadTemperature`, `ViewingStatus`, `Property`, `Lead`, `Viewing`, `AuditLog`, `DashboardMetrics`.
- Валидаторы на Zod:
  - `propertySchema` (включая `price_floor <= price_listing`),
  - `leadClassifyResponseSchema`,
  - `scheduleViewingSchema`.

## 4) Prompt pack
Промпты находятся в `lib/prompts/`:
1. `seller.system.txt`
2. `classify.user.txt`
3. `schedule.user.txt`
4. `followup.user.txt`
5. `owner-summary.user.txt`

## 5) n8n workflow docs
Документация:
- `docs/workflows/inbound-lead.md`
- `docs/workflows/viewing-scheduler.md`
- `docs/workflows/reminders.md`
- `docs/workflows/post-viewing.md`
- `docs/workflows/daily-report.md`

JSON skeletons:
- `lib/workflows/inbound-lead.json`
- `lib/workflows/viewing-scheduler.json`
- `lib/workflows/reminders.json`
- `lib/workflows/post-viewing.json`
- `lib/workflows/daily-report.json`

## 6) API surface
- `GET /api/dashboard` — агрегированные метрики dashboard.
- `GET /api/properties` — список объектов.
- `POST /api/properties` — создать объект.
- `GET /api/leads` — список лидов.
- `GET /api/viewings` — список показов.

## 7) Implementation plan (7 дней)
1. День 1: развернуть Supabase, применить миграцию, добавить ENV.
2. День 2: подключить inbound webhook и workflow `inbound-lead`.
3. День 3: включить `viewing-scheduler` + правила подтверждения и автоотмены.
4. День 4: включить `reminders` и контроль no-show.
5. День 5: включить `post-viewing` + эскалацию hot лидов.
6. День 6: включить `daily-report` в Telegram/WhatsApp.
7. День 7: smoke test end-to-end, корректировка prompt pack по конверсии.

## Launch instructions
1. Установить зависимости:
   ```bash
   cd apps/ai-realtor-mvp
   npm install
   ```
2. Создать `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   OPENAI_API_KEY=...
   ```
3. Применить SQL миграцию в Supabase SQL Editor.
4. Запустить локально:
   ```bash
   npm run dev
   ```
5. Проверка типов:
   ```bash
   npm run typecheck
   ```

## Explicit assumptions
- Канальные интеграции (WhatsApp/Telegram/CRM source) подключаются через n8n HTTP nodes.
- Для MVP один активный `property_id` используется в inbound workflow по умолчанию.
- Auth владельца будет добавлен на следующей итерации; текущий scope — owner-first single-user pilot.
