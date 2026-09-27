-- Strategy definitions are evidence-bearing and immutable after registration.
drop trigger if exists trg_strategy_versions_immutable on public.strategy_versions;
create trigger trg_strategy_versions_immutable
before update or delete on public.strategy_versions
for each row execute function public.lotoos_reject_mutation();

comment on table public.strategy_versions is
  'Append-only registry. Publish a new version instead of mutating an existing strategy definition.';
