import StoreAnalyzer from '../../../src/storeAnalyzer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { url } = req.body
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Validate and detect store type
    const validation = StoreAnalyzer.validateStoreUrl(url)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    const storeType = validation.storeType
    const extractedName = await StoreAnalyzer.extractStoreName(url, storeType)

    res.json({
      storeType,
      extractedName,
      valid: true
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}