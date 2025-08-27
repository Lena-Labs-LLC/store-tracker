// Global monitoring lock to prevent multiple concurrent executions
class MonitoringLock {
  constructor() {
    this.isLocked = false
    this.lockId = null
  }

  async acquire(requestId) {
    if (this.isLocked) {
      console.log(`🔒 [${requestId}] Monitoring is locked by ${this.lockId}, skipping`)
      return false
    }
    
    this.isLocked = true
    this.lockId = requestId
    console.log(`🔓 [${requestId}] Acquired monitoring lock`)
    return true
  }

  release(requestId) {
    if (this.lockId === requestId) {
      this.isLocked = false
      this.lockId = null
      console.log(`🔓 [${requestId}] Released monitoring lock`)
    } else {
      console.log(`⚠️ [${requestId}] Attempted to release lock owned by ${this.lockId}`)
    }
  }

  getStatus() {
    return {
      isLocked: this.isLocked,
      lockId: this.lockId
    }
  }
}

// Global singleton instance
let globalLock = null

export function getMonitoringLock() {
  if (!globalLock) {
    globalLock = new MonitoringLock()
    console.log('🆕 Created global monitoring lock')
  }
  return globalLock
}

export default MonitoringLock