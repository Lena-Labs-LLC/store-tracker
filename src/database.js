const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
        
        // In-memory storage for serverless environments
        if (this.isServerless) {
            this.stores = [];
            this.apps = [];
            this.sessions = [];
            this.nextId = 1;
        }
    }

    async initialize() {
        if (this.isServerless) {
            // For serverless, just resolve immediately
            console.log('Using in-memory database for serverless environment');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('app_tracker.db', (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS stores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL CHECK(type IN ('playstore', 'appstore')),
                check_interval_hours INTEGER DEFAULT 24,
                last_checked DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS apps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER,
                app_id TEXT NOT NULL,
                name TEXT NOT NULL,
                url TEXT,
                discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (store_id) REFERENCES stores (id),
                UNIQUE(store_id, app_id)
            )`,
            `CREATE TABLE IF NOT EXISTS monitoring_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                store_id INTEGER,
                apps_found INTEGER DEFAULT 0,
                new_apps_found INTEGER DEFAULT 0,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                status TEXT DEFAULT 'running',
                FOREIGN KEY (store_id) REFERENCES stores (id)
            )`
        ];

        for (const query of queries) {
            await this.run(query);
        }
    }

    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Store management
    async addStore(name, url, type, checkInterval = 24) {
        if (this.isServerless) {
            const store = {
                id: this.nextId++,
                name,
                url,
                type,
                check_interval_hours: checkInterval,
                last_checked: null,
                created_at: new Date().toISOString()
            };
            this.stores.push(store);
            return { id: store.id, changes: 1 };
        }
        
        return this.run(
            'INSERT INTO stores (name, url, type, check_interval_hours) VALUES (?, ?, ?, ?)',
            [name, url, type, checkInterval]
        );
    }

    async getStores() {
        if (this.isServerless) {
            return [...this.stores].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        return this.all('SELECT * FROM stores ORDER BY created_at DESC');
    }

    async deleteStore(id) {
        if (this.isServerless) {
            this.apps = this.apps.filter(app => app.store_id !== id);
            this.stores = this.stores.filter(store => store.id !== id);
            return { changes: 1 };
        }
        
        await this.run('DELETE FROM apps WHERE store_id = ?', [id]);
        return this.run('DELETE FROM stores WHERE id = ?', [id]);
    }

    async updateStoreInterval(id, hours) {
        if (this.isServerless) {
            const store = this.stores.find(s => s.id === id);
            if (store) {
                store.check_interval_hours = hours;
                return { changes: 1 };
            }
            return { changes: 0 };
        }
        
        return this.run('UPDATE stores SET check_interval_hours = ? WHERE id = ?', [hours, id]);
    }

    // Monitoring
    async getStoresForMonitoring() {
        if (this.isServerless) {
            const now = new Date();
            return this.stores.filter(store => {
                if (!store.last_checked) return true;
                const lastChecked = new Date(store.last_checked);
                const nextCheck = new Date(lastChecked.getTime() + (store.check_interval_hours * 60 * 60 * 1000));
                return now >= nextCheck;
            });
        }
        
        const query = `
            SELECT * FROM stores 
            WHERE last_checked IS NULL 
            OR datetime(last_checked, '+' || check_interval_hours || ' hours') <= datetime('now')
        `;
        return this.all(query);
    }

    async updateLastChecked(storeId) {
        if (this.isServerless) {
            const store = this.stores.find(s => s.id === storeId);
            if (store) {
                store.last_checked = new Date().toISOString();
                return { changes: 1 };
            }
            return { changes: 0 };
        }
        
        return this.run('UPDATE stores SET last_checked = datetime("now") WHERE id = ?', [storeId]);
    }

    // Apps
    async addApp(storeId, appId, name, url) {
        if (this.isServerless) {
            const existing = this.apps.find(app => app.store_id === storeId && app.app_id === appId);
            if (existing) return { changes: 0 };
            
            const app = {
                id: this.nextId++,
                store_id: storeId,
                app_id: appId,
                name,
                url,
                discovered_at: new Date().toISOString()
            };
            this.apps.push(app);
            return { id: app.id, changes: 1 };
        }
        
        return this.run(
            'INSERT OR IGNORE INTO apps (store_id, app_id, name, url) VALUES (?, ?, ?, ?)',
            [storeId, appId, name, url]
        );
    }

    async getAppsForStore(storeId) {
        if (this.isServerless) {
            return this.apps
                .filter(app => app.store_id === storeId)
                .sort((a, b) => new Date(b.discovered_at) - new Date(a.discovered_at));
        }
        
        return this.all('SELECT * FROM apps WHERE store_id = ? ORDER BY discovered_at DESC', [storeId]);
    }

    async getNewApps(storeId, since) {
        if (this.isServerless) {
            return this.apps
                .filter(app => app.store_id === storeId && new Date(app.discovered_at) > new Date(since))
                .sort((a, b) => new Date(b.discovered_at) - new Date(a.discovered_at));
        }
        
        return this.all(
            'SELECT * FROM apps WHERE store_id = ? AND discovered_at > ? ORDER BY discovered_at DESC',
            [storeId, since]
        );
    }
}

module.exports = Database;