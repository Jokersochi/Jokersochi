-- LotoOS P0 canonical forward/evidence schema.
-- Supabase is the sole operational source of truth; evidence rows are append-only.

create extension if not exists pgcrypto;

alter table public.data_sources
  add column if not exists verification_meta jsonb not null default '{}'::jsonb;

alter table public.ingestion_runs
  add column if not exists error_class text,
  add column if not exists failure_code text,
  add column if not exists severity text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='ingestion_runs_severity_check') then
    alter table public.ingestion_runs
      add constraint ingestion_runs_severity_check
      check (severity is null or severity in ('info','warning','error','critical'));
  end if;
end $$;

create or replace function public.lotoos_ticket_valid(values_in smallint[])
returns boolean
language sql immutable strict
set search_path=pg_catalog
as $$
  select cardinality(values_in)=4
     and (select count(*) from unnest(values_in) v where v between 1 and 20)=4
     and (select count(distinct v) from unnest(values_in) v)=4
$$;

create table if not exists public.strategy_versions (
  id uuid primary key default gen_random_uuid(),
  strategy_key text not null,
  version text not null,
  status text not null default 'experimental'
    check (status in ('baseline','experimental','active','retired','negative_control')),
  engine_commit_sha text not null,
  engine_path text not null default 'supabase/functions/advance-lotoos-evidence/index.ts',
  config jsonb not null default '{}'::jsonb,
  config_hash text not null,
  notes text,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique(strategy_key,version)
);

create table if not exists public.experiment_manifests (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique,
  title text not null,
  hypothesis text not null,
  strategy_version_id uuid not null references public.strategy_versions(id),
  comparator_strategy_key text not null default 'random',
  primary_metric text not null default 'paired_mean_best_matches_delta',
  min_forward_draws integer not null default 1000 check (min_forward_draws>=1000),
  alpha numeric not null default 0.05 check (alpha>0 and alpha<1),
  multiple_testing_method text not null default 'BH' check (multiple_testing_method in ('BH','NONE')),
  ci_method text not null default 'bootstrap' check (ci_method in ('bootstrap','block_bootstrap')),
  bootstrap_resamples integer not null default 10000 check (bootstrap_resamples>=1000),
  frozen_config jsonb not null default '{}'::jsonb,
  frozen_config_hash text not null,
  status text not null default 'draft' check (status in ('draft','preregistered','completed','retired')),
  preregistered_at timestamptz,
  created_at timestamptz not null default now(),
  notes text
);

create table if not exists public.forward_runs (
  id uuid primary key default gen_random_uuid(),
  target_draw bigint not null,
  strategy_version_id uuid not null references public.strategy_versions(id),
  experiment_manifest_id uuid references public.experiment_manifests(id),
  training_cutoff bigint not null check (training_cutoff<target_draw),
  source_verified_through bigint not null check (source_verified_through<=training_cutoff),
  dataset_hash text not null,
  engine_commit_sha text not null,
  seed text not null,
  config_hash text not null,
  tickets_hash text not null,
  locked_at timestamptz not null,
  provenance text not null default 'native_supabase'
    check (provenance in ('native_supabase','imported_github_ledger','imported_legacy')),
  provenance_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(target_draw,strategy_version_id)
);

create table if not exists public.forward_tickets (
  run_id uuid not null references public.forward_runs(id) on delete restrict,
  ticket_index smallint not null check (ticket_index between 1 and 100),
  field1 smallint[] not null,
  field2 smallint[] not null,
  ticket_hash text not null,
  created_at timestamptz not null default now(),
  primary key(run_id,ticket_index),
  constraint forward_tickets_field1_valid check (public.lotoos_ticket_valid(field1)),
  constraint forward_tickets_field2_valid check (public.lotoos_ticket_valid(field2))
);

create table if not exists public.forward_settlements (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.forward_runs(id) on delete restrict,
  settlement_version integer not null default 1 check (settlement_version>=1),
  supersedes_id uuid references public.forward_settlements(id),
  settled_at timestamptz not null default now(),
  result_draw_number bigint not null references public.draws(draw_number),
  result_hash text not null,
  match_summary jsonb not null,
  any_prize boolean,
  ticket_cost_rub numeric,
  gross_payout_rub numeric,
  net_result_rub numeric,
  roi numeric,
  payout_coverage text not null default 'unavailable'
    check (payout_coverage in ('complete','partial','unavailable','counterfactual_unresolved')),
  payout_notes text,
  metadata jsonb not null default '{}'::jsonb,
  unique(run_id,settlement_version)
);

create table if not exists public.evidence_runs (
  id uuid primary key default gen_random_uuid(),
  experiment_manifest_id uuid not null references public.experiment_manifests(id),
  strategy_version_id uuid not null references public.strategy_versions(id),
  evaluation_start_draw bigint not null,
  evaluation_end_draw bigint not null check (evaluation_end_draw>=evaluation_start_draw),
  forward_draws integer not null check (forward_draws>=0),
  paired_delta_mean numeric,
  bootstrap_ci_low numeric,
  bootstrap_ci_high numeric,
  p_value numeric,
  q_value numeric,
  gate_status text not null
    check (gate_status in ('insufficient_forward','no_signal','positive_candidate','promoted','negative','blocked')),
  promoted boolean not null default false,
  dataset_hash text not null,
  engine_commit_sha text not null,
  metrics jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now()
);

