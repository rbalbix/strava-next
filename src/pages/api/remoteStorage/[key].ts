import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../services/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      try {
        let { key } = req.query;
        key = typeof key === 'string' ? key : key[0];
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
