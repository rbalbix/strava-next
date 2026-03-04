import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadModuleOptions = {
  redisGet?: ReturnType<typeof vi.fn>;
  redisSet?: ReturnType<typeof vi.fn>;
  redisDel?: ReturnType<typeof vi.fn>;
  redisSetex?: ReturnType<typeof vi.fn>;
  oauthPost?: ReturnType<typeof vi.fn>;
  isAxiosError?: (value: unknown) => boolean;
};

async function loadStravaAuthModule(options: LoadModuleOptions = {}) {
  vi.resetModules();

  const redis = {
    get: options.redisGet ?? vi.fn(),
    set: options.redisSet ?? vi.fn().mockResolvedValue('OK'),
    del: options.redisDel ?? vi.fn().mockResolvedValue(1),
    setex: options.redisSetex ?? vi.fn().mockResolvedValue('OK'),
  };

  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const tokenRefreshAttemptsInc = vi.fn();
  const tokenRefreshSuccessInc = vi.fn();
  const tokenRefreshFailureInc = vi.fn();

  vi.doMock('../../../src/services/redis', () => ({ default: redis }));
  vi.doMock('../../../src/services/logger', () => ({
    getLogger: () => logger,
  }));
  vi.doMock('../../../src/services/metrics', () => ({
    tokenRefreshAttempts: { inc: tokenRefreshAttemptsInc },
    tokenRefreshSuccess: { inc: tokenRefreshSuccessInc },
    tokenRefreshFailure: { inc: tokenRefreshFailureInc },
  }));
  vi.doMock('../../../src/services/api', () => ({
    apiStravaOauthToken: {
      post: options.oauthPost ?? vi.fn(),
    },
  }));
  vi.doMock('axios', () => ({
    default: {
      isAxiosError: options.isAxiosError ?? (() => false),
    },
    isAxiosError: options.isAxiosError ?? (() => false),
  }));

  const mod = await import('../../../src/services/strava-auth');
  return {
    ...mod,
    redis,
    logger,
    tokenRefreshAttemptsInc,
    tokenRefreshSuccessInc,
    tokenRefreshFailureInc,
  };
}

