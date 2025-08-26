import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [stats, setStats] = useState({})
  const [stores, setStores] = useState([])
  const [sessions, setSessions] = useState([])
  const [newApps, setNewApps] = useState([])
  const [formData, setFormData] = useState({
    storeName: '',
    storeUrl: '',
    checkInterval: 24
  })
  const [storePreview, setStorePreview] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    // Initialize the app and background service
    const initApp = async () => {
      try {
        await fetch('/api/init', { method: 'POST' })
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }
    
    initApp()
    loadStats()
    loadStores()
    loadSessions()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadStats()
      loadSessions()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const showAlert = (message, type) => {
    const id = Date.now()
    setAlerts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id))
    }, 5000)
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/monitoring/stats')
      const data = await response.json()
      setStats(data || {})
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats({}) // Set empty object on error
    }
  }

  const loadStores = async () => {
    try {
      const response = await fetch('/api/stores')
      const data = await response.json()
      // Ensure data is always an array
      setStores(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading stores:', error)
      setStores([]) // Set empty array on error
    }
  }

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/monitoring/sessions')
      const data = await response.json()
      // Ensure data is always an array
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      setSessions([]) // Set empty array on error
    }
  }

  const handleUrlChange = async (url) => {
    setFormData(prev => ({ ...prev, storeUrl: url }))
    
    if (url && isValidUrl(url)) {
      try {
        const response = await fetch('/api/stores/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        const result = await response.json()
        
        if (response.ok) {
          setStorePreview({ type: 'success', ...result })
          if (!formData.storeName.trim()) {
            setFormData(prev => ({ ...prev, storeName: result.extractedName }))
          }
        } else {
          setStorePreview({ type: 'error', error: result.error })
        }
      } catch (error) {
        setStorePreview(null)
      }
    } else {
      setStorePreview(null)
    }
  }

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.storeUrl) {
      showAlert('Store URL is required', 'danger')
      return
    }

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.storeName || null,
          url: formData.storeUrl,
          checkInterval: parseInt(formData.checkInterval)
        })
      })

      const result = await response.json()

      if (response.ok) {
        setFormData({ storeName: '', storeUrl: '', checkInterval: 24 })
        setStorePreview(null)
        loadStores()
        loadStats()
        showAlert('Store added successfully!', 'success')
      } else {
        showAlert(result.error, 'danger')
      }
    } catch (error) {
      showAlert('Error adding store', 'danger')
    }
  }

  const checkStore = async (id) => {
    try {
      showAlert('Checking store...', 'info')
      
      const response = await fetch(`/api/monitoring/check/${id}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        loadStores()
        loadStats()
        loadSessions()
        showAlert(`Check completed! Found ${result.totalApps} apps, ${result.newApps} new`, 'success')
      } else {
        showAlert(result.error, 'danger')
      }
    } catch (error) {
      showAlert('Error checking store', 'danger')
    }
  }

  const checkAllStores = async () => {
    if (stores.length === 0) {
      showAlert('No stores to check', 'warning')
      return
    }

    try {
      showAlert(`Checking all ${stores.length} stores...`, 'info')
      
      const response = await fetch('/api/monitoring/check-all', {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh data
        loadStores()
        loadStats()
        loadSessions()
        
        const alertType = result.successCount === result.totalStores ? 'success' : 'warning'
        showAlert(
          `${result.message}. Found ${result.totalApps || 0} total apps, ${result.totalNewApps || 0} new apps.`,
          alertType
        )
      } else {
        showAlert(result.error || 'Error checking all stores', 'danger')
      }
    } catch (error) {
      showAlert('Error checking all stores', 'danger')
    }
  }

  const deleteStore = async (id) => {
    if (!confirm('Are you sure you want to delete this store? This will also delete all associated apps.')) {
      return
    }

    try {
      const response = await fetch(`/api/stores/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadStores()
        loadStats()
        showAlert('Store deleted successfully!', 'success')
      } else {
        showAlert('Error deleting store', 'danger')
      }
    } catch (error) {
      showAlert('Error deleting store', 'danger')
    }
  }

  const testWebhook = async () => {
    try {
      showAlert('Testing webhook...', 'info')
      
      const response = await fetch('/api/webhook/test', {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        showAlert('Webhook test sent successfully! Check your Slack channel.', 'success')
      } else {
        showAlert(`Webhook test failed: ${result.error}`, 'danger')
      }
    } catch (error) {
      showAlert('Error testing webhook', 'danger')
    }
  }

  return (
    <>
      <Head>
        <title>App Store Tracker</title>
        <meta name="description" content="Track and monitor new apps in app stores" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Alerts */}
      <div className="position-fixed" style={{ top: '20px', right: '20px', zIndex: 9999 }}>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type} alert-dismissible fade show mb-2`} style={{ minWidth: '300px' }}>
            {alert.message}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            ></button>
          </div>
        ))}
      </div>

      <nav className="navbar navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand mb-0 h1">
            <i className="fas fa-mobile-alt me-2"></i>App Store Tracker
          </span>
        </div>
      </nav>

      <div className="container mt-4">
        {/* Stats Row */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <div className="card-body text-center">
                <h3>{stats.total_stores || 0}</h3>
                <p className="mb-0">Total Stores</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <div className="card-body text-center">
                <h3>{stats.total_apps || 0}</h3>
                <p className="mb-0">Total Apps</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <div className="card-body text-center">
                <h3>{stats.total_sessions || 0}</h3>
                <p className="mb-0">Total Checks</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <div className="card-body text-center">
                <h3 className="new-apps-badge">{stats.new_apps_24h || 0}</h3>
                <p className="mb-0">New Apps (24h)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Store Form */}
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0"><i className="fas fa-plus me-2"></i>Add New Store</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-3">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Store Name (optional)"
                    value={formData.storeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                  />
                </div>
                <div className="col-md-5">
                  <input 
                    type="url" 
                    className="form-control" 
                    placeholder="Store URL (auto-detects type)" 
                    required
                    value={formData.storeUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                  />
                  {storePreview && (
                    <div className={`small mt-1 ${storePreview.type === 'error' ? 'text-danger' : 'text-success'}`}>
                      <i className="fas fa-info-circle"></i> 
                      {storePreview.type === 'error' ? (
                        ` ❌ ${storePreview.error}`
                      ) : (
                        ` ${storePreview.storeType === 'playstore' ? '🤖' : '🍎'} Detected: ${storePreview.storeType.toUpperCase()} - "${storePreview.extractedName}"`
                      )}
                    </div>
                  )}
                </div>
                <div className="col-md-3">
                  <div className="input-group">
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="24" 
                      min="1"
                      value={formData.checkInterval}
                      onChange={(e) => setFormData(prev => ({ ...prev, checkInterval: e.target.value }))}
                    />
                    <span className="input-group-text">hours</span>
                  </div>
                </div>
                <div className="col-md-1">
                  <button type="submit" className="btn btn-primary w-100">
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Stores List */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0"><i className="fas fa-store me-2"></i>Monitored Stores</h5>
            <div>
              <button 
                className="btn btn-success btn-sm me-2" 
                onClick={checkAllStores} 
                disabled={stores.length === 0}
                title={stores.length === 0 ? 'No stores to check' : `Check all ${stores.length} stores`}
              >
                <i className="fas fa-play"></i> Check All
              </button>
              <button className="btn btn-warning btn-sm me-2" onClick={testWebhook}>
                <i className="fas fa-bell"></i> Test Webhook
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={loadStores}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row">
              {stores.length === 0 ? (
                <div className="col-12">
                  <p className="text-muted text-center">No stores added yet</p>
                </div>
              ) : (
                stores.map(store => (
                  <div key={store.id} className="col-md-6 col-lg-4 mb-3">
                    <div className="card store-card h-100" style={{ transition: 'transform 0.2s' }}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="card-title mb-0">{store.name}</h6>
                          <span className={`badge bg-${store.type === 'playstore' ? 'success' : 'primary'}`}>
                            <i className={`fab fa-${store.type === 'playstore' ? 'google-play' : 'app-store-ios'}`}></i> {store.type}
                          </span>
                        </div>
                        <p className="card-text small text-muted mb-2">{store.url}</p>
                        <div className="row text-center mb-3">
                          <div className="col-6">
                            <small className="text-muted">Check Every</small>
                            <div><strong>{store.check_interval_hours}h</strong></div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Last Checked</small>
                            <div><small>{store.last_checked ? new Date(store.last_checked).toLocaleString() : 'Never'}</small></div>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => checkStore(store.id)}>
                            <i className="fas fa-sync-alt"></i> Check Now
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteStore(store.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="card mt-4">
          <div className="card-header">
            <h5 className="mb-0"><i className="fas fa-history me-2"></i>Recent Monitoring Sessions</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Apps Found</th>
                    <th>New Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-muted text-center">No monitoring sessions yet</td>
                    </tr>
                  ) : (
                    sessions.slice(0, 10).map(session => (
                      <tr key={session.id}>
                        <td>{session.store_name}</td>
                        <td>{new Date(session.started_at).toLocaleString()}</td>
                        <td>
                          <span className={`badge bg-${session.status === 'completed' ? 'success' : 'warning'}`}>
                            {session.status}
                          </span>
                        </td>
                        <td>{session.apps_found || 0}</td>
                        <td><strong>{session.new_apps_found || 0}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .store-card:hover {
          transform: translateY(-2px);
        }
        .new-apps-badge {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  )
}