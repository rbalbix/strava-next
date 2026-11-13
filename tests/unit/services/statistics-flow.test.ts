import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  remoteGetImpl?: ReturnType<typeof vi.fn>;
  getAthleteImpl?: ReturnType<typeof vi.fn>;
  getGearsImpl?: ReturnType<typeof vi.fn>;
  getActivitiesImpl?: ReturnType<typeof vi.fn>;
  processActivitiesImpl?: ReturnType<typeof vi.fn>;
  saveRemoteImpl?: ReturnType<typeof vi.fn>;
  saveUnrecognizedCodesImpl?: ReturnType<typeof vi.fn>;
  getUnrecognizedCodesImpl?: ReturnType<typeof vi.fn>;
  // D14.1: auto-refresh do relatório
  fetchStravaActivityImpl?: ReturnType<typeof vi.fn>;
  processActivityImpl?: ReturnType<typeof vi.fn>;
  getStoredUnrecognizedCodesImpl?: ReturnType<typeof vi.fn>;
  recordRefreshAttemptImpl?: ReturnType<typeof vi.fn>;
};

async function loadStatisticsModule(options: LoadOptions = {}) {
  vi.resetModules();

  const apiRemoteStorageGet =
    options.remoteGetImpl ?? vi.fn().mockResolvedValue({ data: null });
  const getAthlete = options.getAthleteImpl ?? vi.fn().mockResolvedValue({});
  const getGears = options.getGearsImpl ?? vi.fn().mockReturnValue([]);
  const getActivities =
    options.getActivitiesImpl ?? vi.fn().mockResolvedValue([]);
  const processActivities =
    options.processActivitiesImpl ?? vi.fn().mockResolvedValue(undefined);
  const saveRemote =
    options.saveRemoteImpl ?? vi.fn().mockResolvedValue({ success: true });
  // D14: relatório de códigos não reconhecidos — save best-effort / get do
  // backfill (null = chave ausente). O redis real nunca carrega aqui.
  const saveUnrecognizedCodes =
    options.saveUnrecognizedCodesImpl ?? vi.fn().mockResolvedValue(undefined);
  const getUnrecognizedCodes =
    options.getUnrecognizedCodesImpl ?? vi.fn().mockResolvedValue(null);
  // D14.1: auto-refresh do relatório — defaults sem relatório/fetch para os
  // testes existentes seguirem sem tocar nas cadeias `Once` do redis.
  const fetchStravaActivity = options.fetchStravaActivityImpl ?? vi.fn();
  const processActivity =
    options.processActivityImpl ?? vi.fn().mockResolvedValue(null);
  const getStoredUnrecognizedCodes =
    options.getStoredUnrecognizedCodesImpl ?? vi.fn().mockResolvedValue(null);
  const recordRefreshAttempt =
    options.recordRefreshAttemptImpl ?? vi.fn().mockResolvedValue(undefined);
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  vi.doMock('../../../src/services/api', () => ({
    apiRemoteStorage: { get: apiRemoteStorageGet },
  }));
  vi.doMock('../../../src/services/athlete', () => ({ getAthlete }));
  vi.doMock('../../../src/services/gear', () => ({
    getGears,
    // D15: este teste de fluxo injeta os gears pelo mock do getGears; a
    // lógica real de ordenação é coberta em gear.test.ts.
    orderGearsByLastUse: () => getGears({} as any),
  }));
  vi.doMock('../../../src/services/activity', () => ({
    getActivities,
    processActivities,
    fetchStravaActivity,
    processActivity,
  }));
  vi.doMock('../../../src/services/utils', () => ({ saveRemote }));
  vi.doMock('../../../src/services/unrecognized-codes', () => ({
    saveUnrecognizedCodes,
    getUnrecognizedCodes,
    getStoredUnrecognizedCodes,
    recordRefreshAttempt,
  }));
  vi.doMock('../../../src/services/logger', () => ({
    getLogger: () => logger,
  }));

  const mod = await import('../../../src/services/statistics');

  return {
    ...mod,
    apiRemoteStorageGet,
    getAthlete,
    getGears,
    getActivities,
    processActivities,
    saveRemote,
    saveUnrecognizedCodes,
    getUnrecognizedCodes,
    fetchStravaActivity,
    processActivity,
    getStoredUnrecognizedCodes,
    recordRefreshAttempt,
    logger,
  };
}

