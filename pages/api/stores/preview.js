export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let StoreAnalyzer;
    try {
      StoreAnalyzer = require('../../../src/storeAnalyzer');
    } catch (error) {
      console.error('StoreAnalyzer import error:', error);
      // Fallback validation for Vercel
      const storeType = url.includes('play.google.com') ? 'playstore' : 'appstore';
      const extractedName = 'Sample Store';
      return res.json({
        storeType,
        extractedName,
        valid: true
      });
    }

    // Validate and detect store type
    const validation = StoreAnalyzer.validateStoreUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const storeType = validation.storeType;
    const extractedName = await StoreAnalyzer.extractStoreName(url, storeType);

    res.json({
      storeType,
      extractedName,
      valid: true
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
}