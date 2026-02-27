import { NextApiRequest, NextApiResponse } from 'next';
import { hasValidInternalApiKey } from '../../../services/internal-api-auth';
import redis from '../../../services/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!hasValidInternalApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'POST':
      try {
        const { key, value } = req.body;

        if (typeof key !== 'string' || key.trim().length === 0) {
          return res.status(400).json({ error: 'Invalid key' });
        }

        if (key.startsWith('strava:auth:')) {
          return res.status(403).json({ error: 'Forbidden key namespace' });
        }

        await redis.set(key, value);
        return res.status(201).end();
      } catch (error) {
        return res.status(400).json({ error: 'Invalid data' });
      }

    default:
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
