const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    async initialize() {
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
                check_interval_hours REAL DEFAULT 24,
                check_interval_value INTEGER DEFAULT 24,
                check_interval_unit TEXT DEFAULT 'hours' CHECK(check_interval_unit IN ('seconds', 'minutes', 'hours', 'days')),
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
        
        // Migration: Add new columns if they don't exist
        await this.migrateTimeUnits();
    }

    async migrateTimeUnits() {
        try {
            // Check if new columns exist
            const tableInfo = await this.all("PRAGMA table_info(stores)");
            const hasIntervalValue = tableInfo.some(col => col.name === 'check_interval_value');
            const hasIntervalUnit = tableInfo.some(col => col.name === 'check_interval_unit');
            
            if (!hasIntervalValue) {
                await this.run('ALTER TABLE stores ADD COLUMN check_interval_value INTEGER DEFAULT 24');
                // Copy existing hours to new column
                await this.run('UPDATE stores SET check_interval_value = check_interval_hours WHERE check_interval_value IS NULL');
            }
            
            if (!hasIntervalUnit) {
                await this.run('ALTER TABLE stores ADD COLUMN check_interval_unit TEXT DEFAULT "hours"');
            }
        } catch (error) {
            console.log('Migration completed or columns already exist:', error.message);
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
    async addStore(name, url, type, checkInterval = 24, intervalUnit = 'hours') {
        const intervalHours = this.convertToHours(checkInterval, intervalUnit);
        return this.run(
            'INSERT INTO stores (name, url, type, check_interval_hours, check_interval_value, check_interval_unit) VALUES (?, ?, ?, ?, ?, ?)',
            [name, url, type, intervalHours, checkInterval, intervalUnit]
        );
    }

    async getStores() {
        return this.all('SELECT * FROM stores ORDER BY created_at DESC');
    }

    async deleteStore(id) {
        await this.run('DELETE FROM apps WHERE store_id = ?', [id]);
        return this.run('DELETE FROM stores WHERE id = ?', [id]);
    }

    async updateStoreInterval(id, value, unit = 'hours') {
        const hours = this.convertToHours(value, unit);
        return this.run(
            'UPDATE stores SET check_interval_hours = ?, check_interval_value = ?, check_interval_unit = ? WHERE id = ?', 
            [hours, value, unit, id]
        );
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

    // Helper method to get human readable interval
    getReadableInterval(value, unit) {
        if (value === 1) {
            return `1 ${unit.slice(0, -1)}`; // Remove 's' for singular
        }
        return `${value} ${unit}`;
    }

    // Monitoring
    async getStoresForMonitoring() {
        // Get all stores and filter them in JavaScript to handle different time units properly
        const allStores = await this.all('SELECT * FROM stores');
        const now = new Date();
        
        return allStores.filter(store => {
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
        return this.run('UPDATE stores SET last_checked = datetime("now") WHERE id = ?', [storeId]);
    }

    // Apps
    async addApp(storeId, appId, name, url) {
        return this.run(
            'INSERT OR IGNORE INTO apps (store_id, app_id, name, url) VALUES (?, ?, ?, ?)',
            [storeId, appId, name, url]
        );
    }

    async getAppsForStore(storeId) {
        return this.all('SELECT * FROM apps WHERE store_id = ? ORDER BY discovered_at DESC', [storeId]);
    }

    async getNewApps(storeId, since) {
        return this.all(
            'SELECT * FROM apps WHERE store_id = ? AND discovered_at > ? ORDER BY discovered_at DESC',
            [storeId, since]
        );
    }
}

module.exports = Database;