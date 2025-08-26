const cron = require('node-cron')
const Database = require('../src/database')
const StoreMonitor = require('../src/storeMonitor')

class BackgroundService {
  constructor() {
    this.db = new Database()
    this.storeMonitor = new StoreMonitor(this.db)
    this.isRunning = false
    this.cronJob = null
  }

  async start() {
    if (this.isRunning) {
      console.log('Background service is already running')
      return
    }

    try {
      await this.db.initialize()
      console.log('Database initialized for background service')
      
      // Start scheduled monitoring - check every minute
      this.cronJob = cron.schedule('* * * * *', async () => {
        try {
          const stores = await this.db.getStoresForMonitoring()
          for (const store of stores) {
            await this.storeMonitor.checkStore(store)
          }
        } catch (error) {
          console.error('Scheduled monitoring error:', error)
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
    backgroundService = new BackgroundService()
  }
  return backgroundService
}

export default BackgroundService