describe('strava-auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_ID = 'client-id';
    process.env.CLIENT_SECRET = 'client-secret';
  });

  it('returns cached token when token is not expired', async () => {
    const redisGet = vi.fn().mockResolvedValue(
      JSON.stringify({
        refreshToken: 'refresh',
        accessToken: 'access',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    const { getAthleteAccessToken, redis } = await loadStravaAuthModule({
      redisGet,
    });

    const result = await getAthleteAccessToken(123);

    expect(result).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: expect.any(Number),
    });
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('refreshes token when expired and lock is acquired', async () => {
    const expired = Math.floor(Date.now() / 1000) - 5;
    const redisGet = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-old',
          accessToken: 'access-old',
          expiresAt: expired,
          athleteInfo: { id: 123 },
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-new',
          accessToken: 'access-new',
          expiresAt: expired + 3600,
          athleteInfo: { id: 123 },
        }),
      );
    const oauthPost = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        refresh_token: 'refresh-new',
        access_token: 'access-new',
        expires_at: expired + 3600,
      },
    });
    const { getAthleteAccessToken, redis, tokenRefreshSuccessInc } =
      await loadStravaAuthModule({
        redisGet,
        oauthPost,
      });

    const result = await getAthleteAccessToken(123);

    expect(result).toEqual({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
      expiresAt: expired + 3600,
    });
    expect(redis.set).toHaveBeenCalled();
    expect(redis.setex).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalled();
    expect(tokenRefreshSuccessInc).toHaveBeenCalledTimes(1);
  });

  it('returns refreshed token even when lock release fails', async () => {
    const expired = Math.floor(Date.now() / 1000) - 5;
    const redisGet = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-old',
          accessToken: 'access-old',
          expiresAt: expired,
          athleteInfo: { id: 123 },
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-new',
          accessToken: 'access-new',
          expiresAt: expired + 3600,
          athleteInfo: { id: 123 },
        }),
      );
    const oauthPost = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        refresh_token: 'refresh-new',
        access_token: 'access-new',
        expires_at: expired + 3600,
      },
    });

    const { getAthleteAccessToken, redis, logger } = await loadStravaAuthModule({
      redisGet,
      redisDel: vi.fn().mockRejectedValue(new Error('del failed')),
      oauthPost,
    });

    const result = await getAthleteAccessToken(123);
    expect(result).toEqual({
      accessToken: 'access-new',
      refreshToken: 'refresh-new',
      expiresAt: expired + 3600,
    });
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns token refreshed by another process when lock is not acquired', async () => {
    const expired = Math.floor(Date.now() / 1000) - 10;
    const fresh = Math.floor(Date.now() / 1000) + 3600;
    const redisGet = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-old',
          accessToken: 'access-old',
          expiresAt: expired,
          athleteInfo: { id: 123 },
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-shared',
          accessToken: 'access-shared',
          expiresAt: fresh,
        }),
      );

    const redisSet = vi.fn().mockResolvedValue(null);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet,
      redisSet,
    });

    const result = await getAthleteAccessToken(123);

    expect(result).toEqual({
      accessToken: 'access-shared',
      refreshToken: 'refresh-shared',
      expiresAt: fresh,
    });
    expect(redisSet).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it('throws when athlete auth is missing in redis', async () => {
    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet: vi.fn().mockResolvedValue(null),
    });

    await expect(getAthleteAccessToken(123)).rejects.toThrow(
      'Erro ao obter token para athlete 123',
    );
  });

  it('throws when athlete auth payload is invalid json', async () => {
    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet: vi.fn().mockResolvedValue('{invalid-json'),
    });

    await expect(getAthleteAccessToken(123)).rejects.toThrow(
      'Erro ao obter token para athlete 123',
    );
  });

  it('throws when athlete auth payload has invalid shape', async () => {
    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet: vi.fn().mockResolvedValue(
        JSON.stringify({
          refreshToken: 'refresh',
          accessToken: 'access',
          expiresAt: 'not-a-number',
        }),
      ),
    });

    await expect(getAthleteAccessToken(123)).rejects.toThrow(
      'Erro ao obter token para athlete 123',
    );
  });

  it('accepts cached auth payload with explicit lastUpdated', async () => {
    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet: vi.fn().mockResolvedValue(
        JSON.stringify({
          refreshToken: 'refresh',
          accessToken: 'access',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          lastUpdated: 12345,
        }),
      ),
    });

    const result = await getAthleteAccessToken(123);
    expect(result?.accessToken).toBe('access');
  });

  it('refreshStravaToken throws on non-retryable axios error', async () => {
    const oauthPost = vi.fn().mockRejectedValue({
      response: { status: 400 },
      message: 'bad request',
    });
    const { refreshStravaToken, tokenRefreshFailureInc } =
      await loadStravaAuthModule({
        oauthPost,
        isAxiosError: () => true,
      });

    await expect(refreshStravaToken('refresh-token', 123)).rejects.toThrow(
      'não-retentável',
    );
    expect(tokenRefreshFailureInc).not.toHaveBeenCalled();
  });

  it('refreshStravaToken retries retryable errors and then succeeds', async () => {
    const oauthPost = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 }, message: 'server 1' })
      .mockRejectedValueOnce({ response: { status: 500 }, message: 'server 2' })
      .mockResolvedValueOnce({
        status: 200,
        data: { access_token: 'a2', refresh_token: 'r2', expires_at: 1000 },
      });

    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

    const { refreshStravaToken, tokenRefreshAttemptsInc, tokenRefreshSuccessInc } =
      await loadStravaAuthModule({
        oauthPost,
        isAxiosError: () => true,
      });

    const result = await refreshStravaToken('refresh-token', 123);

    expect(result).toEqual({ access_token: 'a2', refresh_token: 'r2', expires_at: 1000 });
    expect(tokenRefreshAttemptsInc).toHaveBeenCalledTimes(3);
    expect(tokenRefreshSuccessInc).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
  });

  it('refreshStravaToken throws after max attempts with non-2xx response', async () => {
    const oauthPost = vi.fn().mockResolvedValue({ status: 500, statusText: 'ERR', data: {} });

    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

    const { refreshStravaToken, tokenRefreshAttemptsInc, tokenRefreshFailureInc } =
      await loadStravaAuthModule({ oauthPost });

    await expect(refreshStravaToken('refresh-token', 321)).rejects.toThrow(
      'Refresh token failed: 500 ERR',
    );
    expect(tokenRefreshAttemptsInc).toHaveBeenCalledTimes(3);
    expect(tokenRefreshFailureInc).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
  });

  it('saveStravaAuth throws when health check fails after setex', async () => {
    const redisSetex = vi.fn().mockResolvedValue('OK');
    const redisGet = vi.fn().mockResolvedValue(
      JSON.stringify({
        refreshToken: 'refresh',
        accessToken: 'different-access',
        expiresAt: 123,
      }),
    );
    const { saveStravaAuth } = await loadStravaAuthModule({
      redisSetex,
      redisGet,
    });

    await expect(
      saveStravaAuth(10, 'refresh', 'expected-access', 123, {}),
    ).rejects.toThrow('Health check failed');
  });


  it('falls back to local refresh after lock wait timeout', async () => {
    const expired = 1;
    const renewed = 9999;

    const redisGet = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-timeout',
          accessToken: 'access-timeout',
          expiresAt: expired,
          athleteInfo: { id: 123 },
        }),
      )
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-fallback',
          accessToken: 'access-fallback',
          expiresAt: renewed,
        }),
      );

    const redisSet = vi.fn().mockResolvedValue(null);
    const oauthPost = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        refresh_token: 'refresh-fallback',
        access_token: 'access-fallback',
        expires_at: renewed,
      },
    });

    const nowValues = [100000, 100000, 100000, 100000, 140000];
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowValues.shift() ?? 140000);

    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet,
      redisSet,
      oauthPost,
    });

    const result = await getAthleteAccessToken(123);
    expect(result).toEqual({
      accessToken: 'access-fallback',
      refreshToken: 'refresh-fallback',
      expiresAt: renewed,
    });

    nowSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  it('throws when fallback refresh fails after lock timeout', async () => {
    const redisGet = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          refreshToken: 'refresh-timeout',
          accessToken: 'access-timeout',
          expiresAt: 1,
          athleteInfo: { id: 123 },
        }),
      )
      .mockResolvedValueOnce(null);

    const oauthPost = vi.fn().mockRejectedValue(new Error('fallback failed'));

    const nowValues = [100000, 100000, 100000, 100000, 140000];
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowValues.shift() ?? 140000);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet,
      redisSet: vi.fn().mockResolvedValue(null),
      oauthPost,
      isAxiosError: () => false,
    });

    await expect(getAthleteAccessToken(123)).rejects.toThrow('fallback failed');

    nowSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  it('throws when refresh fails with acquired lock', async () => {
    const expired = Math.floor(Date.now() / 1000) - 5;
    const redisGet = vi.fn().mockResolvedValue(
      JSON.stringify({
        refreshToken: 'refresh-old',
        accessToken: 'access-old',
        expiresAt: expired,
        athleteInfo: { id: 123 },
      }),
    );

    const { getAthleteAccessToken, redis } = await loadStravaAuthModule({
      redisGet,
      oauthPost: vi.fn().mockRejectedValue(new Error('refresh exploded')),
      isAxiosError: () => false,
    });

    await expect(getAthleteAccessToken(123)).rejects.toThrow('refresh exploded');
    expect(redis.del).toHaveBeenCalledTimes(1);
  });

  it('refreshStravaToken retries unknown errors and throws after max attempts', async () => {
    const oauthPost = vi.fn().mockRejectedValue(new Error('network down'));

    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

    const { refreshStravaToken, tokenRefreshAttemptsInc, tokenRefreshFailureInc } =
      await loadStravaAuthModule({ oauthPost, isAxiosError: () => false });

    await expect(refreshStravaToken('refresh-token', 999)).rejects.toThrow('network down');
    expect(tokenRefreshAttemptsInc).toHaveBeenCalledTimes(3);
    expect(tokenRefreshFailureInc).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });
  it('refreshStravaToken returns response data on successful request', async () => {
    const oauthPost = vi.fn().mockResolvedValue({
      status: 200,
      data: { access_token: 'a', refresh_token: 'r', expires_at: 999 },
    });
    const { refreshStravaToken, tokenRefreshAttemptsInc, tokenRefreshSuccessInc } =
      await loadStravaAuthModule({
        oauthPost,
      });

    const result = await refreshStravaToken('r0', 1);
    expect(result).toEqual({ access_token: 'a', refresh_token: 'r', expires_at: 999 });
    expect(tokenRefreshAttemptsInc).toHaveBeenCalledTimes(1);
    expect(tokenRefreshSuccessInc).toHaveBeenCalledTimes(1);
  });
});
