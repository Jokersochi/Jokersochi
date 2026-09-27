-- Run forward evidence shortly after the canonical 10-minute ingestion schedule.

do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='lotoos-forward-evidence';
  if j is not null then perform cron.unschedule(j); end if;
end $$;

select cron.schedule(
  'lotoos-forward-evidence',
  '2,12,22,32,42,52 * * * *',
  $$
    select net.http_post(
      url := 'https://oryuanpvbjxmnihmwbin.supabase.co/functions/v1/advance-lotoos-evidence',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-lotoos-sync-token',(select decrypted_secret from vault.decrypted_secrets where name='lotoos_sync_token')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);
