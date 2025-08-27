// Debug endpoint to check sessions count
let Database, db;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // Use Supabase database
  const SupabaseDatabase = (await import('../../../lib/database-supabase.js')).default;
  Database = SupabaseDatabase;
  db = new Database();
} else if (process.env.VERCEL) {
  // Use Vercel-compatible in-memory database
  const VercelDatabase = (await import('../../../lib/database-vercel.js')).default;
  Database = VercelDatabase;
  db = new Database();
} else {
  // Use SQLite for local development
  Database = require('../../../src/database');
  db = new Database();
}

export default async function handler(req, res) {
  try {
    await db.initialize();
    
    // Test different queries
    const results = {};
    
    // Check if monitoring_sessions table exists
    try {
      const tableCheck = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='monitoring_sessions'");
      results.tableExists = tableCheck.length > 0;
    } catch (error) {
      results.tableExists = false;
      results.tableError = error.message;
    }
    
    // Check total sessions count
    try {
      const totalSessions = await db.all('SELECT COUNT(*) as count FROM monitoring_sessions');
      results.totalSessionsCount = totalSessions[0]?.count || 0;
    } catch (error) {
      results.totalSessionsError = error.message;
    }
    
    // Check if stores table exists and has data
    try {
      const storesCount = await db.all('SELECT COUNT(*) as count FROM stores');
      results.storesCount = storesCount[0]?.count || 0;
    } catch (error) {
      results.storesError = error.message;
    }
    
    // Try the join query
    try {
      const joinQuery = await db.all(`
        SELECT COUNT(*) as count
        FROM monitoring_sessions ms
        JOIN stores s ON ms.store_id = s.id
      `);
      results.joinQueryCount = joinQuery[0]?.count || 0;
    } catch (error) {
      results.joinQueryError = error.message;
    }
    
    // Get some sample sessions
    try {
      const sampleSessions = await db.all('SELECT * FROM monitoring_sessions LIMIT 5');
      results.sampleSessions = sampleSessions;
    } catch (error) {
      results.sampleSessionsError = error.message;
    }
    
    res.json(results);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}