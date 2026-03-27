import type { DetailedAthlete, SummaryGear } from 'strava';
import { Equipment } from './equipment';
import { ActivitySportType } from './strava-sdk';

export type GearType = 'bike' | 'shoes';

export type GearStats = {
  id: string;
  name: string;
  distance: number;
  movingTime: number;
  activityType: ActivitySportType | null;
  count: number;
  equipments: Equipment[];
};

function getGears(athlete: DetailedAthlete): SummaryGear[] {
  // Só traz os equipamentos ativos
  const { bikes, shoes } = athlete;
  return [...bikes, ...shoes];
}

function verifyIfHasAnyGears(athlete: DetailedAthlete): boolean {
  const gears = getGears(athlete);
  return gears && gears.length !== 0;
}

export { getGears, verifyIfHasAnyGears };
