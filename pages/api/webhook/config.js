import WebhookService from '../../../src/webhookService'

const webhookService = new WebhookService()

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.json({
      webhookUrl: webhookService.webhookUrl ? '***configured***' : 'not configured',
      isConfigured: !!webhookService.webhookUrl
    })
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}