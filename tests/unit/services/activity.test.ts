import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  redisGet?: ReturnType<typeof vi.fn>;
  saveRemoteResult?: { success: boolean };
  updateActivityInArrayResult?: unknown[];
  isAxiosError?: (value: unknown) => boolean;
  activityProcessedIncImpl?: ReturnType<typeof vi.fn>;
  activityFailedIncImpl?: ReturnType<typeof vi.fn>;
};

async function loadActivityModule(options: LoadOptions = {}) {
  vi.resetModules();

  const redis = {
    get: options.redisGet ?? vi.fn().mockResolvedValue(null),
  };
  const saveRemote = vi
    .fn()
    .mockResolvedValue(options.saveRemoteResult ?? { success: true });
  const updateActivityInArray = vi
    .fn()
    .mockReturnValue(options.updateActivityInArrayResult ?? []);
  const mergeActivities = vi.fn();
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  };
  const activityProcessedInc = options.activityProcessedIncImpl ?? vi.fn();
  const activityFailedInc = options.activityFailedIncImpl ?? vi.fn();

  vi.doMock('../../../src/services/redis', () => ({
    default: redis,
  }));
  vi.doMock('../../../src/services/utils', () => ({
    saveRemote,
    updateActivityInArray,
    mergeActivities,
  }));
  vi.doMock('../../../src/services/logger', () => ({
    getLogger: () => logger,
  }));
  vi.doMock('../../../src/services/metrics', () => ({
    activityProcessed: { inc: activityProcessedInc },
    activityFailed: { inc: activityFailedInc },
  }));
  vi.doMock('axios', () => ({
    default: {
      isAxiosError: options.isAxiosError ?? (() => false),
    },
    isAxiosError: options.isAxiosError ?? (() => false),
  }));

  const mod = await import('../../../src/services/activity');

  return {
    ...mod,
    redis,
    saveRemote,
    updateActivityInArray,
    mergeActivities,
    logger,
    activityProcessedInc,
    activityFailedInc,
  };
}

