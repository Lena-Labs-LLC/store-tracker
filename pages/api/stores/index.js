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
      const stores = await db.getStores()
      // Ensure we always return an array
      res.json(Array.isArray(stores) ? stores : [])
    } catch (error) {
      console.error('Stores API error:', error)
      // Return empty array on error instead of error object
      res.json([])
    }
  } else if (req.method === 'POST') {
    try {
      const { name, url, checkInterval, intervalUnit } = req.body
      let StoreAnalyzer;
      try {
        StoreAnalyzer = require('../../../src/storeAnalyzer');
      } catch (error) {
        console.error('StoreAnalyzer import error:', error);
        return res.status(500).json({ error: 'StoreAnalyzer module not found' });
      }
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' })
      }

      // Validate and detect store type
      const validation = StoreAnalyzer.validateStoreUrl(url)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }

      const storeType = validation.storeType
      
      // Extract store name if not provided
      let storeName = name
      if (!storeName || storeName.trim() === '') {
        console.log('Extracting store name from URL...')
        storeName = await StoreAnalyzer.extractStoreName(url, storeType)
      }

      const result = await db.addStore(storeName, url, storeType, checkInterval || 24, intervalUnit || 'hours')
      res.json({ 
        id: result.id, 
        message: 'Store added successfully',
        detectedType: storeType,
        extractedName: storeName
      })
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Store URL already exists' })
      } else {
        res.status(500).json({ error: error.message })
      }
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}