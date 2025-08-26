// Vercel-compatible database implementation
// This is a temporary in-memory implementation for Vercel deployment
// In production, you should use a cloud database like PlanetScale, Supabase, or MongoDB

class VercelDatabase {
    constructor() {
        // In-memory storage (will reset on each deployment)
        // This is just for demo purposes - use a real database in production
        this.stores = [];
        this.apps = [];
        this.sessions = [];
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Add some sample data for demo
        this.stores = [
            {
                id: 1,
                name: 'Sample Play Store',
                url: 'https://play.google.com/store/apps/developer?id=Sample+Developer',
                type: 'playstore',
                check_interval_hours: 24,
                check_interval_value: 24,
                check_interval_unit: 'hours',
                last_checked: null,
                created_at: new Date().toISOString()
            }
        ];
        
        this.apps = [];
        this.sessions = [];
        this.initialized = true;
    }

    async run(query, params = []) {
        // Mock implementation for INSERT operations
        return { id: Math.floor(Math.random() * 1000), changes: 1 };
    }

    async get(query, params = []) {
        // Mock implementation - return first matching record
        if (query.includes('COUNT')) {
            return {
                total_stores: this.stores.length,
                total_apps: this.apps.length,
                total_sessions: this.sessions.length,
                new_apps_24h: 0
            };
        }
        return null;
    }

    async all(query, params = []) {
        if (query.includes('stores')) {
            return this.stores;
        }
        if (query.includes('apps')) {
            return this.apps;
        }
        if (query.includes('monitoring_sessions')) {
            return this.sessions;
        }
        return [];
    }

    // Store management
    async addStore(name, url, type, checkInterval = 24, intervalUnit = 'hours') {
        const intervalHours = this.convertToHours(checkInterval, intervalUnit);
        const id = this.stores.length + 1;
        const store = {
            id,
            name,
            url,
            type,
            check_interval_hours: intervalHours,
            check_interval_value: checkInterval,
            check_interval_unit: intervalUnit,
            last_checked: null,
            created_at: new Date().toISOString()
        };
        this.stores.push(store);
        return { id };
    }

    async getStores() {
        return this.stores;
    }

    async deleteStore(id) {
        this.stores = this.stores.filter(s => s.id !== parseInt(id));
        this.apps = this.apps.filter(a => a.store_id !== parseInt(id));
        return { changes: 1 };
    }

    async updateStoreInterval(id, value, unit = 'hours') {
        const hours = this.convertToHours(value, unit);
        const store = this.stores.find(s => s.id === parseInt(id));
        if (store) {
            store.check_interval_hours = hours;
            store.check_interval_value = value;
            store.check_interval_unit = unit;
        }
        return { changes: 1 };
    }

    // Helper method to convert different time units to hours
    convertToHours(value, unit) {
        switch (unit) {
            case 'seconds':
                return Math.max(0.0003, value / 3600); // Minimum 1 second = 0.0003 hours
            case 'minutes':
                return Math.max(0.017, value / 60); // Minimum 1 minute = 0.017 hours
            case 'hours':
                return value;
            case 'days':
                return value * 24;
            default:
                return value;
        }
    }

    // Monitoring
    async getStoresForMonitoring() {
        const now = new Date();
        
        return this.stores.filter(store => {
            if (!store.last_checked) {
                return true; // Never checked, should be monitored
            }
            
            const lastChecked = new Date(store.last_checked);
            const intervalValue = store.check_interval_value || store.check_interval_hours || 24;
            const intervalUnit = store.check_interval_unit || 'hours';
            
            // Calculate the next check time based on the interval
            let nextCheckTime;
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
                default:
                    // Fallback to hours
                    nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 60 * 60 * 1000));
            }
            
            return now >= nextCheckTime;
        });
    }

    async updateLastChecked(storeId) {
        const store = this.stores.find(s => s.id === parseInt(storeId));
        if (store) {
            store.last_checked = new Date().toISOString();
        }
        return { changes: 1 };
    }

    // Apps
    async addApp(storeId, appId, name, url) {
        const id = this.apps.length + 1;
        const app = {
            id,
            store_id: parseInt(storeId),
            app_id: appId,
            name,
            url,
            discovered_at: new Date().toISOString()
        };
        this.apps.push(app);
        return { id };
    }

    async getAppsForStore(storeId) {
        return this.apps.filter(app => app.store_id === parseInt(storeId));
    }

    async getNewApps(storeId, since) {
        const sinceDate = new Date(since);
        return this.apps.filter(app => 
            app.store_id === parseInt(storeId) && 
            new Date(app.discovered_at) > sinceDate
        );
    }
}

export default VercelDatabase;