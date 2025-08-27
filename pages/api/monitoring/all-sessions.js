// Simple API to get ALL sessions with working pagination
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
    
    console.log('All-Sessions API - Requested page:', page, 'limit:', limit);
    
    // Get ALL sessions first, then handle pagination in JavaScript
    // Try without JOIN first to see if that's the issue
    let allSessions;
    try {
      allSessions = await db.all(`
        SELECT ms.*, s.name as store_name, s.type as store_type
        FROM monitoring_sessions ms
        LEFT JOIN stores s ON ms.store_id = s.id
        ORDER BY ms.started_at DESC
      `);
    } catch (error) {
      console.log('JOIN query failed, trying without JOIN:', error.message);
      // Fallback: get sessions without store info first
      allSessions = await db.all(`
        SELECT * FROM monitoring_sessions 
        ORDER BY started_at DESC
      `);
      
      // Add store info manually
      for (let session of allSessions) {
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
    
    console.log('All-Sessions API - Total sessions found:', allSessions.length);
    
    // Handle pagination manually
    const total = allSessions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = allSessions.slice(startIndex, endIndex);
    
    console.log('All-Sessions API - Returning sessions:', paginatedSessions.length, 'of', total);
    
    res.json({
      sessions: paginatedSessions,
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
    console.error('All-Sessions API error:', error);
    res.status(500).json({ 
      error: error.message,
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
}