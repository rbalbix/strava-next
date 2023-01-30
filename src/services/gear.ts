import { ActivityType, DetailedAthlete, SummaryGear } from 'strava';

type Equipment = {
  name: string;
  distance: number;
  movingTime: number;
  date?: string;
  isRegistered: boolean;
};

export type GearStats = {
  id: string;
  name: string;
  distance: number;
  movingTime: number;
  activityType: ActivityType;
  count: number;
  equipments: Equipment[];
};

function getGears(athlete: DetailedAthlete) {
  // Só traz os equipamentos ativos
  const { bikes, shoes } = athlete;
  const gears: SummaryGear[] = JSON.parse(JSON.stringify(bikes)).concat(
    JSON.parse(JSON.stringify(shoes))
  );

  return gears;
}

export { getGears };
