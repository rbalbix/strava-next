import { NextApiRequest, NextApiResponse } from 'next';
import { RemoteStorageSetRequestSchema } from '../../../contracts/api';
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
        const parsed = RemoteStorageSetRequestSchema.safeParse(req.body);

        if (!parsed.success) {
          const invalidKey = parsed.error.issues.some((issue) =>
            issue.path.includes('key'),
          );
          if (invalidKey) {
            const key = (req.body as { key?: unknown })?.key;
            if (typeof key === 'string' && key.trim().length > 0) {
              return res.status(403).json({ error: 'Forbidden key' });
            }
            return res.status(400).json({ error: 'Invalid key' });
          }
          return res.status(400).json({ error: 'Invalid data' });
        }

        const { key, value } = parsed.data;
        if (!key) {
          return res.status(403).json({ error: 'Forbidden key' });
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
