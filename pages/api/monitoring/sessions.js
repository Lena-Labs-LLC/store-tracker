// Use different database implementations based on environment
let Database, db;

if (process.env.VERCEL) {
  // Use Vercel-compatible database
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
      res.json(sessions)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}