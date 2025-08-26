import { getBackgroundService } from '../../../lib/backgroundService'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const service = getBackgroundService()
      res.json(service.getStatus())
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}