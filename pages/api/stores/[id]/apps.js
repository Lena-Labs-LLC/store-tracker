// Use different database implementations based on environment
let Database, db;

if (process.env.VERCEL) {
  // Use Vercel-compatible database
  const VercelDatabase = (await import('../../../../lib/database-vercel.js')).default;
  Database = VercelDatabase;
  db = new Database();
} else {
  // Use SQLite for local development
  Database = require('../../../../src/database');
  db = new Database();
}

export default async function handler(req, res) {
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ error: 'Database initialization failed' });
  }
  
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const apps = await db.getAppsForStore(id)
      res.json(apps)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}