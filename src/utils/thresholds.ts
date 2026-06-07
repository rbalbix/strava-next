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
