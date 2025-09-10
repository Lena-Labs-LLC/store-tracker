// Simple endpoint to test Vercel cron functionality
export default async function handler(req, res) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isVercelCron = req.headers['user-agent']?.includes('vercel-cron') ||
        req.headers['x-vercel-cron'] === '1';

    console.log(`🧪 Cron test endpoint called at ${timestamp}`);
    console.log(`Method: ${method}, User-Agent: ${userAgent}`);
    console.log(`Is Vercel Cron: ${isVercelCron}`);
    console.log('All headers:', req.headers);

    res.json({
        message: 'Cron test endpoint working',
        timestamp,
        method,
        userAgent,
        isVercelCron,
        headers: req.headers
    });
}
