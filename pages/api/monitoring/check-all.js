// Use different database implementations based on environment
let Database, db, storeMonitor;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // Use Supabase database with real StoreMonitor
  const SupabaseDatabase = (await import('../../../lib/database-supabase.js')).default;
  const StoreMonitor = require('../../../src/storeMonitor');
  Database = SupabaseDatabase;
  db = new Database();
  
  // Create a wrapper for StoreMonitor to work with Supabase
  class SupabaseStoreMonitor extends StoreMonitor {
    constructor(database) {
      super(database);
    }
    
    async checkAllStores() {
      try {
        const stores = await this.db.getStores();
        
        if (stores.length === 0) {
          return {
            message: 'No stores to check',
            totalStores: 0,
            results: []
          };
        }
        
        const results = [];
        let totalApps = 0;
        let totalNewApps = 0;
        let successCount = 0;
        
        // Check all stores
        for (const store of stores) {
          try {
            const result = await this.manualCheck(store.id);
            results.push({
              storeId: store.id,
              storeName: store.name,
              success: true,
              ...result
            });
            totalApps += result.totalApps || 0;
            totalNewApps += result.newApps || 0;
            successCount++;
          } catch (error) {
            console.error(`Error checking store ${store.name}:`, error);
            results.push({
              storeId: store.id,
              storeName: store.name,
              success: false,
              error: error.message
            });
          }
        }
        
        return {
          message: `Checked ${successCount}/${stores.length} stores successfully`,
          totalStores: stores.length,
          successCount,
          totalApps,
          totalNewApps,
          results
        };
        
      } catch (error) {
        console.error('Check all stores error:', error);
        throw error;
      }
    }
  }
  
  storeMonitor = new SupabaseStoreMonitor(db);
} else if (process.env.VERCEL) {
  // Use Vercel-compatible in-memory database
  const VercelDatabase = (await import('../../../lib/database-vercel.js')).default;
  Database = VercelDatabase;
  db = new Database();
  // Mock store monitor for Vercel
  storeMonitor = {
    async checkAllStores() {
      return {
        message: 'Check all not implemented for Vercel',
        totalStores: 0,
        results: []
      };
    }
  };
} else {
  // Use SQLite for local development
  Database = require('../../../src/database');
  const StoreMonitor = require('../../../src/storeMonitor');
  db = new Database();
  storeMonitor = new StoreMonitor(db);
  
  // Add checkAllStores method to the original StoreMonitor
  storeMonitor.checkAllStores = async function() {
    try {
      const stores = await this.db.all('SELECT * FROM stores ORDER BY created_at DESC');
      
      if (stores.length === 0) {
        return {
          message: 'No stores to check',
          totalStores: 0,
          results: []
        };
      }
      
      const results = [];
      let totalApps = 0;
      let totalNewApps = 0;
      let successCount = 0;
      
      // Check all stores
      for (const store of stores) {
        try {
          const result = await this.checkStore(store);
          results.push({
            storeId: store.id,
            storeName: store.name,
            success: true,
            ...result
          });
          totalApps += result.totalApps || 0;
          totalNewApps += result.newApps || 0;
          successCount++;
        } catch (error) {
          console.error(`Error checking store ${store.name}:`, error);
          results.push({
            storeId: store.id,
            storeName: store.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        message: `Checked ${successCount}/${stores.length} stores successfully`,
        totalStores: stores.length,
        successCount,
        totalApps,
        totalNewApps,
        results
      };
      
    } catch (error) {
      console.error('Check all stores error:', error);
      throw error;
    }
  };
}

export default async function handler(req, res) {
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ error: 'Database initialization failed' });
  }

  if (req.method === 'POST') {
    try {
      const result = await storeMonitor.checkAllStores();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}