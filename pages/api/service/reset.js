import { getBackgroundService } from '../../../lib/backgroundService'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const service = getBackgroundService()
      
      // Stop existing service
      service.stop()
      
      // Force reset the singleton
      const backgroundServiceModule = await import('../../../lib/backgroundService')
      backgroundServiceModule.backgroundService = null
      
      // Create new service
      const newService = getBackgroundService()
      await newService.start()
      
      res.json({ 
        message: 'Background service reset and restarted successfully', 
        status: newService.getStatus() 
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}