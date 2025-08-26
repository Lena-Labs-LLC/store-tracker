import Database from '../../../src/database'

const db = new Database()

export default async function handler(req, res) {
  await db.initialize()
  
  const { id } = req.query

  if (req.method === 'DELETE') {
    try {
      await db.deleteStore(id)
      res.json({ message: 'Store deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { hours } = req.body
      
      if (!hours || hours <= 0) {
        return res.status(400).json({ error: 'Hours must be a positive number' })
      }

      await db.updateStoreInterval(id, hours)
      res.json({ message: 'Check interval updated successfully' })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PATCH'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}