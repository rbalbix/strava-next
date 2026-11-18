import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  redisGet?: ReturnType<typeof vi.fn>;
  redisSet?: ReturnType<typeof vi.fn>;
  redisDel?: ReturnType<typeof vi.fn>;
  // Item 4 (LGPD): valor lido na chave strava:auth:<id> — undefined = o
  // atleta "existe" (default dos testes); null = deletado (guarda pula a
  // gravação).
  authGet?: unknown;
  saveRemoteResult?: { success: boolean };
  updateActivityInArrayResult?: unknown[];
  isAxiosError?: (value: unknown) => boolean;
  activityProcessedIncImpl?: ReturnType<typeof vi.fn>;
  activityFailedIncImpl?: ReturnType<typeof vi.fn>;
};

async function loadActivityModule(options: LoadOptions = {}) {
  vi.resetModules();

  const baseRedisGet = options.redisGet ?? vi.fn().mockResolvedValue(null);
  const redis = {
    // Key-aware: a guarda LGPD lê strava:auth:<id> e o resto (activities,
    // unrecognized-codes…) cai no redisGet do teste.
    get: vi.fn((key: string) => {
      if (String(key).includes(':auth:')) {
        return Promise.resolve(
          options.authGet !== undefined
            ? options.authGet
            : { accessToken: 'access-token' },
        );
      }
      return Promise.resolve(baseRedisGet(key));
    }),
    // 'OK' = lock adquirido na primeira tentativa (nenhum teste espera).
    set: options.redisSet ?? vi.fn().mockResolvedValue('OK'),
    del: options.redisDel ?? vi.fn().mockResolvedValue(1),
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
    warn: vi.fn(),
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
    // expect(strava.activities.getActivityById).toHaveBeenCalledTimes(1);
  });

  it('getActivities forwards before/after params and aborts when a detail fetch fails', async () => {
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

    // Falha no detalhe de atividade com `*` aborta a operação inteira (não
    // só o 429): gravar parcialmente custaria o marking de manutenção —
    // `private_note` viraria '' em silêncio e nunca seria refeito.
    await expect(
      getActivities(strava, [{ id: 'g1' }] as any, 11, 22),
    ).rejects.toThrow('detail down');

    expect(
      strava.activities.getLoggedInAthleteActivities,
    ).toHaveBeenCalledTimes(2);
    const firstCallParams =
      strava.activities.getLoggedInAthleteActivities.mock.calls[0][0];
    expect(firstCallParams.before).toBe(11);
    expect(firstCallParams.after).toBe(22);
    expect(firstCallParams.per_page).toBe(200);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 10 }),
      'Falha ao buscar detalhes da atividade — abortando o fetch para não gravar nota vazia',
    );
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

  // ——— Item 2 (merge-safe): lock de escrita + guarda LGPD ———

  it('processActivity runs under the activities write lock and releases it', async () => {
    const merged = [{ id: 2 }, { id: 1 }];
    const {
      processActivity,
      updateActivityInArray,
      redis,
      saveRemote,
      activityProcessedInc,
    } = await loadActivityModule({
      redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
      updateActivityInArrayResult: merged,
    });

    const result = await processActivity({ id: 2 } as any, 321);

    // Lock NX com TTL, relê o estado atual e grava dentro da seção crítica.
    expect(redis.set).toHaveBeenCalledWith(
      'strava:lock:activities:321',
      '1',
      { nx: true, ex: 30 },
    );
    expect(updateActivityInArray).toHaveBeenCalledWith(
      { id: 2 },
      [{ id: 1 }],
    );
    expect(saveRemote).toHaveBeenCalled();
    // Libera a lock no finally — mesmo caminho de sucesso.
    expect(redis.del).toHaveBeenCalledWith('strava:lock:activities:321');
    expect(result).toEqual(merged);
    expect(activityProcessedInc).toHaveBeenCalled();
  });

  it('processActivity waits for a busy activities lock and then proceeds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    try {
      const setMock = vi
        .fn()
        .mockResolvedValueOnce(null) // tentativa inicial: ocupada
        .mockResolvedValueOnce(null) // 1º poll (100ms): ainda ocupada
        .mockResolvedValue('OK'); // 2º poll (200ms): liberada
      const { processActivity, updateActivityInArray } =
        await loadActivityModule({
          redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
          redisSet: setMock,
          updateActivityInArrayResult: [{ id: 2 }],
        });

      const promise = processActivity({ id: 2 } as any, 321);
      await vi.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result).toEqual([{ id: 2 }]);
      expect(setMock).toHaveBeenCalledTimes(3);
      expect(updateActivityInArray).toHaveBeenCalledWith({ id: 2 }, [
        { id: 1 },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('processActivity writes lockless after the wait cap and never releases someone else’s lock', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    try {
      const setMock = vi.fn().mockResolvedValue(null); // sempre ocupada
      const delMock = vi.fn().mockResolvedValue(1);
      const { processActivity, saveRemote } = await loadActivityModule({
        redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
        redisSet: setMock,
        redisDel: delMock,
        updateActivityInArrayResult: [{ id: 2 }],
      });

      const promise = processActivity({ id: 2 } as any, 321);
      await vi.advanceTimersByTimeAsync(2_500); // teto de espera: 2s
      const result = await promise;

      // Degrada para o comportamento de antes do lock: grava mesmo assim.
      expect(result).toEqual([{ id: 2 }]);
      expect(saveRemote).toHaveBeenCalled();
      // Nunca liberou a lock de ninguém (não a adquiriu).
      expect(delMock).not.toHaveBeenCalled();
      // ~1 inicial + 20 polls de 100ms em 2s.
      expect(setMock.mock.calls.length).toBeGreaterThanOrEqual(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('processActivity skips the write when the athlete auth key is gone (LGPD)', async () => {
    const {
      processActivity,
      saveRemote,
      logger,
      activityProcessedInc,
      redis,
    } = await loadActivityModule({
      authGet: null, // delete do atleta já executou
      redisGet: vi.fn().mockResolvedValue({ activities: [{ id: 1 }] }),
      updateActivityInArrayResult: [{ id: 2 }],
    });

    const result = await processActivity({ id: 2 } as any, 321);

    // Sem auth não há gravação (senão a atividade "revivida" persistiria
    // para sempre — não há próximo evento para limpá-la).
    expect(result).toBeNull();
    expect(saveRemote).not.toHaveBeenCalled();
    expect(activityProcessedInc).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ athleteId: 321 }),
      expect.stringContaining('atleta sem auth'),
    );
    // A lock é liberada mesmo no caminho de skip.
    expect(redis.del).toHaveBeenCalledWith('strava:lock:activities:321');
  });

  it('athleteStillExists reads the auth key', async () => {
    const deleted = await loadActivityModule({ authGet: null });
    await expect(deleted.athleteStillExists(5)).resolves.toBe(false);

    const alive = await loadActivityModule();
    await expect(alive.athleteStillExists(5)).resolves.toBe(true);

    // Falha de leitura → abre (abre): o guard existe para detectar delete,
    // não para medir disponibilidade.
    const failing = await loadActivityModule({
      redisGet: vi.fn().mockRejectedValue(new Error('redis down')),
    });
    await expect(failing.athleteStillExists(5)).resolves.toBe(true);
  });

  it('getActivities stamps synced_at (the merge tie-breaker) on every copy', async () => {
    const { getActivities } = await loadActivityModule();
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: 1,
              name: 'Ride',
              distance: 10,
              moving_time: 5,
              type: 'Ride',
              start_date_local: '2026-01-01T00:00:00Z',
              gear_id: 'g1',
            },
          ])
          .mockResolvedValueOnce([]),
        getActivityById: vi.fn(),
      },
    } as any;

    const result = await getActivities(
      strava,
      [{ id: 'g1' }] as any,
      null,
      null,
    );

    expect(result).toHaveLength(1);
    expect(typeof result[0].synced_at).toBe('number');
    expect(result[0].synced_at).toBeGreaterThan(1_700_000_000);
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

  it('verifyIfHasAnyActivities answers from the Redis cache without calling Strava', async () => {
    const { verifyIfHasAnyActivities, redis } = await loadActivityModule({
      redisGet: vi
        .fn()
        .mockResolvedValue({ lastUpdated: 1, activities: [{ id: 1 }] }),
    });
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi.fn(),
      },
    } as any;

    await expect(
      verifyIfHasAnyActivities(strava, { id: 7 } as any),
    ).resolves.toBe(true);

    expect(redis.get).toHaveBeenCalledWith('strava:activities:7');
    // A razão do cache: zero chamadas à API do Strava neste poll.
    expect(strava.activities.getLoggedInAthleteActivities).not.toHaveBeenCalled();
  });

  it('verifyIfHasAnyActivities falls back to Strava when the cache read fails or is empty', async () => {
    // 1) Leitura de cache falha → warn + caminho antigo (API do Strava).
    const failing = await loadActivityModule({
      redisGet: vi.fn().mockRejectedValue(new Error('redis down')),
    });
    const stravaDown = {
      activities: {
        getLoggedInAthleteActivities: vi.fn().mockResolvedValue([{ id: 1 }]),
      },
    } as any;

    await expect(
      failing.verifyIfHasAnyActivities(stravaDown, { id: 9 } as any),
    ).resolves.toBe(true);
    expect(failing.logger.warn).toHaveBeenCalledTimes(1);
    expect(stravaDown.activities.getLoggedInAthleteActivities).toHaveBeenCalledTimes(
      1,
    );

    // 2) Cache existe mas vazio → o cache não prova nada; Strava decide
    //    (preserva o comportamento pré-otimização).
    const emptyCache = await loadActivityModule({
      redisGet: vi.fn().mockResolvedValue({ lastUpdated: 1, activities: [] }),
    });
    const stravaEmpty = {
      activities: {
        getLoggedInAthleteActivities: vi.fn().mockResolvedValue([{ id: 1 }]),
      },
    } as any;

    await expect(
      emptyCache.verifyIfHasAnyActivities(stravaEmpty, { id: 9 } as any),
    ).resolves.toBe(true);
    expect(
      stravaEmpty.activities.getLoggedInAthleteActivities,
    ).toHaveBeenCalledTimes(1);
  });

  it('getActivities aborts on 429 while fetching details instead of storing empty private notes', async () => {
    const { getActivities, logger } = await loadActivityModule();
    const starred = (id: number) => ({
      id,
      name: `* bike ${id}`,
      distance: 1000,
      moving_time: 100,
      type: 'Ride',
      start_date_local: '2026-01-01T00:00:00Z',
      gear_id: 'g1',
    });
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockResolvedValueOnce([starred(1), starred(2)])
          .mockResolvedValueOnce([]),
        getActivityById: vi
          .fn()
          .mockRejectedValue({ status: 429, message: 'Too Many Requests' }),
      },
    } as any;

    // A operação inteira falha: gravar parcialmente custaria os markings de
    // manutenção (`private_note` viraria '' em silêncio).
    await expect(
      getActivities(strava, [{ id: 'g1' }] as any, null, null),
    ).rejects.toEqual({ status: 429, message: 'Too Many Requests' });

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 1 }),
      'Rate limit do Strava ao buscar detalhes — abortando o fetch',
    );
    // Qualquer erro no detalhe de atividade com `*` aborta (429 ou não) —
    // o caminho de tolerância agora é só para enriquecer sport_type.
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.anything(),
      'Erro ao obter detalhes da atividade para enriquecer dados',
    );
  });

  it('getActivities fetches details with bounded concurrency (batches of 8)', async () => {
    const { getActivities } = await loadActivityModule();
    const activities = Array.from({ length: 24 }, (_, index) => ({
      id: index + 1,
      name: `* bike ${index + 1}`,
      distance: 1000,
      moving_time: 100,
      type: 'Ride',
      start_date_local: '2026-01-01T00:00:00Z',
      gear_id: 'g1',
    }));

    let inFlight = 0;
    let maxInFlight = 0;
    const strava = {
      activities: {
        getLoggedInAthleteActivities: vi
          .fn()
          .mockResolvedValueOnce(activities)
          .mockResolvedValueOnce([]),
        getActivityById: vi.fn().mockImplementation(async () => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 2));
          inFlight -= 1;
          return { private_note: 'chain' };
        }),
      },
    } as any;

    const result = await getActivities(strava, [{ id: 'g1' }] as any, null, null);

    expect(result).toHaveLength(24);
    expect(strava.activities.getActivityById).toHaveBeenCalledTimes(24);
    // O `Promise.all` original mandava 24 de uma vez (num rebuild real, 201):
    // contra o limite de 100 leituras/15min do Strava, era 429 garantido.
    expect(maxInFlight).toBeLessThanOrEqual(8);
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
