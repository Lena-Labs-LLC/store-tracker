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
    async addStore(name, url, type, checkInterval = 24) {
        const id = this.stores.length + 1;
        const store = {
            id,
            name,
            url,
            type,
            check_interval_hours: checkInterval,
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

    async updateStoreInterval(id, hours) {
        const store = this.stores.find(s => s.id === parseInt(id));
        if (store) {
            store.check_interval_hours = hours;
        }
        return { changes: 1 };
    }

    // Monitoring
    async getStoresForMonitoring() {
        return this.stores.filter(store => {
            if (!store.last_checked) return true;
            const lastChecked = new Date(store.last_checked);
            const now = new Date();
            const hoursSinceCheck = (now - lastChecked) / (1000 * 60 * 60);
            return hoursSinceCheck >= store.check_interval_hours;
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