-- ⚠️ IMPORTANT: Execute this SQL in Supabase SQL Editor NOW! ⚠️
-- This will fix the missing weather_code column and RLS policies

-- 1. Add weather_code column if it doesn't exist
ALTER TABLE weather_daily_cache
ADD COLUMN IF NOT EXISTS weather_code INTEGER;

COMMENT ON COLUMN weather_daily_cache.weather_code IS 'WMO Weather interpretation code (0-99)';

-- 2. Fix RLS policies
DROP POLICY IF EXISTS "Allow public read access to weather cache" ON weather_daily_cache;
DROP POLICY IF EXISTS "Allow authenticated write access to weather cache" ON weather_daily_cache;
DROP POLICY IF EXISTS "Allow public write access to weather cache" ON weather_daily_cache;

-- Enable RLS
ALTER TABLE weather_daily_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read weather data
CREATE POLICY "Allow public read access to weather cache"
ON weather_daily_cache
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert/update weather data
CREATE POLICY "Allow authenticated write access to weather cache"
ON weather_daily_cache
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Clear old cache data to force refresh with new schema
DELETE FROM weather_daily_cache WHERE date < CURRENT_DATE;

-- Verification: Check if the column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weather_daily_cache'
AND column_name = 'weather_code';
