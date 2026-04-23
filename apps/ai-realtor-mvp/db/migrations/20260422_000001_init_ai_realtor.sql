create extension if not exists "pgcrypto";

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  address text not null,
  price_listing bigint not null check (price_listing > 0),
  price_floor bigint not null check (price_floor > 0 and price_floor <= price_listing),
  passport_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  source text not null,
  name text,
  phone text,
  channel text not null,
  first_message text not null,
  temperature text not null check (temperature in ('cold','warm','hot')),
  status text not null check (status in ('new','in_conversation','awaiting_phone','viewing_requested','viewing_scheduled','viewing_confirmed','viewing_done','paused','escalated','closed')),
  escalated_to_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  channel text not null,
  message_text text not null,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists viewings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  scheduled_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('requested','awaiting_confirmation','confirmed','completed','cancelled','no_show')),
  confirmation_status text not null check (confirmation_status in ('pending','confirmed','declined')) default 'pending',
  no_show_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_property_id on leads(property_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_viewings_scheduled_at on viewings(scheduled_at);
create index if not exists idx_viewings_status on viewings(status);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);

create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger touch_properties_updated_at
before update on properties
for each row execute function touch_updated_at();

create trigger touch_leads_updated_at
before update on leads
for each row execute function touch_updated_at();

create trigger touch_viewings_updated_at
before update on viewings
for each row execute function touch_updated_at();
