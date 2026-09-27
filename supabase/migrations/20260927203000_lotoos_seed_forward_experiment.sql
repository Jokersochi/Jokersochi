-- Seed immutable strategy versions and the primary preregistered forward experiment.
-- Generated IDs are intentionally resolved by subquery; none are hardcoded.

insert into public.strategy_versions
  (strategy_key,version,status,engine_commit_sha,engine_path,config,config_hash,notes)
values
  ('adaptive20','3.0.0','experimental','c2aba54b303877d96c682f50b79996ec95558b2a',
   'supabase/functions/advance-lotoos-evidence/index.ts',
   '{"ticket_count":5,"lookback":500,"coverage":"full_1_20","score":"z_plus_overdue_ratio","allocation":"snake_5x4"}'::jsonb,
   encode(digest(('{"ticket_count":5,"lookback":500,"coverage":"full_1_20","score":"z_plus_overdue_ratio","allocation":"snake_5x4"}'::jsonb)::text,'sha256'),'hex'),
   'Forward-only candidate; history changes allocation, not number inclusion.'),
  ('balanced20','1.0.0','baseline','c2aba54b303877d96c682f50b79996ec95558b2a',
   'supabase/functions/advance-lotoos-evidence/index.ts',
   '{"ticket_count":5,"coverage":"full_1_20","history_used":false,"permutation_a":{"shift":0,"step":7},"permutation_b":{"shift":3,"step":9}}'::jsonb,
   encode(digest(('{"ticket_count":5,"coverage":"full_1_20","history_used":false,"permutation_a":{"shift":0,"step":7},"permutation_b":{"shift":3,"step":9}}'::jsonb)::text,'sha256'),'hex'),
   'Deterministic full-coverage structural baseline.'),
  ('random','1.0.0','baseline','c2aba54b303877d96c682f50b79996ec95558b2a',
   'supabase/functions/advance-lotoos-evidence/index.ts',
   '{"ticket_count":5,"rng":"mulberry32","seed":"sha256(target_draw:strategy:engine_release)","without_replacement_within_ticket":true}'::jsonb,
   encode(digest(('{"ticket_count":5,"rng":"mulberry32","seed":"sha256(target_draw:strategy:engine_release)","without_replacement_within_ticket":true}'::jsonb)::text,'sha256'),'hex'),
   'Deterministic random comparator for paired forward evaluation.')
on conflict(strategy_key,version) do nothing;

with ids as (
  select
    (select id from public.strategy_versions where strategy_key='adaptive20' and version='3.0.0' order by created_at desc limit 1) adaptive_id,
    (select id from public.strategy_versions where strategy_key='random' and version='1.0.0' order by created_at desc limit 1) random_id
),
cfg as (
  select jsonb_build_object(
    'strategy','adaptive20@3.0.0','comparator','random@1.0.0','ticket_count',5,
    'primary_metric','paired_best_total_matches_delta','forward_only',true,'no_backfill',true,
    'min_forward_draws',1000,'alpha',0.05,'ci_method','bootstrap','bootstrap_resamples',10000,
    'multiple_testing','BH','hypothesis_family','production_primary_v1'
  ) j
)
insert into public.experiment_manifests
  (experiment_key,title,hypothesis,strategy_version_id,comparator_strategy_key,primary_metric,
   min_forward_draws,alpha,multiple_testing_method,ci_method,bootstrap_resamples,
   frozen_config,frozen_config_hash,status,preregistered_at,notes)
select
  'adaptive20_v3_vs_random_v1_forward_primary',
  'Adaptive20 v3 vs Random v1 — preregistered forward primary',
  'On draws locked before their results, Adaptive20 v3 has a positive paired mean delta in best total matches per five-ticket portfolio versus deterministic Random v1.',
  ids.adaptive_id,'random','paired_best_total_matches_delta',1000,0.05,'BH','bootstrap',10000,
  cfg.j,encode(digest(cfg.j::text,'sha256'),'hex'),'preregistered',now(),
  'Historical walk-forward results do not count toward this gate.'
from ids,cfg
where ids.adaptive_id is not null and ids.random_id is not null
on conflict(experiment_key) do nothing;
