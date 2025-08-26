// Use different database implementations based on environment
let Database, db, storeMonitor;

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // Use Supabase database with real StoreMonitor
  const SupabaseDatabase = (await import('../../../../lib/database-supabase.js')).default;
  const StoreMonitor = require('../../../../src/storeMonitor');
  Database = SupabaseDatabase;
  db = new Database();
  
  // Create a wrapper for StoreMonitor to work with Supabase
  class SupabaseStoreMonitor extends StoreMonitor {
    constructor(database) {
      super(database);
    }
    
    async manualCheck(storeId) {
      try {
        // Get store info from Supabase
        const stores = await this.db.getStores();
        const store = stores.find(s => s.id == storeId);
        
        if (!store) {
          throw new Error('Store not found');
        }
        
        // Create monitoring session
        const session = await this.db.createMonitoringSession(storeId);
        
        let apps = [];
        
        // Use the actual scraping methods
        if (store.type === 'playstore') {
          apps = await this.scrapePlayStore(store.url);
        } else if (store.type === 'appstore') {
          apps = await this.scrapeAppStore(store.url);
        }
        
        let newAppsCount = 0;
        const existingApps = await this.db.getAppsForStore(store.id);
        const existingAppIds = new Set(existingApps.map(app => app.app_id));
        const newAppsFound = [];

        for (const app of apps) {
          if (!existingAppIds.has(app.id)) {
            await this.db.addApp(store.id, app.id, app.name, app.url);
            newAppsFound.push({
              app_id: app.id,
              name: app.name,
              url: app.url,
              discovered_at: new Date().toISOString()
            });
            newAppsCount++;
          }
        }
        
        // Update monitoring session with results
        await this.db.updateMonitoringSession(session.id, {
          apps_found: apps.length,
          new_apps_found: newAppsCount
        });
        
        // Update last checked
        await this.db.updateLastChecked(storeId);
        
        // Send webhook if new apps were found
        if (newAppsFound.length > 0) {
          try {
            await this.webhookService.sendNewApps(newAppsFound, store.name, store.type);
            console.log(`Webhook sent for ${newAppsFound.length} new apps from ${store.name}`);
          } catch (error) {
            console.error(`Webhook failed for store ${store.name}:`, error);
          }
        }
        
        console.log(`Store ${store.name}: Found ${apps.length} apps, ${newAppsCount} new`);
        
        return {
          totalApps: apps.length,
          newApps: newAppsCount,
          sessionId: session.id,
          newAppsData: newAppsFound
        };
        
      } catch (error) {
        console.error('Manual check error:', error);
        throw error;
      }
    }
  }
  
  storeMonitor = new SupabaseStoreMonitor(db);
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