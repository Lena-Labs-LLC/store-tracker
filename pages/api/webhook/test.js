import WebhookService from '../../../src/webhookService'

const webhookService = new WebhookService()

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Testing webhook...')
      console.log('Webhook URL:', webhookService.webhookUrl)
      
      const result = await webhookService.testWebhook()
      
      if (result.success) {
        res.json({ 
          message: 'Webhook test sent successfully',
          status: result.status 
        })
      } else {
        res.status(400).json({ 
          error: `Webhook failed: ${result.error}`,
          status: result.status,
          details: result.details
        })
      }
    } catch (error) {
      console.error('Webhook test error:', error)
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}