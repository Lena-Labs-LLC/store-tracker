// Use different database implementations based on environment
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
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ error: 'Database initialization failed' });
  }

  if (req.method === 'GET') {
    try {
      const sessions = await db.all(`
        SELECT ms.*, s.name as store_name, s.type as store_type
        FROM monitoring_sessions ms
        JOIN stores s ON ms.store_id = s.id
        ORDER BY ms.started_at DESC
        LIMIT 50
      `)
      // Ensure we always return an array
      res.json(Array.isArray(sessions) ? sessions : [])
    } catch (error) {
      console.error('Sessions API error:', error)
      // Return empty array on error instead of error object
      res.json([])
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}