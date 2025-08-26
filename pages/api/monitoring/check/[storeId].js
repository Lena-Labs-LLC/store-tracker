// Use different database implementations based on environment
let Database, db, storeMonitor;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // Use Supabase database
  const SupabaseDatabase = (await import('../../../../lib/database-supabase.js')).default;
  Database = SupabaseDatabase;
  db = new Database();
  // Mock store monitor for Supabase (for now)
  storeMonitor = {
    async manualCheck(storeId) {
      return {
        totalApps: 0,
        newApps: 0,
        sessionId: Math.floor(Math.random() * 1000)
      };
    }
  };
} else if (process.env.VERCEL) {
  // Use Vercel-compatible in-memory database
  const VercelDatabase = (await import('../../../../lib/database-vercel.js')).default;
  Database = VercelDatabase;
  db = new Database();
  // Mock store monitor for Vercel
  storeMonitor = {
    async manualCheck(storeId) {
      return {
        totalApps: 0,
        newApps: 0,
        sessionId: Math.floor(Math.random() * 1000)
      };
    }
  };
} else {
  // Use SQLite for local development
  Database = require('../../../../src/database');
  const StoreMonitor = require('../../../../src/storeMonitor');
  db = new Database();
  storeMonitor = new StoreMonitor(db);
}

export default async function handler(req, res) {
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ error: 'Database initialization failed' });
  }
  
  const { storeId } = req.query

  if (req.method === 'POST') {
    try {
      const result = await storeMonitor.manualCheck(storeId)
      res.json({
        message: 'Store checked successfully',
        ...result
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}