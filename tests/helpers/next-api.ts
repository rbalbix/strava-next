import type { NextApiRequest, NextApiResponse } from 'next';

type RequestOptions = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  body?: unknown;
  remoteAddress?: string;
};

type MockResponse = NextApiResponse & {
  statusCode: number;
  body?: unknown;
  ended: boolean;
  headers: Record<string, string | string[]>;
  redirectedTo?: string;
};

export function createMockRequest(options: RequestOptions = {}): NextApiRequest {
  return {
    method: options.method ?? 'GET',
    headers: options.headers ?? {},
    query: options.query ?? {},
    cookies: options.cookies ?? {},
    body: options.body,
    socket: { remoteAddress: options.remoteAddress ?? '127.0.0.1' },
  } as NextApiRequest;
}

export function createMockResponse(): MockResponse {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    headers: {} as Record<string, string | string[]>,
    redirectedTo: undefined as string | undefined,
    setHeader(name: string, value: string | string[]) {
      res.headers[name] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    send(payload: unknown) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    redirect(url: string) {
      res.statusCode = res.statusCode || 307;
      res.redirectedTo = url;
      res.ended = true;
      return res;
    },
    end(payload?: unknown) {
      res.body = payload;
      res.ended = true;
      return res;
    },
  };

  return res as unknown as MockResponse;
}
