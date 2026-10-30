import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/authorize';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  apiStravaOauthTokenPost: vi.fn(),
  apiStravaAuthPost: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  apiStravaOauthToken: { post: mocks.apiStravaOauthTokenPost },
  apiStravaAuth: { post: mocks.apiStravaAuthPost },
}));

vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({ error: mocks.loggerError }),
}));

describe('/api/authorize integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_ID = 'client-id';
    process.env.CLIENT_SECRET = 'client-secret';
    process.env.GRANT_TYPE = 'authorization_code';
  });

  it('returns 400 when code is missing', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {},
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Code parameter is missing or invalid' });
  });

  it('returns 400 when oauth state is invalid', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'bad' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid OAuth state' });
    expect(res.headers['Set-Cookie']).toBeTruthy();
  });

  it('redirects to home and saves tokens on success', async () => {
    mocks.apiStravaOauthTokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_at: 123456,
        athlete: { id: 999 },
      },
    });
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'good' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(mocks.apiStravaAuthPost).toHaveBeenCalledWith(
      '/',
      expect.objectContaining({ athleteId: 999, accessToken: 'access' }),
    );
    expect(res.redirectedTo).toBe('/');

    const cookies = res.headers['Set-Cookie'] as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('strava_code=abc') && c.includes('Max-Age=2592000'))).toBe(true);
    expect(cookies.some((c) => c.includes('strava_athleteId=999') && c.includes('Max-Age=2592000'))).toBe(true);
  });

  it('redirects to the landing when downstream fails', async () => {
    // Um login com falha não pode terminar num beco sem saída: o destino é a
    // landing, sem sessão e com o CTA de login à vista. Antes ia para /404 —
    // escolha que fazia sentido quando `/` ainda redirecionava para o OAuth e
    // voltar para lá reabria o loop (§8.1, A1); com a landing é destino
    // terminal.
    mocks.apiStravaOauthTokenPost.mockRejectedValueOnce(new Error('boom'));
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'good' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.redirectedTo).toBe('/');
    expect(mocks.loggerError).toHaveBeenCalled();
    // Limpa qualquer cookie emitida antes da falha (caso o save no Redis seja
    // o ponto que falhou), para a landing ser renderizada direto.
    const cookies = res.headers['Set-Cookie'] as string[];
    expect(cookies).toHaveLength(3);
    expect(cookies.every((cookie) => cookie.includes('Max-Age=0'))).toBe(true);
  });

  it('clears cookies emitted before saving tokens fails', async () => {
    // Exercita a ordem problemática: /api/authorize emite as cookies antes
    // de pedir ao serviço interno para persistir refresh/access token. Sem o
    // cleanup do catch, a home abriria um painel que inevitavelmente recebe
    // 401, em vez de chegar direto à landing.
    mocks.apiStravaOauthTokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_at: 123456,
        athlete: { id: 999 },
      },
    });
    mocks.apiStravaAuthPost.mockRejectedValueOnce(new Error('Redis indisponível'));
    const req = createMockRequest({
      method: 'GET',
      query: { code: 'abc', state: 'good' },
      headers: { cookie: 'strava_oauth_state=good' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.redirectedTo).toBe('/');
    const cookies = res.headers['Set-Cookie'] as string[];
    expect(cookies).toHaveLength(3);
    expect(cookies.every((cookie) => cookie.includes('Max-Age=0'))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes('strava_code=abc'))).toBe(false);
  });
});
