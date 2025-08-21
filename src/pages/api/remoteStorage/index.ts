import { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../../services/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      try {
        return res.status(200).end();
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch' });
      }

    case 'POST':
      try {
        const { athlete, value } = req.body;
        await redis.set(athlete, value);
        return res.status(201).end();
      } catch (error) {
        return res.status(400).json({ error: 'Invalid data' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
