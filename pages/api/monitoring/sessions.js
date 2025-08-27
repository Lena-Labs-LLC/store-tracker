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
  console.log('Sessions API - Database type:', db.constructor.name);
  console.log('Sessions API - Environment:', {
    SUPABASE: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    VERCEL: !!process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV
  });
  
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ error: 'Database initialization failed' });
  }

  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      console.log('Sessions API - page:', page, 'limit:', limit, 'offset:', offset); // Debug log

      // Get total count - handle different database implementations
      let total = 0;
      try {
        const countResult = await db.get(`SELECT COUNT(*) as total FROM monitoring_sessions`);
        total = countResult?.total || countResult?.count || 0;
        console.log('Sessions API - count result:', countResult);
      } catch (error) {
        console.log('Count query failed, trying alternative:', error.message);
        // Try alternative for different database implementations
        try {
          const allSessions = await db.all(`SELECT id FROM monitoring_sessions`);
          total = allSessions.length;
          console.log('Sessions API - alternative count:', total);
        } catch (altError) {
          console.log('Alternative count also failed:', altError.message);
          total = 0;
        }
      }
      console.log('Sessions API - final total count:', total);

      // Get paginated sessions - handle different database implementations
      let sessions = [];
      try {
        sessions = await db.all(`
          SELECT ms.*, 
                 COALESCE(s.name, 'Deleted Store') as store_name, 
                 COALESCE(s.type, 'unknown') as store_type
          FROM monitoring_sessions ms
          LEFT JOIN stores s ON ms.store_id = s.id
          ORDER BY ms.started_at DESC
          LIMIT ? OFFSET ?
        `, [limit, offset]);
      } catch (error) {
        console.log('JOIN query failed, trying simple query:', error.message);
        // Try simple query without JOIN for different database implementations
        try {
          sessions = await db.all(`
            SELECT * FROM monitoring_sessions 
            ORDER BY started_at DESC 
            LIMIT ? OFFSET ?
          `, [limit, offset]);
          
          // If sessions have store_name already (from previous queries), use them as-is
          // Otherwise, try to get store info separately
          if (sessions.length > 0 && !sessions[0].store_name) {
            for (let session of sessions) {
              try {
                const store = await db.get(`SELECT name, type FROM stores WHERE id = ?`, [session.store_id]);
                session.store_name = store?.name || 'Unknown Store';
                session.store_type = store?.type || 'unknown';
              } catch (storeError) {
                session.store_name = 'Unknown Store';
                session.store_type = 'unknown';
              }
            }
          }
        } catch (simpleError) {
          console.log('Simple query also failed:', simpleError.message);
          sessions = [];
        }
      }
      
      console.log('Sessions API - sessions returned:', sessions.length);

      const totalPages = Math.ceil(total / limit);
      console.log('Sessions API - totalPages:', totalPages); // Debug log

      res.json({
        sessions: Array.isArray(sessions) ? sessions : [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Sessions API error:', error);
      // Return empty result on error
      res.json({
        sessions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}