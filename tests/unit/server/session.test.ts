import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_MAX_AGE } from '../../../src/config';
import {
  createStravaSession,
  resolveStravaSession,
  revokeStravaSession,
} from '../../../src/server/session';
import redis from '../../../src/services/redis';

// A sessão é pura lógica sobre o Redis; o transporte é substituído aqui.
vi.mock('../../../src/services/redis', () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

const mockedRedis = vi.mocked(redis);

function expectedKey(token: string): string {
  return `strava:session:${createHash('sha256').update(token).digest('hex')}`;
}

describe('session service (D6/PR 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStravaSession', () => {
    it('gera um token opaco e grava o registro com TTL de 30 dias', async () => {
      mockedRedis.setex.mockResolvedValueOnce('OK');

      const token = await createStravaSession(4242);

      // 32 bytes em hex = 64 caracteres — 256 bits de entropia.
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(mockedRedis.setex).toHaveBeenCalledWith(
        expectedKey(token),
        SESSION_MAX_AGE,
        '4242',
      );
      expect(SESSION_MAX_AGE).toBe(30 * 24 * 60 * 60);
    });

    it('gera tokens distintos a cada chamada (nunca reutiliza)', async () => {
      mockedRedis.setex.mockResolvedValue('OK');

      const first = await createStravaSession(1);
      const second = await createStravaSession(1);

      expect(first).not.toBe(second);
      expect(mockedRedis.setex).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolveStravaSession', () => {
    it('devolve o athleteId do registro', async () => {
      mockedRedis.get.mockResolvedValueOnce('4242');

      await expect(resolveStravaSession('a'.repeat(64))).resolves.toBe(4242);
      expect(mockedRedis.get).toHaveBeenCalledWith(expectedKey('a'.repeat(64)));
    });

    it('aceita o valor já parseado pelo cliente Upstash (number)', async () => {
      // O cliente devolve JSON parseado quando possível — o registro pode
      // chegar como number, não como string.
      mockedRedis.get.mockResolvedValueOnce(4242);

      await expect(resolveStravaSession('b'.repeat(64))).resolves.toBe(4242);
    });

    it('devolve null quando a sessão não existe (expirada/apagada/revogada)', async () => {
      mockedRedis.get.mockResolvedValueOnce(null);

      await expect(resolveStravaSession('c'.repeat(64))).resolves.toBeNull();
    });

    it('devolve null para valores inválidos no registro', async () => {
      // Registro corrompido não pode virar "atleta 0" nem NaN: sem athleteId
      // confiável, a sessão não autentica ninguém.
      for (const bogus of ['abc', '', '0', '-5']) {
        mockedRedis.get.mockResolvedValueOnce(bogus);
        await expect(resolveStravaSession('d'.repeat(64))).resolves.toBeNull();
      }
    });

    it('propaga erro do Redis (infra ≠ fim de sessão)', async () => {
      // Quem chama precisa distinguir: lançar → 500 com retry; null → 401.
      mockedRedis.get.mockRejectedValueOnce(new Error('upstash indisponível'));

      await expect(resolveStravaSession('e'.repeat(64))).rejects.toThrow(
        'upstash indisponível',
      );
    });
  });

  describe('revokeStravaSession', () => {
    it('apaga exatamente a chave da sessão', async () => {
      mockedRedis.del.mockResolvedValueOnce(1);

      await revokeStravaSession('f'.repeat(64));

      expect(mockedRedis.del).toHaveBeenCalledWith(
        expectedKey('f'.repeat(64)),
      );
    });
  });
});
