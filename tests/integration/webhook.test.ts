import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

type LoadWebhookOptions = {
  verifyToken?: string;
  webhookSubscriptionId?: string;
  webhookAllowedIps?: string;
  validationResult?: unknown;
  storedActivitiesData?: unknown;
  athleteTokens?: unknown;
  fetchedActivity?: unknown;
  getActivitiesResult?: unknown[];
  mergedActivitiesResult?: unknown[];
  athleteData?: unknown;
  gearsData?: unknown[];
  hasAuth?: number;
  rateLimitCurrent?: number;
  replayInsertResult?: unknown;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  method?: string;
  nodeEnv?: string;
};

async function loadWebhookHandler(options: LoadWebhookOptions = {}) {
  vi.resetModules();

  (process.env as Record<string, string | undefined>).VERIFY_TOKEN =
    options.verifyToken ?? 'verify-token';
  (process.env as Record<string, string | undefined>).NODE_ENV =
    options.nodeEnv ?? 'test';
  (process.env as Record<string, string | undefined>).WEBHOOK_ALLOWED_IPS =
    options.webhookAllowedIps ?? '';
  if (options.webhookSubscriptionId !== undefined) {
    (process.env as Record<string, string | undefined>).WEBHOOK_SUBSCRIPTION_ID =
      options.webhookSubscriptionId;
  } else {
    delete (process.env as Record<string, string | undefined>)
      .WEBHOOK_SUBSCRIPTION_ID;
  }

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const redisMock = {
    exists: vi.fn().mockResolvedValue(options.hasAuth ?? 1),
    incr: vi.fn().mockResolvedValue(options.rateLimitCurrent ?? 1),
    expire: vi.fn().mockResolvedValue(1),
    set: vi
      .fn()
      .mockResolvedValue(
        options.replayInsertResult === undefined
          ? 'OK'
          : options.replayInsertResult,
      ),
    del: vi.fn().mockResolvedValue(1),
  };

  const validateWebhookEvent = vi
    .fn()
    .mockReturnValue(
      options.validationResult ?? {
        success: true,
        data: {
          aspect_type: 'delete',
          event_time: Math.floor(Date.now() / 1000),
          object_id: 123,
          object_type: 'athlete',
          owner_id: 987,
          subscription_id: 1,
        },
      },
    );

  const webhookEventsInc = vi.fn();
  const webhookValidationFailedInc = vi.fn();
  const fetchStravaActivity = vi.fn().mockResolvedValue(
    options.fetchedActivity ?? { id: 123, name: 'Ride' },
  );
  const getActivities = vi
    .fn()
    .mockResolvedValue(options.getActivitiesResult ?? []);
  const processActivities = vi.fn().mockResolvedValue(undefined);
  const processActivity = vi.fn().mockResolvedValue(undefined);
  const apiRemoteStorageGet = vi.fn().mockResolvedValue({
    data: options.storedActivitiesData ?? null,
  });
  const getAthlete = vi
    .fn()
    .mockResolvedValue(options.athleteData ?? { id: 987, bikes: [] });
  const getGears = vi.fn().mockReturnValue(options.gearsData ?? []);
  const updateStatistics = vi.fn().mockResolvedValue([]);
  const getAthleteAccessToken = vi
    .fn()
    .mockResolvedValue(
      options.athleteTokens ?? {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 9999999999,
      },
    );
  const mergeActivities = vi
    .fn()
    .mockReturnValue(options.mergedActivitiesResult ?? []);

  vi.doMock('../../src/services/logger', () => ({
    getLogger: () => mockLogger,
  }));

  vi.doMock('../../src/services/webhook-validation', () => ({
    validateWebhookEvent,
  }));

  vi.doMock('../../src/services/redis', () => ({
    default: redisMock,
  }));

  vi.doMock('../../src/services/metrics', () => ({
    webhookEvents: { inc: webhookEventsInc },
    webhookValidationFailed: { inc: webhookValidationFailedInc },
  }));

  vi.doMock('../../src/services/activity', () => ({
    fetchStravaActivity,
    getActivities,
    processActivities,
    processActivity,
  }));

  vi.doMock('../../src/services/api', () => ({
    apiRemoteStorage: { get: apiRemoteStorageGet },
  }));

  vi.doMock('../../src/services/athlete', () => ({
    getAthlete,
  }));

  vi.doMock('../../src/services/gear', () => ({
    getGears,
  }));

  vi.doMock('../../src/services/statistics', () => ({
    updateStatistics,
  }));

  vi.doMock('../../src/services/strava-auth', () => ({
    getAthleteAccessToken,
  }));

  vi.doMock('../../src/services/utils', () => ({
    mergeActivities,
  }));

  vi.doMock('../../src/services/email', () => ({
    sendEmail: vi.fn(),
    createErrorEmailTemplate: vi.fn(() => '<p>error</p>'),
  }));

  vi.doMock('strava', () => ({
    Strava: vi.fn().mockImplementation(() => ({})),
  }));

  (process.env as Record<string, string | undefined>).CLIENT_ID = 'client-id';
  (process.env as Record<string, string | undefined>).CLIENT_SECRET =
    'client-secret';

  const { default: webhookHandler } = await import('../../src/pages/api/webhook');

  const req = createMockRequest({
    method: options.method ?? 'POST',
    headers: {
      'x-request-id': 'req-id-1',
      'x-forwarded-for': '127.0.0.1',
    },
    query: options.query ?? {},
    body:
      options.body ??
      ({
        any: 'payload',
      } as unknown),
  });
  const res = createMockResponse();

  return {
    webhookHandler,
    req,
    res,
    redisMock,
    validateWebhookEvent,
    webhookEventsInc,
    webhookValidationFailedInc,
    fetchStravaActivity,
    getActivities,
    processActivities,
    processActivity,
    apiRemoteStorageGet,
    getAthlete,
    getGears,
    updateStatistics,
    getAthleteAccessToken,
    mergeActivities,
  };
}

