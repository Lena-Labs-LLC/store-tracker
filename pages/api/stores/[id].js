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
  
  const { id } = req.query

  if (req.method === 'DELETE') {
    try {
      await db.deleteStore(id)
      res.json({ message: 'Store deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { value, unit, studioTag } = req.body
      const hasIntervalUpdate = value !== undefined || unit !== undefined
      const hasTagUpdate = studioTag !== undefined

      if (!hasIntervalUpdate && !hasTagUpdate) {
        return res.status(400).json({ error: 'No store updates provided' })
      }

      if (hasIntervalUpdate) {
        if (!value || value <= 0) {
          return res.status(400).json({ error: 'Interval value must be a positive number' })
        }

        if (!unit || !['seconds', 'minutes', 'hours', 'days'].includes(unit)) {
          return res.status(400).json({ error: 'Unit must be seconds, minutes, hours, or days' })
        }

        await db.updateStoreInterval(id, value, unit)
      }

      if (hasTagUpdate) {
        if (typeof studioTag !== 'string' && studioTag !== null) {
          return res.status(400).json({ error: 'Studio tag must be a string' })
        }

        if (!db.updateStoreTag) {
          return res.status(500).json({ error: 'Store tag updates are not supported by this database' })
        }

        await db.updateStoreTag(id, studioTag)
      }

      res.json({ message: 'Store updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PATCH'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
