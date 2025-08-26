import Database from '../../../../src/database'
import StoreMonitor from '../../../../src/storeMonitor'

const db = new Database()
const storeMonitor = new StoreMonitor(db)

export default async function handler(req, res) {
  await db.initialize()
  
  const { storeId } = req.query

  if (req.method === 'POST') {
    try {
      const result = await storeMonitor.manualCheck(storeId)
      res.json({
        message: 'Store checked successfully',
        ...result
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}