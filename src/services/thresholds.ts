export type { EquipmentThresholds } from '../contracts/api';
import type { EquipmentThresholds, ThresholdEntry } from '../contracts/api';
import redis from './redis';
import { REDIS_KEYS } from '../config/index';

/**
 * Formato cru persistido no Redis: registros antigos são números puros
 * (unidade implícita em km) e registros novos são o par valor+unidade.
 * A conversão acontece exclusivamente na fronteira de leitura deste módulo.
 */
type StoredEquipmentThresholds = Record<
  string,
  Record<string, number | ThresholdEntry>
>;

function normalizeThresholds(
  stored: StoredEquipmentThresholds | null,
): EquipmentThresholds {
  const normalized: EquipmentThresholds = {};

  for (const [gearId, equipments] of Object.entries(stored ?? {})) {
    normalized[gearId] = {};

    for (const [equipmentId, value] of Object.entries(equipments)) {
      normalized[gearId][equipmentId] =
        typeof value === 'number' ? { value, unit: 'km' } : value;
    }
  }

  return normalized;
}

function validateThresholdEntry(entry: ThresholdEntry): void {
  const value = entry?.value;
  const unit = entry?.unit;

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('thresholdKm must be a number');
  }

  if (value < 0) {
    throw new Error('thresholdKm must be greater than or equal to 0');
  }

  if (unit !== 'km' && unit !== 'h') {
    throw new Error('unit must be km or h');
  }
}

export async function getEquipmentThresholds(
  athleteId: number,
): Promise<EquipmentThresholds> {
  if (!Number.isFinite(athleteId) || athleteId <= 0) {
    throw new Error('athleteId must be a positive number');
  }

  const key = REDIS_KEYS.equipmentThresholds(athleteId);
  const stored = await redis.get<StoredEquipmentThresholds>(key);

  return normalizeThresholds(stored);
}

export async function saveEquipmentThreshold(
  athleteId: number,
  gearId: string,
  equipmentId: string,
  entry: ThresholdEntry,
): Promise<EquipmentThresholds> {
  if (!Number.isFinite(athleteId) || athleteId <= 0) {
    throw new Error('athleteId must be a positive number');
  }

  if (!gearId?.trim()) {
    throw new Error('gearId is required');
  }

  if (!equipmentId?.trim()) {
    throw new Error('equipmentId is required');
  }

  validateThresholdEntry(entry);

  const key = REDIS_KEYS.equipmentThresholds(athleteId);
  const stored = (await redis.get<StoredEquipmentThresholds>(key)) ?? {};
  const updated: StoredEquipmentThresholds = { ...stored };

  if (!updated[gearId]) {
    updated[gearId] = {};
  }

  updated[gearId] = {
    ...updated[gearId],
    [equipmentId]: entry,
  };

  await redis.set(key, updated);
  return normalizeThresholds(updated);
}
