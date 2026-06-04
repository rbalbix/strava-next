export type { EquipmentThresholds } from '../contracts/api';
import type { EquipmentThresholds } from '../contracts/api';
import redis from './redis';
import { REDIS_KEYS } from '../config/index';

function validateThresholdKm(thresholdKm: number): void {
  if (typeof thresholdKm !== 'number' || Number.isNaN(thresholdKm)) {
    throw new Error('thresholdKm must be a number');
  }

  if (thresholdKm < 0) {
    throw new Error('thresholdKm must be greater than or equal to 0');
  }
}

export async function getEquipmentThresholds(
  athleteId: number,
): Promise<EquipmentThresholds> {
  if (!Number.isFinite(athleteId) || athleteId <= 0) {
    throw new Error('athleteId must be a positive number');
  }

  const key = REDIS_KEYS.equipmentThresholds(athleteId);
  const stored = await redis.get<EquipmentThresholds>(key);

  return stored ?? {};
}

export async function saveEquipmentThreshold(
  athleteId: number,
  gearId: string,
  equipmentId: string,
  thresholdKm: number,
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

  validateThresholdKm(thresholdKm);

  const key = REDIS_KEYS.equipmentThresholds(athleteId);
  const current = (await redis.get<EquipmentThresholds>(key)) ?? {};
  const updated: EquipmentThresholds = { ...current };

  if (!updated[gearId]) {
    updated[gearId] = {};
  }

  updated[gearId] = {
    ...updated[gearId],
    [equipmentId]: thresholdKm,
  };

  await redis.set(key, updated);
  return updated;
}
