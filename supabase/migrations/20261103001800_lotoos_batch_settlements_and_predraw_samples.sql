-- LotoOS P0: catch up only unsettled forward portfolios; never rewrite locks.
-- Forward primary comparison excludes records created after the draw and avoids retrospective re-locking.

CREATE OR REPLACE FUNCTION public.lotoos_settle_pending_batch(p_limit integer DEFAULT 250)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'p_limit must be between 1 and 500';
  end if;
  with candidates as materialized (
    select fr.id run_id,fr.target_draw,fr.locked_at,fr.created_at,
           d.draw_date,d.field1,d.field2,d.ticket_price_rub
    from public.forward_runs fr
    join public.draws d on d.draw_number=fr.target_draw
    where not exists (
      select 1 from public.forward_settlements fs where fs.run_id=fr.id
    )
    order by fr.target_draw,fr.id
    limit p_limit
  ),
  counts as (
    select c.run_id,c.target_draw,c.locked_at,c.created_at,c.draw_date,
           c.field1,c.field2,c.ticket_price_rub,ft.ticket_index,
           (select count(*)::integer from unnest(ft.field1) x where x=any(c.field1)) m1,
           (select count(*)::integer from unnest(ft.field2) x where x=any(c.field2)) m2
    from candidates c
    join public.forward_tickets ft on ft.run_id=c.run_id
  ),
  categories as (
    select x.*,
    case
      when greatest(m1,m2)=4 then
        case least(m1,m2) when 4 then 1 when 3 then 2 when 2 then 3 when 1 then 4 else 5 end
      when greatest(m1,m2)=3 then
        case least(m1,m2) when 3 then 6 when 2 then 7 when 1 then 8 else 9 end
      when greatest(m1,m2)=2 then
        case least(m1,m2) when 2 then 10 when 1 then 11 else 12 end
      else null
    end as category
    from counts x
  ),
  matched as (
    select c.*,p.winners_count,p.payout_per_winner_rub,
      (select count(*)::integer
       from public.draw_payouts q
       where q.draw_number=c.target_draw and q.category ~ '^(1[0-2]|[1-9])$') category_rows
    from categories c
    left join public.draw_payouts p
      on p.draw_number=c.target_draw and p.category=c.category::text
  ),
  rolled as (
    select
      run_id,target_draw,max(locked_at) locked_at,max(created_at) created_at,
      max(draw_date) draw_date,max(ticket_price_rub) ticket_price_rub,
      max(category_rows) category_rows,
      count(*) ticket_count,
      jsonb_agg(jsonb_build_object(
        'field1',m1,'field2',m2,'total',m1+m2,'category',category
      ) order by ticket_index) ticket_results,
      max(m1+m2) best_total,
      count(*) filter(where m1>=2 and m2>=2) balanced22_tickets,
      count(*) filter(where category is not null) winning_pattern_tickets,
      count(*) filter(where category is not null
        and (winners_count is null or winners_count<=0
        or payout_per_winner_rub is null or payout_per_winner_rub<=0)) unresolved_tickets,
      coalesce(sum(payout_per_winner_rub) filter(
        where category is not null and winners_count>0 and payout_per_winner_rub>0
      ),0)::numeric observed_gross
    from matched
    group by run_id,target_draw
    having count(*)=5
  ),
  finalized as (
    select r.*,
      (r.locked_at < r.draw_date and r.created_at < r.draw_date) as pre_draw_verified,
      case
        when r.ticket_price_rub is null or r.ticket_price_rub<=0 or r.category_rows=0
          then 'unavailable'
        when r.category_rows <> 12 then 'partial'
        when r.unresolved_tickets > 0 then 'counterfactual_unresolved'
        else 'complete'
      end payout_coverage
    from rolled r
  ),
  inserted as (
    insert into public.forward_settlements(
      run_id,settlement_version,result_draw_number,result_hash,
      match_summary,any_prize,ticket_cost_rub,gross_payout_rub,
      net_result_rub,roi,payout_coverage,payout_notes,metadata
    )
    select
      f.run_id,1,f.target_draw,
      encode(extensions.digest((f.target_draw::text||':'||f.ticket_results::text),'sha256'),'hex'),
      jsonb_build_object(
        'tickets',f.ticket_results,
        'best_total',f.best_total,
        'balanced22_tickets',f.balanced22_tickets,
        'winning_pattern_tickets',f.winning_pattern_tickets,
        'unresolved_counterfactual_tickets',f.unresolved_tickets
      ),
      f.winning_pattern_tickets>0,
      case when f.ticket_price_rub>0 then f.ticket_price_rub*f.ticket_count else null end,
      f.observed_gross,
      case when f.payout_coverage='complete'
        then f.observed_gross-f.ticket_price_rub*f.ticket_count else null end,
      case when f.payout_coverage='complete'
        then (f.observed_gross-f.ticket_price_rub*f.ticket_count)
             /nullif(f.ticket_price_rub*f.ticket_count,0)
        else null end,
      f.payout_coverage,
      case when f.payout_coverage='complete'
        then 'Published realized payout benchmark; not a prediction or counterfactual jackpot calculation.'
        else 'Counterfactual payout is unresolved or official category coverage is incomplete.' end,
      jsonb_build_object(
        'payout_rows',f.category_rows,
        'observed_gross_lower_bound_rub',f.observed_gross,
        'pre_draw_verified',f.pre_draw_verified,
        'settlement_engine','sql_batch_v1',
        'ticket_count',f.ticket_count
      )
    from finalized f
    on conflict(run_id,settlement_version) do nothing
    returning id
  )
  select count(*) into result_count from inserted;
  return result_count;
