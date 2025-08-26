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
      const stats = await db.get(`
        SELECT 
          COUNT(DISTINCT s.id) as total_stores,
          COUNT(DISTINCT a.id) as total_apps,
          COUNT(DISTINCT ms.id) as total_sessions,
          SUM(CASE WHEN ms.started_at > datetime('now', '-24 hours') THEN ms.new_apps_found ELSE 0 END) as new_apps_24h
        FROM stores s
        LEFT JOIN apps a ON s.id = a.store_id
        LEFT JOIN monitoring_sessions ms ON s.id = ms.store_id
      `)
      res.json(stats)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}