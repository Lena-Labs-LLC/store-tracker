const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function migrateTimeUnits() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables')
        process.exit(1)
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Starting migration to add time unit columns...')
    
    try {
        // Add the new columns to the stores table
        const { error: addValueError } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE stores ADD COLUMN IF NOT EXISTS check_interval_value INTEGER DEFAULT 24;'
        })
        
        if (addValueError) {
            console.error('Error adding check_interval_value column:', addValueError)
        } else {
            console.log('✓ Added check_interval_value column')
        }
        
        const { error: addUnitError } = await supabase.rpc('exec_sql', {
            sql: "ALTER TABLE stores ADD COLUMN IF NOT EXISTS check_interval_unit TEXT DEFAULT 'hours' CHECK(check_interval_unit IN ('minutes', 'hours', 'days'));"
        })
        
        if (addUnitError) {
            console.error('Error adding check_interval_unit column:', addUnitError)
        } else {
            console.log('✓ Added check_interval_unit column')
        }
        
        // Update existing records to have the new values
        const { error: updateError } = await supabase.rpc('exec_sql', {
            sql: `
                UPDATE stores 
                SET 
                    check_interval_value = check_interval_hours,
                    check_interval_unit = 'hours'
                WHERE 
                    check_interval_value IS NULL 
                    OR check_interval_unit IS NULL;
            `
        })
        
        if (updateError) {
            console.error('Error updating existing records:', updateError)
        } else {
            console.log('✓ Updated existing records with default values')
        }
        
        console.log('Migration completed successfully!')
        
    } catch (error) {
        console.error('Migration failed:', error)
        process.exit(1)
    }
}

migrateTimeUnits()