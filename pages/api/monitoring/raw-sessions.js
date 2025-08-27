// Direct database query to get ALL sessions - no fancy stuff
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await db.initialize();
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    console.log('RAW Sessions API - Getting ALL sessions directly from database');
    
    // Get ALL sessions with the most basic query possible
    // Try different approaches to get all 1,676 sessions
    let allSessionsRaw;
    
    // Method 1: Try with explicit LIMIT
    try {
      allSessionsRaw = await db.all(`SELECT * FROM monitoring_sessions ORDER BY id DESC LIMIT 2000`);
      console.log('RAW Sessions API - Method 1 (LIMIT 2000):', allSessionsRaw.length, 'sessions');
    } catch (error) {
      console.log('Method 1 failed:', error.message);
    }
    
    // Method 2: If still limited, try without ORDER BY
    if (!allSessionsRaw || allSessionsRaw.length < 100) {
      try {
        allSessionsRaw = await db.all(`SELECT * FROM monitoring_sessions LIMIT 2000`);
        console.log('RAW Sessions API - Method 2 (no ORDER BY):', allSessionsRaw.length, 'sessions');
      } catch (error) {
        console.log('Method 2 failed:', error.message);
      }
    }
    
    // Method 3: If using Supabase, try their specific pagination
    if (!allSessionsRaw || allSessionsRaw.length < 100) {
      try {
        if (db.supabase) {
          const { data, error } = await db.supabase
            .from('monitoring_sessions')
            .select('*')
            .order('id', { ascending: false })
            .limit(2000);
          if (!error) {
            allSessionsRaw = data;
            console.log('RAW Sessions API - Method 3 (Supabase direct):', allSessionsRaw.length, 'sessions');
          }
        }
      } catch (error) {
        console.log('Method 3 failed:', error.message);
      }
    }
    
    // Fallback
    if (!allSessionsRaw) {
      allSessionsRaw = await db.all(`SELECT * FROM monitoring_sessions ORDER BY id DESC`);
    }
    
    console.log('RAW Sessions API - Final count:', allSessionsRaw.length, 'total sessions');
    
    // Get store names in a separate query to avoid JOIN issues
    const stores = await db.all(`SELECT id, name, type FROM stores`);
    const storeMap = {};
    stores.forEach(store => {
      storeMap[store.id] = { name: store.name, type: store.type };
    });
    
    // Add store info to sessions
    const allSessions = allSessionsRaw.map(session => ({
      ...session,
      store_name: storeMap[session.store_id]?.name || 'Unknown Store',
      store_type: storeMap[session.store_id]?.type || 'unknown'
    }));
    
    // Manual pagination
    const total = allSessions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = allSessions.slice(startIndex, endIndex);
    
    console.log('RAW Sessions API - Total:', total, 'Pages:', totalPages, 'Returning:', paginatedSessions.length);
    
    res.json({
      sessions: paginatedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      debug: {
        rawCount: allSessionsRaw.length,
        storesCount: stores.length,
        query: 'SELECT * FROM monitoring_sessions ORDER BY id DESC'
      }
    });
    
  } catch (error) {
    console.error('RAW Sessions API error:', error);
    res.status(500).json({ 
      error: error.message,
      sessions: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
    });
  }
}