create table if not exists public.evidence_events (
  id bigint generated by default as identity primary key,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.lotoos_reject_mutation()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  raise exception 'LotoOS evidence rows are append-only; mutation rejected for %.%',tg_table_schema,tg_table_name;
end $$;

create or replace function public.lotoos_guard_manifest_freeze()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  if old.preregistered_at is not null then raise exception 'Preregistered experiment manifests are immutable'; end if;
  return new;
end $$;

drop trigger if exists trg_forward_runs_immutable on public.forward_runs;
create trigger trg_forward_runs_immutable before update or delete on public.forward_runs
for each row execute function public.lotoos_reject_mutation();

drop trigger if exists trg_forward_tickets_immutable on public.forward_tickets;
create trigger trg_forward_tickets_immutable before update or delete on public.forward_tickets
for each row execute function public.lotoos_reject_mutation();

drop trigger if exists trg_forward_settlements_immutable on public.forward_settlements;
create trigger trg_forward_settlements_immutable before update or delete on public.forward_settlements
for each row execute function public.lotoos_reject_mutation();

drop trigger if exists trg_evidence_runs_immutable on public.evidence_runs;
create trigger trg_evidence_runs_immutable before update or delete on public.evidence_runs
for each row execute function public.lotoos_reject_mutation();

drop trigger if exists trg_evidence_events_immutable on public.evidence_events;
create trigger trg_evidence_events_immutable before update or delete on public.evidence_events
for each row execute function public.lotoos_reject_mutation();

drop trigger if exists trg_experiment_manifest_freeze on public.experiment_manifests;
create trigger trg_experiment_manifest_freeze before update or delete on public.experiment_manifests
for each row execute function public.lotoos_guard_manifest_freeze();

create index if not exists idx_forward_runs_target_draw on public.forward_runs(target_draw);
create index if not exists idx_forward_runs_strategy on public.forward_runs(strategy_version_id,target_draw);
create index if not exists idx_forward_runs_experiment on public.forward_runs(experiment_manifest_id) where experiment_manifest_id is not null;
create index if not exists idx_forward_settlements_run on public.forward_settlements(run_id,settlement_version desc);
create index if not exists idx_forward_settlements_result_draw on public.forward_settlements(result_draw_number);
create index if not exists idx_forward_settlements_supersedes on public.forward_settlements(supersedes_id) where supersedes_id is not null;
create index if not exists idx_evidence_runs_experiment on public.evidence_runs(experiment_manifest_id,calculated_at desc);
create index if not exists idx_evidence_runs_strategy on public.evidence_runs(strategy_version_id,calculated_at desc);
create index if not exists idx_experiment_manifests_strategy on public.experiment_manifests(strategy_version_id);
create index if not exists idx_ingestion_runs_source_started on public.ingestion_runs(source_key,started_at desc);

alter table public.strategy_versions enable row level security;
alter table public.experiment_manifests enable row level security;
alter table public.forward_runs enable row level security;
alter table public.forward_tickets enable row level security;
alter table public.forward_settlements enable row level security;
alter table public.evidence_runs enable row level security;
alter table public.evidence_events enable row level security;

revoke all on table public.strategy_versions,public.experiment_manifests,public.forward_runs,
  public.forward_tickets,public.forward_settlements,public.evidence_runs,public.evidence_events
from anon,authenticated;

grant select on table public.strategy_versions,public.experiment_manifests,public.forward_runs,
  public.forward_tickets,public.forward_settlements,public.evidence_runs
to anon,authenticated;

drop policy if exists "public read strategy versions" on public.strategy_versions;
create policy "public read strategy versions" on public.strategy_versions for select to anon,authenticated using(true);
drop policy if exists "public read experiment manifests" on public.experiment_manifests;
create policy "public read experiment manifests" on public.experiment_manifests for select to anon,authenticated using(true);
drop policy if exists "public read forward runs" on public.forward_runs;
create policy "public read forward runs" on public.forward_runs for select to anon,authenticated using(true);
drop policy if exists "public read forward tickets" on public.forward_tickets;
create policy "public read forward tickets" on public.forward_tickets for select to anon,authenticated using(true);
drop policy if exists "public read forward settlements" on public.forward_settlements;
create policy "public read forward settlements" on public.forward_settlements for select to anon,authenticated using(true);
drop policy if exists "public read evidence runs" on public.evidence_runs;
create policy "public read evidence runs" on public.evidence_runs for select to anon,authenticated using(true);
drop policy if exists "deny client evidence events" on public.evidence_events;
create policy "deny client evidence events" on public.evidence_events for select to anon,authenticated using(false);

revoke execute on function public.lotoos_reject_mutation() from public,anon,authenticated;
revoke execute on function public.lotoos_guard_manifest_freeze() from public,anon,authenticated;

update public.data_sources
set verification_meta = verification_meta || jsonb_build_object(
  'canonical_role',case when source_key='stoloto_official' then 'primary_truth' else 'secondary_reference' end
)
where enabled=true;
