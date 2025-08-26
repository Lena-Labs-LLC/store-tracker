class AppTracker {
    constructor() {
        this.newApps = [];
        this.init();
    }

    init() {
        this.loadStats();
        this.loadStores();
        this.loadSessions();
        this.setupEventListeners();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.loadStats();
            this.loadSessions();
        }, 30000);
    }

    setupEventListeners() {
        document.getElementById('addStoreForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStore();
        });

        // Add URL preview functionality
        const urlInput = document.getElementById('storeUrl');
        let previewTimeout;
        
        urlInput.addEventListener('input', (e) => {
            clearTimeout(previewTimeout);
            const url = e.target.value.trim();
            
            if (url && this.isValidUrl(url)) {
                previewTimeout = setTimeout(() => {
                    this.previewStore(url);
                }, 1000); // Wait 1 second after user stops typing
            } else {
                this.hidePreview();
            }
        });
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async previewStore(url) {
        try {
            const response = await fetch('/api/stores/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const result = await response.json();

            if (response.ok) {
                this.showPreview(result.storeType, result.extractedName);
                
                // Auto-fill store name if empty
                const nameInput = document.getElementById('storeName');
                if (!nameInput.value.trim()) {
                    nameInput.value = result.extractedName;
                }
            } else {
                this.showPreview('error', result.error);
            }
        } catch (error) {
            this.hidePreview();
        }
    }

    showPreview(type, text) {
        const preview = document.getElementById('storePreview');
        const previewText = document.getElementById('previewText');
        
        if (type === 'error') {
            preview.className = 'small text-danger mt-1';
            previewText.innerHTML = `❌ ${text}`;
        } else {
            preview.className = 'small text-success mt-1';
            const typeIcon = type === 'playstore' ? '🤖' : '🍎';
            previewText.innerHTML = `${typeIcon} Detected: ${type.toUpperCase()} - "${text}"`;
        }
        
        preview.style.display = 'block';
    }

    hidePreview() {
        document.getElementById('storePreview').style.display = 'none';
    }

    async loadStats() {
        try {
            const response = await fetch('/api/monitoring/stats');
            const stats = await response.json();
            
            document.getElementById('totalStores').textContent = stats.total_stores || 0;
            document.getElementById('totalApps').textContent = stats.total_apps || 0;
            document.getElementById('totalSessions').textContent = stats.total_sessions || 0;
            document.getElementById('newApps24h').textContent = stats.new_apps_24h || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadStores() {
        try {
            const response = await fetch('/api/stores');
            const stores = await response.json();
            
            const storesList = document.getElementById('storesList');
            storesList.innerHTML = '';

            if (stores.length === 0) {
                storesList.innerHTML = '<div class="col-12"><p class="text-muted text-center">No stores added yet</p></div>';
                return;
            }

            stores.forEach(store => {
                const storeCard = this.createStoreCard(store);
                storesList.appendChild(storeCard);
            });
        } catch (error) {
            console.error('Error loading stores:', error);
        }
    }

    createStoreCard(store) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-3';

        const lastChecked = store.last_checked 
            ? new Date(store.last_checked).toLocaleString()
            : 'Never';

        const typeIcon = store.type === 'playstore' ? 'fab fa-google-play' : 'fab fa-app-store-ios';
        const typeColor = store.type === 'playstore' ? 'success' : 'primary';

        col.innerHTML = `
            <div class="card store-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${store.name}</h6>
                        <span class="badge bg-${typeColor}">
                            <i class="${typeIcon}"></i> ${store.type}
                        </span>
                    </div>
                    <p class="card-text small text-muted mb-2">${store.url}</p>
                    <div class="row text-center mb-3">
                        <div class="col-6">
                            <small class="text-muted">Check Every</small>
                            <div><strong>${store.check_interval_hours}h</strong></div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Last Checked</small>
                            <div><small>${lastChecked}</small></div>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill" onclick="app.checkStore(${store.id})">
                            <i class="fas fa-sync-alt"></i> Check Now
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="app.viewApps(${store.id}, '${store.name}')">
                            <i class="fas fa-list"></i> Apps
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteStore(${store.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return col;
    }

    async addStore() {
        const name = document.getElementById('storeName').value.trim();
        const url = document.getElementById('storeUrl').value.trim();
        const checkInterval = document.getElementById('checkInterval').value || 24;

        if (!url) {
            this.showAlert('Store URL is required', 'danger');
            return;
        }

        try {
            const response = await fetch('/api/stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    name: name || null, 
                    url, 
                    checkInterval: parseInt(checkInterval) 
                })
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('addStoreForm').reset();
                this.loadStores();
                this.loadStats();
                this.showAlert('Store added successfully!', 'success');
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Error adding store', 'danger');
        }
    }

    async deleteStore(id) {
        if (!confirm('Are you sure you want to delete this store? This will also delete all associated apps.')) {
            return;
        }

        try {
            const response = await fetch(`/api/stores/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadStores();
                this.loadStats();
                this.showAlert('Store deleted successfully!', 'success');
            } else {
                this.showAlert('Error deleting store', 'danger');
            }
        } catch (error) {
            this.showAlert('Error deleting store', 'danger');
        }
    }

    async checkStore(id) {
        try {
            this.showAlert('Checking store...', 'info');
            
            const response = await fetch(`/api/monitoring/check/${id}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                this.loadStores();
                this.loadStats();
                this.loadSessions();
                
                // Load new apps if any were found
                if (result.newApps > 0) {
                    await this.loadNewAppsForStore(id, result.sessionId);
                }
                
                this.showAlert(`Check completed! Found ${result.totalApps} apps, ${result.newApps} new`, 'success');
            } else {
                this.showAlert(result.error, 'danger');
            }
        } catch (error) {
            this.showAlert('Error checking store', 'danger');
        }
    }

    async checkAllStores() {
        try {
            // Show loading overlay
            this.showCheckingOverlay();
            
            const storesResponse = await fetch('/api/stores');
            const stores = await storesResponse.json();
            
            if (stores.length === 0) {
                this.hideCheckingOverlay();
                this.showAlert('No stores to check', 'warning');
                return;
            }

            let totalNewApps = 0;
            let completedChecks = 0;
            
            // Check all stores in parallel
            const checkPromises = stores.map(async (store) => {
                try {
                    const response = await fetch(`/api/monitoring/check/${store.id}`, {
                        method: 'POST'
                    });
                    const result = await response.json();
                    
                    if (response.ok && result.newApps > 0) {
                        await this.loadNewAppsForStore(store.id, result.sessionId);
                        totalNewApps += result.newApps;
                    }
                    
                    completedChecks++;
                    return result;
                } catch (error) {
                    console.error(`Error checking store ${store.name}:`, error);
                    completedChecks++;
                    return null;
                }
            });

            await Promise.all(checkPromises);
            
            this.hideCheckingOverlay();
            this.loadStores();
            this.loadStats();
            this.loadSessions();
            
            this.showAlert(`All stores checked! ${completedChecks} stores processed, ${totalNewApps} new apps found`, 'success');
            
        } catch (error) {
            this.hideCheckingOverlay();
            this.showAlert('Error checking all stores', 'danger');
        }
    }

    async loadNewAppsForStore(storeId, sessionId) {
        try {
            const response = await fetch(`/api/stores/${storeId}/apps`);
            const allApps = await response.json();
            
            // Get store info
            const storesResponse = await fetch('/api/stores');
            const stores = await storesResponse.json();
            const store = stores.find(s => s.id === storeId);
            
            // Get apps from the last session (new apps)
            const recentApps = allApps.filter(app => {
                const appTime = new Date(app.discovered_at);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                return appTime > fiveMinutesAgo;
            });
            
            if (recentApps.length > 0) {
                recentApps.forEach(app => {
                    this.newApps.push({
                        ...app,
                        storeName: store.name,
                        storeType: store.type
                    });
                });
                
                this.displayNewApps();
            }
        } catch (error) {
            console.error('Error loading new apps:', error);
        }
    }

    displayNewApps() {
        const newAppsSection = document.getElementById('newAppsSection');
        const newAppsList = document.getElementById('newAppsList');
        
        if (this.newApps.length === 0) {
            newAppsSection.style.display = 'none';
            return;
        }
        
        newAppsSection.style.display = 'block';
        newAppsList.innerHTML = '';
        
        // Group apps by store
        const appsByStore = {};
        this.newApps.forEach(app => {
            if (!appsByStore[app.storeName]) {
                appsByStore[app.storeName] = [];
            }
            appsByStore[app.storeName].push(app);
        });
        
        Object.keys(appsByStore).forEach(storeName => {
            const storeApps = appsByStore[storeName];
            const storeType = storeApps[0].storeType;
            const typeIcon = storeType === 'playstore' ? 'fab fa-google-play' : 'fab fa-app-store-ios';
            const typeColor = storeType === 'playstore' ? 'success' : 'primary';
            
            const storeSection = document.createElement('div');
            storeSection.className = 'mb-4';
            storeSection.innerHTML = `
                <h6 class="mb-3">
                    <span class="badge bg-${typeColor} me-2">
                        <i class="${typeIcon}"></i> ${storeName}
                    </span>
                    ${storeApps.length} new app${storeApps.length > 1 ? 's' : ''}
                </h6>
            `;
            
            storeApps.forEach(app => {
                const appItem = document.createElement('div');
                appItem.className = 'new-app-item';
                appItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${app.name}</h6>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                Discovered: ${new Date(app.discovered_at).toLocaleString()}
                            </small>
                        </div>
                        <div class="ms-3">
                            <a href="${app.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-external-link-alt"></i> View
                            </a>
                        </div>
                    </div>
                `;
                storeSection.appendChild(appItem);
            });
            
            newAppsList.appendChild(storeSection);
        });
    }

    clearNewApps() {
        this.newApps = [];
        this.displayNewApps();
    }

    showCheckingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'checkingOverlay';
        overlay.className = 'checking-overlay';
        overlay.innerHTML = `
            <div class="text-center text-white">
                <div class="spinner-border mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <h5>Checking all stores...</h5>
                <p>This may take a few moments</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideCheckingOverlay() {
        const overlay = document.getElementById('checkingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    async viewApps(storeId, storeName) {
        try {
            const response = await fetch(`/api/stores/${storeId}/apps`);
            const apps = await response.json();

            let appsHtml = `
                <div class="modal fade" id="appsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Apps in ${storeName}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
            `;

            if (apps.length === 0) {
                appsHtml += '<p class="text-muted">No apps found yet</p>';
            } else {
                appsHtml += '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Name</th><th>Discovered</th><th>Link</th></tr></thead><tbody>';
                apps.forEach(app => {
                    appsHtml += `
                        <tr>
                            <td>${app.name}</td>
                            <td>${new Date(app.discovered_at).toLocaleString()}</td>
                            <td><a href="${app.url}" target="_blank" class="btn btn-sm btn-outline-primary">View</a></td>
                        </tr>
                    `;
                });
                appsHtml += '</tbody></table></div>';
            }

            appsHtml += `
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('appsModal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.insertAdjacentHTML('beforeend', appsHtml);
            const modal = new bootstrap.Modal(document.getElementById('appsModal'));
            modal.show();
        } catch (error) {
            this.showAlert('Error loading apps', 'danger');
        }
    }

    async loadSessions() {
        try {
            const response = await fetch('/api/monitoring/sessions');
            const sessions = await response.json();
            
            const tbody = document.getElementById('sessionsTable');
            tbody.innerHTML = '';

            if (sessions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center">No monitoring sessions yet</td></tr>';
                return;
            }

            sessions.slice(0, 10).forEach(session => {
                const row = document.createElement('tr');
                const statusBadge = session.status === 'completed' ? 'success' : 'warning';
                const startedAt = new Date(session.started_at).toLocaleString();
                
                row.innerHTML = `
                    <td>${session.store_name}</td>
                    <td>${startedAt}</td>
                    <td><span class="badge bg-${statusBadge}">${session.status}</span></td>
                    <td>${session.apps_found || 0}</td>
                    <td><strong>${session.new_apps_found || 0}</strong></td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    async testWebhook() {
        try {
            this.showAlert('Testing webhook...', 'info');
            
            const response = await fetch('/api/webhook/test', {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                this.showAlert('Webhook test sent successfully! Check your Slack channel.', 'success');
            } else {
                this.showAlert(`Webhook test failed: ${result.error}`, 'danger');
            }
        } catch (error) {
            this.showAlert('Error testing webhook', 'danger');
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the app
const app = new AppTracker();

// Make loadStores available globally for the refresh button
window.loadStores = () => app.loadStores();