create table if not exists api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  idempotency_key text not null,
  response_json jsonb,
  created_at timestamptz not null default now(),
  unique(operation, idempotency_key)
);

create index if not exists idx_api_idempotency_operation on api_idempotency_keys(operation);

alter table api_idempotency_keys enable row level security;

create policy if not exists "service role manages idempotency" on api_idempotency_keys
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
