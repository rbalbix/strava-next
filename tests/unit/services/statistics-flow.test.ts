import { beforeEach, describe, expect, it, vi } from 'vitest';

type LoadOptions = {
  remoteGetImpl?: ReturnType<typeof vi.fn>;
  getAthleteImpl?: ReturnType<typeof vi.fn>;
  getGearsImpl?: ReturnType<typeof vi.fn>;
  getActivitiesImpl?: ReturnType<typeof vi.fn>;
  processActivitiesImpl?: ReturnType<typeof vi.fn>;
  saveRemoteImpl?: ReturnType<typeof vi.fn>;
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
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  vi.doMock('../../../src/services/api', () => ({
    apiRemoteStorage: { get: apiRemoteStorageGet },
  }));
  vi.doMock('../../../src/services/athlete', () => ({ getAthlete }));
  vi.doMock('../../../src/services/gear', () => ({ getGears }));
  vi.doMock('../../../src/services/activity', () => ({
    getActivities,
    processActivities,
  }));
  vi.doMock('../../../src/services/utils', () => ({ saveRemote }));
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
});
