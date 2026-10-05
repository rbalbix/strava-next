import type { ThresholdEntry, ThresholdUnit } from '../contracts/api';
import { locale } from './format';

export type ThresholdState = 'normal' | 'warning' | 'overdue' | 'no-threshold';

export function computeThresholdState(
  distanceKm: number,
  thresholdKm?: number,
): ThresholdState {
  if (thresholdKm === undefined || thresholdKm === null) {
    return 'no-threshold';
  }

  if (thresholdKm <= 0) {
    return distanceKm >= 0 ? 'overdue' : 'no-threshold';
  }

  const ratio = distanceKm / thresholdKm;

  if (ratio >= 1) {
    return 'overdue';
  }

  if (ratio >= 0.8) {
    return 'warning';
  }

  return 'normal';
}

export function resolveCurrentConsumption(
  entry: ThresholdEntry,
  equipment: { distance?: number; movingTime?: number },
): number {
  return entry.unit === 'h'
    ? (equipment.movingTime ?? 0) / 3600
    : (equipment.distance ?? 0) / 1000;
}

/**
 * Formata um valor na unidade do limite: duas casas para km e uma para horas
 * (regra do PRD). Compartilhado pela barra de progresso e pelo modal de alerta
 * para as duas superfícies nunca divergirem na apresentação (PRD, O2).
 */
export function formatThresholdValue(
  value: number,
  unit: ThresholdUnit,
): string {
  return `${locale.format(unit === 'h' ? ',.1f' : ',.2f')(value)} ${unit}`;
}
