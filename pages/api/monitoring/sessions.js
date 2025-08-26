import Database from '../../../src/database'

const db = new Database()

export default async function handler(req, res) {
  await db.initialize()

  if (req.method === 'GET') {
    try {
      const sessions = await db.all(`
        SELECT ms.*, s.name as store_name, s.type as store_type
        FROM monitoring_sessions ms
        JOIN stores s ON ms.store_id = s.id
        ORDER BY ms.started_at DESC
        LIMIT 50
      `)
      res.json(sessions)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}