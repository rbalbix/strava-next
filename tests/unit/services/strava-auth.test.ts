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

  it('throws when athlete auth is missing in redis', async () => {
    const { getAthleteAccessToken } = await loadStravaAuthModule({
      redisGet: vi.fn().mockResolvedValue(null),
    });

    await expect(getAthleteAccessToken(123)).rejects.toThrow(
      'Erro ao obter token para athlete 123',
    );
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
});
