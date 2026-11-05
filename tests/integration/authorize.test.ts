import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/authorize';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  apiStravaOauthTokenPost: vi.fn(),
  apiStravaAuthPost: vi.fn(),
  loggerError: vi.fn(),
  redisSetex: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  apiStravaOauthToken: { post: mocks.apiStravaOauthTokenPost },
  apiStravaAuth: { post: mocks.apiStravaAuthPost },
}));

vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({ error: mocks.loggerError }),
}));

// A sessão nova (D6/PR 2) grava o registro no Redis antes de emitir o cookie.
vi.mock('../../src/services/redis', () => ({
  default: {
    get: vi.fn(),
    setex: (...args: unknown[]) => mocks.redisSetex(...args),
    del: vi.fn(),
  },
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
    mocks.redisSetex.mockResolvedValueOnce('OK');
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

    // D6/PR 2: a sessão é um registro no Redis apontado por um token opaco —
    // o `strava_code` (code de OAuth de uso único) deixou de ser a "sessão".
    expect(mocks.redisSetex).toHaveBeenCalledWith(
      expect.stringMatching(/^strava:session:[0-9a-f]{64}$/),
      30 * 24 * 60 * 60,
      '999',
    );

    const cookies = res.headers['Set-Cookie'] as string[];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find((c) => c.startsWith('gl_session='));
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie).toContain('Max-Age=2592000');
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Lax');

    // Os legados só aparecem limpos — nenhum valor antigo é reemitido.
    expect(
      cookies.some(
        (c) => c.startsWith('strava_code=') && c.includes('Max-Age=0'),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (c) => c.startsWith('strava_athleteId=') && c.includes('Max-Age=0'),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (c) => c.startsWith('strava_oauth_state=') && c.includes('Max-Age=0'),
      ),
    ).toBe(true);
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
    // Nada foi emitido antes de a sessão estar pronta: só o estado OAuth,
    // já consumido, é limpo. `gl_session` não existe neste ponto — e os
    // cookies legados do usuário são preservados, porque um login que falha
    // não pode encerrar uma sessão que ele já tinha.
    const cookies = res.headers['Set-Cookie'] as string[];
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain('strava_oauth_state=');
    expect(cookies[0]).toContain('Max-Age=0');
    expect(mocks.redisSetex).not.toHaveBeenCalled();
  });

  it('does not emit the session cookie when saving tokens fails', async () => {
    // A ordem nova emite as cookies somente depois de a sessão estar completa
    // (save + registro no Redis). Se o save falhar, não há `gl_session` para
    // limpar — e a falha não pode apagar os cookies legados de um usuário que
    // já tinha sessão.
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
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain('strava_oauth_state=');
    expect(cookies[0]).toContain('Max-Age=0');
    // A sessão só é criada depois do save: nem chega a tocar no Redis.
    expect(mocks.redisSetex).not.toHaveBeenCalled();
  });
});
