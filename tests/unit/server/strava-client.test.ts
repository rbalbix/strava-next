import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RateLimit } from 'strava';

const mocks = vi.hoisted(() => ({
  stravaConfigs: [] as Record<string, unknown>[],
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  responsesInc: vi.fn(),
}));

vi.mock('strava', () => ({
  Strava: vi.fn().mockImplementation(function (config: Record<string, unknown>) {
    mocks.stravaConfigs.push(config);
    return {};
  }),
}));

vi.mock('../../../src/services/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: vi.fn(),
  }),
}));

// Atribuição do quota: o contador por `context` mora em metrics (que puxa
// redis) — mockado aqui para o módulo carregar sem tocar no Upstash.
vi.mock('../../../src/services/metrics', () => ({
  stravaApiResponses: { inc: mocks.responsesInc },
}));

import {
  createStravaClient,
  reportRateLimit,
} from '../../../src/server/strava-client';

function rateLimit(shortTermUsage: number): RateLimit {
  return {
    // Tier padrão do Strava: 100 leituras/15min e 1.000/dia.
    shortTermLimit: 100,
    longTermLimit: 1000,
    shortTermUsage,
    longTermUsage: 42,
    timestamp: 1_700_000_000_000,
  };
}

describe('reportRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs usage on every response and only warns near the limit', () => {
    reportRateLimit(rateLimit(50));
    expect(mocks.loggerInfo).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).not.toHaveBeenCalled();

    // 80% de 100 = 80: a partir daqui vira warning (tempo de frear antes do
    // 429, que custa a janela de 15 min inteira).
    reportRateLimit(rateLimit(79));
    expect(mocks.loggerWarn).not.toHaveBeenCalled();

    reportRateLimit(rateLimit(80));
    expect(mocks.loggerWarn).toHaveBeenCalledTimes(1);
    expect(mocks.loggerInfo).toHaveBeenCalledTimes(3);
  });

  it('tolerates malformed rate limit payloads without warning', () => {
    // Números ausentes (payload parcial) → só o info, sem divisão por zero.
    reportRateLimit({
      shortTermUsage: undefined,
      shortTermLimit: 0,
    } as unknown as RateLimit);
    // Uso alto mas limite 0 (header corrompido) → sem warning.
    reportRateLimit({
      shortTermUsage: 999,
      shortTermLimit: 0,
    } as unknown as RateLimit);

    expect(mocks.loggerInfo).toHaveBeenCalledTimes(2);
    expect(mocks.loggerWarn).not.toHaveBeenCalled();
  });

  it('tags every log and the quota counter with the calling context', () => {
    const ctx = { context: 'dashboard', athleteId: 69666780 };

    reportRateLimit(rateLimit(10), ctx);

    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'dashboard',
        athleteId: 69666780,
        rateLimit: expect.anything(),
      }),
      'Strava rate limit usage',
    );
    expect(mocks.responsesInc).toHaveBeenCalledWith({ context: 'dashboard' });

    // Sem contexto (chamador legado) → label 'unknown', nunca crash.
    reportRateLimit(rateLimit(10));
    expect(mocks.responsesInc).toHaveBeenLastCalledWith({
      context: 'unknown',
    });
  });

  it('includes the context in the near-limit warning', () => {
    reportRateLimit(rateLimit(90), { context: 'webhook.activity' });

    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'webhook.activity' }),
      expect.any(String),
    );
  });
});

describe('createStravaClient', () => {
  // process.env é compartilhado por worker: restaura após os testes.
  const savedEnv = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stravaConfigs.length = 0;
    process.env.CLIENT_ID = 'client-id';
    process.env.CLIENT_SECRET = 'client-secret';
  });

  afterEach(() => {
    if (savedEnv.CLIENT_ID === undefined) delete process.env.CLIENT_ID;
    else process.env.CLIENT_ID = savedEnv.CLIENT_ID;
    if (savedEnv.CLIENT_SECRET === undefined) delete process.env.CLIENT_SECRET;
    else process.env.CLIENT_SECRET = savedEnv.CLIENT_SECRET;
  });

  it('wires on_rate_limit_update into the SDK credentials', () => {
    const client = createStravaClient({
      refreshToken: 'refresh',
      accessToken: 'access',
      expiresAt: 9_999_999_999,
    });

    expect(client).not.toBeNull();
    expect(mocks.stravaConfigs).toHaveLength(1);
    const config = mocks.stravaConfigs[0] as {
      on_rate_limit_update?: (rl: RateLimit) => void;
    };
    expect(typeof config.on_rate_limit_update).toBe('function');

    // O callback ligado no SDK é o reportRateLimit (mesma assinatura).
    config.on_rate_limit_update?.(rateLimit(90));
    expect(mocks.loggerWarn).toHaveBeenCalledTimes(1);
  });

  it('binds the rate-limit context into the SDK callback closure', () => {
    createStravaClient(
      { refreshToken: 'refresh' },
      { context: 'webhook.athlete', athleteId: 42 },
    );

    const config = mocks.stravaConfigs[0] as {
      on_rate_limit_update?: (rl: RateLimit) => void;
    };
    config.on_rate_limit_update?.(rateLimit(10));

    // O contexto dado na criação chega ao log e ao contador — sem ele o
    // consumo do quota ficaria anônimo (design 2026-11-18, item 1).
    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'webhook.athlete', athleteId: 42 }),
      'Strava rate limit usage',
    );
    expect(mocks.responsesInc).toHaveBeenCalledWith({
      context: 'webhook.athlete',
    });
  });

  it('accepts credentials without access token yet (refresh flow)', () => {
    const client = createStravaClient({ refreshToken: 'refresh' });

    expect(client).not.toBeNull();
    expect(mocks.stravaConfigs).toHaveLength(1);
    expect(mocks.stravaConfigs[0]).toMatchObject({
      client_id: 'client-id',
      client_secret: 'client-secret',
      refresh_token: 'refresh',
    });
  });

  it('returns null when the Strava env is incomplete', () => {
    delete process.env.CLIENT_ID;
    delete process.env.CLIENT_SECRET;

    expect(createStravaClient({ refreshToken: 'refresh' })).toBeNull();
    expect(mocks.stravaConfigs).toHaveLength(0);
  });
});
