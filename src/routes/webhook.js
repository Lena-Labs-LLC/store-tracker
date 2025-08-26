const express = require('express');

module.exports = (webhookService) => {
    const router = express.Router();

    // Test webhook endpoint
    router.post('/test', async (req, res) => {
        try {
            console.log('Testing webhook...');
            console.log('Webhook URL:', webhookService.webhookUrl);
            
            const result = await webhookService.testWebhook();
            
            if (result.success) {
                res.json({ 
                    message: 'Webhook test sent successfully',
                    status: result.status 
                });
            } else {
                res.status(400).json({ 
                    error: `Webhook failed: ${result.error}`,
                    status: result.status,
                    details: result.details
                });
            }
        } catch (error) {
            console.error('Webhook test error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Get webhook configuration
    router.get('/config', (req, res) => {
        res.json({
            webhookUrl: webhookService.webhookUrl ? '***configured***' : 'not configured',
            isConfigured: !!webhookService.webhookUrl
        });
    });

    return router;
};