describe('activity service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getActivities paginates, filters by active gear and fills private_note for starred activities', async () => {
    const { getActivities } = await loadActivityModule();
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: 1,
              name: '* service',
              distance: 1000,
              moving_time: 100,
              type: 'Ride',
              start_date_local: '2026-01-01T00:00:00Z',
              gear_id: 'g1',
            },
            {
              id: 2,
              name: 'ignore',
              distance: 500,
              moving_time: 50,
              type: 'Ride',
              start_date_local: '2026-01-01T00:00:00Z',
              gear_id: 'g2',
            },
            {
              id: 3,
              name: 'normal',
              distance: 750,
              moving_time: 80,
              type: 'Ride',
              start_date_local: '2026-01-02T00:00:00Z',
              gear_id: 'g1',
            },
          ])
          .mockResolvedValueOnce([]),
        getActivityById: vi.fn().mockResolvedValue({ private_note: 'chain' }),
      },
    } as any;

    const result = await getActivities(
      strava,
      [{ id: 'g1' }] as any,
      null,
      null,
    );
    const byId = [...result].sort((a, b) => a.id - b.id);

    expect(result).toHaveLength(2);
    expect(byId[0]).toMatchObject({ id: 1, private_note: 'chain' });
    expect(byId[1]).toMatchObject({ id: 3, private_note: '' });
    expect(strava.activities.getActivityById).toHaveBeenCalledTimes(1);
  });

  it('getActivities forwards before/after params and tolerates detail fetch failures', async () => {
    const { getActivities, logger } = await loadActivityModule();
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: 10,
              name: '* broken-detail',
              distance: 1200,
              moving_time: 100,
              type: 'Ride',
              start_date_local: '2026-02-01T00:00:00Z',
              gear_id: 'g1',
            },
          ])
          .mockResolvedValueOnce([]),
        getActivityById: vi.fn().mockRejectedValue(new Error('detail down')),
      },
    } as any;

    const result = await getActivities(strava, [{ id: 'g1' }] as any, 11, 22);
    expect(
      strava.activities.getLoggedInAthleteActivities,
    ).toHaveBeenCalledTimes(2);
    const firstCallParams =
      strava.activities.getLoggedInAthleteActivities.mock.calls[0][0];
    expect(firstCallParams.before).toBe(11);
    expect(firstCallParams.after).toBe(22);
    expect(firstCallParams.per_page).toBe(200);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 10, private_note: '' });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('getActivities normalizes missing private_note from activity detail', async () => {
    const { getActivities } = await loadActivityModule();
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: 99,
              name: '* detail-empty',
              distance: 1000,
              moving_time: 100,
              type: 'Ride',
              start_date_local: '2026-02-01T00:00:00Z',
              gear_id: 'g1',
            },
          ])
          .mockResolvedValueOnce([]),
        getActivityById: vi.fn().mockResolvedValue({ private_note: undefined }),
      },
    } as any;

    const result = await getActivities(
      strava,
      [{ id: 'g1' }] as any,
      null,
      null,
    );
    expect(result[0].private_note).toBe('');
  });

  it('fetchStravaActivity returns activity on success', async () => {
    const { fetchStravaActivity } = await loadActivityModule();
    const strava = {
      activities: {
        getActivityById: vi.fn().mockResolvedValue({ id: 100 }),
      },
    } as any;

    const result = await fetchStravaActivity(100, strava);
    expect(result).toEqual({ id: 100 });
  });

  it('fetchStravaActivity maps axios errors', async () => {
    const { fetchStravaActivity } = await loadActivityModule({
      isAxiosError: () => true,
    });
    const strava = {
      activities: {
        getActivityById: vi.fn().mockRejectedValue({
          response: { status: 503, data: { message: 'unavailable' } },
          message: 'fail',
        }),
      },
    } as any;

    await expect(fetchStravaActivity(200, strava)).rejects.toThrow(
      'Strava API error: 503 - unavailable',
    );
  });

  it('fetchStravaActivity uses axios error.message when response payload has no message', async () => {
    const { fetchStravaActivity } = await loadActivityModule({
      isAxiosError: () => true,
    });
    const strava = {
      activities: {
        getActivityById: vi.fn().mockRejectedValue({
          response: { status: 503, data: {} },
          message: 'fallback-msg',
        }),
      },
    } as any;

    await expect(fetchStravaActivity(201, strava)).rejects.toThrow(
      'Strava API error: 503 - fallback-msg',
    );
  });

  it('fetchStravaActivity throws for null activity response', async () => {
    const { fetchStravaActivity } = await loadActivityModule();
    const strava = {
      activities: {
        getActivityById: vi.fn().mockResolvedValue(null),
      },
    } as any;

    await expect(fetchStravaActivity(999, strava)).rejects.toThrow(
      'Erro ao recuperar a atividade 999',
    );
  });

  it('fetchStravaActivity rethrows non-axios errors', async () => {
    const { fetchStravaActivity } = await loadActivityModule({
      isAxiosError: () => false,
    });
    const strava = {
      activities: {
        getActivityById: vi.fn().mockRejectedValue(new Error('unexpected')),
      },
    } as any;

    await expect(fetchStravaActivity(201, strava)).rejects.toThrow(
      'unexpected',
    );
  });

  it('processActivities persists payload and increments processed metric', async () => {
    const { processActivities, saveRemote, activityProcessedInc } =
      await loadActivityModule({
        saveRemoteResult: { success: true },
      });
    const activities = [{ id: 1 }] as any;

    await processActivities(123, activities);

    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote.mock.calls[0][0]).toBe('strava:activities:123');
    expect(activityProcessedInc).toHaveBeenCalledTimes(1);
  });

  it('processActivities throws when remote save fails', async () => {
    const { processActivities } = await loadActivityModule({
      saveRemoteResult: { success: false },
    });

    await expect(processActivities(123, [] as any)).rejects.toThrow(
      'Erro ao processar atividades para 123',
    );
  });

  it('processActivities succeeds even when processed metric increment throws', async () => {
    const { processActivities } = await loadActivityModule({
      saveRemoteResult: { success: true },
      activityProcessedIncImpl: vi.fn().mockImplementation(() => {
        throw new Error('metric fail');
      }),
    });

    await expect(
      processActivities(123, [{ id: 1 }] as any),
    ).resolves.toBeUndefined();
  });

  it('processActivity updates activities and returns merged list', async () => {
    const merged = [{ id: 2 }, { id: 1 }];
    const { processActivity, updateActivityInArray, activityProcessedInc } =
      await loadActivityModule({
        redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
        saveRemoteResult: { success: true },
        updateActivityInArrayResult: merged,
      });

    const result = await processActivity({ id: 2 } as any, 321);

    expect(updateActivityInArray).toHaveBeenCalledTimes(1);
    expect(result).toEqual(merged);
    expect(activityProcessedInc).toHaveBeenCalledTimes(2);
  });

  it('processActivity supports empty stored payload and metric increment failures', async () => {
    const merged = [{ id: 1 }];
    const { processActivity } = await loadActivityModule({
      redisGet: vi.fn().mockResolvedValue(null),
      saveRemoteResult: { success: true },
      updateActivityInArrayResult: merged,
      activityProcessedIncImpl: vi.fn().mockImplementation(() => {
        throw new Error('metric failed');
      }),
    });

    await expect(processActivity({ id: 1 } as any, 111)).resolves.toEqual(
      merged,
    );
  });

  it('processActivity returns null and increments failed metric when processing fails', async () => {
    const { processActivity, activityFailedInc, logger } =
      await loadActivityModule({
        redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
        saveRemoteResult: { success: false },
        updateActivityInArrayResult: [{ id: 2 }],
      });

    const result = await processActivity({ id: 2 } as any, 321);

    expect(result).toBeNull();
    expect(activityFailedInc).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('processActivity still returns null when failed metric increment throws', async () => {
    const { processActivity } = await loadActivityModule({
      redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
      saveRemoteResult: { success: false },
      updateActivityInArrayResult: [{ id: 2 }],
      activityFailedIncImpl: vi.fn().mockImplementation(() => {
        throw new Error('metric fail');
      }),
    });

    await expect(processActivity({ id: 2 } as any, 321)).resolves.toBeNull();
  });

  it('verifyIfHasAnyActivities returns false for empty activity list and throws on errors', async () => {
    const { verifyIfHasAnyActivities, activityFailedInc } =
      await loadActivityModule();
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi.fn().mockResolvedValue([]),
      },
    } as any;
    const empty = await verifyIfHasAnyActivities(strava, {} as any);
    expect(empty).toBe(false);

    strava.activities.getLoggedInAthleteActivities.mockRejectedValueOnce(
      new Error('boom'),
    );
    await expect(verifyIfHasAnyActivities(strava, {} as any)).rejects.toThrow(
      'boom',
    );
    expect(activityFailedInc).toHaveBeenCalledTimes(1);
  });

  it('verifyIfHasAnyActivities returns true when list has items', async () => {
    const { verifyIfHasAnyActivities } = await loadActivityModule();
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi.fn().mockResolvedValue([{ id: 1 }]),
      },
    } as any;

    await expect(verifyIfHasAnyActivities(strava, {} as any)).resolves.toBe(
      true,
    );
  });

  it('verifyIfHasAnyActivities rethrows even when failed metric increment throws', async () => {
    const { verifyIfHasAnyActivities } = await loadActivityModule({
      activityFailedIncImpl: vi.fn().mockImplementation(() => {
        throw new Error('metric fail');
      }),
    });
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockRejectedValue(new Error('boom')),
      },
    } as any;

    await expect(verifyIfHasAnyActivities(strava, {} as any)).rejects.toThrow(
      'boom',
    );
  });
});