describe('/api/webhook integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for GET webhook validation with matching token', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        'hub.challenge': 'challenge-value',
      },
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ 'hub.challenge': 'challenge-value' });
  });

  it('returns 400 for POST verification attempt', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      method: 'POST',
      query: { 'hub.verify_token': 'verify-token' },
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid method for verification' });
  });

  it('returns 403 for GET webhook validation with invalid token', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-value',
      },
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Token inválido' });
  });

  it('returns 400 when payload validation fails', async () => {
    const { webhookHandler, req, res, webhookValidationFailedInc } =
      await loadWebhookHandler({
        validationResult: { success: false, error: 'invalid payload' },
      });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid payload',
      details: 'invalid payload',
    });
    expect(webhookValidationFailedInc).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when athlete has no stored auth for non-delete athlete event', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      hasAuth: 0,
      validationResult: {
        success: true,
        data: {
          aspect_type: 'create',
          event_time: Math.floor(Date.now() / 1000),
          object_id: 123,
          object_type: 'activity',
          owner_id: 987,
          subscription_id: 1,
        },
      },
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Athlete not authorized' });
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      hasAuth: 1,
      rateLimitCurrent: 70,
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('60');
    expect(res.body).toEqual({ error: 'Rate limit exceeded' });
  });

  it('returns duplicate marker when replay guard blocks event', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      hasAuth: 1,
      rateLimitCurrent: 1,
      replayInsertResult: null,
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true, duplicate: true });
  });

  it('returns 200 for a valid athlete delete event', async () => {
    const { webhookHandler, req, res, redisMock, webhookEventsInc } =
      await loadWebhookHandler({
        hasAuth: 1,
        rateLimitCurrent: 1,
        replayInsertResult: 'OK',
        validationResult: {
          success: true,
          data: {
            aspect_type: 'delete',
            event_time: Math.floor(Date.now() / 1000),
            object_id: 123,
            object_type: 'athlete',
            owner_id: 987,
            subscription_id: 1,
          },
        },
      });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(webhookEventsInc).toHaveBeenCalledTimes(1);
    expect(redisMock.del).toHaveBeenCalledTimes(1);
  });

  it('returns 500 in production when subscription guard is missing', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      nodeEnv: 'production',
      webhookSubscriptionId: undefined,
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Webhook subscription guard not configured' });
  });

  it('returns 403 when subscription_id mismatches configured subscription', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      webhookSubscriptionId: '777',
      validationResult: {
        success: true,
        data: {
          aspect_type: 'delete',
          event_time: Math.floor(Date.now() / 1000),
          object_id: 123,
          object_type: 'athlete',
          owner_id: 987,
          subscription_id: 999,
        },
      },
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Invalid subscription' });
  });

  it('returns 200 for athlete delete event without stored auth (idempotent)', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      hasAuth: 0,
      validationResult: {
        success: true,
        data: {
          aspect_type: 'delete',
          event_time: Math.floor(Date.now() / 1000),
          object_id: 123,
          object_type: 'athlete',
          owner_id: 987,
          subscription_id: 1,
        },
      },
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it('returns 405 for unsupported methods', async () => {
    const { webhookHandler, req, res } = await loadWebhookHandler({
      method: 'PUT',
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.ended).toBe(true);
  });

  it('processes activity create on first sync using single activity fetch', async () => {
    const eventTime = Math.floor(Date.now() / 1000);
    const { webhookHandler, req, res, fetchStravaActivity, processActivity, updateStatistics } =
      await loadWebhookHandler({
        validationResult: {
          success: true,
          data: {
            aspect_type: 'create',
            event_time: eventTime,
            object_id: 4321,
            object_type: 'activity',
            owner_id: 987,
            subscription_id: 1,
          },
        },
        storedActivitiesData: null,
      });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(fetchStravaActivity).toHaveBeenCalledWith(4321, expect.any(Object));
    expect(processActivity).toHaveBeenCalledWith(expect.any(Object), 987);
    expect(updateStatistics).toHaveBeenCalledWith(expect.any(Object), 987);
  });

  it('processes activity update with stored activities', async () => {
    const eventTime = Math.floor(Date.now() / 1000);
    const { webhookHandler, req, res, fetchStravaActivity, processActivity, processActivities, updateStatistics } =
      await loadWebhookHandler({
        validationResult: {
          success: true,
          data: {
            aspect_type: 'update',
            event_time: eventTime,
            object_id: 200,
            object_type: 'activity',
            owner_id: 987,
            subscription_id: 1,
          },
        },
        storedActivitiesData: {
          lastUpdated: 1700000000,
          activities: [{ id: 100 }],
        },
      });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(fetchStravaActivity).toHaveBeenCalledWith(200, expect.any(Object));
    expect(processActivity).toHaveBeenCalledWith(expect.any(Object), 987);
    expect(processActivities).not.toHaveBeenCalled();
    expect(updateStatistics).toHaveBeenCalledTimes(1);
  });

  it('processes activity create with stored activities and merges collections', async () => {
    const eventTime = Math.floor(Date.now() / 1000);
    const activitiesFromApi = [{ id: 200 }];
    const storedActivities = [{ id: 100 }];
    const mergedActivities = [{ id: 200 }, { id: 100 }];

    const {
      webhookHandler,
      req,
      res,
      getAthlete,
      getGears,
      getActivities,
      mergeActivities,
      processActivities,
      updateStatistics,
    } = await loadWebhookHandler({
      validationResult: {
        success: true,
        data: {
          aspect_type: 'create',
          event_time: eventTime,
          object_id: 300,
          object_type: 'activity',
          owner_id: 987,
          subscription_id: 1,
        },
      },
      storedActivitiesData: {
        lastUpdated: 1700000000,
        activities: storedActivities,
      },
      athleteData: { id: 987, bikes: [{ id: 'bike-1' }] },
      gearsData: [{ id: 'bike-1' }],
      getActivitiesResult: activitiesFromApi,
      mergedActivitiesResult: mergedActivities,
    });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(getAthlete).toHaveBeenCalledTimes(1);
    expect(getGears).toHaveBeenCalledTimes(1);
    expect(getActivities).toHaveBeenCalledWith(
      expect.any(Object),
      [{ id: 'bike-1' }],
      null,
      1700000000,
    );
    expect(mergeActivities).toHaveBeenCalledWith(activitiesFromApi, storedActivities);
    expect(processActivities).toHaveBeenCalledWith(987, mergedActivities);
    expect(updateStatistics).toHaveBeenCalledTimes(1);
  });

  it('processes activity delete with stored activities and removes deleted item', async () => {
    const eventTime = Math.floor(Date.now() / 1000);
    const existing = [{ id: 111 }, { id: 222 }, { id: 333 }];
    const { webhookHandler, req, res, processActivities, updateStatistics } =
      await loadWebhookHandler({
        validationResult: {
          success: true,
          data: {
            aspect_type: 'delete',
            event_time: eventTime,
            object_id: 222,
            object_type: 'activity',
            owner_id: 987,
            subscription_id: 1,
          },
        },
        storedActivitiesData: {
          lastUpdated: 1700000000,
          activities: existing,
        },
      });

    await webhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(processActivities).toHaveBeenCalledWith(987, [{ id: 111 }, { id: 333 }]);
    expect(updateStatistics).toHaveBeenCalledTimes(1);
  });
});
