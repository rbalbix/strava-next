import type { NextApiRequest, NextApiResponse } from 'next';
import { register } from '../../services/metrics';

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    res.setHeader(
      'Content-Type',
      register.contentType || 'text/plain; version=0.0.4',
    );
    const body = await register.metrics();
    res.status(200).send(body);
  } catch (err) {
    res.status(500).send('Error collecting metrics');
  }
}
