const express = require('express');

module.exports = (db, storeMonitor) => {
    const router = express.Router();

    // Manual check for a specific store
    router.post('/check/:storeId', async (req, res) => {
        try {
            const { storeId } = req.params;
            const result = await storeMonitor.manualCheck(storeId);
            res.json({
                message: 'Store checked successfully',
                ...result
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get monitoring sessions
    router.get('/sessions', async (req, res) => {
        try {
            if (db.isServerless) {
                // Simple in-memory version
                const sessions = db.sessions.map(session => {
                    const store = db.stores.find(s => s.id === session.store_id);
                    return {
                        ...session,
                        store_name: store ? store.name : 'Unknown',
                        store_type: store ? store.type : 'unknown'
                    };
                }).sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 50);
                res.json(sessions);
            } else {
                const sessions = await db.all(`
                    SELECT ms.*, s.name as store_name, s.type as store_type
                    FROM monitoring_sessions ms
                    JOIN stores s ON ms.store_id = s.id
                    ORDER BY ms.started_at DESC
                    LIMIT 50
                `);
                res.json(sessions);
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get monitoring stats
    router.get('/stats', async (req, res) => {
        try {
            if (db.isServerless) {
                // Simple in-memory version
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                const stats = {
                    total_stores: db.stores.length,
                    total_apps: db.apps.length,
                    total_sessions: db.sessions.length,
                    new_apps_24h: db.sessions
                        .filter(s => new Date(s.started_at) > yesterday)
                        .reduce((sum, s) => sum + (s.new_apps_found || 0), 0)
                };
                res.json(stats);
            } else {
                const stats = await db.get(`
                    SELECT 
                        COUNT(DISTINCT s.id) as total_stores,
                        COUNT(DISTINCT a.id) as total_apps,
                        COUNT(DISTINCT ms.id) as total_sessions,
                        SUM(CASE WHEN ms.started_at > datetime('now', '-24 hours') THEN ms.new_apps_found ELSE 0 END) as new_apps_24h
                    FROM stores s
                    LEFT JOIN apps a ON s.id = a.store_id
                    LEFT JOIN monitoring_sessions ms ON s.id = ms.store_id
                `);
                res.json(stats);
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get new apps from a specific session
    router.get('/session/:sessionId/new-apps', async (req, res) => {
        try {
            const { sessionId } = req.params;
            
            // Get session info
            const session = await db.get(`
                SELECT ms.*, s.name as store_name, s.type as store_type
                FROM monitoring_sessions ms
                JOIN stores s ON ms.store_id = s.id
                WHERE ms.id = ?
            `, [sessionId]);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            
            // Get apps discovered during this session (within 5 minutes of session start)
            const newApps = await db.all(`
                SELECT * FROM apps 
                WHERE store_id = ? 
                AND datetime(discovered_at) >= datetime(?)
                AND datetime(discovered_at) <= datetime(?, '+5 minutes')
                ORDER BY discovered_at DESC
            `, [session.store_id, session.started_at, session.started_at]);
            
            res.json({
                session,
                newApps
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};