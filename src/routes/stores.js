const express = require('express');
const StoreAnalyzer = require('../storeAnalyzer');

module.exports = (db) => {
    const router = express.Router();

    // Get all stores
    router.get('/', async (req, res) => {
        try {
            const stores = await db.getStores();
            res.json(stores);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Preview store info before adding
    router.post('/preview', async (req, res) => {
        try {
            const { url } = req.body;
            
            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            // Validate and detect store type
            const validation = StoreAnalyzer.validateStoreUrl(url);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const storeType = validation.storeType;
            const extractedName = await StoreAnalyzer.extractStoreName(url, storeType);

            res.json({
                storeType,
                extractedName,
                valid: true
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Add new store
    router.post('/', async (req, res) => {
        try {
            const { name, url, checkInterval } = req.body;
            
            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            // Validate and detect store type
            const validation = StoreAnalyzer.validateStoreUrl(url);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            const storeType = validation.storeType;
            
            // Extract store name if not provided
            let storeName = name;
            if (!storeName || storeName.trim() === '') {
                console.log('Extracting store name from URL...');
                storeName = await StoreAnalyzer.extractStoreName(url, storeType);
            }

            const result = await db.addStore(storeName, url, storeType, checkInterval || 24);
            res.json({ 
                id: result.id, 
                message: 'Store added successfully',
                detectedType: storeType,
                extractedName: storeName
            });
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'Store URL already exists' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // Delete store
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await db.deleteStore(id);
            res.json({ message: 'Store deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Update store check interval
    router.patch('/:id/interval', async (req, res) => {
        try {
            const { id } = req.params;
            const { hours } = req.body;
            
            if (!hours || hours <= 0) {
                return res.status(400).json({ error: 'Hours must be a positive number' });
            }

            await db.updateStoreInterval(id, hours);
            res.json({ message: 'Check interval updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get apps for a store
    router.get('/:id/apps', async (req, res) => {
        try {
            const { id } = req.params;
            const apps = await db.getAppsForStore(id);
            res.json(apps);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};