import { describe, expect, it, vi } from 'vitest';
import {
  respondIfSessionMissing,
  withProtectedAPI,
} from '../../../src/server/auth';
import { StravaSessionNotFoundError } from '../../../src/services/strava-auth';
import { createMockRequest, createMockResponse } from '../../helpers/next-api';

// `services/strava-auth` importa o cliente Redis; o guard real é o que importa
// aqui, então só o transporte é substituído.
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}));

describe('withProtectedAPI middleware', () => {
  it('returns 401 Unauthorized if strava_athleteId cookie is missing', async () => {
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
