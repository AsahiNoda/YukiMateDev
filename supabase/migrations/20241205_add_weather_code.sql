-- Add weather_code column to weather_daily_cache table
-- WMO Weather interpretation codes (0-99)

ALTER TABLE weather_daily_cache
ADD COLUMN IF NOT EXISTS weather_code INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN weather_daily_cache.weather_code IS 'WMO Weather interpretation code (0-99). See: https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM';
