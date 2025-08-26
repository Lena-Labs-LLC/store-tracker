let initialized = false

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      if (!initialized) {
        // Skip background service initialization on Vercel
        if (!process.env.VERCEL) {
          const { getBackgroundService } = await import('../../lib/backgroundService');
          const service = getBackgroundService();
          await service.start();
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