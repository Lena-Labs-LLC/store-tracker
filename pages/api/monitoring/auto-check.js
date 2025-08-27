// Auto-check endpoint that can be called by external cron services
// This prevents multiple internal cron jobs from running

let isRunning = false;
let lastRun = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Prevent concurrent executions
  if (isRunning) {
    return res.json({
      message: 'Monitoring already in progress',
      isRunning: true,
      lastRun
    });
  }

  // Prevent too frequent calls (minimum 30 seconds between calls)
  if (lastRun && (Date.now() - lastRun) < 30000) {
    return res.json({
      message: 'Too frequent calls, minimum 30 seconds between runs',
      isRunning: false,
      lastRun: new Date(lastRun).toISOString(),
      nextAllowedRun: new Date(lastRun + 30000).toISOString()
    });
  }

  isRunning = true;
  const startTime = Date.now();
  lastRun = startTime;

  try {
    // Initialize database
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

    await db.initialize();

    // Get stores that need monitoring
    const stores = await db.getStoresForMonitoring();
    console.log(`🔄 Auto-check: Found ${stores.length} stores that need monitoring`);

    if (stores.length === 0) {
      return res.json({
        message: 'No stores need monitoring at this time',
        storesChecked: 0,
        totalNewApps: 0,
        duration: Date.now() - startTime
      });
    }

    // Initialize StoreMonitor
    const StoreMonitor = require('../../../src/storeMonitor');
    const storeMonitor = new StoreMonitor(db);

    let checkedCount = 0;
    let totalNewApps = 0;
    const results = [];

    // Check each store
    for (const store of stores) {
      try {
        console.log(`🏪 Auto-check: Checking store ${store.name}`);
        const result = await storeMonitor.checkStore(store);
        checkedCount++;
        totalNewApps += result.newApps;
        results.push({
          storeId: store.id,
          storeName: store.name,
          totalApps: result.totalApps,
          newApps: result.newApps
        });
        console.log(`✅ Auto-check: Store ${store.name} checked: ${result.totalApps} apps, ${result.newApps} new`);
      } catch (error) {
        console.error(`❌ Auto-check: Error checking store ${store.name}:`, error);
        results.push({
          storeId: store.id,
          storeName: store.name,
          error: error.message
        });
      }
    }

    res.json({
      message: `Auto-check completed successfully`,
      storesFound: stores.length,
      storesChecked: checkedCount,
      totalNewApps,
      duration: Date.now() - startTime,
      results
    });

  } catch (error) {
    console.error('❌ Auto-check error:', error);
    res.status(500).json({ 
      error: error.message,
      duration: Date.now() - startTime
    });
  } finally {
    isRunning = false;
  }
}