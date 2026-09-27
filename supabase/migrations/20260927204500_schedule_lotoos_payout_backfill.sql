-- Gradually extend official payout coverage backward without hammering the upstream source.
do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='lotoos-payout-backfill';
  if j is not null then perform cron.unschedule(j); end if;
end $$;

select cron.schedule(
  'lotoos-payout-backfill',
  '27 * * * *',
  $$
    select net.http_post(
      url := 'https://oryuanpvbjxmnihmwbin.supabase.co/functions/v1/sync-lotoos-4x20',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-lotoos-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='lotoos_sync_token')
      ),
      body := jsonb_build_object('mode','payout_backfill_auto'),
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);
