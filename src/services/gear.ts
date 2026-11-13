import type { DetailedAthlete, SummaryGear } from 'strava';
import type { ActivityBase } from './activity';
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

// D15: ordena por uso recente (data da última atividade, decrescente)
// dentro de cada grupo — bikes primeiro, demais gears depois. Gear sem
// atividade nenhuma fica no fim do seu grupo ('' ordena depois de
// qualquer data); empates mantêm a ordem do Strava (sort estável).
function orderGearsByLastUse(
  bikes: SummaryGear[],
  shoes: SummaryGear[],
  activities: ActivityBase[],
): SummaryGear[] {
  const lastUsed = new Map<string, string>();
  activities.forEach((activity) => {
    if (!activity.gear_id) return;
    const current = lastUsed.get(activity.gear_id);
    if (!current || activity.start_date_local > current) {
      lastUsed.set(activity.gear_id, activity.start_date_local);
    }
  });

  const byMostRecentUse = (a: SummaryGear, b: SummaryGear): number => {
    const usedA = lastUsed.get(a.id) ?? '';
    const usedB = lastUsed.get(b.id) ?? '';
    return usedB.localeCompare(usedA);
  };

  return [...bikes]
    .sort(byMostRecentUse)
    .concat([...shoes].sort(byMostRecentUse));
}

export { getGears, orderGearsByLastUse, verifyIfHasAnyGears };
