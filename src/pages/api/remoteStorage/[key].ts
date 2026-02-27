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
        const queryKey = req.query.key;
        const key =
          typeof queryKey === 'string'
            ? queryKey
            : Array.isArray(queryKey)
              ? queryKey[0]
              : undefined;

        if (typeof key !== 'string' || key.trim().length === 0) {
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
