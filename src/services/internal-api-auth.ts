import type { NextApiRequest } from 'next';

export function hasValidInternalApiKey(req: NextApiRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) return false;

  const incomingHeader = req.headers['x-internal-api-key'];
  const incoming = Array.isArray(incomingHeader)
    ? incomingHeader[0]
    : incomingHeader;

  if (!incoming) return false;
  return incoming === expected;
}
