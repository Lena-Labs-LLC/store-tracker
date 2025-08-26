// Status endpoint to check monitoring system
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await db.initialize();
    
    // Get all stores
    const allStores = await db.getStores();
    
    // Get stores that need monitoring
    const storesForMonitoring = await db.getStoresForMonitoring();
    
    // Calculate next check times for each store
    const now = new Date();
    const storeStatus = allStores.map(store => {
      const intervalValue = store.check_interval_value || store.check_interval_hours || 24;
      const intervalUnit = store.check_interval_unit || 'hours';
      
      let nextCheckTime = null;
      let timeUntilNextCheck = null;
      
      if (store.last_checked) {
        const lastChecked = new Date(store.last_checked);
        
        switch (intervalUnit) {
          case 'seconds':
            nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 1000));
            break;
          case 'minutes':
            nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 60 * 1000));
            break;
          case 'hours':
            nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 60 * 60 * 1000));
            break;
          case 'days':
            nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 24 * 60 * 60 * 1000));
            break;
        }
        
        timeUntilNextCheck = Math.max(0, nextCheckTime.getTime() - now.getTime());
      }
      
      return {
        id: store.id,
        name: store.name,
        interval: `${intervalValue} ${intervalUnit}`,
        lastChecked: store.last_checked,
        nextCheckTime: nextCheckTime?.toISOString(),
        timeUntilNextCheck: timeUntilNextCheck ? Math.round(timeUntilNextCheck / 1000) : null,
        needsMonitoring: storesForMonitoring.some(s => s.id === store.id)
      };
    });
    
    // Check background service status
    let backgroundServiceStatus = null;
    try {
      if (!process.env.VERCEL) {
        const { getBackgroundService } = await import('../../../lib/backgroundService');
        const service = getBackgroundService();
        backgroundServiceStatus = service.getStatus();
      }
    } catch (error) {
      backgroundServiceStatus = { error: error.message };
    }
    
    res.json({
      totalStores: allStores.length,
      storesNeedingMonitoring: storesForMonitoring.length,
      backgroundService: backgroundServiceStatus,
      environment: {
        isVercel: !!process.env.VERCEL,
        hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV
      },
      stores: storeStatus
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
}