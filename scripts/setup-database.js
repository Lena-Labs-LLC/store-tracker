// Setup script to initialize Supabase database
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('Setting up Supabase database...')

  try {
    // Create stores table
    const { error: storesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS stores (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL CHECK(type IN ('playstore', 'appstore')),
          check_interval_hours INTEGER DEFAULT 24,
          last_checked TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })

    if (storesError) {
      console.error('Error creating stores table:', storesError)
    } else {
      console.log('✅ Stores table created')
    }

    // Create apps table
    const { error: appsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS apps (
          id BIGSERIAL PRIMARY KEY,
          store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
          app_id TEXT NOT NULL,
          name TEXT NOT NULL,
          url TEXT,
          discovered_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(store_id, app_id)
        );
      `
    })

    if (appsError) {
      console.error('Error creating apps table:', appsError)
    } else {
      console.log('✅ Apps table created')
    }

    // Create monitoring_sessions table
    const { error: sessionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS monitoring_sessions (
          id BIGSERIAL PRIMARY KEY,
          store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
          apps_found INTEGER DEFAULT 0,
          new_apps_found INTEGER DEFAULT 0,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          status TEXT DEFAULT 'running'
        );
      `
    })

    if (sessionsError) {
      console.error('Error creating monitoring_sessions table:', sessionsError)
    } else {
      console.log('✅ Monitoring sessions table created')
    }

    // Insert sample data
    const { error: sampleError } = await supabase
      .from('stores')
      .upsert([
        {
          name: 'Sample Play Store Developer',
          url: 'https://play.google.com/store/apps/developer?id=Sample+Developer',
          type: 'playstore',
          check_interval_hours: 24
        },
        {
          name: 'Sample App Store Developer',
          url: 'https://apps.apple.com/developer/sample-developer/id123456789',
          type: 'appstore',
          check_interval_hours: 24
        }
      ], { onConflict: 'url' })

    if (sampleError) {
      console.error('Error inserting sample data:', sampleError)
    } else {
      console.log('✅ Sample data inserted')
    }

    console.log('🎉 Database setup completed successfully!')

  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

setupDatabase()