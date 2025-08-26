// Manual trigger for monitoring (useful for testing)
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await db.initialize();
    
    // Import StoreMonitor
    const StoreMonitor = require('../../../src/storeMonitor');
    const storeMonitor = new StoreMonitor(db);
    
    // Get all stores first for debugging
    const allStores = await db.getStores();
    console.log(`Total stores in database: ${allStores.length}`);
    console.log('All stores:', allStores.map(s => ({
      id: s.id,
      name: s.name,
      last_checked: s.last_checked,
      interval_value: s.check_interval_value,
      interval_unit: s.check_interval_unit
    })));
    
    // Get stores that need monitoring
    const stores = await db.getStoresForMonitoring();
    console.log(`Found ${stores.length} stores that need monitoring`);
    console.log('Stores for monitoring:', stores.map(s => ({
      id: s.id,
      name: s.name,
      last_checked: s.last_checked,
      interval_value: s.check_interval_value,
      interval_unit: s.check_interval_unit
    })));
    
    // TEMPORARY: If no stores found for monitoring but we have stores, force check all stores
    const storesToCheck = stores.length > 0 ? stores : allStores;
    console.log(`Will check ${storesToCheck.length} stores (forced: ${stores.length === 0 && allStores.length > 0})`);
    
    // Use storesToCheck instead of stores for the actual monitoring
    
    let checkedCount = 0;
    let totalNewApps = 0;
    const results = [];
    
    for (const store of storesToCheck) {
      try {
        console.log(`Checking store: ${store.name} (interval: ${store.check_interval_value || store.check_interval_hours} ${store.check_interval_unit || 'hours'})`);
        const result = await storeMonitor.checkStore(store);
        checkedCount++;
        totalNewApps += result.newApps;
        results.push({
          storeId: store.id,
          storeName: store.name,
          totalApps: result.totalApps,
          newApps: result.newApps
        });
      } catch (error) {
        console.error(`Error checking store ${store.name}:`, error);
        results.push({
          storeId: store.id,
          storeName: store.name,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Monitoring triggered successfully`,
      storesFound: stores.length,
      storesForced: stores.length === 0 && allStores.length > 0 ? allStores.length : 0,
      storesChecked: checkedCount,
      totalNewApps,
      results
    });
    
  } catch (error) {
    console.error('Manual monitoring trigger error:', error);
    res.status(500).json({ error: error.message });
  }
}