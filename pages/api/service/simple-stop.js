import { getSimpleMonitoringService } from '../../../lib/simpleMonitoring'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const service = getSimpleMonitoringService()
      service.stop()
      
      res.json({ 
        message: 'Simple monitoring service stopped', 
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