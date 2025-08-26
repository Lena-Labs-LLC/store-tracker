-- Migration: Add time unit columns to stores table
-- Run this in your Supabase SQL Editor
-- Execute each statement one by one if needed

-- Step 1: Change check_interval_hours to support decimals (for minutes)
ALTER TABLE stores 
ALTER COLUMN check_interval_hours TYPE NUMERIC(10,4);

-- Step 2: Add the check_interval_value column
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS check_interval_value INTEGER DEFAULT 24;

-- Step 3: Add the check_interval_unit column  
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS check_interval_unit TEXT DEFAULT 'hours';

-- Step 4: Update existing records to populate the new columns
UPDATE stores 
SET 
    check_interval_value = check_interval_hours,
    check_interval_unit = 'hours'
WHERE 
    check_interval_value IS NULL 
    OR check_interval_unit IS NULL;

-- Step 5: Verify the migration worked
SELECT id, name, check_interval_hours, check_interval_value, check_interval_unit 
FROM stores 
LIMIT 5;