describe('statistics flow service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateStatistics uses cached statistics when timestamps are aligned', async () => {
    const remoteGetImpl = vi
      .fn()
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, activities: [{ id: 1 }] },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, statistics: [{ id: 'bike-1' }] },
      });

    const { updateStatistics, getAthlete, getActivities, processActivities } =
      await loadStatisticsModule({ remoteGetImpl });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(getAthlete).not.toHaveBeenCalled();
    expect(getActivities).not.toHaveBeenCalled();
    expect(processActivities).not.toHaveBeenCalled();
  });

  it('updateStatistics recomputes from scratch when no stored activities exist', async () => {
    const activities = [
      {
        id: 10,
        name: 'Ride',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ];
    const remoteGetImpl = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });
    const getAthleteImpl = vi.fn().mockResolvedValue({ id: 123 });
    const getGearsImpl = vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]);
    const getActivitiesImpl = vi.fn().mockResolvedValue(activities);
    const saveRemoteImpl = vi.fn().mockResolvedValue({ success: true });

    const {
      updateStatistics,
      getActivities,
      processActivities,
      saveRemote,
      getAthlete,
    } = await loadStatisticsModule({
      remoteGetImpl,
      getAthleteImpl,
      getGearsImpl,
      getActivitiesImpl,
      saveRemoteImpl,
    });

    const result = await updateStatistics({} as any, 123);

    expect(getActivities).toHaveBeenCalledWith(
      expect.any(Object),
      [{ id: 'bike-1', name: 'Bike' }],
      null,
      null,
    );
    expect(processActivities).toHaveBeenCalledWith(123, activities);
    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(getAthlete).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'bike-1', distance: 1000, count: 1 });
  });

  it('updateStatistics merges new and stored activities when cache exists', async () => {
    const existing = [
      {
        id: 1,
        name: 'Old',
        distance: 500,
        moving_time: 50,
        type: 'Ride',
        sport_type: 'Ride',
        start_date_local: '2025-12-31T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ];
    const incoming = [
      {
        id: 2,
        name: 'New',
        distance: 1000,
        moving_time: 100,
        type: 'Ride',
        sport_type: 'Ride',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ];
    const remoteGetImpl = vi
      .fn()
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, activities: existing },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1690000000, statistics: [{ id: 'old' }] },
      });

    const getActivitiesImpl = vi.fn().mockResolvedValue(incoming);
    const processActivitiesImpl = vi.fn().mockResolvedValue(undefined);

    const { updateStatistics, getActivities, processActivities } =
      await loadStatisticsModule({
        remoteGetImpl,
        getAthleteImpl: vi.fn().mockResolvedValue({ id: 123 }),
        getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]),
        getActivitiesImpl,
        processActivitiesImpl,
        saveRemoteImpl: vi.fn().mockResolvedValue({ success: true }),
      });

    await updateStatistics({} as any, 123);

    expect(getActivities).toHaveBeenCalledWith(
      expect.any(Object),
      [{ id: 'bike-1', name: 'Bike' }],
      null,
      1700000000,
    );
    expect(processActivities).toHaveBeenCalledWith(123, [...incoming, ...existing]);
  });

  it('updateStatistics rebuilds from scratch when stored cache has legacy activities without sport_type', async () => {
    const existing = [
      {
        id: 1,
        name: 'Old',
        distance: 500,
        moving_time: 50,
        type: 'Ride',
        start_date_local: '2025-12-31T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ];
    const rebuilt = [
      {
        id: 2,
        name: 'New',
        distance: 1000,
        moving_time: 100,
        type: 'MountainBikeRide',
        sport_type: 'MountainBikeRide',
        start_date_local: '2026-01-01T00:00:00Z',
        gear_id: 'bike-1',
        private_note: '',
      },
    ];
    const remoteGetImpl = vi
      .fn()
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, activities: existing },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1690000000, statistics: [{ id: 'old' }] },
      });

    const getActivitiesImpl = vi.fn().mockResolvedValue(rebuilt);
    const processActivitiesImpl = vi.fn().mockResolvedValue(undefined);

    const { updateStatistics, getActivities, processActivities } =
      await loadStatisticsModule({
        remoteGetImpl,
        getAthleteImpl: vi.fn().mockResolvedValue({ id: 123 }),
        getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]),
        getActivitiesImpl,
        processActivitiesImpl,
        saveRemoteImpl: vi.fn().mockResolvedValue({ success: true }),
      });

    await updateStatistics({} as any, 123);

    expect(getActivities).toHaveBeenCalledWith(
      expect.any(Object),
      [{ id: 'bike-1', name: 'Bike' }],
      null,
      null,
    );
    expect(processActivities).toHaveBeenCalledWith(123, rebuilt);
  });

  it('processStatistics throws when saveRemote fails', async () => {
    const {
      processStatistics,
      saveRemote,
    } = await loadStatisticsModule({
      getAthleteImpl: vi.fn().mockResolvedValue({ id: 1 }),
      getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]),
      saveRemoteImpl: vi.fn().mockResolvedValue({
        success: false,
        error: 'failed',
      }),
    });

    await expect(
      processStatistics(
        {} as any,
        123,
        [
          {
            id: 1,
            name: 'Ride',
            distance: 1000,
            moving_time: 100,
            type: 'Ride',
            start_date_local: '2026-01-01T00:00:00Z',
            gear_id: 'bike-1',
            private_note: '',
          },
        ] as any,
      ),
    ).rejects.toThrow('Erro ao processar estatísticas para 123');

    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote.mock.calls[0][0]).toBe('strava:statistics:123');
  });

  it('updateStatistics rethrows when remote fetch fails', async () => {
    const remoteGetImpl = vi.fn().mockRejectedValue(new Error('remote down'));
    const { updateStatistics, logger } = await loadStatisticsModule({ remoteGetImpl });

    await expect(updateStatistics({} as any, 55)).rejects.toThrow('remote down');
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  // --- D14: relatório de códigos não reconhecidos ---

  const plainActivity = {
    id: 1,
    name: 'Ride',
    distance: 1000,
    moving_time: 100,
    type: 'Ride',
    start_date_local: '2026-01-01T00:00:00Z',
    gear_id: 'bike-1',
    private_note: '',
  };

  function alignedCacheRemoteGet(storedActivities: unknown[]) {
    return vi
      .fn()
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, activities: storedActivities },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, statistics: [{ id: 'bike-1' }] },
      });
  }

  it('processStatistics saves the unrecognized codes report best-effort', async () => {
    const { processStatistics, saveUnrecognizedCodes, getGears } =
      await loadStatisticsModule({
        getAthleteImpl: vi.fn().mockResolvedValue({ id: 1 }),
        getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]),
      });

    const result = await processStatistics({} as any, 123, [
      plainActivity,
    ] as any);

    expect(result).toHaveLength(1);
    expect(saveUnrecognizedCodes).toHaveBeenCalledWith(123, []);
    expect(getGears).toHaveBeenCalled();
  });

  it('processStatistics keeps stats when the report save fails', async () => {
    const saveUnrecognizedCodesImpl = vi
      .fn()
      .mockRejectedValue(new Error('redis down'));
    const { processStatistics, logger } = await loadStatisticsModule({
      getAthleteImpl: vi.fn().mockResolvedValue({ id: 1 }),
      getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]),
      saveUnrecognizedCodesImpl,
    });

    const result = await processStatistics({} as any, 123, [
      plainActivity,
    ] as any);

    expect(result).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('processStatistics does not save the report when stats save fails', async () => {
    const { processStatistics, saveUnrecognizedCodes } =
      await loadStatisticsModule({
        getAthleteImpl: vi.fn().mockResolvedValue({ id: 1 }),
        getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike' }]),
        saveRemoteImpl: vi.fn().mockResolvedValue({
          success: false,
          error: 'failed',
        }),
      });

    await expect(
      processStatistics({} as any, 123, [plainActivity] as any),
    ).rejects.toThrow('Erro ao processar estatísticas para 123');
    expect(saveUnrecognizedCodes).not.toHaveBeenCalled();
  });

  it('updateStatistics skips the backfill when the report key already exists', async () => {
    const { updateStatistics, saveUnrecognizedCodes, getAthlete } =
      await loadStatisticsModule({
        remoteGetImpl: alignedCacheRemoteGet([{ id: 1 }]),
        getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([]),
      });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(saveUnrecognizedCodes).not.toHaveBeenCalled();
    expect(getAthlete).not.toHaveBeenCalled();
  });

  it('updateStatistics backfills an empty report without calling Strava', async () => {
    const { updateStatistics, saveUnrecognizedCodes, getAthlete } =
      await loadStatisticsModule({
        remoteGetImpl: alignedCacheRemoteGet([{ id: 1 }]),
      });

    await updateStatistics({} as any, 123);

    expect(saveUnrecognizedCodes).toHaveBeenCalledWith(123, []);
    expect(getAthlete).not.toHaveBeenCalled();
  });

  it('updateStatistics backfills with gear names when cases exist', async () => {
    const storedActivities = [
      {
        ...plainActivity,
        id: 11,
        name: '* ride',
        start_date_local: '2026-01-02T00:00:00Z',
        private_note: 'troquei a chian',
      },
    ];
    const { updateStatistics, saveUnrecognizedCodes, getAthlete } =
      await loadStatisticsModule({
        remoteGetImpl: alignedCacheRemoteGet(storedActivities),
        getAthleteImpl: vi.fn().mockResolvedValue({ id: 123 }),
        getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike A' }]),
      });

    await updateStatistics({} as any, 123);

    expect(getAthlete).toHaveBeenCalledTimes(1);
    expect(saveUnrecognizedCodes).toHaveBeenCalledWith(123, [
      {
        activityId: 11,
        gearName: 'Bike A',
        startDate: '2026-01-02T00:00:00Z',
        word: 'chian',
        suggestion: 'chain',
      },
    ]);
  });

  it('updateStatistics keeps cached stats when the backfill fails', async () => {
    const getUnrecognizedCodesImpl = vi
      .fn()
      .mockRejectedValue(new Error('redis down'));
    const { updateStatistics, logger } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([{ id: 1 }]),
      getUnrecognizedCodesImpl,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  // --- D14.1: auto-refresh do relatório (caminho B) ---

  const reportedCase = {
    activityId: 11,
    gearName: 'Bike A',
    startDate: '2026-01-02T00:00:00Z',
    word: 'chian',
    suggestion: 'chain',
  };

  const storedReportedActivity = {
    ...plainActivity,
    id: 11,
    name: '* ride',
    sport_type: 'Ride' as const,
    start_date_local: '2026-01-02T00:00:00Z',
    private_note: 'troquei a chian',
  };

  it('D14.1: skips the refresh while the throttle is active', async () => {
    const now = Math.floor(Date.now() / 1000);
    const fetchStravaActivity = vi.fn();
    const recordRefreshAttempt = vi.fn();

    const { updateStatistics, getAthlete } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
        lastUpdated: now - 120,
        codes: [reportedCase],
        lastRefreshAttempt: now - 60,
      }),
      getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([reportedCase]),
      fetchStravaActivityImpl: fetchStravaActivity,
      recordRefreshAttemptImpl: recordRefreshAttempt,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(fetchStravaActivity).not.toHaveBeenCalled();
    expect(recordRefreshAttempt).not.toHaveBeenCalled();
    expect(getAthlete).not.toHaveBeenCalled(); // fast path intacto
  });

  it('D14.1: refreshes the reported note and forces recompute even when aligned', async () => {
    const freshActivities = [
      { ...storedReportedActivity, private_note: 'troquei a chain' },
    ];
    const remoteGetImpl = vi
      .fn()
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, activities: [storedReportedActivity] },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, statistics: [{ id: 'bike-1' }] },
      })
      .mockResolvedValueOnce({
        // relê pós-refresh: a nota já foi corrigida pelo processActivity
        data: { lastUpdated: 1700000100, activities: freshActivities },
      });
    const detail = {
      id: 11,
      name: '* ride',
      private_note: 'troquei a chain',
    };
    const fetchStravaActivity = vi.fn().mockResolvedValue(detail);
    const processActivity = vi.fn().mockResolvedValue(freshActivities);
    const recordRefreshAttempt = vi.fn();
    const report = {
      lastUpdated: 1700000000,
      codes: [reportedCase],
    };

    const {
      updateStatistics,
      apiRemoteStorageGet,
      getAthlete,
      getActivities,
      processActivities,
      saveRemote,
      saveUnrecognizedCodes,
    } = await loadStatisticsModule({
      remoteGetImpl,
      getAthleteImpl: vi.fn().mockResolvedValue({ id: 123 }),
      getGearsImpl: vi.fn().mockReturnValue([{ id: 'bike-1', name: 'Bike A' }]),
      getActivitiesImpl: vi.fn().mockResolvedValue([]),
      fetchStravaActivityImpl: fetchStravaActivity,
      processActivityImpl: processActivity,
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue(report),
      recordRefreshAttemptImpl: recordRefreshAttempt,
    });

    const result = await updateStatistics({} as any, 123);

    // fetch + apply da atividade reportada
    expect(fetchStravaActivity).toHaveBeenCalledWith(11, expect.anything());
    expect(processActivity).toHaveBeenCalledWith(detail, 123);
    // tentativa carimbada ANTES do fetch
    expect(recordRefreshAttempt).toHaveBeenCalledWith(123, report);
    expect(recordRefreshAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      fetchStravaActivity.mock.invocationCallOrder[0],
    );
    // relê o cache uma única vez após a mudança (3ª leitura)
    expect(apiRemoteStorageGet).toHaveBeenCalledTimes(3);
    // recálculo forçado mesmo com timestamps no mesmo minuto
    expect(getAthlete).toHaveBeenCalled();
    expect(getActivities).toHaveBeenCalledWith(
      expect.any(Object),
      [{ id: 'bike-1', name: 'Bike A' }],
      null,
      1700000100,
    );
    expect(processActivities).toHaveBeenCalledWith(123, freshActivities);
    expect(saveRemote).toHaveBeenCalledWith(
      'strava:statistics:123',
      expect.any(String),
    );
    // relatório regravado sem o caso (nota corrigida não gera caso)
    expect(saveUnrecognizedCodes).toHaveBeenCalledWith(123, []);
    expect(result).toHaveLength(1);
  });

  it('D14.1: keeps the fast path when the note did not change', async () => {
    const detail = {
      id: 11,
      name: '* ride',
      private_note: 'troquei a chian', // igual ao cache
    };
    const fetchStravaActivity = vi.fn().mockResolvedValue(detail);
    const recordRefreshAttempt = vi.fn();

    const {
      updateStatistics,
      getAthlete,
      processActivity,
      recordRefreshAttempt: stamped,
    } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
        lastUpdated: 1700000000,
        codes: [reportedCase],
      }),
      getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([reportedCase]),
      fetchStravaActivityImpl: fetchStravaActivity,
      recordRefreshAttemptImpl: recordRefreshAttempt,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(stamped).toHaveBeenCalledWith(123, {
      lastUpdated: 1700000000,
      codes: [reportedCase],
    });
    expect(fetchStravaActivity).toHaveBeenCalledTimes(1);
    expect(processActivity).not.toHaveBeenCalled();
    expect(getAthlete).not.toHaveBeenCalled(); // fast path preservado
  });

  it('D14.1: tolerates fetch failures (best-effort)', async () => {
    const fetchStravaActivity = vi
      .fn()
      .mockRejectedValue(new Error('Strava API error: 404'));
    const recordRefreshAttempt = vi.fn();

    const { updateStatistics, getAthlete, logger } =
      await loadStatisticsModule({
        remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
        getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
          lastUpdated: 1700000000,
          codes: [reportedCase],
        }),
        getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([reportedCase]),
        fetchStravaActivityImpl: fetchStravaActivity,
        recordRefreshAttemptImpl: recordRefreshAttempt,
      });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    // tentativa registrada mesmo com o fetch falhando (gravada antes)
    expect(recordRefreshAttempt).toHaveBeenCalledTimes(1);
    expect(getAthlete).not.toHaveBeenCalled();
  });

  it('D14.1: does not fetch or insert a reported activity missing from the cache', async () => {
    const fetchStravaActivity = vi.fn();
    const recordRefreshAttempt = vi.fn();

    const { updateStatistics, getAthlete, processActivity } =
      await loadStatisticsModule({
        remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
        getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
          lastUpdated: 1700000000,
          codes: [{ ...reportedCase, activityId: 999 }], // fora do cache
        }),
        getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([
          { ...reportedCase, activityId: 999 },
        ]),
        fetchStravaActivityImpl: fetchStravaActivity,
        recordRefreshAttemptImpl: recordRefreshAttempt,
      });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(fetchStravaActivity).not.toHaveBeenCalled();
    expect(processActivity).not.toHaveBeenCalled();
    expect(recordRefreshAttempt).toHaveBeenCalledTimes(1);
    expect(getAthlete).not.toHaveBeenCalled();
  });

  it('D14.1: tolerates report read failures (best-effort)', async () => {
    const getStoredUnrecognizedCodes = vi
      .fn()
      .mockRejectedValue(new Error('redis down'));
    const fetchStravaActivity = vi.fn();

    const { updateStatistics, logger } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: getStoredUnrecognizedCodes,
      fetchStravaActivityImpl: fetchStravaActivity,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(fetchStravaActivity).not.toHaveBeenCalled();
  });

  it('D14.1: still refreshes when recording the attempt fails', async () => {
    const detail = {
      id: 11,
      name: '* ride',
      private_note: 'troquei a chian',
    };
    const fetchStravaActivity = vi.fn().mockResolvedValue(detail);
    const recordRefreshAttempt = vi
      .fn()
      .mockRejectedValue(new Error('redis down'));

    const { updateStatistics, logger } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
        lastUpdated: 1700000000,
        codes: [reportedCase],
      }),
      getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([reportedCase]),
      fetchStravaActivityImpl: fetchStravaActivity,
      recordRefreshAttemptImpl: recordRefreshAttempt,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(recordRefreshAttempt).toHaveBeenCalledTimes(1);
    expect(fetchStravaActivity).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('D14.1: exits early when the report has no cases', async () => {
    const fetchStravaActivity = vi.fn();
    const recordRefreshAttempt = vi.fn();

    const { updateStatistics, getAthlete } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
        lastUpdated: 1700000000,
        codes: [],
      }),
      getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([]),
      fetchStravaActivityImpl: fetchStravaActivity,
      recordRefreshAttemptImpl: recordRefreshAttempt,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(fetchStravaActivity).not.toHaveBeenCalled();
    expect(recordRefreshAttempt).not.toHaveBeenCalled();
    expect(getAthlete).not.toHaveBeenCalled();
  });

  it('D14.1: applies the change when only the name changed (note fields absent)', async () => {
    const storedNoNote = {
      id: 11,
      name: '* ride',
      distance: 1000,
      moving_time: 100,
      type: 'Ride',
      sport_type: 'Ride',
      start_date_local: '2026-01-02T00:00:00Z',
      gear_id: 'bike-1',
      // sem private_note — cobre o nullish dos dois lados da comparação
    };
    const fresh = [{ ...storedNoNote, name: '* ride (novo)' }];
    const detail = { id: 11, name: '* ride (novo)' }; // sem private_note
    const remoteGetImpl = vi
      .fn()
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, activities: [storedNoNote] },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000000, statistics: [{ id: 'bike-1' }] },
      })
      .mockResolvedValueOnce({
        data: { lastUpdated: 1700000100, activities: fresh },
      });
    const fetchStravaActivity = vi.fn().mockResolvedValue(detail);
    const processActivity = vi.fn().mockResolvedValue(fresh);

    const { updateStatistics, getAthlete, processActivity: applied } =
      await loadStatisticsModule({
        remoteGetImpl,
        getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
          lastUpdated: 1700000000,
          codes: [reportedCase],
        }),
        getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([reportedCase]),
        fetchStravaActivityImpl: fetchStravaActivity,
        processActivityImpl: processActivity,
      });

    await updateStatistics({} as any, 123);

    expect(fetchStravaActivity).toHaveBeenCalledWith(11, expect.anything());
    expect(applied).toHaveBeenCalledWith(detail, 123);
    expect(getAthlete).toHaveBeenCalled(); // recompute forçado
  });

  it('D14.1: does not force recompute when the write fails', async () => {
    const detail = {
      id: 11,
      name: '* ride',
      private_note: 'troquei a chain', // mudou, mas a gravação falha
    };
    const fetchStravaActivity = vi.fn().mockResolvedValue(detail);
    const processActivity = vi.fn().mockResolvedValue(null); // falha interna

    const {
      updateStatistics,
      apiRemoteStorageGet,
      getAthlete,
      processActivity: applied,
    } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
        lastUpdated: 1700000000,
        codes: [reportedCase],
      }),
      getUnrecognizedCodesImpl: vi.fn().mockResolvedValue([reportedCase]),
      fetchStravaActivityImpl: fetchStravaActivity,
      processActivityImpl: processActivity,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    expect(applied).toHaveBeenCalledWith(detail, 123);
    // sem gravação → sem relê e sem recálculo forçado
    expect(apiRemoteStorageGet).toHaveBeenCalledTimes(2);
    expect(getAthlete).not.toHaveBeenCalled();
  });

  it('D14.1: fetches each reported activity once even with two reported words', async () => {
    const detail = {
      id: 11,
      name: '* ride',
      private_note: 'troquei a chian', // igual ao cache — sem mudança
    };
    const fetchStravaActivity = vi.fn().mockResolvedValue(detail);
    const recordRefreshAttempt = vi.fn();
    const twoCases = [
      reportedCase,
      { ...reportedCase, word: 'reviw', suggestion: 'review' },
    ];

    const { updateStatistics, getAthlete } = await loadStatisticsModule({
      remoteGetImpl: alignedCacheRemoteGet([storedReportedActivity]),
      getStoredUnrecognizedCodesImpl: vi.fn().mockResolvedValue({
        lastUpdated: 1700000000,
        codes: twoCases,
      }),
      getUnrecognizedCodesImpl: vi.fn().mockResolvedValue(twoCases),
      fetchStravaActivityImpl: fetchStravaActivity,
      recordRefreshAttemptImpl: recordRefreshAttempt,
    });

    const result = await updateStatistics({} as any, 123);

    expect(result).toEqual([{ id: 'bike-1' }]);
    // mesma atividade (11) em duas linhas do relatório → um único fetch
    expect(fetchStravaActivity).toHaveBeenCalledTimes(1);
    expect(fetchStravaActivity).toHaveBeenCalledWith(11, expect.anything());
    expect(getAthlete).not.toHaveBeenCalled(); // sem mudança → fast path intacto
  });
});
