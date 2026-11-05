import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../src/pages/api/logout';
import { SESSION_COOKIE } from '../../src/server/cookies';
import { createMockRequest, createMockResponse } from '../helpers/next-api';

const mocks = vi.hoisted(() => ({
  redisDel: vi.fn(),
  loggerWarn: vi.fn(),
}));

// O logout revoga a sessão no Redis (D6/PR 2) além de limpar os cookies.
vi.mock('../../src/services/redis', () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    del: (...args: unknown[]) => mocks.redisDel(...args),
  },
}));

// A revogação que falha registra um warn (§8.12.4) sem quebrar o logout.
vi.mock('../../src/services/logger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    warn: (...args: unknown[]) => mocks.loggerWarn(...args),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

function sessionKey(token: string): string {
  return `strava:session:${createHash('sha256').update(token).digest('hex')}`;
}

describe('/api/logout integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-POST', async () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it('clears cookies and returns success for POST', async () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(res.headers['Set-Cookie']).toBeTruthy();
  });

  it('revoga a sessão no Redis e limpa todos os cookies', async () => {
    mocks.redisDel.mockResolvedValueOnce(1);

    const req = createMockRequest({
      method: 'POST',
      cookies: { [SESSION_COOKIE]: 'token-opaco' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    // Revogação: apagar a chave invalida o token em qualquer dispositivo —
    // limpar o cookie só tira o valor deste navegador.
    expect(mocks.redisDel).toHaveBeenCalledWith(sessionKey('token-opaco'));

    const cookies = res.headers['Set-Cookie'] as string[];
    // Os dois legados da migração são limpos junto: um logout encerra a
    // sessão antiga de quem ainda não reautenticou.
    for (const name of [SESSION_COOKIE, 'strava_code', 'strava_athleteId', 'strava_oauth_state']) {
      const cookie = cookies.find((c) => c.startsWith(`${name}=`));
      expect(cookie, `cookie ${name} não foi limpo`).toBeTruthy();
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    }
  });

  it('funciona sem gl_session (sessão legada) limpando os cookies', async () => {
    const req = createMockRequest({
      method: 'POST',
      cookies: { strava_code: 'old', strava_athleteId: '1' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mocks.redisDel).not.toHaveBeenCalled();
    const cookies = res.headers['Set-Cookie'] as string[];
    expect(
      cookies.some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(true);
  });

  it('não falha quando o Redis está indisponível (melhor esforço)', async () => {
    // Um logout não pode falhar por indisponibilidade do Redis: limpar os
    // cookies já encerra a sessão local, e a chave remanescente expira sozinha.
    mocks.redisDel.mockRejectedValueOnce(new Error('upstash fora do ar'));

    const req = createMockRequest({
      method: 'POST',
      cookies: { [SESSION_COOKIE]: 'token-opaco' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
    const cookies = res.headers['Set-Cookie'] as string[];
    expect(cookies.some((c) => c.startsWith(`${SESSION_COOKIE}=`))).toBe(true);
    // A falha da revogação é registrada (sem ela, a chave órfã seria
    // indistinguível de uma sessão ativa na contagem pós-deploy).
    expect(mocks.loggerWarn).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Falha ao revogar a sessão no Redis',
    );
  });
});
