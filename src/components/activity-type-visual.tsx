import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { PiBicycle } from 'react-icons/pi';

export type ActivityVisualType = 'mountain-bike' | 'bike' | 'run';

export function isBikeActivityType(
  activityType: string | null | undefined,
): boolean {
  return typeof activityType === 'string' && activityType.endsWith('Ride');
}

export function getActivityVisualType(
  activityType: string | null | undefined,
): ActivityVisualType {
  // D15: sem tipo associado (gear sem nenhuma atividade) → ícone de bike
  // Road por padrão; tipos conhecidos seguem a regra de antes.
  if (activityType == null) return 'bike';
  if (activityType === 'MountainBikeRide') return 'mountain-bike';
  if (isBikeActivityType(activityType)) return 'bike';
  return 'run';
}

export function renderActivityIcon(
  visualType: ActivityVisualType,
  className?: string,
  color?: string,
) {
  switch (visualType) {
    case 'mountain-bike':
      return (
        <PiBicycle
          className={className}
          color={color}
          aria-hidden='true'
          focusable='false'
          data-testid='icon-mountain-bike'
        />
      );
    case 'bike':
      return (
        <MdDirectionsBike
          className={className}
          color={color}
          aria-hidden='true'
          focusable='false'
          data-testid='icon-bike'
        />
      );
    default:
      return (
        <MdDirectionsRun
          className={className}
          color={color}
          aria-hidden='true'
          focusable='false'
          data-testid='icon-run'
        />
      );
  }
}
