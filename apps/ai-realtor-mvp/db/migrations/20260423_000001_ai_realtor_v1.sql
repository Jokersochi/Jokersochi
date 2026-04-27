create extension if not exists "pgcrypto";

create type lead_status as enum (
  'new','in_conversation','awaiting_phone','viewing_requested','viewing_scheduled','viewing_confirmed','viewing_done','paused','escalated','closed'
);

create type lead_temperature as enum ('cold','warm','hot');
create type viewing_status as enum ('requested','awaiting_confirmation','confirmed','completed','cancelled','no_show');
create type message_direction as enum ('inbound','outbound','internal');

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  title text not null,
  address text not null,
  price_listing numeric not null check (price_listing > 0),
  price_floor numeric not null check (price_floor > 0 and price_floor <= price_listing),
  passport_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  external_id text,
  source text not null,
  name text,
  phone text,
  channel text not null,
  first_message text,
  temperature lead_temperature not null default 'cold',
  status lead_status not null default 'new',
  escalated_to_owner boolean not null default false,
  no_show_count int not null default 0,
  manual_confirmation_required boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_leads_source_external_unique
  on leads(source, external_id) where external_id is not null;

create table if not exists lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  external_message_id text,
  direction message_direction not null,
  channel text not null,
  message_text text not null,
  ai_generated boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists viewings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  scheduled_at timestamptz not null,
  ends_at timestamptz not null,
  status viewing_status not null default 'requested',
  confirmation_status text not null default 'pending',
  no_show_flag boolean not null default false,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  reminder_2h_sent_at timestamptz,
  reminder_30m_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > scheduled_at)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_property on leads(property_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_temperature on leads(temperature);
create index if not exists idx_messages_lead on lead_messages(lead_id);
create index if not exists idx_viewings_lead on viewings(lead_id);
create index if not exists idx_viewings_property on viewings(property_id);
create index if not exists idx_viewings_status on viewings(status);
create index if not exists idx_viewings_scheduled on viewings(scheduled_at);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_properties_updated_at before update on properties for each row execute function set_updated_at();
create trigger trg_leads_updated_at before update on leads for each row execute function set_updated_at();
create trigger trg_viewings_updated_at before update on viewings for each row execute function set_updated_at();

alter table properties enable row level security;
alter table leads enable row level security;
alter table lead_messages enable row level security;
alter table viewings enable row level security;
alter table audit_logs enable row level security;

create policy if not exists "owner read properties" on properties for select using (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner write properties" on properties for all using (auth.role() in ('authenticated','service_role')) with check (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner read leads" on leads for select using (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner write leads" on leads for all using (auth.role() in ('authenticated','service_role')) with check (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner read lead_messages" on lead_messages for select using (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner write lead_messages" on lead_messages for all using (auth.role() in ('authenticated','service_role')) with check (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner read viewings" on viewings for select using (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner write viewings" on viewings for all using (auth.role() in ('authenticated','service_role')) with check (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner read audit_logs" on audit_logs for select using (auth.role() in ('authenticated','service_role'));
create policy if not exists "owner write audit_logs" on audit_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
