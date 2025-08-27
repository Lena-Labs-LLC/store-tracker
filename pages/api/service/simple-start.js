import { getSimpleMonitoringService } from '../../../lib/simpleMonitoring'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const service = getSimpleMonitoringService()
      const intervalMinutes = parseInt(req.body?.intervalMinutes) || 2
      
      service.start(intervalMinutes)
      
      res.json({ 
        message: `Simple monitoring service started (every ${intervalMinutes} minutes)`, 
        status: service.getStatus() 
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}