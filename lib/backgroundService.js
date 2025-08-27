const cron = require('node-cron')
import { getMonitoringLock } from './monitoring-lock.js'

class BackgroundService {
  constructor() {
    this.db = null
    this.storeMonitor = null
    this.isRunning = false
    this.cronJob = null

    this.instanceId = Math.random().toString(36).substr(2, 9)
    console.log(`🏗️ BackgroundService instance created: ${this.instanceId}`)
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Background service is already running, skipping start')
      return
    }

    if (this.cronJob) {
      console.log('⚠️ Cron job already exists, stopping it first')
      this.cronJob.stop()
      this.cronJob = null
    }

    try {
      // Initialize the correct database implementation
      let Database, db;

      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Use Supabase database
        const SupabaseDatabase = (await import('../lib/database-supabase.js')).default;
        Database = SupabaseDatabase;
        db = new Database();
      } else if (process.env.VERCEL) {
        // Use Vercel-compatible in-memory database
        const VercelDatabase = (await import('../lib/database-vercel.js')).default;
        Database = VercelDatabase;
        db = new Database();
      } else {
        // Use SQLite for local development
        Database = require('../src/database');
        db = new Database();
      }

      await db.initialize();
      this.db = db;
      
      // Initialize StoreMonitor with the correct database
      const StoreMonitor = require('../src/storeMonitor');
      this.storeMonitor = new StoreMonitor(this.db);
      
      console.log('Database initialized for background service')
      
      // Start scheduled monitoring - check every minute
      this.cronJob = cron.schedule('* * * * *', async () => {
        const requestId = `${this.instanceId}-${Date.now()}`
        
        console.log(`🔄 [${requestId}] Background monitoring check started at:`, new Date().toISOString())
        
        try {
          // Use database-based locking by checking if any monitoring is currently running
          const { data: runningSessions } = await this.db.supabase
            .from('monitoring_sessions')
            .select('id')
            .eq('status', 'running')
            .gte('started_at', new Date(Date.now() - 60000).toISOString()) // Within last minute
          
          if (runningSessions && runningSessions.length > 0) {
            console.log(`⏳ [${requestId}] Found ${runningSessions.length} running sessions, skipping this cycle`)
            return
          }
          
          const stores = await this.db.getStoresForMonitoring()
          console.log(`📊 [${requestId}] Found ${stores.length} stores that need monitoring`)
          
          for (const store of stores) {
            console.log(`🏪 [${requestId}] Checking store: ${store.name}`)
            const result = await this.storeMonitor.checkStore(store)
            console.log(`✅ [${requestId}] Store ${store.name} checked: ${result.totalApps} apps, ${result.newApps} new`)
          }
          
          if (stores.length === 0) {
            console.log(`ℹ️ [${requestId}] No stores need monitoring at this time`)
          }
        } catch (error) {
          console.error(`❌ [${requestId}] Scheduled monitoring error:`, error)
        } finally {
          console.log(`✨ [${requestId}] Background monitoring check completed at:`, new Date().toISOString())
        }
      }, {
        scheduled: false // Don't start immediately
      })

      this.cronJob.start()
      this.isRunning = true
      console.log('Background monitoring service started')
    } catch (error) {
      console.error('Failed to start background service:', error)
      throw error
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
    }
    this.isRunning = false
    console.log('Background monitoring service stopped')
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasJob: !!this.cronJob
    }
  }
}

// Singleton instance
let backgroundService = null

export function getBackgroundService() {
  if (!backgroundService) {
    console.log('🆕 Creating new BackgroundService instance')
    backgroundService = new BackgroundService()
  } else {
    console.log('♻️ Reusing existing BackgroundService instance')
  }
  return backgroundService
}

export default BackgroundService