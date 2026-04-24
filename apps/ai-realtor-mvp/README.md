# AI Realtor MVP (денежная версия v1)

Owner-first MVP для 1 объекта. Цель: не терять входящие лиды, доводить до показа и эскалировать только hot лиды.

## Folder tree

```txt
apps/ai-realtor-mvp
├─ app/
│  ├─ api/
│  │  ├─ ai/classify/route.ts
│  │  ├─ ai/reply/route.ts
│  │  ├─ dashboard/route.ts
│  │  ├─ leads/route.ts
│  │  ├─ leads/inbound/route.ts
│  │  ├─ leads/[id]/route.ts
│  │  ├─ owner/daily-summary/route.ts
│  │  ├─ properties/route.ts
│  │  ├─ properties/[id]/route.ts
│  │  ├─ viewings/route.ts
│  │  └─ viewings/[id]/{confirm,cancel,complete}/route.ts
│  ├─ dashboard/page.tsx
│  ├─ properties/{page.tsx,new/page.tsx,[id]/page.tsx}
│  ├─ leads/page.tsx
│  ├─ viewings/page.tsx
│  └─ layout.tsx
├─ components/
├─ db/
│  ├─ migrations/20260423_000001_ai_realtor_v1.sql
│  └─ seed.sql
├─ docs/workflows/*.md
├─ lib/
│  ├─ adapters/
│  ├─ ai/
│  ├─ services/
│  ├─ supabase/
│  └─ workflows/*.json
├─ prompts/*.txt
├─ shared/{types.ts,validators.ts}
└─ test-fixtures/ai-classification-cases.json
```

## Supabase migration + RLS
- Migration: `db/migrations/20260423_000001_ai_realtor_v1.sql`.
- Includes enums, tables, constraints, indexes, `updated_at` triggers.
- RLS enabled on core tables with owner-readable/writable baseline policies.
- TODO: tighten policies by `owner_id = auth.uid()` once Auth flow is finalized.

## Seed
- Seed file: `db/seed.sql`.
- Adds pilot property:
  - title: `Квартира, пилотный объект`
  - listing: `9 000 000`
  - floor: `8 500 000`
  - address: `demo address`

## API surface
- `GET /api/dashboard`
- `GET /api/properties`
- `POST /api/properties`
- `GET /api/properties/[id]`
- `PATCH /api/properties/[id]`
- `GET /api/leads`
- `POST /api/leads/inbound`
- `PATCH /api/leads/[id]`
- `GET /api/viewings`
- `POST /api/viewings`
- `PATCH /api/viewings/[id]/confirm`
- `PATCH /api/viewings/[id]/cancel`
- `PATCH /api/viewings/[id]/complete`
- `POST /api/ai/classify`
- `POST /api/ai/reply`
- `POST /api/owner/daily-summary`

## Prompt pack
Located in `prompts/` and duplicated in `lib/prompts/` for n8n compatibility.

## n8n workflows
Blueprint docs: `docs/workflows/*.md`.
Importable skeletons: `lib/workflows/*.json`.

## AI test fixtures
`test-fixtures/ai-classification-cases.json` covers key classification scenarios.

## Local run
```bash
cd apps/ai-realtor-mvp
npm install
npm run dev
```

### Validate
```bash
npm run typecheck
npm run lint
```

## Environment variables
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional adapters:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_TOKEN`

Notes:
- If Telegram/WhatsApp credentials are missing, owner summary API returns `not_configured` status instead of crashing.
