// Simple monitoring service using setInterval instead of cron
class SimpleMonitoringService {
  constructor() {
    this.intervalId = null
    this.isRunning = false
    this.instanceId = Math.random().toString(36).substr(2, 9)
    console.log(`🏗️ SimpleMonitoringService instance created: ${this.instanceId}`)
  }

  start(intervalMinutes = 2) {
    if (this.isRunning) {
      console.log(`⚠️ [${this.instanceId}] Simple monitoring is already running`)
      return
    }

    console.log(`🚀 [${this.instanceId}] Starting simple monitoring every ${intervalMinutes} minutes`)
    
    // Call immediately once
    this.checkStores()
    
    // Then set up interval
    this.intervalId = setInterval(() => {
      this.checkStores()
    }, intervalMinutes * 60 * 1000)
    
    this.isRunning = true
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log(`🛑 [${this.instanceId}] Simple monitoring stopped`)
  }

  async checkStores() {
    try {
      console.log(`🔄 [${this.instanceId}] Calling auto-check endpoint`)
      
      // Call our auto-check endpoint
      const response = await fetch('http://localhost:3000/api/monitoring/auto-check', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log(`✅ [${this.instanceId}] Auto-check completed: ${result.storesChecked} stores checked, ${result.totalNewApps} new apps`)
      } else {
        console.error(`❌ [${this.instanceId}] Auto-check failed:`, result.error)
      }
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Error calling auto-check:`, error.message)
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.intervalId,
      instanceId: this.instanceId
    }
  }
}

// Singleton instance
let simpleService = null

export function getSimpleMonitoringService() {
  if (!simpleService) {
    console.log('🆕 Creating new SimpleMonitoringService instance')
    simpleService = new SimpleMonitoringService()
  } else {
    console.log('♻️ Reusing existing SimpleMonitoringService instance')
  }
  return simpleService
}

export default SimpleMonitoringService