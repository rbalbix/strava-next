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
    ended: false,
    headers: {} as Record<string, string | string[]>,
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    redirect(url: string) {
      this.statusCode = this.statusCode || 307;
      this.redirectedTo = url;
      this.ended = true;
      return this;
    },
    end(payload?: unknown) {
      this.body = payload;
      this.ended = true;
      return this;
    },
  };

  return res as MockResponse;
}
