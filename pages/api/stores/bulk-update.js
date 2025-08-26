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

  if (req.method === 'PATCH') {
    try {
      const { storeIds, value, unit } = req.body;
      
      if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
        return res.status(400).json({ error: 'Store IDs array is required' });
      }
      
      if (!value || value <= 0) {
        return res.status(400).json({ error: 'Interval value must be a positive number' });
      }

      if (!unit || !['seconds', 'minutes', 'hours', 'days'].includes(unit)) {
        return res.status(400).json({ error: 'Unit must be seconds, minutes, hours, or days' });
      }

      // Update all selected stores
      let updatedCount = 0;
      for (const storeId of storeIds) {
        try {
          await db.updateStoreInterval(storeId, value, unit);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update store ${storeId}:`, error);
        }
      }

      res.json({ 
        message: `Updated ${updatedCount} of ${storeIds.length} stores successfully`,
        updatedCount,
        totalRequested: storeIds.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}