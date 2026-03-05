import { GiCycling } from 'react-icons/gi';
import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';

export type ActivityVisualType = 'mountain-bike' | 'bike' | 'run';

export function isBikeActivityType(
  activityType: string | null | undefined,
): boolean {
  return typeof activityType === 'string' && activityType.endsWith('Ride');
}

export function getActivityVisualType(
  activityType: string | null | undefined,
): ActivityVisualType {
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
        <GiCycling
          className={className}
          color={color}
          data-testid='icon-mountain-bike'
        />
      );
    case 'bike':
      return (
        <MdDirectionsBike
          className={className}
          color={color}
          data-testid='icon-bike'
        />
      );
    default:
      return (
        <MdDirectionsRun
          className={className}
          color={color}
          data-testid='icon-run'
        />
      );
  }
}
