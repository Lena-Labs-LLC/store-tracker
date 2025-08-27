let initialized = false

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (!initialized) {
        // Skip background service initialization on Vercel
        if (!process.env.VERCEL) {
          const { getSimpleMonitoringService } = await import('../../lib/simpleMonitoring');
          const service = getSimpleMonitoringService();
          service.start(2); // Check every 2 minutes
        }
        initialized = true;
        console.log('App initialized');
      }
      
      res.json({ message: 'App initialized successfully', initialized: true });
    } catch (error) {
      console.error('Initialization error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}