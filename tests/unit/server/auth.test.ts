import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  respondIfSessionMissing,
  withProtectedAPI,
} from '../../../src/server/auth';
import { SESSION_COOKIE } from '../../../src/server/cookies';
import { StravaSessionNotFoundError } from '../../../src/services/strava-auth';
import { createMockRequest, createMockResponse } from '../../helpers/next-api';

// `services/strava-auth` importa o cliente Redis; o guard real é o que importa
// aqui, então só o transporte é substituído.
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}));

// A sessão nova resolve o athleteId no Redis; o registro é simulado aqui.
// O logger também é substituído para que o caso de 500 não imprima erro real.
vi.mock('../../../src/services/redis', () => ({
  default: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
}));
vi.mock('../../../src/services/logger', () => ({
  getLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import redis from '../../../src/services/redis';

const mockedRedis = vi.mocked(redis);

describe('withProtectedAPI middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 Unauthorized if no session cookie is present', async () => {
    const req = createMockRequest({
      method: 'GET',
      cookies: {},
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      reason: 'Session expired or invalid',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('forwards the request to the underlying handler if strava_athleteId cookie is present', async () => {
    // Legado da migração do PR 2: sem `gl_session`, o par antigo continua
    // valendo — é o que impede deslogar a base existente no deploy.
    const req = createMockRequest({
      method: 'GET',
      cookies: { strava_athleteId: '55555' },
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledWith(req, res, 55555);
  });

  it('resolve o athleteId pelo registro da sessão quando há gl_session', async () => {
    // D6/PR 2: a identidade vem do Redis, não do cookie enviado pelo cliente.
    mockedRedis.get.mockResolvedValueOnce('999');

    const req = createMockRequest({
      method: 'GET',
      cookies: { [SESSION_COOKIE]: 'token-opaco', strava_athleteId: '1' },
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    // O `gl_session` é autoritativo: o athleteId legado é ignorado.
    expect(mockedRedis.get).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(req, res, 999);
  });

  it('responde 401 quando o gl_session não tem registro (sessão revogada)', async () => {
    mockedRedis.get.mockResolvedValueOnce(null);

    const req = createMockRequest({
      method: 'GET',
      cookies: { [SESSION_COOKIE]: 'token-expirado' },
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      reason: 'Session expired or invalid',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('responde 500 — nunca 401 — quando o Redis não responde', async () => {
    // Falha de infra não pode deslogar ninguém (§8.6): 401 limparia os
    // cookies do usuário por indisponibilidade do Redis. 500 mantém a sessão
    // e o cliente mostra o painel de erro com retry (D5).
    mockedRedis.get.mockRejectedValueOnce(new Error('upstash fora do ar'));

    const req = createMockRequest({
      method: 'GET',
      cookies: { [SESSION_COOKIE]: 'token-opaco' },
    });
    const res = createMockResponse();

    const handler = vi.fn();
    const wrapped = withProtectedAPI(handler);

    await wrapped(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('respondIfSessionMissing', () => {
  it('responde 401 quando a sessão não existe mais no Redis', () => {
    const res = createMockResponse();

    const handled = respondIfSessionMissing(
      res,
      new StravaSessionNotFoundError(777),
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: 'Unauthorized',
      reason: 'Session expired or invalid',
    });
  });

  it('devolve false para erros que não são ausência de sessão', () => {
    // Se esta guarda falhasse para todo erro, uma falha de infraestrutura
    // deslogaria o usuário em vez de mostrar o painel de erro com retry.
    const res = createMockResponse();

    expect(respondIfSessionMissing(res, new Error('boom'))).toBe(false);
    expect(respondIfSessionMissing(res, undefined)).toBe(false);
    expect(respondIfSessionMissing(res, null)).toBe(false);

    // Nada foi respondido: o handler original ainda vai tratar o erro.
    expect(res.ended).toBe(false);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeUndefined();
  });
});
