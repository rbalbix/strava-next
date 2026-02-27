import type { NextApiRequest } from 'next';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(
    aBuffer as unknown as Uint8Array,
    bBuffer as unknown as Uint8Array,
  );
}

export function hasValidInternalApiKey(req: NextApiRequest): boolean {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) return false;

  const incomingHeader = req.headers['x-internal-api-key'];
  const incoming = Array.isArray(incomingHeader)
    ? incomingHeader[0]
    : incomingHeader;

  if (!incoming) return false;
  return safeCompare(incoming, expected);
}
