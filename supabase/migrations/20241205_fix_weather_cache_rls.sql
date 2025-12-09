-- Fix Row-Level Security policy for weather_daily_cache table
-- Allow users to insert/update weather data

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to weather cache" ON weather_daily_cache;
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

-- Alternative: If you want to allow anonymous users to write as well
-- CREATE POLICY "Allow public write access to weather cache"
-- ON weather_daily_cache
-- FOR ALL
-- TO public
-- USING (true)
-- WITH CHECK (true);
