import { beforeEach, describe, expect, it, vi } from 'vitest';

type AxiosInstanceMock = {
  name: string;
  interceptors: {
    request: {
      use: ReturnType<typeof vi.fn>;
    };
  };
};

async function loadApiModule(token?: string) {
  vi.resetModules();

  if (token) {
    process.env.INTERNAL_API_TOKEN = token;
  } else {
    delete process.env.INTERNAL_API_TOKEN;
  }

  const instances: AxiosInstanceMock[] = [];
  const create = vi.fn().mockImplementation(() => {
    const inst: AxiosInstanceMock = {
      name: `instance_${instances.length + 1}`,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    };
    instances.push(inst);
    return inst;
  });

  const isAxiosError = vi.fn((e: unknown) => Boolean((e as any)?.isAxiosError));
  const axiosRetryFn = vi.fn();
  const isNetworkOrIdempotentRequestError = vi.fn((e: any) => e?.network === true);
  const exponentialDelay = vi.fn(() => 123);

  vi.doMock('axios', () => ({
    default: { create, isAxiosError },
    create,
    isAxiosError,
  }));
  vi.doMock('axios-retry', () => ({
    default: axiosRetryFn,
    isNetworkOrIdempotentRequestError,
    exponentialDelay,
  }));

  const mod = await import('../../../src/services/api');
  return {
    ...mod,
    instances,
    create,
    isAxiosError,
    axiosRetryFn,
    isNetworkOrIdempotentRequestError,
    exponentialDelay,
  };
}

describe('api service bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates axios clients with internal api header when token is present', async () => {
    const { create } = await loadApiModule('internal-token');

    expect(create).toHaveBeenCalledTimes(4);
    const callArgs = create.mock.calls.map((call) => call[0]);
    expect(callArgs[1].headers['X-Internal-Api-Key']).toBe('internal-token');
    expect(callArgs[2].headers['X-Internal-Api-Key']).toBe('internal-token');
    expect(callArgs[3].headers['X-Internal-Api-Key']).toBe('internal-token');
  });

  it('configures retry for all clients with retries=3', async () => {
    const {
      axiosRetryFn,
      apiStravaOauthToken,
      apiRemoteStorage,
      apiStravaAuth,
      apiEmail,
    } = await loadApiModule('token');

    expect(axiosRetryFn).toHaveBeenCalledTimes(4);
    expect(axiosRetryFn.mock.calls[0][0]).toBe(apiStravaOauthToken);
    expect(axiosRetryFn.mock.calls[1][0]).toBe(apiRemoteStorage);
    expect(axiosRetryFn.mock.calls[2][0]).toBe(apiStravaAuth);
    expect(axiosRetryFn.mock.calls[3][0]).toBe(apiEmail);
    expect(axiosRetryFn.mock.calls[0][1].retries).toBe(3);
    expect(typeof axiosRetryFn.mock.calls[0][1].retryCondition).toBe('function');
  });

  it('retryCondition returns true for network errors and 5xx responses', async () => {
    const { axiosRetryFn } = await loadApiModule('token');
    const retryCondition = axiosRetryFn.mock.calls[0][1].retryCondition;

    const network = retryCondition({ isAxiosError: true, network: true });
    const serverError = retryCondition({
      isAxiosError: true,
      response: { status: 503 },
    });
    const clientError = retryCondition({
      isAxiosError: true,
      response: { status: 400 },
    });

    expect(network).toBe(true);
    expect(serverError).toBe(true);
    expect(clientError).toBe(false);
  });

  it('adds X-Request-ID when missing and preserves existing request id', async () => {
    const { instances } = await loadApiModule('token');
    const useSpy = instances[0].interceptors.request.use;
    const interceptor = useSpy.mock.calls[0][0];

    const noHeaderResult = interceptor({ headers: {} });
    expect(noHeaderResult.headers['X-Request-ID']).toMatch(/^req_/);

    const existingResult = interceptor({
      headers: { 'x-request-id': 'already-set' },
    });
    expect(existingResult.headers['x-request-id']).toBe('already-set');
    expect(existingResult.headers['X-Request-ID']).toBeUndefined();
  });
});
