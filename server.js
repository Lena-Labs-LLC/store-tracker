const express = require('express');
const path = require('path');
const cron = require('node-cron');
const Database = require('./src/database');
const StoreMonitor = require('./src/storeMonitor');
const GoogleSheetsService = require('./src/googleSheets');
const WebhookService = require('./src/webhookService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const db = new Database();
const storeMonitor = new StoreMonitor(db);
const googleSheets = new GoogleSheetsService();
const webhookService = new WebhookService();

// Routes
app.use('/api/stores', require('./src/routes/stores')(db));
app.use('/api/monitoring', require('./src/routes/monitoring')(db, storeMonitor));
app.use('/api/webhook', require('./src/routes/webhook')(webhookService));

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function startServer() {
    try {
        await db.initialize();
        console.log('Database initialized');
        
        // Start scheduled monitoring
        await startScheduledMonitoring();
        
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

async function startScheduledMonitoring() {
    // Don't run cron jobs in serverless environments
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        console.log('Skipping scheduled monitoring in serverless environment');
        return;
    }
    
    // Check for stores that need monitoring every minute
    cron.schedule('* * * * *', async () => {
        try {
            const stores = await db.getStoresForMonitoring();
            for (const store of stores) {
                await storeMonitor.checkStore(store);
            }
        } catch (error) {
            console.error('Scheduled monitoring error:', error);
        }
    });
}

startServer();