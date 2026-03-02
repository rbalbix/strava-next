import type { NextApiRequest, NextApiResponse } from 'next';
import { hasValidInternalApiKey } from '../../services/internal-api-auth';
import { getLogger } from '../../services/logger';
import { register } from '../../services/metrics';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const log = getLogger(req.headers['x-request-id'] as string);

  if (!hasValidInternalApiKey(req)) {
    log.warn({ method: req.method }, 'Unauthorized request to metrics endpoint');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.setHeader(
      'Content-Type',
      register.contentType || 'text/plain; version=0.0.4',
    );
    const body = await register.metrics();
    res.status(200).send(body);
  } catch (err) {
    log.error({ err }, 'Failed to collect metrics');
    res.status(500).send('Error collecting metrics');
  }
}
