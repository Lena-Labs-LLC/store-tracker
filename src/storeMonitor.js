const axios = require('axios');
const cheerio = require('cheerio');
const WebhookService = require('./webhookService');

class StoreMonitor {
    constructor(database) {
        this.db = database;
        this.webhookService = new WebhookService();
    }

    async checkStore(store) {
        console.log(`Checking store: ${store.name}`);
        
        try {
            // Create monitoring session - handle different database implementations
            let sessionId;
            try {
                if (this.db.createMonitoringSession) {
                    // Supabase implementation
                    const session = await this.db.createMonitoringSession(store.id);
                    sessionId = session.id;
                } else {
                    // SQLite implementation
                    const sessionResult = await this.db.run(
                        'INSERT INTO monitoring_sessions (store_id) VALUES (?)',
                        [store.id]
                    );
                    sessionId = sessionResult.id;
                }
            } catch (error) {
                console.error('Error creating monitoring session:', error);
                // Continue without session tracking
                sessionId = Math.floor(Math.random() * 1000);
            }

            let apps = [];
            
            if (store.type === 'playstore') {
                apps = await this.scrapePlayStore(store.url);
            } else if (store.type === 'appstore') {
                apps = await this.scrapeAppStore(store.url);
            }

            let newAppsCount = 0;
            const existingApps = await this.db.getAppsForStore(store.id);
            const existingAppIds = new Set(existingApps.map(app => app.app_id));
            const newAppsFound = [];

            for (const app of apps) {
                if (!existingAppIds.has(app.id)) {
                    await this.db.addApp(store.id, app.id, app.name, app.url);
                    newAppsFound.push({
                        app_id: app.id,
                        name: app.name,
                        url: app.url,
                        discovered_at: new Date().toISOString()
                    });
                    newAppsCount++;
                }
            }

            // Update monitoring session - handle different database implementations
            try {
                if (this.db.updateMonitoringSession) {
                    // Supabase implementation
                    await this.db.updateMonitoringSession(sessionId, {
                        apps_found: apps.length,
                        new_apps_found: newAppsCount
                    });
                } else {
                    // SQLite implementation
                    await this.db.run(
                        'UPDATE monitoring_sessions SET apps_found = ?, new_apps_found = ?, completed_at = datetime("now"), status = "completed" WHERE id = ?',
                        [apps.length, newAppsCount, sessionId]
                    );
                }
            } catch (error) {
                console.error('Error updating monitoring session:', error);
                // Continue anyway
            }

            await this.db.updateLastChecked(store.id);

            // Send webhook if new apps were found
            if (newAppsFound.length > 0) {
                try {
                    await this.webhookService.sendNewApps(newAppsFound, store.name, store.type);
                    console.log(`Webhook sent for ${newAppsFound.length} new apps from ${store.name}`);
                } catch (error) {
                    console.error(`Webhook failed for store ${store.name}:`, error);
                }
            }

            console.log(`Store ${store.name}: Found ${apps.length} apps, ${newAppsCount} new`);
            
            return {
                totalApps: apps.length,
                newApps: newAppsCount,
                sessionId,
                newAppsData: newAppsFound
            };

        } catch (error) {
            console.error(`Error checking store ${store.name}:`, error);
            throw error;
        }
    }

    async scrapePlayStore(url) {
        try {
            // For Play Store developer pages or category pages
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const apps = [];

            // Try different selectors for different Play Store page types
            const appSelectors = [
                'a[href*="/store/apps/details?id="]', // App detail links
                '[data-docid]', // App containers with docid
                '.card-click-target' // Card containers
            ];

            for (const selector of appSelectors) {
                $(selector).each((i, element) => {
                    const $el = $(element);
                    let appId, name, appUrl;

                    // Extract app ID from href
                    const href = $el.attr('href') || $el.find('a').attr('href');
                    if (href && href.includes('id=')) {
                        appId = href.split('id=')[1].split('&')[0];
                    }

                    // Extract from data-docid if available
                    if (!appId) {
                        appId = $el.attr('data-docid');
                    }

                    // Get app name
                    name = $el.find('[title]').attr('title') || 
                           $el.attr('title') || 
                           $el.text().trim();

                    if (appId && name) {
                        appUrl = `https://play.google.com/store/apps/details?id=${appId}`;
                        apps.push({ id: appId, name, url: appUrl });
                    }
                });

                if (apps.length > 0) break; // Stop if we found apps with this selector
            }

            return apps;
        } catch (error) {
            console.error('Play Store scraping error:', error);
            return [];
        }
    }

    async scrapeAppStore(url) {
        try {
            // For App Store developer pages or category pages
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const apps = [];

            // App Store selectors
            $('a[href*="/app/"]').each((i, element) => {
                const $el = $(element);
                const href = $el.attr('href');
                
                if (href) {
                    const urlParts = href.split('/');
                    const appId = urlParts[urlParts.length - 1].split('?')[0];
                    const name = $el.text().trim() || $el.find('img').attr('alt') || 'Unknown App';
                    
                    if (appId && name !== 'Unknown App') {
                        apps.push({
                            id: appId,
                            name,
                            url: href.startsWith('http') ? href : `https://apps.apple.com${href}`
                        });
                    }
                }
            });

            return apps;
        } catch (error) {
            console.error('App Store scraping error:', error);
            return [];
        }
    }

    async manualCheck(storeId) {
        const store = await this.db.get('SELECT * FROM stores WHERE id = ?', [storeId]);
        if (!store) {
            throw new Error('Store not found');
        }
        
        return this.checkStore(store);
    }
}

module.exports = StoreMonitor;