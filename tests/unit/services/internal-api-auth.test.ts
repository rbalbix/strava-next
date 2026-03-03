import type { NextApiRequest } from 'next';
import { describe, expect, it } from 'vitest';
import { hasValidInternalApiKey } from '../../../src/services/internal-api-auth';

function makeReq(
  value?: string | string[],
): NextApiRequest {
  return {
    headers: value === undefined ? {} : { 'x-internal-api-key': value },
  } as NextApiRequest;
}

describe('hasValidInternalApiKey', () => {
  it('returns false when expected token is missing', () => {
    delete process.env.INTERNAL_API_TOKEN;
    expect(hasValidInternalApiKey(makeReq('abc'))).toBe(false);
  });

  it('returns false when incoming token is missing', () => {
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    expect(hasValidInternalApiKey(makeReq())).toBe(false);
  });

  it('returns true when tokens match', () => {
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    expect(hasValidInternalApiKey(makeReq('secret-token'))).toBe(true);
  });

  it('uses first header value when the header is an array', () => {
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    expect(hasValidInternalApiKey(makeReq(['secret-token', 'other']))).toBe(
      true,
    );
  });

  it('returns false when tokens differ', () => {
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    expect(hasValidInternalApiKey(makeReq('invalid-token'))).toBe(false);
  });
});
