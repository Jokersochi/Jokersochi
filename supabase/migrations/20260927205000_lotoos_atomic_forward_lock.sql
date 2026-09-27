-- Pre-draw run metadata and its five tickets must be committed atomically.
create or replace function public.lotoos_lock_forward_run(p_run jsonb, p_tickets jsonb)
returns table(run_id uuid, created boolean)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_id uuid;
  v_target bigint := (p_run->>'target_draw')::bigint;
  v_strategy uuid := (p_run->>'strategy_version_id')::uuid;
  v_count integer;
begin
  if jsonb_typeof(p_tickets) <> 'array' or jsonb_array_length(p_tickets) <> 5 then
    raise exception 'Forward lock requires exactly five tickets';
  end if;

  insert into public.forward_runs (
    target_draw,strategy_version_id,experiment_manifest_id,training_cutoff,
    source_verified_through,dataset_hash,engine_commit_sha,seed,config_hash,
    tickets_hash,locked_at,provenance,provenance_verified,metadata
  ) values (
    v_target,v_strategy,nullif(p_run->>'experiment_manifest_id','')::uuid,
    (p_run->>'training_cutoff')::bigint,(p_run->>'source_verified_through')::bigint,
    p_run->>'dataset_hash',p_run->>'engine_commit_sha',p_run->>'seed',
    p_run->>'config_hash',p_run->>'tickets_hash',(p_run->>'locked_at')::timestamptz,
    coalesce(p_run->>'provenance','native_supabase'),
    coalesce((p_run->>'provenance_verified')::boolean,false),
    coalesce(p_run->'metadata','{}'::jsonb)
  )
  on conflict (target_draw,strategy_version_id) do nothing
  returning id into v_id;

  if v_id is null then
    select fr.id into v_id
    from public.forward_runs fr
    where fr.target_draw=v_target and fr.strategy_version_id=v_strategy;

    if v_id is null then raise exception 'Forward run conflict could not be resolved'; end if;

    if exists (
      select 1 from public.forward_runs fr
      where fr.id=v_id and (
        fr.tickets_hash is distinct from p_run->>'tickets_hash'
        or fr.config_hash is distinct from p_run->>'config_hash'
        or fr.engine_commit_sha is distinct from p_run->>'engine_commit_sha'
        or fr.dataset_hash is distinct from p_run->>'dataset_hash'
        or fr.training_cutoff is distinct from (p_run->>'training_cutoff')::bigint
      )
    ) then
      raise exception 'Existing forward lock conflicts with deterministic regeneration';
    end if;

    select count(*) into v_count from public.forward_tickets ft where ft.run_id=v_id;
    if v_count <> 5 then raise exception 'Existing forward run is incomplete: % tickets',v_count; end if;
    return query select v_id,false;
    return;
  end if;

  insert into public.forward_tickets(run_id,ticket_index,field1,field2,ticket_hash)
  select
    v_id,
    (t->>'ticket_index')::smallint,
    array(select (jsonb_array_elements_text(t->'field1'))::smallint),
    array(select (jsonb_array_elements_text(t->'field2'))::smallint),
    t->>'ticket_hash'
  from jsonb_array_elements(p_tickets) as x(t);

  select count(*) into v_count from public.forward_tickets ft where ft.run_id=v_id;
  if v_count <> 5 then raise exception 'Atomic forward lock produced % tickets instead of 5',v_count; end if;

  return query select v_id,true;
end;
$$;

revoke execute on function public.lotoos_lock_forward_run(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.lotoos_lock_forward_run(jsonb,jsonb) to service_role;
