import Database from '../../../../src/database'

const db = new Database()

export default async function handler(req, res) {
  await db.initialize()
  
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const apps = await db.getAppsForStore(id)
      res.json(apps)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}