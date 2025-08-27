// Test endpoint to see what happens when we create sessions
let Database, db;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const SupabaseDatabase = (await import('../../../lib/database-supabase.js')).default;
  Database = SupabaseDatabase;
  db = new Database();
} else if (process.env.VERCEL) {
  const VercelDatabase = (await import('../../../lib/database-vercel.js')).default;
  Database = VercelDatabase;
  db = new Database();
} else {
  Database = require('../../../src/database');
  db = new Database();
}

export default async function handler(req, res) {
  try {
    await db.initialize();
    
    // Get current session count
    const beforeCount = await db.all('SELECT COUNT(*) as count FROM monitoring_sessions');
    console.log('Sessions before test:', beforeCount);
    
    // Get min and max IDs
    const minMax = await db.all('SELECT MIN(id) as min_id, MAX(id) as max_id FROM monitoring_sessions');
    console.log('ID range before test:', minMax);
    
    // Create a test session
    const testSession = await db.createMonitoringSession(76); // Using store_id 76
    console.log('Created test session:', testSession);
    
    // Get count after
    const afterCount = await db.all('SELECT COUNT(*) as count FROM monitoring_sessions');
    console.log('Sessions after test:', afterCount);
    
    // Get new min and max IDs
    const newMinMax = await db.all('SELECT MIN(id) as min_id, MAX(id) as max_id FROM monitoring_sessions');
    console.log('ID range after test:', newMinMax);
    
    // Get the last 10 sessions to see the pattern
    const lastSessions = await db.all('SELECT id, store_id, started_at FROM monitoring_sessions ORDER BY id DESC LIMIT 10');
    console.log('Last 10 sessions:', lastSessions);
    
    res.json({
      beforeCount: beforeCount[0],
      afterCount: afterCount[0],
      minMaxBefore: minMax[0],
      minMaxAfter: newMinMax[0],
      testSession,
      lastSessions,
      analysis: {
        countChanged: afterCount[0].count !== beforeCount[0].count,
        idRangeChanged: newMinMax[0].max_id !== minMax[0].max_id,
        possibleIssues: []
      }
    });
    
  } catch (error) {
    console.error('Test session creation error:', error);
    res.status(500).json({ error: error.message });
  }
}