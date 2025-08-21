import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../services/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      try {
        let { id } = req.query;
        id = typeof id === 'string' ? id : id[0];
        const item = await redis.get(id);
        return res.status(200).send({ item });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