end $function$


CREATE OR REPLACE FUNCTION public.lotoos_forward_paired_samples(p_experiment_key text)
 RETURNS TABLE(target_draw bigint, candidate_best integer, baseline_best integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
select c.target_draw,
       (cs.match_summary->>'best_total')::integer candidate_best,
       (rs.match_summary->>'best_total')::integer baseline_best
from public.experiment_manifests m
join public.forward_runs c
  on c.experiment_manifest_id=m.id and c.strategy_version_id=m.strategy_version_id
join public.forward_runs r
  on r.target_draw=c.target_draw
join public.strategy_versions sv on sv.id=r.strategy_version_id
  and sv.strategy_key=m.comparator_strategy_key
join public.draws d on d.draw_number=c.target_draw
join lateral (
  select match_summary from public.forward_settlements
  where run_id=c.id order by settlement_version desc limit 1
) cs on true
join lateral (
  select match_summary from public.forward_settlements
  where run_id=r.id order by settlement_version desc limit 1
) rs on true
where m.experiment_key=p_experiment_key
  and m.status='preregistered'
  and m.preregistered_at is not null
  and c.provenance_verified and r.provenance_verified
  and c.provenance='native_supabase' and r.provenance='native_supabase'
  and c.target_draw=c.training_cutoff+1
  and r.target_draw=r.training_cutoff+1
  and c.source_verified_through=c.training_cutoff
  and r.source_verified_through=r.training_cutoff
  and c.locked_at>=m.preregistered_at
  and r.locked_at>=m.preregistered_at
  and c.locked_at<d.draw_date
  and r.locked_at<d.draw_date
  and c.created_at<d.draw_date
  and r.created_at<d.draw_date
  and (cs.match_summary->>'best_total') ~ '^[0-8]$'
  and (rs.match_summary->>'best_total') ~ '^[0-8]$'
order by c.target_draw;
$function$


revoke all on function public.lotoos_settle_pending_batch(integer) from public,anon,authenticated;
grant execute on function public.lotoos_settle_pending_batch(integer) to service_role;
revoke all on function public.lotoos_forward_paired_samples(text) from public,anon,authenticated;
grant execute on function public.lotoos_forward_paired_samples(text) to service_role;
