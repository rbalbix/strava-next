import { REDIS_KEYS } from '../config';
import type { UnrecognizedCode } from '../contracts/api';
import redis from './redis';

// D14 — persistência do relatório de códigos não reconhecidos (molde de
// thresholds.ts): module próprio para que statistics/dashboard mockem SÓ
// este import nos testes, sem tocar no cliente redis. O cliente do app
// nunca chega aqui.

export type StoredUnrecognizedCodes = {
  lastUpdated: number;
  codes: UnrecognizedCode[];
  /**
   * D14.1 — unix seconds da última tentativa de auto-refresh (registrada
   * antes dos fetches: o throttle vale mesmo se a tentativa falhar).
   */
  lastRefreshAttempt?: number;
};

/** Grava o relatório. Lança em falha do redis — o chamador é best-effort. */
export async function saveUnrecognizedCodes(
  athleteId: number,
  codes: UnrecognizedCode[],
): Promise<void> {
  await redis.set(REDIS_KEYS.unrecognizedCodes(athleteId), {
    lastUpdated: Math.floor(Date.now() / 1000),
    codes,
  } satisfies StoredUnrecognizedCodes);
}

/**
 * Lê o registro completo do relatório. `null` = chave ausente (o backfill
 * usa isso para saber que ainda não passou por aqui). Lança em falha do
 * redis — o chamador decide.
 */
export async function getStoredUnrecognizedCodes(
  athleteId: number,
): Promise<StoredUnrecognizedCodes | null> {
  const stored = await redis.get<StoredUnrecognizedCodes>(
    REDIS_KEYS.unrecognizedCodes(athleteId),
  );

  if (!stored || !Array.isArray(stored.codes)) return null;
  return stored;
}

/**
 * Lê só os casos. `null` = chave ausente. Casca sobre o leitor completo
 * (o dashboard não precisa do restante do registro).
 */
export async function getUnrecognizedCodes(
  athleteId: number,
): Promise<UnrecognizedCode[] | null> {
  const stored = await getStoredUnrecognizedCodes(athleteId);
  return stored ? stored.codes : null;
}

/**
 * D14.1 — carimba a tentativa de auto-refresh preservando o resto do
 * registro. Grava antes dos fetches (throttle vale mesmo com falha no
 * meio); o chamador é best-effort.
 */
export async function recordRefreshAttempt(
  athleteId: number,
  stored: StoredUnrecognizedCodes,
): Promise<void> {
  await redis.set(REDIS_KEYS.unrecognizedCodes(athleteId), {
    ...stored,
    lastRefreshAttempt: Math.floor(Date.now() / 1000),
  } satisfies StoredUnrecognizedCodes);
}
