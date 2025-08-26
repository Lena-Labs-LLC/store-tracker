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
        return this.run(
            'INSERT INTO stores (name, url, type, check_interval_hours) VALUES (?, ?, ?, ?)',
            [name, url, type, checkInterval]
        );
    }

    async getStores() {
        return this.all('SELECT * FROM stores ORDER BY created_at DESC');
    }

    async deleteStore(id) {
        await this.run('DELETE FROM apps WHERE store_id = ?', [id]);
        return this.run('DELETE FROM stores WHERE id = ?', [id]);
    }

    async updateStoreInterval(id, hours) {
        return this.run('UPDATE stores SET check_interval_hours = ? WHERE id = ?', [hours, id]);
    }

    // Monitoring
    async getStoresForMonitoring() {
        const query = `
            SELECT * FROM stores 
            WHERE last_checked IS NULL 
            OR datetime(last_checked, '+' || check_interval_hours || ' hours') <= datetime('now')
        `;
        return this.all(query);
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