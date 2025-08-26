export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      let webhookService;
      try {
        const WebhookService = require('../../../src/webhookService');
        webhookService = new WebhookService();
      } catch (error) {
        console.error('WebhookService import error:', error);
        return res.json({
          webhookUrl: 'not configured',
          isConfigured: false
        });
      }

      res.json({
        webhookUrl: webhookService.webhookUrl ? '***configured***' : 'not configured',
        isConfigured: !!webhookService.webhookUrl
      });
    } catch (error) {
      console.error('Webhook config error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}