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
    case 'GET':
      try {
        let { key } = req.query;
        key = typeof key === 'string' ? key : key[0];

        if (!key || key.trim().length === 0) {
          return res.status(400).json({ error: 'Invalid key' });
        }

        if (key.startsWith('strava:auth:')) {
          return res.status(403).json({ error: 'Forbidden key namespace' });
        }

        const value = await redis.get(key);
        return res.status(200).send(value);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
