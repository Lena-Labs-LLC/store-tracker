import { getBackgroundService } from '../../../lib/backgroundService'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const service = getBackgroundService()
      await service.start()
      res.json({ message: 'Background service started successfully', status: service.getStatus() })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}