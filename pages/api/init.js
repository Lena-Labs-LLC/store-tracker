import { getBackgroundService } from '../../lib/backgroundService'

let initialized = false

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (!initialized) {
        const service = getBackgroundService()
        await service.start()
        initialized = true
        console.log('App initialized with background service')
      }
      
      res.json({ message: 'App initialized successfully', initialized: true })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}