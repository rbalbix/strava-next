import {
  ActivityType,
  DetailedAthlete,
  ResourceState,
  SummaryGear,
} from 'strava';

export interface SummaryGearWithNickName {
  id: string;
  primary: boolean;
  name: string;
  nickname: string;
  resource_state: ResourceState;
  distance: number;
}

export type Equipment = {
  id: string;
  caption: string;
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
  const gears: SummaryGearWithNickName[] = JSON.parse(
    JSON.stringify(bikes)
  ).concat(JSON.parse(JSON.stringify(shoes)));

  return gears;
}

export { getGears };
