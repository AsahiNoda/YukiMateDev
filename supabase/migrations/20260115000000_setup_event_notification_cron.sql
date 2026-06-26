-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule event notification cron job
-- This job runs every hour to check for events that ended 6 hours ago
-- and sends post-event evaluation notifications to participants

SELECT cron.schedule(
  'schedule-event-notifications',     -- Job name
  '0 * * * *',                         -- Run every hour at minute 0 (Cron expression)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.api_url') || '/functions/v1/schedule-event-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Create settings table to store API URL and service role key
CREATE TABLE IF NOT EXISTS app.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Note: You need to manually insert the API URL and service role key:
-- INSERT INTO app.settings (key, value) VALUES
--   ('api_url', 'https://YOUR_PROJECT_REF.supabase.co'),
--   ('service_role_key', 'YOUR_SERVICE_ROLE_KEY');
